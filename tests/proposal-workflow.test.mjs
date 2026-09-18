import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
// Transpile the real modules; external services are isolated test doubles.
function load(path, mocks = {}) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  const mod = { exports: {} };
  // Only executes trusted repository source, never user or AI-provided content.
  // oxlint-disable-next-line typescript/no-implied-eval
  new Function('require', 'module', 'exports', outputText)(id => id in mocks ? mocks[id] : require(id), mod, mod.exports);
  return mod.exports;
}
const workflow = load('lib/proposal-workflow.ts');
const brief = Object.fromEntries(workflow.briefFields.map(f => [f.key, f.list ? ['Entrega confirmada'] : 'Informação confirmada']));
brief.budget = null;
const sectionTypes = ['cover', 'context', 'scope', 'process', 'investment', 'closing'];
const copy = {
  brand_name: 'Marca de teste', title: 'Proposta de teste', subtitle: 'Apresentação aprovada',
  slides: sectionTypes.map((type, index) => ({
    type, eyebrow: 'Etapa ' + index, title: 'Título aprovado ' + index,
    body: 'Parágrafo aprovado ' + index + '\nSegundo parágrafo.',
    bullets: Array.from({ length: 7 }, (_, n) => 'Item aprovado ' + index + '-' + n),
  })),
};
test('briefing: campos essenciais e orçamento desconhecido', () => {
  assert.equal(workflow.isBriefing(brief), true);
  assert.equal(workflow.briefApprovalError(brief), null);
  assert.ok(workflow.briefApprovalError({ ...brief, problem: '' }));
  assert.ok(workflow.briefApprovalError({ ...brief, objectives: [' '] }));
  assert.equal(workflow.isBriefing({ ...brief, budget: -1 }), false);
  assert.equal(workflow.isBriefing({ ...brief, budget: Infinity }), false);
});
test('copy: exige texto integral, capa, investimento único e encerramento', () => {
  assert.equal(workflow.copyApprovalError(copy), null);
  assert.equal(workflow.isProposalCopy({ ...copy, slides: copy.slides.slice(1) }), false);
  assert.equal(workflow.isProposalCopy({ ...copy, slides: copy.slides.map((s, i) => i === 2 ? { ...s, type: 'investment' } : s) }), false);
  assert.equal(workflow.isProposalCopy({ ...copy, slides: copy.slides.map((s, i) => i === 2 ? { ...s, type: 'unknown' } : s) }), false);
  assert.ok(workflow.copyApprovalError({ ...copy, slides: copy.slides.map((s, i) => i === 2 ? { ...s, body: ' ' } : s) }));
});

function serviceMocks(key) {
  const env = key ? { OPENAI_API_KEY: 'test-only-key' } : {};
  const writes = [];
  const db = { prepare(sql) {
    return { bind(...args) {
      return {
        first: async () => sql.includes('agent_profiles') ? { status: 'configured', businessName: 'Marca de teste', servicesJson: '[]' } : { count: 4 },
        all: async () => ({ results: [] }),
        run: async () => { writes.push({ sql, args }); return { meta: { last_row_id: 77 } }; },
      };
    } };
  } };
  return { writes, modules: {
    'cloudflare:workers': { env },
    '@/lib/file-store': load('lib/file-store.ts', { 'cloudflare:workers': { env } }),
    '@/app/chatgpt-auth': { getChatGPTUser: async () => ({ userId: 'test-user' }) },
    '@/db': { getD1: () => db },
    '@/db/workspace': { getWorkspaceForUser: async () => 'test-workspace' },
    '@/lib/proposal-workflow': workflow,
  } };
}
const request = payload => new Request('http://localhost/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
test('agente: não pula briefing e não simula IA desconectada', async () => {
  const { POST } = load('app/api/agent/generate/route.ts', serviceMocks(false).modules);
  assert.equal((await POST(request({ description: 'Contexto bastante detalhado do cliente e do seu projeto.' }))).status, 400);
  assert.equal((await POST(request({ phase: 'copy', briefing: brief }))).status, 409);
  assert.equal((await POST(request({ phase: 'copy', briefing: brief, briefingApproved: true }))).status, 503);
  const result = await POST(request({ phase: 'briefing', description: 'Contexto bastante detalhado do cliente e do seu projeto.' }));
  assert.equal(result.status, 503);
  assert.equal((await result.json()).code, 'ai_not_configured');
});
test('agente: chamadas separadas, revisão e resposta inválida', async () => {
  const { POST } = load('app/api/agent/generate/route.ts', serviceMocks(true).modules);
  const originalFetch = globalThis.fetch;
  const calls = [];
  let generated = { understanding: 'Síntese', briefing: brief, missing_questions: ['Qual o prazo?'] };
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return Response.json({ status: 'completed', output: [{ content: [{ text: JSON.stringify(generated) }] }] });
  };
  try {
    const first = await POST(request({ phase: 'briefing', description: 'Contexto bastante detalhado do cliente e do seu projeto.' }));
    assert.equal(first.status, 200);
    assert.equal((await first.json()).proposal, undefined);
    assert.equal(calls[0].text.format.name, 'client_briefing');
    assert.equal(calls[0].text.format.schema.properties.proposal, undefined);
    generated = { strategy: 'Relação problema-solução', proposal: copy };
    const second = await POST(request({ phase: 'copy', briefing: brief, briefingApproved: true, previousCopy: copy, feedback: 'Detalhe o processo' }));
    assert.equal(second.status, 200);
    assert.deepEqual((await second.json()).proposal.slides, copy.slides);
    assert.equal(calls[1].text.format.name, 'proposal_copy');
    assert.match(calls[1].input[0].content[1].text, /Detalhe o processo/);
    generated = { proposal: {} };
    assert.equal((await POST(request({ phase: 'copy', briefing: brief, briefingApproved: true }))).status, 502);
    globalThis.fetch = async () => Response.json({ status: 'incomplete' });
    assert.equal((await POST(request({ phase: 'copy', briefing: brief, briefingApproved: true }))).status, 502);
    globalThis.fetch = async () => new Response('', { status: 429 });
    assert.equal((await POST(request({ phase: 'copy', briefing: brief, briefingApproved: true }))).status, 502);
  } finally { globalThis.fetch = originalFetch; }
});
test('layout: exige ambas aprovações e salva exatamente o texto aprovado', async () => {
  const mock = serviceMocks(false);
  const { POST } = load('app/api/proposals/route.ts', mock.modules);
  const payload = { workflow: 'phased', brief, content: copy, template: 'Somus Editorial', validity: '2026-10-01' };
  assert.equal((await POST(request(payload))).status, 409);
  assert.equal((await POST(request({ ...payload, briefingApproved: true }))).status, 409);
  assert.equal(mock.writes.length, 0);
  const saved = await POST(request({ ...payload, briefingApproved: true, copyApproved: true, value: 999999 }));
  assert.equal(saved.status, 201);
  const values = mock.writes[0].args;
  assert.equal(values[4], 0);
  assert.deepEqual(JSON.parse(values[9]), brief);
  assert.deepEqual(JSON.parse(values[10]), { ...copy, budget_pending: true });
});
test('one page: preserva todo o texto aprovado nos temas anteriores e na nova coleção', () => {
  const collection = load('lib/proposal-collection.ts', { './proposal-editions': load('lib/proposal-editions.ts') });
  const collectionComponents = load('components/proposal-collection.tsx', {
    './proposal-collection.module.css': {},
  });
  const { ProposalOnePage } = load('components/proposal-onepage.tsx', {
    '@/components/proposal-artwork': { resolveProposalTemplate: template => template },
    './proposal-collection': collectionComponents,
    '@/lib/proposal-collection': collection,
    '@/lib/proposal-templates': load('lib/proposal-templates.ts', { './proposal-collection': collection }),
  });
  for (const template of ['editorial', 'noir', 'prisma', ...collection.collectionTemplates.map(item => item.value)]) {
    const html = renderToStaticMarkup(React.createElement(ProposalOnePage, { proposal: {
      code: 'TEST-001', client: 'Cliente teste', project: copy.title, template,
      content: { ...copy, budget_pending: true },
    } }));
    for (const section of copy.slides) {
      assert.ok(html.includes(section.title), template + ': título');
      assert.ok(html.includes(section.body), template + ': corpo');
      for (const bullet of section.bullets) assert.ok(html.includes(bullet), template + ': ' + bullet);
    }
    assert.ok(html.includes('A confirmar'));
    assert.ok(!html.includes('R$'));
  }
});

test('coleção: quarenta propostas completas, dez por área, com download e prévia coerentes', () => {
  const collection = load('lib/proposal-collection.ts', { './proposal-editions': load('lib/proposal-editions.ts') });
  assert.equal(collection.collectionTemplates.length, 40);
  for (const niche of ['Consultoria', 'Arquitetura', 'Marketing', 'Design']) {
    assert.equal(collection.collectionTemplates.filter(item => item.niche === niche).length, 10);
  }
  for (const template of collection.collectionTemplates) {
    const example = collection.createCollectionExample(template.value);
    const markdown = collection.collectionMarkdown(template.value);
    assert.equal(example.content.slides.length, 6);
    assert.ok(example.value > 0);
    for (const section of example.content.slides) {
      assert.ok(markdown.includes(section.title));
      for (const bullet of section.bullets) assert.ok(markdown.includes(bullet));
    }
    assert.equal(collection.getCollectionDesign(template.id), collection.getCollectionDesign(template.value));
  }
  assert.equal(collection.createCollectionExample('não existe'), undefined);
});

const imports = load('lib/imported-template.ts');
const imported = { id: '11111111-1111-4111-8111-111111111111', name: 'Modelo do cliente', niche: 'Design', template: 'Design · Beyond / Brand design', content: copy };
test('importação: limita conteúdo e remove propriedades não autorizadas', () => {
  const clean = imports.normalizeImportedTemplate({ ...imported, content: { ...copy, hero_image_url: 'javascript:alert(1)', budget_pending: false } });
  assert.equal(clean.content.hero_image_url, undefined);
  assert.equal(clean.content.budget_pending, true);
  assert.equal(imports.normalizeImportedTemplate({ ...imported, niche: 'Inválida' }), null);
  assert.equal(imports.normalizeImportedTemplate({ ...imported, content: { ...copy, slides: [] } }), null);
  assert.equal(imports.normalizeImportedTemplate({ ...imported, content: { ...copy, slides: [{ ...copy.slides[0], body: 'x'.repeat(18001) }] } }), null);
});
test('importação: rejeita upload inválido, IA ausente e mantém erros recuperáveis', async () => {
  const originalFetch = globalThis.fetch;
  let signedIn = true;
  const env = {};
  const mocks = {
    'cloudflare:workers': { env },
    '@/app/chatgpt-auth': { getChatGPTUser: async () => signedIn ? { userId: 'test' } : null },
    '@/db/workspace': { getWorkspaceForUser: async () => 'workspace-a' },
    '@/lib/imported-template': imports,
    '@/lib/proposal-collection': { collectionTemplates: [{ niche: 'Design', value: imported.template }] },
  };
  const { POST } = load('app/api/templates/import/route.ts', mocks);
  const pdf = () => new Request('http://test/api/templates/import', { method: 'POST', body: '%PDF-1.4\nexample' });
  try {
    signedIn = false; assert.equal((await POST(pdf())).status, 401);
    signedIn = true; assert.equal((await POST(pdf())).status, 503);
    env.OPENAI_API_KEY = 'test-only';
    assert.equal((await POST(new Request('http://test', { method: 'POST', body: 'not a PDF' }))).status, 400);
    assert.equal((await POST(new Request('http://test', { method: 'POST', headers: { 'content-length': String(9 * 1024 * 1024) }, body: '%PDF-' }))).status, 413);
    globalThis.fetch = async (_url, options) => {
      const sent = JSON.parse(options.body);
      assert.equal(sent.store, false); assert.match(sent.input[0].content[0].file_data, /^data:application\/pdf;base64,/);
      return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ ...copy, readable: true, warning: 'Revise a tabela', name: imported.name, niche: 'Design' }) }] }] });
    };
    const success = await POST(pdf()); assert.equal(success.status, 200);
    assert.deepEqual((await success.json()).template.content.slides, copy.slides);
    globalThis.fetch = async () => Response.json({ status: 'incomplete' }); assert.equal((await POST(pdf())).status, 422);
    globalThis.fetch = async () => new Response('', { status: 429 }); assert.equal((await POST(pdf())).status, 502);
  } finally { globalThis.fetch = originalFetch; }
});
test('templates salvos: isolamento de empresa em leitura e atualização', async () => {
  let signedIn = true; let owner = 'workspace-b'; const queries = [];
  const db = { prepare(sql) { return { bind(...args) { queries.push({ sql, args }); return { first: async () => ({ workspace: owner }), all: async () => ({ results: [] }), run: async () => ({}) }; } }; } };
  const { GET, POST } = load('app/api/templates/route.ts', {
    '@/db': { getD1: () => db }, '@/app/chatgpt-auth': { getChatGPTUser: async () => signedIn ? { userId: 'test' } : null },
    '@/db/workspace': { getWorkspaceForUser: async () => 'workspace-a' }, '@/lib/imported-template': imports,
    '@/lib/proposal-collection': { getCollectionDesign: () => ({}) },
  });
  signedIn = false; assert.equal((await GET()).status, 401); assert.equal((await POST(request(imported))).status, 401);
  signedIn = true; assert.equal((await GET()).status, 200);
  assert.match(queries[0].sql, /WHERE workspace_id = \?/); assert.deepEqual(queries[0].args, ['workspace-a']);
  assert.equal((await POST(request(imported))).status, 404);
  assert.ok(!queries.some(q => q.sql.startsWith('INSERT')));
  owner = 'workspace-a'; assert.equal((await POST(request(imported))).status, 200);
  const insert = queries.find(q => q.sql.startsWith('INSERT'));
  assert.equal(insert.args[1], 'workspace-a'); assert.match(insert.sql, /WHERE imported_templates.workspace_id = excluded.workspace_id/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import { Miniflare } from 'miniflare';

// Every model/reference call in this suite must have an explicit local fixture.
globalThis.fetch = async () => {
  throw new Error('External network is disabled in studio unit tests.');
};

const require = createRequire(import.meta.url);
function source(path) {
  return readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}
function transpile(path) {
  return ts.transpileModule(source(path), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
}
function load(path, mocks = {}) {
  const mod = { exports: {} };
  // Execute repository source only. Model HTML is never executed by this loader.
  new Function('require', 'module', 'exports', 'fetch', transpile(path))(
    (id) => (id in mocks ? mocks[id] : require(id)),
    mod,
    mod.exports,
    mocks.fetch || ((...args) => globalThis.fetch(...args)),
  );
  return mod.exports;
}
const studio = load('lib/studio.ts');
const webContent = () => ({
  title: 'Site e campanhas', message: 'Proposta organizada.', client: 'Clínica Aurora',
  objective: 'Aumentar os agendamentos de consultas.', timeline: '30 dias: entrega do site',
  terms: '50% na entrada, saldo na entrega.', exclusions: 'Verba de mídia não inclusa.',
  validity: '15 dias', months: 6, discountPercent: 0, design: 'contrast', accent: '#175bd2',
  serif: false, coverId: '', missing_information: [],
  services: [
    { title: 'Site', description: 'Página de serviços\nFormulário de contato', quantity: 1, unitCents: 400000, billing: 'once' },
    { title: 'Gestão de tráfego', description: '4 campanhas\nRelatório mensal', quantity: 1, unitCents: 250000, billing: 'monthly' },
  ],
});

test('instant local creation builds a proposal without an AI request', async () => {
  const f = fixture();
  try {
    const { project } = await (
      await f.create({ briefing: 'Proposta para Clínica Aurora.' })
    ).json();
    const response = await f.messages.POST(
      request({
        message:
          'Gestão de tráfego por R$ 2.500 por mês e site por R$ 4.000, pagamento único. Objetivo: aumentar agendamentos.',
        revision: 0,
        quality: 'local',
      }),
      context(project.id),
    );
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.match(result.project.html, /Clínica Aurora/);
    assert.match(result.project.html, /Gestão de tráfego/);
    assert.equal(result.project.aiUsage.calls, 0);
    assert.equal(
      f.sqlite.prepare('SELECT COUNT(*) AS n FROM studio_ai_requests').get().n,
      0,
    );
  } finally {
    f.sqlite.close();
  }
});

test('web creation uses one compact content call, local layout and a smaller reservation', async () => {
  const f = fixture({ web: true });
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return Response.json({ status: 'completed', output_text: JSON.stringify(webContent()),
      usage: { input_tokens: 1200, output_tokens: 650 } });
  };
  try {
    const { project } = await (await f.create({ briefing: 'Proposta para Clínica Aurora.' })).json();
    const response = await f.messages.POST(request({ message: 'Criar site e campanhas.', revision: 0 }), context(project.id));
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].text.format.name, 'studio_web');
    assert.equal(calls[0].text.format.schema.properties.html, undefined);
    assert.equal(calls[0].model, 'gpt-5-mini');
    assert.equal(calls[0].max_output_tokens, 6000);
    assert.match(result.project.html, /<h1>Clínica Aurora<\/h1>/);
    assert.match(result.project.html, /19\.000,00/);
    assert.match(result.project.html, /Verba de mídia não inclusa/);
    assert.match(result.project.html, /studio-asset:web-cover/);
    assert.equal(result.versions.length, 1);
    assert.equal(result.project.aiUsage.calls, 1);
    assert.equal(studioEconomy.studioWebSpendLimit, 0.02);
    assert.equal(f.sqlite.prepare('SELECT reserved_usd FROM studio_ai_requests').get().reserved_usd, 0.02);
  } finally { globalThis.fetch = previous; f.sqlite.close(); }
});

test('web output validation rejects invented image IDs, bad money and blank services without paid repair', async () => {
  for (const patch of [
    { coverId: 'not-a-real-asset' },
    { services: [] },
    { services: [{ ...webContent().services[0], unitCents: -1 }] },
    { accent: 'red;url(https://example.com)' },
  ]) {
    assert.throws(() => studioWeb.parseStudioWeb(JSON.stringify({ ...webContent(), ...patch }), null, []));
  }
  const f = fixture({ web: true });
  const previous = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => {
    count++;
    return Response.json({ status: 'completed', output_text: JSON.stringify({ ...webContent(), services: [] }),
      usage: { input_tokens: 100, output_tokens: 100 } });
  };
  try {
    const { project } = await (await f.create()).json();
    const response = await f.messages.POST(request({ message: 'Crie a proposta.', revision: 0 }), context(project.id));
    assert.equal(response.status, 422);
    assert.equal(count, 1);
    assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM studio_versions').get().n, 0);
    assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM studio_ai_requests').get().n, 1);
  } finally { globalThis.fetch = previous; f.sqlite.close(); }
});

test('reference-led, premium, existing and explicitly templated proposals keep their requested creation path', () => {
  assert.equal(studioWeb.useStudioWeb('create', 'economy', false, 'none', false), true);
  for (const args of [
    ['create', 'economy', false, 'none', true],
    ['create', 'premium', false, 'none', false],
    ['create', 'economy', true, 'none', false],
    ['create', 'economy', false, 'performance', false],
    ['patch', 'economy', true, 'none', false],
    ['chat', 'economy', false, 'none', false],
  ]) assert.equal(studioWeb.useStudioWeb(...args), false);
});
const studioTemplates = load('lib/studio-templates.ts');
const studioDesign = load('lib/studio-design.ts', { '@/lib/studio': studio });
const studioStream = load('lib/studio-stream.ts');
const studioEconomy = load('lib/studio-economy.ts', { '@/lib/studio': studio });
const studioPatches = load('lib/studio-patches.ts', { '@/lib/studio': studio });
const zero = load('lib/zero-proposal.ts', {
  './zero-proposal-styles': load('lib/zero-proposal-styles.ts'),
});
const zeroCompose = load('lib/zero-compose.ts', {
  './zero-proposal': zero,
});
const studioLocal = load('lib/studio-local.ts', {
  './studio': studio,
  './zero-compose': zeroCompose,
  './zero-proposal': zero,
});
const studioWeb = load('lib/studio-web.ts', {
  './zero-proposal': zero,
  './studio': studio,
  './studio-web-covers': { studioWebCovers: Object.fromEntries(zero.zeroCovers.map((c) => [c.url, 'data:image/webp;base64,YQ=='])) },
});
const html =
  '<!doctype html><html><head><style>body{color:#123}</style></head><body><h1>Proposta teste</h1><p>Escopo confirmado</p></body></html>';
const request = (payload, method = 'POST') =>
  new Request('http://localhost/api/studio/test', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
const context = (id) => ({ params: Promise.resolve({ id }) });

function fixture({ web = false } = {}) {
  const pipeline = {
    requests: [],
    design: {
      summary: 'Proposta de teste',
      client: 'Cliente teste',
      requirements: [],
      sections: [
        {
          id: 'escopo',
          title: 'Escopo',
          composition: 'Grade editorial',
          requirements: [],
        },
      ],
      visual: {
        direction: 'Editorial',
        palette: ['#10a090'],
        typography: 'Arial',
        referenceTraits: [],
      },
      missing: [],
    },
    audit: { issues: [], covered: [], referenceAssessment: '' },
  };
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync(new URL('../drizzle/', import.meta.url))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sqlite.exec(source('drizzle/' + file));
  sqlite.exec(
    "INSERT INTO workspaces VALUES ('one', 'One', 'one', 1), ('two', 'Two', 'two', 1)",
  );
  let user = { userId: 'one', email: 'one@example.com' };
  const d1 = {
    prepare(sql) {
      function statement(args = []) {
        return {
          bind: (...values) => statement(values),
          first: async () => sqlite.prepare(sql).get(...args) || null,
          all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
          run: async () => {
            const result = sqlite.prepare(sql).run(...args);
            return {
              success: true,
              meta: {
                changes: Number(result.changes),
                last_row_id: Number(result.lastInsertRowid),
              },
            };
          },
        };
      }
      return statement();
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  const files = new Map();
  const env = {
    STUDIO_WEB_PROPOSALS: web ? 'true' : 'false',
    OPENAI_API_KEY: 'test-key-never-sent',
    FILES: {
      put: async (key, bytes) => {
        files.set(
          key,
          typeof bytes === 'string'
            ? new TextEncoder().encode(bytes).buffer
            : bytes,
        );
      },
      get: async (key) =>
        files.has(key) ? { arrayBuffer: async () => files.get(key) } : null,
      delete: async (key) => {
        files.delete(key);
      },
    },
  };
  const modules = {
    fetch: async (url, options) => {
      if (String(url) === 'https://api.openai.com/v1/responses') {
        const body = JSON.parse(options.body);
        const name = body.text?.format?.name;
        if (name === 'studio_design' || name === 'studio_audit') {
          pipeline.requests.push(body);
          const result =
            name === 'studio_design'
              ? typeof pipeline.design === 'function'
                ? pipeline.design(body)
                : pipeline.design
              : typeof pipeline.audit === 'function'
                ? pipeline.audit(body)
                : pipeline.audit;
          return Response.json({
            status: 'completed',
            output_text: JSON.stringify(result),
          });
        }
      }
      return globalThis.fetch(url, options);
    },
    'cloudflare:workers': { env },
    '@/db': { getD1: () => d1 },
    '@/lib/studio': studio,
    '@/lib/studio-design': studioDesign,
    '@/lib/studio-stream': studioStream,
    '@/lib/studio-economy': studioEconomy,
    '@/lib/studio-local': studioLocal,
    '@/lib/studio-patches': studioPatches,
    '@/lib/studio-templates': studioTemplates,
    '@/lib/studio-web': studioWeb,
    '@/lib/studio-media': {
      prepareStudioMedia: async (
        _db,
        _bucket,
        _workspace,
        _reference,
        value,
      ) => ({ assets: [], currentHtml: value, warnings: [] }),
      embedStudioMedia: async (value) => ({
        html: value,
        used: [],
        unresolved: [],
      }),
    },
    '@/lib/studio-review': {
      reviewStudioHtml: async () => ({
        headings: ['Proposta teste'],
        imageCount: 0,
        issues: [],
      }),
    },
    '@/lib/studio-reference': {
      readStudioReference: async (url) => {
        const response = await fetch(url);
        if (!response.ok)
          throw new studio.StudioError(
            'A referência não está pública.',
            422,
            'reference_unavailable',
          );
        return {
          url,
          title: 'Modelo de proposta',
          method: 'html',
          text: await response.text(),
          structure: 'h1,section,h2',
          styles: ':root{--accent:#10a090}',
        };
      },
    },
    '@/app/chatgpt-auth': { getChatGPTUser: async () => user },
    '@/db/workspace': { getWorkspaceForUser: async (user) => user.userId },
    '@/lib/studio-html': {
      sanitizeStudioHtml: async (value) => value,
      ensureStudioLogo: async (value, id) =>
        value.includes('studio-asset:' + id)
          ? value
          : value.replace('<body>', `<body><img src="studio-asset:${id}">`),
      editStudioHtml: async (value, edit) =>
        value.replace('Proposta teste', edit.text),
    },
  };
  modules['@/lib/file-store'] = load('lib/file-store.ts', { 'cloudflare:workers': { env } });
  modules['@/db/studio-usage'] = load('db/studio-usage.ts', modules);
  const database = load('db/studio.ts', modules);
  modules['@/db/studio'] = database;
  const collection = load('app/api/studio/route.ts', modules);
  const item = load('app/api/studio/[id]/route.ts', modules);
  const messages = load('app/api/studio/[id]/message/route.ts', modules);
  async function create(values = {}) {
    const form = new FormData();
    form.set('mode', 'free');
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    return collection.POST(
      new Request('http://localhost/api/studio', {
        method: 'POST',
        body: form,
      }),
    );
  }
  return {
    pipeline,
    modules,
    sqlite,
    d1,
    database,
    env,
    files,
    collection,
    item,
    messages,
    create,
    setUser: (value) => {
      user = value;
    },
  };
}

test('validates references, user messages and complete model documents', () => {
  assert.equal(studio.referenceUrl(''), '');
  assert.equal(
    studio.referenceUrl('https://example.com/proposal#top'),
    'https://example.com/proposal#top',
  );
  for (const url of [
    'http://example.com',
    'https://localhost',
    'https://127.1',
    'https://[::1]',
    'https://host.internal',
    'https://user:password@example.com',
  ])
    assert.throws(() => studio.referenceUrl(url));
  assert.throws(() => studio.studioInput({ message: ' ', revision: 0 }));
  assert.throws(() =>
    studio.studioInput({ message: 'Mude a cor', revision: -1 }),
  );
  assert.equal(
    studio.parseStudioOutput(
      JSON.stringify({
        message: 'Pronta',
        title: 'Teste',
        html,
        reference_status: 'not_requested',
      }),
    ).html,
    html,
  );
  assert.throws(() =>
    studio.parseStudioOutput(
      JSON.stringify({
        message: 'Pronta',
        title: 'Teste',
        html: '<html><body>Parcial',
        reference_status: 'not_requested',
      }),
    ),
  );
  const preview = studio.studioPreviewDocument(html);
  assert.ok(
    preview.indexOf('Content-Security-Policy') <
      preview.indexOf('Proposta teste'),
  );
  assert.match(preview, /script-src 'none'/);
  assert.match(preview, /connect-src 'none'/);
});

test('accepts a complete long proposal brief while keeping a bounded request size', () => {
  const message = 'a'.repeat(studio.maxStudioMessageLength);
  assert.equal(
    studio.studioInput({ message, revision: 0 }).message.length,
    studio.maxStudioMessageLength,
  );
  assert.throws(() =>
    studio.studioInput({
      message: 'a'.repeat(studio.maxStudioMessageLength + 1),
      revision: 0,
    }),
  );
});

test('detects references in the current request and retains original long conversation facts', () => {
  assert.equal(
    studioDesign.studioMessageReference(
      'Siga este modelo: https://example.com/modelo.',
      'https://old.example.com',
    ),
    'https://example.com/modelo',
  );
  assert.equal(
    studioDesign.studioMessageReference(
      'Use [esta referência](https://example.com/modelo).',
    ),
    'https://example.com/modelo',
  );
  assert.equal(
    studioDesign.studioMessageReference(
      'Contato: https://example.com/contato',
      'https://old.example.com',
    ),
    'https://old.example.com/',
  );
  assert.throws(() =>
    studioDesign.studioMessageReference('https://127.0.0.1/secret'),
  );
  const original = {
    role: 'user',
    text: 'Briefing completo '.repeat(1000) + 'Honorários: R$ 7.350.',
    at: 1,
  };
  const messages = [
    original,
    ...Array.from({ length: 20 }, (_, i) => ({
      role: 'user',
      text: `Ajuste ${i}`,
      at: i + 2,
    })),
  ];
  const result = studioDesign.studioConversation(messages);
  assert.equal(result[0].text, original.text);
  assert.equal(result.at(-1).text, 'Ajuste 19');
  assert.equal(
    studioDesign.studioCreativeRequest(
      'Está muito genérico, reconstrua.',
      true,
      '',
      false,
    ),
    true,
  );
  assert.equal(
    studioDesign.studioCreativeRequest(
      'Mude só este título.',
      true,
      'h1',
      false,
    ),
    false,
  );
});

test('reads streamed progress across split UTF-8 chunks and refuses incomplete or failed streams', async () => {
  const events = [
    { type: 'progress', stage: 'reading' },
    { type: 'progress', stage: 'reviewing' },
    { type: 'complete', result: { title: 'Proposta de consultoria e gestão' } },
  ];
  const bytes = new TextEncoder().encode(
    events.map((x) => JSON.stringify(x)).join('\n') + '\n',
  );
  const stages = [];
  const response = new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 7)
          controller.enqueue(bytes.slice(i, i + 7));
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'application/x-ndjson' } },
  );
  assert.deepEqual(
    await studioStream.readStudioStream(response, (stage) =>
      stages.push(stage),
    ),
    events[2].result,
  );
  assert.deepEqual(stages, ['reading', 'reviewing']);
  for (const body of [
    '{"type":"progress","stage":"reading"}\n',
    '{"type":"error","error":"Falha na revisão"}\n',
  ])
    await assert.rejects(() =>
      studioStream.readStudioStream(
        new Response(body, {
          headers: { 'Content-Type': 'application/x-ndjson' },
        }),
        () => {},
      ),
    );
});

test('full briefing and inline reference reach all stages, and the reference is persisted with the version', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    if (String(url) === 'https://example.com/modelo')
      return new Response('Referência real');
    calls.push(JSON.parse(options.body));
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify({
        title: 'Teste',
        message: 'Proposta criada.',
        html,
        reference_status: 'used',
      }),
    });
  };
  try {
    const briefing =
      'Contexto do cliente. '.repeat(900) +
      'Condição intermediária: mídia não inclusa. ' +
      'Escopo completo. '.repeat(900);
    const { project } = await (await f.create({ briefing })).json();
    const response = await f.messages.POST(
      request({
        message: 'Siga este modelo: https://example.com/modelo',
        revision: 0,
      }),
      context(project.id),
    );
    assert.equal(
      response.status,
      200,
      JSON.stringify(await response.clone().json()),
    );
    const result = await response.json();
    assert.equal(result.project.referenceUrl, 'https://example.com/modelo');
    for (const call of [...calls, ...f.pipeline.requests]) {
      const content = JSON.parse(call.input[0].content[0].text);
      assert.equal(content.briefing, briefing.trim());
      assert.equal(content.referenceDocument.url, 'https://example.com/modelo');
    }
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('economical custom HTML call receives all commercial conditions and records measured usage', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  const calls = [];
  const condition = 'R$ 4.800 por mês. Verba de mídia não inclusa.';
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return Response.json({
      status: 'completed',
      usage: {
        input_tokens: 2000,
        output_tokens: 500,
        input_tokens_details: { cached_tokens: 1000 },
      },
      output_text: JSON.stringify({
        title: 'Teste',
        message: 'Proposta criada.',
        html: html.replace('</body>', '<p>' + condition + '</p></body>'),
        reference_status: 'not_requested',
      }),
    });
  };
  try {
    const { project } = await (await f.create({ briefing: condition })).json();
    const response = await f.messages.POST(
      request({ message: 'Crie a proposta completa.', revision: 0 }),
      context(project.id),
    );
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(calls.length, 1);
    assert.equal(f.pipeline.requests.length, 0);
    assert.equal(calls[0].model, 'gpt-5-mini');
    assert.equal(
      JSON.parse(calls[0].input[0].content[0].text).briefing,
      condition,
    );
    assert.ok(result.project.html.includes(condition));
    assert.equal(result.versions.length, 1);
    assert.equal(result.project.aiUsage.calls, 1);
    assert.equal(result.project.aiUsage.estimatedUsd, 0.001275);
    assert.equal(result.project.messages.at(-1).usage.cachedTokens, 1000);
    assert.equal(
      f.sqlite.prepare('SELECT status FROM studio_ai_requests').get().status,
      'completed',
    );
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('an empty creation never triggers a paid retry and preserves the saved proposal', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => {
    count++;
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify({
        title: 'Teste',
        message: 'Vou criar sua proposta.',
        html: '',
        reference_status: 'not_requested',
      }),
    });
  };
  try {
    const { project } = await (await f.create()).json();
    const response = await f.messages.POST(
      request({ message: 'Crie a proposta completa.', revision: 0 }),
      context(project.id),
    );
    assert.equal(response.status, 422);
    assert.equal((await response.json()).code, 'proposal_empty');
    assert.equal(count, 1);
    const row = await f.database.studioProject(project.id, 'one');
    assert.equal(row.revision, 0);
    assert.equal(row.messagesJson, '[]');
    assert.equal(row.lockToken, '');
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('streaming reports actual stages and only completes after the saved version exists', async () => {
  const f = fixture();
  let releaseGeneration;
  const generationGate = new Promise((resolve) => {
    releaseGeneration = resolve;
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    await generationGate;
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify({
        title: 'Teste',
        message: 'Proposta criada.',
        html,
        reference_status: 'not_requested',
      }),
    });
  };
  try {
    const { project } = await (await f.create()).json();
    const outgoing = request({ message: 'Crie a proposta.', revision: 0 });
    outgoing.headers.set('Accept', 'text/event-stream');
    const response = await f.messages.POST(outgoing, context(project.id));
    const reader = response.body.getReader();
    const first = await reader.read();
    assert.match(new TextDecoder().decode(first.value), /"type":"connected"/);
    assert.equal(
      (await f.database.studioProject(project.id, 'one')).revision,
      0,
    );
    reader.releaseLock();
    releaseGeneration();
    const stages = [];
    const result = await studioStream.readStudioStream(response, (stage) =>
      stages.push(stage),
    );
    assert.deepEqual(stages, ['reading', 'generating', 'reviewing', 'saving']);
    assert.equal(result.project.revision, 1);
    assert.equal(
      (await f.database.studioProject(project.id, 'one')).lockToken,
      '',
    );
  } finally {
    releaseGeneration();
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('patches preserve original markup and reject conflicting, destructive or unsafe edits', () => {
  const source =
    '<html><head><style>body{color:red}</style></head><body><section id="scope"><h1>Ateliê &amp; Cia</h1><p>R$ 4.800</p><p><b>6</b> meses</p><img src="studio-asset:logo"></section></body></html>';
  const map = studioPatches.studioDocumentMap(source);
  const price = map.outline.find((n) => n.text === 'R$ 4.800');
  const apply = (changes) =>
    studioPatches.applyStudioPatches(
      map,
      JSON.stringify({
        title: 'Teste',
        message: 'Atualizada',
        changes,
        missing_information: [],
      }),
    );
  const changed = apply([
    { index: price.index, operation: 'text', value: 'R$ 5.000 <à vista>' },
  ]);
  assert.equal(
    changed.html,
    source.replace('R$ 4.800', 'R$ 5.000 &lt;à vista&gt;'),
  );
  assert.equal(apply([]).html, '');
  assert.throws(() =>
    apply([
      {
        index: price.index,
        operation: 'replace',
        value: '<script>alert(1)</script>',
      },
    ]),
  );
  assert.throws(() =>
    apply([
      {
        index: price.index,
        operation: 'replace',
        value: '<img src="https://example.com/tracker">',
      },
    ]),
  );
  assert.throws(() =>
    apply([
      {
        index: price.index,
        operation: 'style',
        value: 'background:url(https://example.com)',
      },
    ]),
  );
  assert.throws(() =>
    apply([
      { index: 0, operation: 'remove', value: '' },
      { index: price.index, operation: 'text', value: '0' },
    ]),
  );
  assert.throws(() => apply([{ index: 900, operation: 'text', value: '0' }]));
  assert.throws(() =>
    apply([
      { index: price.index, operation: 'text', value: '0' },
      { index: price.index, operation: 'text', value: '1' },
    ]),
  );
  const nested = map.outline.find((n) => n.tag === 'p' && n.text === 'meses');
  assert.throws(() =>
    apply([{ index: nested.index, operation: 'text', value: '1 mês' }]),
  );
  assert.match(
    apply([{ index: price.index, operation: 'style', value: 'color:#123456' }])
      .html,
    /color:#123456/,
  );
});

test('audit separates absent information from supplied requirements and rejects invented evidence', () => {
  const design = {
    requirements: [
      {
        id: 'r01',
        content: 'Validade de 15 dias',
        evidence: 'Validade de 15 dias',
      },
      {
        id: 'r02',
        content: 'Honorários de R$ 4.800 por mês',
        evidence: 'Honorários de R$ 4.800 por mês',
      },
    ],
  };
  const finding = (kind, extra = {}) => ({
    kind,
    requirementId: '',
    sourceQuote: '',
    proposalQuote: '',
    correction: '',
    ...extra,
  });
  const evidence = {
    facts: [
      'Validade de 15 dias. Honorários de R$ 4.800 por mês. Criação de site não inclusa.',
    ],
    proposal:
      '<style>.scope{display:grid}</style><p>Validade de 15 dias. Retorno garantido em 30 dias.</p>',
    reference: '.scope{display:flex}',
  };
  const issues = [
    finding('missing_information', {
      correction: 'Data de emissão não informada.',
    }),
    finding('missing_information', {
      correction: 'Contato do cliente não informado.',
    }),
    finding('requirement', {
      requirementId: 'r01',
      sourceQuote: 'Validade de 15 dias',
      correction: 'Adicionar data de emissão e responsável operacional.',
    }),
    finding('requirement', {
      sourceQuote: 'Contato do cliente obrigatório',
      correction: 'Adicionar telefone.',
    }),
    finding('requirement', {
      sourceQuote: 'Criação de site não inclusa.',
      correction: 'Adicionar também assinatura e data.',
    }),
    finding('unsupported_content', {
      proposalQuote: 'Retorno garantido em 30 dias.',
      correction: 'Inventar outro resultado.',
    }),
    finding('unsupported_content', {
      proposalQuote: 'Validade de 15 dias',
      correction: 'Remover a validade.',
    }),
    finding('layout', {
      proposalQuote: 'Conteúdo que não existe na página',
      correction: 'Adicionar contatos.',
    }),
    finding('reference_visual', {
      sourceQuote: '.scope{display:flex}',
      proposalQuote: '.scope{display:grid}',
      correction: 'Preservar a organização flex da referência.',
    }),
    finding('reference_visual', {
      sourceQuote: 'referência inventada',
      proposalQuote: '.scope{display:grid}',
      correction: 'Usar outra marca.',
    }),
  ];
  const parsed = studioDesign.parseStudioAudit(
    JSON.stringify({
      issues,
      covered: ['r01'],
      referenceAssessment: 'Contraste preservado',
    }),
    design,
    evidence,
  );
  assert.deepEqual(parsed.missing, [
    'Data de emissão não informada.',
    'Contato do cliente não informado.',
  ]);
  assert.equal(parsed.issues.length, 4);
  assert.match(parsed.issues.join(' '), /r02|4\.800/);
  assert.match(parsed.issues.join(' '), /Criação de site não inclusa/);
  assert.match(
    parsed.issues.join(' '),
    /Remova esta afirmação sem fonte: Retorno garantido/,
  );
  assert.match(parsed.issues.join(' '), /organização flex/);
  assert.doesNotMatch(
    parsed.issues.join(' '),
    /data de emissão|responsável|telefone|assinatura|outro resultado|outra marca/,
  );
  assert.throws(
    () =>
      studioDesign.parseStudioAudit(
        JSON.stringify({
          issues: ['Adicionar contato'],
          covered: [],
          referenceAssessment: '',
        }),
        design,
      ),
    /revisão/,
  );
});

test('missing client contacts and dates do not trigger another paid generation or block saving', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  let generated = 0;
  f.pipeline.audit.issues = [
    'Data de emissão',
    'Contato do cliente',
    'Responsável operacional',
  ].map((field) => ({
    kind: 'missing_information',
    requirementId: '',
    sourceQuote: '',
    proposalQuote: '',
    correction: field + ' não informado.',
  }));
  globalThis.fetch = async () => {
    generated++;
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify({
        title: 'Teste',
        message: 'Criada',
        html,
        reference_status: 'not_requested',
      }),
    });
  };
  try {
    const { project } = await (await f.create({ templateId: 'none' })).json();
    const response = await f.messages.POST(
      request({ message: 'Crie a proposta.', revision: 0 }),
      context(project.id),
    );
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.equal(result.project.revision, 1);
    assert.equal(generated, 1);
    assert.equal(
      f.pipeline.requests.filter((r) => r.text.format.name === 'studio_audit')
        .length,
      0,
    );
    assert.equal(result.project.messages.at(-1).review.missing.length, 0);
    assert.equal(
      (await f.database.studioProject(project.id, 'one')).lockToken,
      '',
    );
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('both creation modes persist, enforce briefing, accept text and PDF, and isolate workspaces', async () => {
  const f = fixture();
  try {
    assert.equal((await f.create({ mode: 'briefing' })).status, 400);
    assert.equal(
      (await f.create({ mode: 'free', referenceUrl: 'http://localhost' }))
        .status,
      400,
    );
    const free = await f.create();
    assert.equal(free.status, 201);
    const { project } = await free.json();
    assert.equal(project.mode, 'free');
    assert.equal(
      (
        await f.create({
          mode: 'briefing',
          file: new File(['Contexto real do cliente'], 'briefing.txt'),
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await f.create({
          mode: 'briefing',
          file: new File(['invalid'], 'briefing.pdf'),
        })
      ).status,
      400,
    );
    const pdf = await f.create({
      mode: 'briefing',
      file: new File(['%PDF-1.7\nfixture'], 'briefing.pdf'),
    });
    assert.equal(pdf.status, 201);
    assert.equal(f.files.size, 1);
    const listed = await (await f.collection.GET()).json();
    assert.equal(listed.projects.length, 3);
    const loaded = await (
      await f.item.GET(
        new Request('http://localhost/test'),
        context(project.id),
      )
    ).json();
    assert.deepEqual(loaded.project.messages, []);
    assert.equal(loaded.project.fileKey, undefined);
    assert.equal(loaded.project.workspaceId, undefined);
    f.setUser({ userId: 'two', email: 'two@example.com' });
    assert.equal((await f.collection.GET()).status, 200);
    assert.equal((await (await f.collection.GET()).json()).projects.length, 0);
    assert.equal(
      (
        await f.item.GET(
          new Request('http://localhost/test'),
          context(project.id),
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await f.messages.POST(
          request({ message: 'Alterar', revision: 0 }),
          context(project.id),
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await f.item.PATCH(
          request({ restore: 1, revision: 0 }, 'PATCH'),
          context(project.id),
        )
      ).status,
      404,
    );
    f.setUser(null);
    assert.equal((await f.collection.GET()).status, 401);
  } finally {
    f.sqlite.close();
  }
});

test('disconnected AI never fabricates a result or loses the saved briefing', async () => {
  const f = fixture();
  try {
    const { project } = await (
      await f.create({ mode: 'briefing', briefing: 'Escopo confirmado' })
    ).json();
    delete f.env.OPENAI_API_KEY;
    const response = await f.messages.POST(
      request({ message: 'Criar a proposta', revision: 0 }),
      context(project.id),
    );
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'ai_not_configured');
    const stored = await f.database.studioProject(project.id, 'one');
    assert.equal(stored.briefing, 'Escopo confirmado');
    assert.equal(stored.revision, 0);
    assert.equal(stored.lockedUntil, 0);
  } finally {
    f.sqlite.close();
  }
});

test('explicit templates keep their visual with one content call and no paid audit', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (_url, options) => {
    sent = JSON.parse(options.body);
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify({
        title: 'Proposta de performance',
        message: 'Primeira versao pronta.',
        headline: 'Crescimento com foco em resultado.',
        summary: 'Uma proposta objetiva para acelerar a operacao.',
        objective: 'Organizar a estrategia e a execucao comercial.',
        scope: [
          'Diagnostico do funil',
          'Plano de midia',
          'Rotina de otimizacao',
        ],
        method: ['Imersao', 'Plano de acao', 'Acompanhamento'],
        timeline: ['Semana 1: diagnostico', 'Semanas 2 a 4: execucao'],
        investment: 'Investimento a definir conforme o escopo final.',
        next_steps: ['Validar o escopo', 'Definir inicio'],
        missing_information: ['Investimento mensal'],
        reference_status: 'not_requested',
      }),
    });
  };
  try {
    const { project } = await (
      await f.create({ templateId: 'performance', briefing: 'Cliente teste' })
    ).json();
    const response = await f.messages.POST(
      request({ message: 'Crie a proposta.', revision: 0 }),
      context(project.id),
    );
    assert.equal(response.status, 200);
    assert.equal(sent.model, 'gpt-5-mini');
    assert.equal(sent.text.format.name, 'studio_template');
    assert.deepEqual(
      f.pipeline.requests.map((r) => r.text.format.name),
      [],
    );
    const result = await response.json();
    assert.match(result.project.html, /Crescimento com foco em resultado/);
    assert.match(result.project.html, /#0f9d72/);
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('conversation edits use existing HTML, restore adds history, stale edits and failures preserve current version', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  const calls = [];
  let generated = {
    title: 'Proposta teste',
    message: 'Primeira versão criada.',
    html,
    reference_status: 'not_requested',
  };
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return Response.json({
      status: 'completed',
      output: [
        { content: [{ type: 'output_text', text: JSON.stringify(generated) }] },
      ],
    });
  };
  try {
    const { project } = await (await f.create()).json();
    const first = await f.messages.POST(
      request({ message: 'Crie a proposta.', revision: 0 }),
      context(project.id),
    );
    assert.equal(first.status, 200);
    const v1 = await first.json();
    assert.equal(calls[0].model, 'gpt-5-mini');
    assert.equal(v1.project.revision, 1);
    assert.equal(v1.versions.length, 1);
    assert.equal(v1.project.messages.length, 2);
    generated = {
      ...generated,
      message: 'Cor ajustada.',
      html: html.replace('#123', '#0b6fe8'),
      changes: [{ index: 0, operation: 'style', value: 'color:#0b6fe8' }],
      missing_information: [],
    };
    assert.equal(
      (
        await f.messages.POST(
          request({ message: 'Troque a cor para azul.', revision: 1 }),
          context(project.id),
        )
      ).status,
      200,
    );
    const modelInput = JSON.parse(calls[1].input[0].content[0].text);
    assert.equal(modelInput.currentHtml, undefined);
    assert.ok(modelInput.documentMap.some((n) => n.text === 'Proposta teste'));
    assert.equal(modelInput.recentConversation.length, 2);
    assert.equal(
      (
        await f.messages.POST(
          request({ message: 'Alteração desatualizada', revision: 1 }),
          context(project.id),
        )
      ).status,
      409,
    );
    assert.equal(calls.length, 2);
    const restored = await f.item.PATCH(
      request({ restore: 1, revision: 2 }, 'PATCH'),
      context(project.id),
    );
    assert.equal(restored.status, 200);
    const v3 = await restored.json();
    assert.equal(v3.project.revision, 3);
    assert.equal(v3.project.html, html);
    assert.equal(v3.versions.length, 3);
    generated = {
      ...generated,
      html: '',
      message: 'O prazo continua a confirmar.',
    };
    assert.equal(
      (
        await f.messages.POST(
          request({ message: 'Qual o prazo?', revision: 3 }),
          context(project.id),
        )
      ).status,
      200,
    );
    assert.equal(
      (await f.database.studioProject(project.id, 'one')).revision,
      3,
    );
    globalThis.fetch = async () => Response.json({ status: 'incomplete' });
    assert.equal(
      (
        await f.messages.POST(
          request({ message: 'Mude o título.', revision: 3 }),
          context(project.id),
        )
      ).status,
      422,
    );
    const stored = await f.database.studioProject(project.id, 'one');
    assert.equal(stored.html, html);
    assert.equal(stored.lockedUntil, 0);
    assert.equal(stored.lockToken, '');
    const lock = await f.database.lockStudioProject(stored, 3);
    assert.equal(
      (
        await f.messages.POST(
          request({ message: 'Pedido concorrente', revision: 3 }),
          context(project.id),
        )
      ).status,
      409,
    );
    await f.database.unlockStudioProject(project.id, lock);
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('missing logo is inserted locally without image inference or another paid generation', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  const logo = {
    id: 'reference-1',
    label: 'Somus',
    kind: 'logo',
    source: 'reference',
    dataUrl: 'data:image/png;base64,aGVsbG8=',
  };
  f.modules['@/lib/studio-media'].prepareStudioMedia = async () => ({
    assets: [logo],
    currentHtml: '',
    warnings: [],
  });
  f.modules['@/lib/studio-media'].embedStudioMedia = async (value) => ({
    html: value,
    used: value.includes('studio-asset:reference-1') ? [logo] : [],
    unresolved: [],
  });
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify({
        title: 'Teste',
        message: 'Criada',
        html,
        reference_status: 'not_requested',
        missing_information: ['Honorários mensais'],
      }),
    });
  };
  try {
    const { project } = await (await f.create()).json();
    const response = await f.messages.POST(
      request({ message: 'Crie a proposta com a logo.', revision: 0 }),
      context(project.id),
    );
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    const input = JSON.parse(calls[0].input[0].content[0].text);
    assert.equal(input.preferredLogoId, logo.id);
    assert.equal(input.mediaCatalog[0].dataUrl, undefined);
    assert.equal(
      calls[0].input[0].content.filter((item) => item.type === 'input_image')
        .length,
      0,
    );
    const result = await response.json();
    assert.equal(result.project.messages.at(-1).review.logo, true);
    assert.deepEqual(result.project.messages.at(-1).review.missing, [
      'Honorários mensais',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('distinguishes API billing and temporary rate limits without retrying paid requests or losing data', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  try {
    const { project } = await (await f.create()).json();
    for (const code of [
      'insufficient_quota',
      'credit_balance_exhausted',
      'project_spend_limit_exceeded',
      'rate_limit_exceeded',
    ]) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return Response.json(
          {
            error: {
              code,
              type:
                code === 'rate_limit_exceeded'
                  ? 'rate_limit_error'
                  : 'insufficient_quota',
            },
          },
          { status: 429, headers: { 'retry-after': '65' } },
        );
      };
      const response = await f.messages.POST(
        request({ message: 'Crie a proposta.', revision: 0 }),
        context(project.id),
      );
      const error = await response.json();
      assert.equal(calls, 1);
      assert.equal(response.status, code === 'rate_limit_exceeded' ? 429 : 503);
      assert.equal(
        error.code,
        code === 'rate_limit_exceeded'
          ? 'ai_rate_limited'
          : 'ai_quota_exceeded',
      );
      if (code === 'rate_limit_exceeded')
        assert.match(error.error, /65 segundos/);
      else assert.doesNotMatch(error.error, /Aguarde/);
      const row = await f.database.studioProject(project.id, 'one');
      assert.equal(row.revision, 0);
      assert.equal(row.lockToken, '');
    }
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('PDF and actual reference content reach the model without relying on web search', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, options) => {
    if (url === 'https://example.com/proposta')
      return new Response(
        'Estrutura da proposta de referência: diagnóstico, escopo e investimento.',
      );
    sent = JSON.parse(options.body);
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify({
        title: 'Teste',
        message: 'Criada a partir do briefing.',
        html,
        reference_status: 'used',
      }),
    });
  };
  try {
    const { project } = await (
      await f.create({
        mode: 'briefing',
        referenceUrl: 'https://example.com/proposta',
        file: new File(['%PDF-1.7\nfixture'], 'brief.pdf'),
      })
    ).json();
    const response = await f.messages.POST(
      request({ message: 'Crie a proposta.', revision: 0 }),
      context(project.id),
    );
    assert.equal(response.status, 200);
    assert.equal(sent.input[0].content[1].type, 'input_file');
    assert.equal(sent.tools, undefined);
    const document = JSON.parse(
      sent.input[0].content[0].text,
    ).referenceDocument;
    assert.match(document.text, /diagnóstico, escopo e investimento/);
    assert.match(document.styles, /#10a090/);
    const message = (await response.json()).project.messages.at(-1);
    assert.deepEqual(message.sources, ['https://example.com/proposta']);
    assert.equal(message.reference.title, 'Modelo de proposta');
    assert.doesNotMatch(message.text, /Não foi possível/);
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('blocked reference or model refusal preserves the page and releases the project lock', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  try {
    const { project } = await (
      await f.create({ referenceUrl: 'https://example.com/blocked' })
    ).json();
    let modelCalls = 0;
    globalThis.fetch = async (url) => {
      if (url === 'https://example.com/blocked')
        return new Response('', { status: 403 });
      modelCalls++;
      throw new Error('Should not call the model');
    };
    const failed = await f.messages.POST(
      request({ message: 'Use o modelo', revision: 0 }),
      context(project.id),
    );
    assert.equal(failed.status, 422);
    assert.equal(modelCalls, 0);
    let row = await f.database.studioProject(project.id, 'one');
    assert.equal(row.html, '');
    assert.equal(row.revision, 0);
    assert.equal(row.messagesJson, '[]');
    assert.equal(row.lockToken, '');
    globalThis.fetch = async (url) =>
      url === 'https://example.com/blocked'
        ? new Response('Modelo lido')
        : Response.json({
            status: 'completed',
            output_text: JSON.stringify({
              title: 'Teste',
              message: 'Não usei a referência.',
              html,
              reference_status: 'unavailable',
            }),
          });
    const ignored = await f.messages.POST(
      request({ message: 'Use o modelo', revision: 0 }),
      context(project.id),
    );
    assert.equal(ignored.status, 422);
    assert.equal((await ignored.json()).code, 'proposal_reference_unused');
    row = await f.database.studioProject(project.id, 'one');
    assert.equal(row.revision, 0);
    assert.equal(row.messagesJson, '[]');
    assert.equal(row.lockToken, '');
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('conversation accepts a safe image reference without storing its data', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (_url, options) => {
    sent = JSON.parse(options.body);
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify({
        title: 'Proposta visual',
        message: 'Usei a imagem como referência visual.',
        html,
        reference_status: 'not_requested',
      }),
    });
  };
  try {
    const { project } = await (await f.create()).json();
    const image = {
      name: 'referencia.png',
      mime: 'image/png',
      data: 'data:image/png;base64,aGVsbG8=',
    };
    const response = await f.messages.POST(
      request({ message: 'Use esta referência.', revision: 0, image }),
      context(project.id),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(
      sent.input[0].content.find((item) => item.type === 'input_image'),
      {
        type: 'input_image',
        image_url: image.data,
        detail: 'auto',
      },
    );
    const result = await response.json();
    assert.deepEqual(result.project.messages[0].attachment, {
      name: image.name,
      mime: image.mime,
    });
    assert.doesNotMatch(JSON.stringify(result.project.messages), /aGVsbG8=/);
    assert.equal(
      (
        await f.messages.POST(
          request({
            message: 'Imagem inválida.',
            revision: 1,
            image: { ...image, mime: 'image/svg+xml' },
          }),
          context(project.id),
        )
      ).status,
      400,
    );
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('project context can be edited without creating a version and rejects stale or cross-workspace writes', async () => {
  const f = fixture();
  try {
    const { project } = await (
      await f.create({ briefing: 'Escopo inicial' })
    ).json();
    const payload = {
      action: 'context',
      revision: 0,
      updatedAt: project.updatedAt,
      title: 'Projeto atualizado',
      briefing: 'Novo escopo',
      referenceUrl: 'https://example.com/apresentacao',
    };
    const saved = await f.item.PATCH(
      request(payload, 'PATCH'),
      context(project.id),
    );
    assert.equal(saved.status, 200);
    const result = await saved.json();
    assert.equal(result.project.referenceUrl, payload.referenceUrl);
    assert.equal(result.project.briefing, 'Novo escopo');
    assert.equal(result.project.revision, 0);
    assert.equal(result.versions.length, 0);
    assert.equal(
      (await f.item.PATCH(request(payload, 'PATCH'), context(project.id)))
        .status,
      409,
    );
    const current = { ...payload, updatedAt: result.project.updatedAt };
    assert.equal(
      (
        await f.item.PATCH(
          request({ ...current, referenceUrl: 'http://localhost/' }, 'PATCH'),
          context(project.id),
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await f.item.PATCH(
          request({ ...current, referenceUrl: '' }, 'PATCH'),
          context(project.id),
        )
      ).status,
      200,
    );
    f.setUser({ userId: 'two', email: 'two@example.com' });
    assert.equal(
      (await f.item.PATCH(request(current, 'PATCH'), context(project.id)))
        .status,
      404,
    );
  } finally {
    f.sqlite.close();
  }
});

test('planning preserves the page even if the model returns HTML, and applying the plan creates a version', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (_url, options) => {
    sent = JSON.parse(options.body);
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify({
        title: 'Plano',
        message: 'Organizar escopo, investimento e próximos passos.',
        html,
        reference_status: 'not_requested',
      }),
    });
  };
  try {
    const { project } = await (await f.create()).json();
    const planned = await f.messages.POST(
      request({ message: 'Planeje a proposta', revision: 0, intent: 'plan' }),
      context(project.id),
    );
    assert.equal(planned.status, 200);
    const plan = await planned.json();
    assert.equal(plan.project.html, '');
    assert.equal(plan.project.revision, 0);
    assert.equal(plan.versions.length, 0);
    assert.equal(plan.project.messages.at(-1).intent, 'plan');
    assert.match(sent.instructions, /Não altere a proposta/);
    const applied = await f.messages.POST(
      request({
        message: 'Aplique o plano.',
        revision: 0,
        intent: 'edit',
        selection: 'h1: Título',
      }),
      context(project.id),
    );
    assert.equal(applied.status, 200);
    assert.equal((await applied.json()).project.revision, 1);
    assert.equal(
      JSON.parse(sent.input[0].content[0].text).selectedElement,
      undefined,
    );
    assert.throws(() =>
      studio.studioInput({ message: 'x', revision: 1, intent: 'invalid' }),
    );
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('visual editing saves a restorable revision and stale context snapshots cannot acquire a lock', async () => {
  const f = fixture();
  try {
    const { project } = await (await f.create()).json();
    f.sqlite
      .prepare('UPDATE studio_projects SET html = ? WHERE id = ?')
      .run(html, project.id);
    const payload = {
      action: 'visual',
      revision: 0,
      updatedAt: project.updatedAt,
      edit: { index: 0, tag: 'h1', text: 'Novo título' },
    };
    const response = await f.item.PATCH(
      request(payload, 'PATCH'),
      context(project.id),
    );
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.project.revision, 1);
    assert.match(result.project.html, /Novo título/);
    assert.equal(result.versions.length, 1);
    assert.equal(
      (await f.item.PATCH(request(payload, 'PATCH'), context(project.id)))
        .status,
      409,
    );
    const snapshot = await f.database.studioProject(project.id, 'one');
    f.sqlite
      .prepare(
        'UPDATE studio_projects SET updated_at = updated_at + 1 WHERE id = ?',
      )
      .run(project.id);
    await assert.rejects(
      () => f.database.lockStudioProject(snapshot, 1),
      /atualizado/,
    );
  } finally {
    f.sqlite.close();
  }
});

test('visual changes escape text, preserve unrelated content and reject unsafe styles', async () => {
  const workerSource = `const exports = {}; ${transpile('lib/studio.ts')} const require = () => exports; ${transpile('lib/studio-html.ts')} addEventListener('fetch', event => event.respondWith((async () => { try { const p = await event.request.json(); return new Response(await exports.editStudioHtml(p.html, exports.studioVisualInput(p.edit))); } catch(e) { return new Response(e.message, {status: e.status || 500}); } })()));`;
  const mf = new Miniflare({
    modules: false,
    script: workerSource,
    compatibilityDate: '2026-05-15',
  });
  const edit = {
    index: 0,
    tag: 'h1',
    text: '<script>alert(1)</script> Novo título',
    color: '#ff0000',
    fontSize: 36,
    align: 'center',
  };
  try {
    const response = await mf.dispatchFetch('https://test.local', {
      method: 'POST',
      body: JSON.stringify({ html, edit }),
    });
    assert.equal(response.status, 200);
    const result = await response.text();
    assert.match(result, /&lt;script&gt;/);
    assert.match(result, /color:#ff0000 !important/);
    assert.match(result, /<p>Escopo confirmado<\/p>/);
    assert.equal(
      (
        await mf.dispatchFetch('https://test.local', {
          method: 'POST',
          body: JSON.stringify({
            html,
            edit: { ...edit, color: 'red;background:url(https://example.com)' },
          }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await mf.dispatchFetch('https://test.local', {
          method: 'POST',
          body: JSON.stringify({ html, edit: { ...edit, index: 90 } }),
        })
      ).status,
      409,
    );
  } finally {
    await mf.dispose();
  }
});

test('actual Worker HTML parser removes active content and keeps proposal styling', async () => {
  const workerSource = `const exports = {}; ${transpile('lib/studio.ts')} const require = () => exports; ${transpile('lib/studio-html.ts')} addEventListener('fetch', event => event.respondWith((async () => new Response(await exports.sanitizeStudioHtml(await event.request.text())))()));`;
  const mf = new Miniflare({
    modules: false,
    script: workerSource,
    compatibilityDate: '2026-05-15',
  });
  try {
    const dangerous =
      '<html><head><meta http-equiv="refresh" content="0;url=https://example.com"><style>h1{color:red}</style><script>alert(1)</script></head><body onload="alert(2)"><h1>Título</h1><a href="#scope">Escopo</a><a href="javascript:alert(1)" ping="https://example.com">X</a><iframe srcdoc="secret"></iframe><form action="https://example.com">Enviar</form></body></html>';
    const result = await mf.dispatchFetch('https://test.local', {
      method: 'POST',
      body: dangerous,
    });
    const clean = await result.text();
    assert.match(clean, /h1\{color:red\}/);
    assert.match(clean, /href="#scope"/);
    assert.doesNotMatch(
      clean,
      /<script|<meta|<iframe|<form|onload=|javascript:|ping=/i,
    );
  } finally {
    await mf.dispose();
  }
});

test('quoted unique replacements work without an API key and inline prices stay editable', async () => {
  const f = fixture();
  try {
    const { project } = await (await f.create()).json();
    f.sqlite
      .prepare('UPDATE studio_projects SET html = ?, revision = 1 WHERE id = ?')
      .run(html, project.id);
    delete f.env.OPENAI_API_KEY;
    const response = await f.messages.POST(
      request({
        message: 'Troque "Escopo confirmado" por "Escopo aprovado"',
        revision: 1,
      }),
      context(project.id),
    );
    assert.equal(
      response.status,
      200,
      JSON.stringify(await response.clone().json()),
    );
    const result = await response.json();
    assert.equal(
      result.project.html,
      html.replace('Escopo confirmado', 'Escopo aprovado'),
    );
    assert.equal(result.project.aiUsage.calls, 0);
    assert.equal(result.project.messages.at(-1).usage.estimatedUsd, 0);
    const map = studioPatches.studioDocumentMap(
      '<html><body><p>Preço: <strong>R$ 4.800</strong></p></body></html>',
    );
    const price = map.outline.find((n) => n.text === 'R$ 4.800');
    assert.ok(price);
    assert.equal(map.outline[0].tag, 'p');
    const changed = studioPatches.applyStudioPatches(
      map,
      JSON.stringify({
        title: 'Teste',
        message: 'Atualizada',
        missing_information: [],
        changes: [{ index: price.index, operation: 'text', value: 'R$ 5.000' }],
      }),
    );
    assert.match(changed.html, /<strong>R\$ 5.000<\/strong>/);
  } finally {
    f.sqlite.close();
  }
});

test('incomplete responses record their usage and replayed requests cannot spend again', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({
      status: 'incomplete',
      usage: { input_tokens: 1000, output_tokens: 500 },
    });
  };
  try {
    const { project } = await (await f.create()).json();
    const payload = {
      message: 'Crie a proposta.',
      revision: 0,
      requestId: 'fixed-request-0123456789',
    };
    const failed = await f.messages.POST(request(payload), context(project.id));
    assert.equal(failed.status, 422);
    const row = await f.database.studioProject(project.id, 'one');
    assert.equal(row.revision, 0);
    assert.equal(row.aiUsage.estimatedUsd, 0.00125);
    assert.equal(row.aiUsage.unconfirmed, 0);
    const replay = await f.messages.POST(request(payload), context(project.id));
    assert.equal(replay.status, 409);
    assert.equal((await replay.json()).code, 'ai_duplicate_request');
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('daily reservations cover unknown failures and are isolated by workspace', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  f.env.STUDIO_DAILY_BUDGET_USD = '0.05';
  globalThis.fetch = async () => {
    calls++;
    throw new Error('Connection lost');
  };
  try {
    const { project } = await (await f.create()).json();
    assert.equal(
      (
        await f.messages.POST(
          request({ message: 'Crie a proposta.', revision: 0 }),
          context(project.id),
        )
      ).status,
      500,
    );
    const { project: other } = await (await f.create()).json();
    const blocked = await f.messages.POST(
      request({ message: 'Crie outra proposta.', revision: 0 }),
      context(other.id),
    );
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).code, 'ai_daily_budget');
    assert.equal(calls, 1);
    assert.equal(
      (await f.database.studioProject(project.id, 'one')).aiUsage.unconfirmed,
      1,
    );
    f.setUser({ userId: 'two', email: 'two@example.com' });
    const { project: separate } = await (await f.create()).json();
    await f.messages.POST(
      request({ message: 'Crie a proposta.', revision: 0 }),
      context(separate.id),
    );
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('reference and PDF facts are cached; later edits do not resend PDFs, reference CSS or images', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  const calls = [];
  let references = 0;
  const url = 'https://example.com/model';
  globalThis.fetch = async (target, options) => {
    if (target === url) {
      references++;
      return new Response('Identidade visual do fornecedor.');
    }
    const call = JSON.parse(options.body);
    calls.push(call);
    const patch = call.text.format.name === 'studio_patch';
    return Response.json({
      status: 'completed',
      usage: { input_tokens: 1000, output_tokens: 500 },
      output_text: JSON.stringify({
        title: 'Teste',
        message: 'Atualizada',
        html,
        reference_status: 'used',
        missing_information: [],
        source_summary: patch
          ? ''
          : 'Contrato: 6 meses. Investimento: R$ 4.800. Mídia não inclusa.',
        changes: [{ index: 1, operation: 'text', value: 'Escopo atualizado' }],
      }),
    });
  };
  try {
    const { project } = await (
      await f.create({
        referenceUrl: url,
        file: new File(['%PDF-1.7 fixture'], 'brief.pdf', {
          type: 'application/pdf',
        }),
      })
    ).json();
    const first = await f.messages.POST(
      request({ message: 'Crie a proposta.', revision: 0 }),
      context(project.id),
    );
    assert.equal(first.status, 200, JSON.stringify(await first.clone().json()));
    assert.ok(calls[0].input[0].content.some((c) => c.type === 'input_file'));
    const second = await f.messages.POST(
      request({ message: 'Atualize o texto do escopo.', revision: 1 }),
      context(project.id),
    );
    assert.equal(
      second.status,
      200,
      JSON.stringify(await second.clone().json()),
    );
    const edit = calls[1].input[0].content;
    assert.equal(edit.length, 1);
    const data = JSON.parse(edit[0].text);
    assert.match(data.briefingAttachment, /Mídia não inclusa/);
    assert.equal(data.currentHtml, undefined);
    assert.equal(data.referenceDocument, undefined);
    const redraw = await f.messages.POST(
      request({ message: 'Refaça a proposta.', revision: 2 }),
      context(project.id),
    );
    assert.equal(
      redraw.status,
      200,
      JSON.stringify(await redraw.clone().json()),
    );
    assert.equal(references, 1);
    assert.equal(calls.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
    f.sqlite.close();
  }
});

test('budget checks fail before billing and premium processing requires explicit selection', () => {
  assert.equal(
    studioEconomy.studioModel('create', 'economy', {
      STUDIO_DESIGN_AI_MODEL: 'gpt-5.5',
    }),
    'gpt-5-mini',
  );
  assert.equal(studioEconomy.studioModel('create', 'premium', {}), 'gpt-5.5');
  assert.equal(studioEconomy.studioModel('chat', 'premium', {}), 'gpt-5-mini');
  assert.throws(() =>
    studioEconomy.studioModel('create', 'economy', {
      STUDIO_ECONOMY_AI_MODEL: 'unpriced',
    }),
  );
  assert.throws(() =>
    studioEconomy.studioOutputBudget(
      'gpt-5-mini',
      'create',
      'economy',
      'x'.repeat(250000),
      0,
      false,
    ),
  );
  assert.ok(
    studioEconomy.studioOutputBudget(
      'gpt-5-mini',
      'patch',
      'economy',
      'texto',
      0,
      false,
    ) <= 4000,
  );
  assert.equal(
    studioEconomy.studioTask('Troque a cor do layout', true, 'edit', false),
    'patch',
  );
  assert.equal(
    studioEconomy.studioTask('Refaça a proposta', true, 'edit', false),
    'create',
  );
  assert.equal(
    studioEconomy.studioTask('Qual o preço?', true, 'edit', false),
    'chat',
  );
});

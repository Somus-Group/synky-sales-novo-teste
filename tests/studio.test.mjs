import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import { Miniflare } from 'miniflare';

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
  new Function('require', 'module', 'exports', transpile(path))(
    (id) => (id in mocks ? mocks[id] : require(id)),
    mod,
    mod.exports,
  );
  return mod.exports;
}
const studio = load('lib/studio.ts');
const studioTemplates = load('lib/studio-templates.ts');
const html =
  '<!doctype html><html><head><style>body{color:#123}</style></head><body><h1>Proposta teste</h1><p>Escopo confirmado</p></body></html>';
const request = (payload, method = 'POST') =>
  new Request('http://localhost/api/studio/test', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
const context = (id) => ({ params: Promise.resolve({ id }) });

function fixture() {
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
    OPENAI_API_KEY: 'test-key-never-sent',
    FILES: {
      put: async (key, bytes) => {
        files.set(key, bytes);
      },
      get: async (key) =>
        files.has(key) ? { arrayBuffer: async () => files.get(key) } : null,
      delete: async (key) => {
        files.delete(key);
      },
    },
  };
  const modules = {
    'cloudflare:workers': { env },
    '@/db': { getD1: () => d1 },
    '@/lib/studio': studio,
    '@/lib/studio-templates': studioTemplates,
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
      editStudioHtml: async (value, edit) =>
        value.replace('Proposta teste', edit.text),
    },
  };
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

test('template projects use GPT-5 Mini once and render the visual locally', async () => {
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
        scope: ['Diagnostico do funil', 'Plano de midia', 'Rotina de otimizacao'],
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
    assert.equal(calls[0].model, 'gpt-5-nano');
    assert.equal(v1.project.revision, 1);
    assert.equal(v1.versions.length, 1);
    assert.equal(v1.project.messages.length, 2);
    generated = {
      ...generated,
      message: 'Cor ajustada.',
      html: html.replace('#123', '#0b6fe8'),
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
    assert.equal(modelInput.currentHtml, html);
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
      502,
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

test('missing logo triggers one repair; a complete version stores review results and a second failure preserves history', async () => {
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
  let fixed = true;
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify({
        title: 'Teste',
        message: 'Proposta revisada.',
        html:
          fixed && calls.length === 2
            ? html.replace(
                '<body>',
                '<body><img src="studio-asset:reference-1">',
              )
            : html,
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
    assert.equal(calls.length, 2);
    const input = JSON.parse(calls[0].input[0].content[0].text);
    assert.equal(input.preferredLogoId, logo.id);
    assert.equal(input.mediaCatalog[0].dataUrl, undefined);
    assert.equal(calls[0].input[0].content.at(-1).image_url, logo.dataUrl);
    assert.match(calls[1].input[0].content.at(-1).text, /Inclua a logo real/);
    const result = await response.json();
    assert.equal(result.project.messages.at(-1).review.logo, true);
    assert.deepEqual(result.project.messages.at(-1).review.missing, [
      'Honorários mensais',
    ]);
    fixed = false;
    const failed = await f.messages.POST(
      request({ message: 'Melhore a proposta.', revision: 1 }),
      context(project.id),
    );
    assert.equal(failed.status, 502);
    assert.equal(calls.length, 4);
    const row = await f.database.studioProject(project.id, 'one');
    assert.equal(row.revision, 1);
    assert.equal(row.html, result.project.html);
    assert.equal(row.lockToken, '');
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
    assert.equal(ignored.status, 502);
    assert.equal((await ignored.json()).code, 'reference_not_applied');
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
    assert.deepEqual(sent.input[0].content.at(-1), {
      type: 'input_image',
      image_url: image.data,
    });
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
    assert.match(sent.instructions, /MODO PLANEJAR/);
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
      'h1: Título',
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

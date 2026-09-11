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
    '@/app/chatgpt-auth': { getChatGPTUser: async () => user },
    '@/db/workspace': { getWorkspaceForUser: async (user) => user.userId },
    '@/lib/studio-html': { sanitizeStudioHtml: async (value) => value },
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
    'https://example.com/proposal',
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

test('PDF and optional reference reach the model, unavailable reference is disclosed', async () => {
  const f = fixture();
  const originalFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (_url, options) => {
    sent = JSON.parse(options.body);
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify({
        title: 'Teste',
        message: 'Criada a partir do briefing.',
        html,
        reference_status: 'unavailable',
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
    assert.deepEqual(sent.tools[0].filters.allowed_domains, ['example.com']);
    assert.match(
      (await response.json()).project.messages.at(-1).text,
      /Não foi possível confirmar a leitura/,
    );
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

test('actual Worker HTML parser removes active content and keeps proposal styling', async () => {
  const workerSource = `const exports = {}; ${transpile('lib/studio-html.ts')} addEventListener('fetch', event => event.respondWith((async () => new Response(await exports.sanitizeStudioHtml(await event.request.text())))()));`;
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

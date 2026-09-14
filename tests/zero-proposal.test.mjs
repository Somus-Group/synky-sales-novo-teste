import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import { parse } from 'parse5';

globalThis.fetch = async () => {
  throw new Error('Network disabled: Proposta Zero must never call an AI API.');
};
const source = (path) =>
  readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function load(path, mocks = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(source(path), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function('require', 'module', 'exports', js)(
    (id) => {
      if (!(id in mocks)) throw new Error('Unexpected dependency: ' + id);
      return mocks[id];
    },
    module,
    module.exports,
  );
  return module.exports;
}
const zero = load('lib/zero-proposal.ts');
const limited = load('lib/imported-template.ts');
const studio = load('lib/studio.ts');
const service = (
  id = 'first',
  unitCents = 1999,
  billing = 'monthly',
  quantity = 2,
) => ({
  id,
  title: 'Serviço confirmado',
  description: 'Entrega original\nRevisão com cliente',
  unitCents,
  billing,
  quantity,
});
const draft = () => ({
  ...zero.emptyZeroDraft('Fornecedor teste'),
  client: 'Cliente teste',
  services: [service()],
  months: 6,
});

test('totals separate monthly and once, use cents and do not multiply setup by months', () => {
  const value = {
    ...draft(),
    discountPercent: 10,
    services: [service(), service('setup', 12345, 'once', 1)],
  };
  const totals = zero.zeroTotals(value);
  assert.equal(totals.monthly, 3598);
  assert.equal(totals.once, 11110);
  assert.equal(totals.contract, 32698);
  assert.equal(totals.initial, 14708);
  assert.equal(totals.pending, false);
  assert.equal(zero.zeroTotals({ ...value, months: 0 }).contract, null);
});

test('unknown prices remain pending and differ from explicitly free services', () => {
  const unknown = { ...draft(), services: [service('unknown', null)] };
  assert.equal(zero.zeroTotals(unknown).pending, true);
  assert.match(
    zero.renderZeroProposal(unknown),
    /Valores pendentes de definição/,
  );
  assert.match(zero.renderZeroProposal(unknown), /A definir/);
  assert.equal(
    zero.zeroTotals({ ...unknown, services: [service('free', 0)] }).pending,
    false,
  );
  assert.deepEqual(zero.zeroReadiness(draft()), []);
  assert.ok(zero.zeroReadiness(zero.emptyZeroDraft()).length >= 3);
});

test('briefing imports explicit labels only and never invents price or discards long terms', () => {
  const terms = 'Pagamento acordado. '.repeat(20);
  const original = `Cliente: Ana\nProjeto: Operação\nObjetivo: Organizar CRM\nCondições: ${terms}\nTexto sem rótulo: valor comercial privado`;
  const result = zero.readZeroBrief(original);
  assert.equal(result.fields.client, 'Ana');
  assert.equal(result.fields.terms, terms.trim());
  assert.deepEqual(result.suggestions, ['sales']);
  assert.equal(result.fields.services, undefined);
  assert.equal(result.fields.unitCents, undefined);
  const tooLong = zero.readZeroBrief('Projeto: ' + 'x'.repeat(161));
  assert.equal(tooLong.fields.title, undefined);
  assert.equal(tooLong.warnings.length, 1);
  assert.equal(
    zero.normalizeZeroDraft({ ...draft(), briefing: original }).briefing,
    original,
  );
});

test('untrusted text stays text in all three layouts; no executable or external resources', () => {
  const injection =
    '<script>fetch("https://invalid.example")</script><img src=x onerror=alert(1)>';
  for (const design of ['editorial', 'contrast', 'compact']) {
    const value = {
      ...draft(),
      design,
      objective: injection,
      client: injection,
      terms: injection,
    };
    const html = zero.renderZeroProposal(value);
    const tags = [];
    function visit(node) {
      if (node.tagName) tags.push(node);
      for (const child of node.childNodes || []) visit(child);
    }
    visit(parse(html));
    assert.equal(
      tags.filter((node) =>
        ['script', 'img', 'iframe', 'link', 'form'].includes(node.tagName),
      ).length,
      0,
    );
    assert.match(html, /script-src 'none'/);
    assert.match(html, /connect-src 'none'/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /@media print/);
    assert.match(html, /@media\(max-width:600px\)/);
    assert.equal(
      html.indexOf('id="investimento"') < html.indexOf('id="escopo"'),
      design === 'compact',
    );
  }
});

test('normalization rejects unsafe assets, invalid amounts and duplicate service IDs', () => {
  for (const patch of [
    { accent: 'red;url(https://example.com)' },
    { logo: 'https://example.com/x.png' },
    { logo: '/api/studio/generate' },
    { months: NaN },
    { months: 2.5 },
    { discountPercent: 101 },
    { services: [service(), service()] },
    { services: [service('bad', -1)] },
  ]) {
    assert.throws(() => zero.normalizeZeroDraft({ ...draft(), ...patch }));
  }
  assert.match(
    zero.renderZeroProposal(
      { ...draft(), logo: '/api/assets/own-token' },
      'https://example.com',
      'data:image/png;base64,YQ==',
    ),
    /src="data:image\/png;base64,YQ=="/,
  );
});

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of readdirSync(new URL('../drizzle/', import.meta.url))
    .filter((name) => name.endsWith('.sql'))
    .sort())
    sqlite.exec(source('drizzle/' + name));
  sqlite.exec(
    "INSERT INTO workspaces VALUES ('one', 'One', 'one', 1), ('two', 'Two', 'two', 1)",
  );
  let user = { userId: 'one', email: 'one@example.com' };
  const db = {
    prepare(sql) {
      const statement = (args = []) => ({
        bind: (...values) => statement(values),
        first: async () => sqlite.prepare(sql).get(...args) || null,
        all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
        run: async () => ({
          meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) },
        }),
      });
      return statement();
    },
  };
  const mocks = {
    '@/db': { getD1: () => db },
    '@/app/chatgpt-auth': { getChatGPTUser: async () => user },
    '@/db/workspace': { getWorkspaceForUser: async (user) => user.userId },
    '@/lib/imported-template': limited,
    '@/lib/zero-proposal': zero,
  };
  return {
    sqlite,
    route: load('app/api/zero/route.ts', mocks),
    setUser: (value) => {
      user = value;
    },
    mocks,
  };
}
const id = '18b539b6-cbae-4faa-8514-f929d9ff8212';
const post = (value, revision = 0) =>
  new Request('http://localhost/api/zero', {
    method: 'POST',
    body: JSON.stringify({ id, revision, draft: value }),
  });
const get = (projectId = '') =>
  new Request(
    'http://localhost/api/zero' + (projectId ? '?id=' + projectId : ''),
  );

test('draft save/open/list is isolated, requires auth and preserves other modules', async (t) => {
  const f = fixture();
  t.after(() => f.sqlite.close());
  assert.equal((await f.route.POST(post(draft()))).status, 200);
  const found = await (await f.route.GET(get(id))).json();
  assert.deepEqual(found.project.draft, draft());
  assert.equal(found.project.revision, 1);
  assert.equal((await (await f.route.GET(get())).json()).projects.length, 1);
  f.setUser({ userId: 'two' });
  assert.equal((await f.route.GET(get(id))).status, 404);
  assert.equal((await (await f.route.GET(get())).json()).projects.length, 0);
  assert.equal((await f.route.POST(post(draft(), 1))).status, 409);
  f.setUser(null);
  assert.equal((await f.route.GET(get())).status, 401);
  assert.equal((await f.route.POST(post(draft()))).status, 401);
  for (const table of [
    'clients',
    'proposals',
    'studio_projects',
    'studio_ai_requests',
  ])
    assert.equal(
      f.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,
      0,
    );
});

test('stale or duplicated saves cannot overwrite another editor', async (t) => {
  const f = fixture();
  t.after(() => f.sqlite.close());
  await f.route.POST(post(draft()));
  assert.equal(
    (await f.route.POST(post({ ...draft(), title: 'Duplicate' }))).status,
    409,
  );
  assert.equal(
    (await f.route.POST(post({ ...draft(), title: 'New version' }, 1))).status,
    200,
  );
  assert.equal(
    (await f.route.POST(post({ ...draft(), title: 'Stale' }, 1))).status,
    409,
  );
  const found = await (await f.route.GET(get(id))).json();
  assert.equal(found.project.draft.title, 'New version');
  assert.equal(found.project.revision, 2);
  assert.equal(
    (
      await f.route.POST(
        post({ ...draft(), logo: '/api/assets/not-our-logo' }, 2),
      )
    ).status,
    400,
  );
  assert.equal(
    (await f.route.POST(post({ ...draft(), title: '' }, 2))).status,
    400,
  );
});

test('reference route returns only visual hints and never calls an AI dependency', async (t) => {
  const f = fixture();
  t.after(() => f.sqlite.close());
  let reads = 0;
  const route = load('app/api/zero/reference/route.ts', {
    ...f.mocks,
    '@/lib/studio': studio,
    '@/lib/studio-reference': {
      readStudioReference: async () => {
        reads++;
        return {
          title: 'Reference',
          text: 'Do not import my prices',
          designEvidence: {
            colors: ['#123456', 'invalid'],
            fonts: ['Arial', 'sans-serif'],
          },
        };
      },
    },
  });
  const request = () =>
    new Request('http://localhost/api/zero/reference', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/reference' }),
    });
  const result = await (await route.POST(request())).json();
  assert.deepEqual(result.colors, ['#123456']);
  assert.equal(result.serif, false);
  assert.equal(result.text, undefined);
  assert.equal(reads, 1);
  f.setUser(null);
  assert.equal((await route.POST(request())).status, 401);
  assert.equal(reads, 1);
});

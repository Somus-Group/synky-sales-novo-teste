import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const worker = await build({
  stdin: {
    resolveDir: root,
    contents: `import {readStudioReference, isPublicAddress} from './lib/studio-reference';
      const realFetch = globalThis.fetch;
      export default { async fetch(request) {
        const {url, resources, addresses, address} = await request.json();
        const visited = [];
        if (address) return Response.json({public: isPublicAddress(address)});
        globalThis.fetch = resources ? async (url, options) => {
          const key = String(url);
          visited.push({url: key, headers: options?.headers, redirect: options?.redirect});
          if (key.startsWith('https://cloudflare-dns.com/')) return Response.json({Answer:(addresses || ['104.21.12.34']).map(data => ({type:data.includes(':') ? 28 : 1,data}))});
          const resource = resources[key];
          if (!resource) return new Response('Missing fixture', {status:404});
          return new Response(resource.base64 ? Uint8Array.from(atob(resource.base64), c => c.charCodeAt(0)) : resource.body || '', {status:resource.status || 200,headers:resource.headers || {'content-type':'text/html'}});
        } : realFetch;
        try { return Response.json({reference: await readStudioReference(url), visited}); }
        catch(error) { return Response.json({error:error.message,code:error.code,visited}, {status:error.status || 500}); }
        finally { globalThis.fetch = realFetch; }
      }};`,
  },
  bundle: true,
  external: ['cloudflare:workers'],
  format: 'esm',
  platform: 'browser',
  write: false,
  tsconfig: root + '/tsconfig.json',
});
async function run(payload) {
  const mf = new Miniflare({
    modules: true,
    script: worker.outputFiles[0].text,
    compatibilityDate: '2026-05-15',
  });
  try {
    const response = await mf.dispatchFetch('https://test.local', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { status: response.status, ...(await response.json()) };
  } finally {
    await mf.dispose();
  }
}
const paragraph =
  'Nossa proposta organiza o diagnóstico, a estratégia, o escopo de trabalho e os próximos passos. A apresentação tem uma identidade visual própria, com seções amplas, tipografia legível e destaques para as etapas do projeto. O investimento e os prazos dependem de cada cliente e devem ser adaptados ao seu briefing.';
const html = `<html><head><title>Modelo público</title><link rel="stylesheet" href="/theme.css"></head><body><script>SECRET_NOT_CONTENT</script><h1>Proposta comercial</h1><p>${paragraph}</p><section class="scope"><h2>Escopo</h2></section></body></html>`;

test('reads page body, structure and external CSS, without executing scripts', async () => {
  const result = await run({
    url: 'https://example.com/proposta',
    resources: {
      'https://example.com/proposta': { body: html },
      'https://example.com/theme.css': {
        body: ':root{--accent:#20b090} .scope{display:grid}',
        headers: { 'content-type': 'text/css' },
      },
    },
  });
  assert.equal(result.status, 200, result.error);
  assert.equal(result.reference.method, 'html');
  assert.match(result.reference.text, /diagnóstico/);
  assert.match(result.reference.styles, /#20b090/);
  assert.match(result.reference.structure, /scope/);
  assert.match(result.reference.template, /Proposta comercial/);
  assert.doesNotMatch(result.reference.template, /SECRET_NOT_CONTENT|<script|stylesheet/);
  assert.doesNotMatch(result.reference.text, /SECRET_NOT_CONTENT/);
  for (const call of result.visited.filter(
    (call) => !call.url.includes('dns-query'),
  )) {
    assert.equal(call.redirect, 'manual');
    assert.equal(call.headers.Authorization, undefined);
    assert.equal(call.headers.Cookie, undefined);
  }
});

test('reads Lovable/React shell through declared modules and static JSX, never executing it', async () => {
  const result = await run({
    url: 'https://example.com/',
    resources: {
      'https://example.com/': {
        body: '<html><head><title>Modelo React</title><script type="module" src="/assets/app.js"></script></head><body><div id="root"></div></body></html>',
      },
      'https://example.com/assets/app.js': {
        body: `throw new Error('MUST_NOT_EXECUTE');
      const copy=${JSON.stringify(paragraph)};
      const data=[{title:'Diagnóstico estratégico',description:'Alinhar a operação ao objetivo do cliente'},{title:'Próximos passos',description:'Organização do projeto comercial'}];
      const Page=()=>jsx.jsxs('section',{className:'bg-white grid gap-12',children:[jsx.jsx('h1',{children:'Proposta comercial'}),jsx.jsx('p',{children:copy}),jsx.jsx(motion.h2,{className:'text-accent',children:'Plano de trabalho'}),data.map(item=>jsx.jsx('p',{children:item.description}))]});`,
        headers: { 'content-type': 'application/javascript' },
      },
    },
  });
  assert.equal(result.status, 200, result.error);
  assert.equal(result.reference.method, 'react-source');
  assert.match(result.reference.text, /Plano de trabalho/);
  assert.match(result.reference.structure, /bg-white grid gap-12/);
  assert.match(result.reference.template, /Plano de trabalho/);
  assert.match(result.reference.template, /synky-react-reference/);
  assert.match(result.reference.structure, /Diagnóstico estratégico/);
  assert.doesNotMatch(result.reference.structure, /MUST_NOT_EXECUTE/);
});

test('validates every redirect and DNS address and refuses private or protected pages', async () => {
  const redirect = await run({
    url: 'https://example.com/',
    resources: {
      'https://example.com/': {
        status: 302,
        headers: { location: 'https://127.0.0.1/private' },
      },
    },
  });
  assert.equal(redirect.status, 400);
  assert.equal(
    redirect.visited.some((call) => call.url.includes('/private')),
    false,
  );
  for (const address of [
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '192.168.0.1',
    '100.64.0.1',
    '::1',
    '::ffff:127.0.0.1',
    'fd00::1',
    'fe80::1',
  ]) {
    assert.equal((await run({ address })).public, false, address);
  }
  const privateHost = await run({
    url: 'https://private.example.com/',
    addresses: ['10.0.0.1'],
    resources: {},
  });
  assert.equal(privateHost.status, 422);
  assert.equal(
    privateHost.visited.some(
      (call) => call.url === 'https://private.example.com/',
    ),
    false,
  );
  const protectedPage = await run({
    url: 'https://example.com/',
    resources: { 'https://example.com/': { status: 403 } },
  });
  assert.equal(protectedPage.status, 422);
  assert.match(protectedPage.error, /login/);
});

test('does not treat an empty SPA, missing assets, download, or oversized response as a read reference', async () => {
  for (const resource of [
    {
      body: '<html><title>App</title><body><div id="root"></div></body></html>',
    },
    {
      body: '<html><script type="module" src="/missing.js"></script><body></body></html>',
    },
    { body: '%PDF-1.7', headers: { 'content-type': 'application/pdf' } },
    {
      body: 'large',
      headers: { 'content-type': 'text/html', 'content-length': '9000000' },
    },
  ]) {
    const result = await run({
      url: 'https://example.com/',
      resources: { 'https://example.com/': resource },
    });
    assert.equal(result.status, 422);
    assert.equal(result.reference, undefined);
  }
});

test('follows a public redirect to the actual proposal, not a canonical metadata URL', async () => {
  const result = await run({
    url: 'https://example.com/start',
    resources: {
      'https://example.com/start': {
        status: 302,
        headers: { location: '/model' },
      },
      'https://example.com/model': {
        body: html.replace(
          '</head>',
          '<link rel="canonical" href="https://elsewhere.example.com/"></head>',
        ),
      },
    },
  });
  assert.equal(result.status, 200, result.error);
  assert.equal(result.reference.url, 'https://example.com/model');
  assert.equal(
    result.visited.some((call) => call.url.includes('elsewhere')),
    false,
  );
});

test(
  'live reference smoke test',
  { skip: !process.env.STUDIO_LIVE_REFERENCE_URL },
  async () => {
    const result = await run({ url: process.env.STUDIO_LIVE_REFERENCE_URL });
    assert.equal(result.status, 200, result.error);
    assert.ok(result.reference.text.length > 250);
    assert.ok(result.reference.structure.length > 250);
    assert.ok(result.reference.styles.length > 100);
    console.log(
      JSON.stringify({
        title: result.reference.title,
        method: result.reference.method,
        textLength: result.reference.text.length,
        structureLength: result.reference.structure.length,
        styleLength: result.reference.styles.length,
        media: result.reference.media.map(({ dataUrl, ...item }) => ({
          ...item,
          bytes: dataUrl.length,
        })),
        mediaWarnings: result.reference.mediaWarnings,
        sample: result.reference.text.slice(0, 900),
      }),
    );
    if (process.env.STUDIO_LIVE_REFERENCE_URL.includes('somus-bpo.lovable.app'))
      assert.ok(
        result.reference.media.some((item) => item.kind === 'logo'),
        'The actual Somus logo must be imported',
      );
  },
);

test('imports real logo bytes, while rejecting private image redirects', async () => {
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=';
  const result = await run({
    url: 'https://example.com/',
    resources: {
      'https://example.com/': {
        body: html.replace(
          '<body>',
          '<body><img src="/logo.png" alt="Marca"><img class="brand" src="/private.png">',
        ),
      },
      'https://example.com/logo.png': {
        base64: png,
        headers: { 'content-type': 'image/png' },
      },
      'https://example.com/private.png': {
        status: 302,
        headers: { location: 'https://127.0.0.1/logo.png' },
      },
    },
  });
  assert.equal(result.status, 200, result.error);
  assert.equal(result.reference.media.length, 1);
  assert.equal(result.reference.media[0].kind, 'logo');
  assert.equal(
    result.reference.media[0].dataUrl,
    'data:image/png;base64,' + png,
  );
  assert.equal(
    result.reference.mediaWarnings.filter((item) => /logo/.test(item)).length,
    1,
  );
  assert.equal(
    result.visited.some((item) => item.url.includes('127.0.0.1')),
    false,
  );
});

test('keeps relevant brand and responsive rules from the middle of large utility stylesheets', async () => {
  const unrelated = Array.from(
    { length: 2000 },
    (_, i) => `.unused-${i}{padding:12px;color:#cccccc}`,
  ).join('');
  const result = await run({
    url: 'https://example.com/proposta',
    resources: {
      'https://example.com/proposta': {
        body: html.replace('class="scope"', 'class="scope md:grid"'),
      },
      'https://example.com/theme.css': {
        body:
          unrelated +
          ':root{--brand:#ad184e}.scope{background:var(--brand);font-family:Georgia}@media(min-width:700px){.md\\:grid{display:grid;grid-template-columns:1fr 1fr}}' +
          unrelated,
        headers: { 'content-type': 'text/css' },
      },
    },
  });
  assert.equal(result.status, 200, result.error);
  assert.match(result.reference.styles, /#ad184e/);
  assert.match(result.reference.styles, /@media/);
  assert.match(result.reference.styles, /grid-template-columns/);
  assert.doesNotMatch(result.reference.styles, /unused-/);
  assert.deepEqual(result.reference.designEvidence.sectionOrder, [
    'Proposta comercial',
    'Escopo',
  ]);
  assert.ok(result.reference.designEvidence.colors.includes('#ad184e'));
});

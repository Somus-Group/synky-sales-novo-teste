import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const worker = await build({
  stdin: {
    resolveDir: root,
    contents: `
import {imageDataUrl,prepareStudioMedia,embedStudioMedia} from './lib/studio-media';
import {reviewStudioHtml} from './lib/studio-review';
import {sanitizeStudioHtml} from './lib/studio-html';
export default {async fetch(request){
 const p=await request.json();
 try {
  if(p.action==='encode') return Response.json({data:imageDataUrl(Uint8Array.from(atob(p.bytes),c=>c.charCodeAt(0)),p.mime)});
  if(p.action==='review') return Response.json(await reviewStudioHtml(p.html,{strict:p.strict,hasReference:p.hasReference}));
  if(p.action==='prepare') {
   let scope='';
   const db={prepare:()=>({bind:(id)=>{scope=id;return {all:async()=>({results:p.rows||[]})};}})};
   const bucket={get:async key=>p.objects?.[key]?{arrayBuffer:async()=>Uint8Array.from(atob(p.objects[key]),c=>c.charCodeAt(0)).buffer}:null};
   return Response.json({...await prepareStudioMedia(db,bucket,p.workspace,p.assets,p.html),scope});
  }
  return Response.json(await embedStudioMedia(await sanitizeStudioHtml(p.html),p.assets));
 } catch(error){return Response.json({error:error.message},{status:error.status||500});}
}};`,
  },
  bundle: true,
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
const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=';
const dataUrl = 'data:image/png;base64,' + png;
const logo = {
  id: 'reference-1',
  kind: 'logo',
  label: 'Somus',
  source: 'reference',
  dataUrl,
};

test('embeds known images after sanitizing, marks the logo and rejects invented URLs', async () => {
  const result = await run({
    assets: [logo],
    html: '<header><img src="studio-asset:reference-1" onerror="alert(1)"></header><img src="https://fake.example/logo.png" alt="Inventada"><script>alert(1)</script>',
  });
  assert.equal(result.status, 200);
  assert.match(result.html, /data:image\/png;base64/);
  assert.match(result.html, /data-studio-role="logo"/);
  assert.match(result.html, /object-fit:contain/);
  assert.doesNotMatch(result.html, /onerror|alert\(|https:\/\/fake/);
  assert.deepEqual(result.unresolved, ['Inventada']);
  assert.equal(result.used[0].id, logo.id);
});

test('media catalog is workspace scoped, preserves previous images and removes base64 from model text', async () => {
  const result = await run({
    action: 'prepare',
    workspace: 'company-a',
    assets: [],
    html: `<img data-studio-role="logo" src="${dataUrl}" alt="Minha marca">`,
    rows: [],
  });
  assert.equal(result.scope, 'company-a');
  assert.equal(result.assets[0].kind, 'logo');
  assert.equal(result.assets[0].source, 'previous');
  assert.equal(result.assets[0].dataUrl, dataUrl);
  assert.match(result.currentHtml, /studio-asset:previous-/);
  assert.doesNotMatch(result.currentHtml, /base64/);
  const library = await run({
    action: 'prepare',
    workspace: 'company-b',
    assets: [],
    html: '',
    rows: [
      {
        kind: 'logo',
        name: 'Marca',
        objectKey: 'a',
        contentType: 'image/png',
        sizeBytes: 68,
      },
    ],
    objects: { a: png },
  });
  assert.equal(library.assets[0].source, 'library');
  assert.equal(library.assets[0].dataUrl, dataUrl);
});

test('rejects non-raster bytes and unsupported/oversized library logos with an actionable warning', async () => {
  assert.equal(
    (
      await run({
        action: 'encode',
        mime: 'image/svg+xml',
        bytes: Buffer.from('<svg/>').toString('base64'),
      })
    ).data,
    null,
  );
  assert.equal(
    (
      await run({
        action: 'encode',
        mime: 'image/png',
        bytes: Buffer.from('<html/>').toString('base64'),
      })
    ).data,
    null,
  );
  const result = await run({
    action: 'prepare',
    workspace: 'a',
    assets: [],
    html: '',
    rows: [{ kind: 'logo', name: 'Grande', sizeBytes: 900000 }],
  });
  assert.equal(result.assets.length, 0);
  assert.equal(result.warnings.length, 1);
});

test('reviews headings, empty sections and internal navigation including nested sections', async () => {
  const complete = await run({
    action: 'review',
    html: '<h1>Proposta comercial</h1><nav><a href="#escopo">Escopo</a></nav><section id="escopo"><section><h2>Escopo</h2><p>Diagnóstico e acompanhamento das campanhas.</p></section></section>',
  });
  assert.deepEqual(complete.issues, []);
  assert.deepEqual(complete.headings, ['Proposta comercial', 'Escopo']);
  const empty = await run({
    action: 'review',
    html: '<section></section><a href="#missing">Teste</a>',
  });
  assert.equal(empty.issues.length, 4);
});

test('strict review blocks generic text proposals and accepts visual compositions', async () => {
  const generic = await run({
    action: 'review',
    html: '<!doctype html><html><head><style>body{font-family:Arial}</style></head><body><h1>Proposta</h1><section><h2>Escopo</h2><p>Texto da proposta.</p><ul><li>Item</li></ul></section></body></html>',
    strict: true,
    hasReference: true,
  });
  assert.ok(generic.issues.some((issue) => /textual demais/.test(issue)));
  assert.ok(generic.issues.some((issue) => /referência/.test(issue)));
  const visual = await run({
    action: 'review',
    strict: true,
    hasReference: true,
    html: `<!doctype html><html><head><style>
      body{font-family:Arial,sans-serif;margin:0}
      .hero{display:grid;grid-template-columns:1.2fr .8fr;gap:40px;padding:72px}
      .panel{display:flex;gap:20px}.scope-grid{display:grid;grid-template-columns:1fr 1fr}
      .card{padding:24px}.timeline{display:grid;grid-template-columns:repeat(3,1fr)}
      .investment{display:flex;justify-content:space-between}
      @media(max-width:700px){.hero,.scope-grid,.timeline{grid-template-columns:1fr}}
    </style></head><body>
      <nav><a href="#escopo">Escopo</a><a href="#metodo">Método</a><a href="#investimento">Investimento</a></nav>
      <section class="hero"><div><h1>Proposta comercial</h1><p>Direção clara para o projeto.</p></div><aside class="panel"><strong>3 frentes</strong></aside></section>
      <section id="escopo"><h2>Escopo</h2><div class="scope-grid"><article class="card">Diagnóstico</article><article class="card">Execução</article></div></section>
      <section id="metodo"><h2>Método</h2><ol class="timeline"><li>Imersão</li><li>Plano</li><li>Acompanhamento</li></ol></section>
      <section id="investimento" class="investment"><h2>Investimento</h2><p>A definir conforme escopo final.</p></section>
      <section><h2>Próximos passos</h2><p>Validar detalhes e iniciar.</p></section>
    </body></html>`,
  });
  assert.deepEqual(visual.issues, []);
});

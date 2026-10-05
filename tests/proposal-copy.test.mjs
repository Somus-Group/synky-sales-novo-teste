import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../lib/proposal-copy.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled)((name) => name === '@/lib/studio-reference' ? { editableReferenceHtml: async (html) => html } : require(name), module, module.exports);

test('proposal copy changes only selected text and preserves original markup and styles', async () => {
  const original = '<!doctype html><html><head><style>.hero{color:#123456}</style></head><body><main class="hero"><h1>Projeto original</h1><p>Texto que permanece</p></main></body></html>';
  const texts = await module.exports.proposalCopyTexts(original);
  const title = texts.find((item) => item.text.includes('Projeto original'));
  assert.ok(title);
  const updated = await module.exports.renderProposalCopy(original, [{ path: title.path, text: 'Novo projeto' }]);
  assert.match(updated, /\.hero\{color:#123456\}/);
  assert.match(updated, /<main class="hero">/);
  assert.match(updated, /<h1>Novo projeto<\/h1>/);
  assert.match(updated, /Texto que permanece/);
});

test('proposal copy rejects stale text paths instead of changing another element', async () => {
  await assert.rejects(module.exports.renderProposalCopy('<p>Texto</p>', [{ path: [50, 50], text: 'Alterado' }]), /página mudou/i);
});

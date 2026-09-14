import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(
  new URL('../lib/team-metrics.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { getTeamMetrics } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

test('team metrics reflect current members, access states and roles', () => {
  const result = getTeamMetrics([
    { role: 'Proprietário', status: 'Ativo' },
    { role: 'Comercial', status: 'Ativo' },
    { role: 'Comercial', status: 'Acesso preparado' },
  ]);
  assert.deepEqual(result, {
    active: 2,
    pending: 1,
    roles: 2,
    occupied: 3,
    available: 7,
    utilization: 30,
    capacity: 10,
  });
});

test('team utilization never exceeds the plan capacity', () => {
  const result = getTeamMetrics(
    Array.from({ length: 12 }, () => ({ role: 'Comercial', status: 'Ativo' })),
  );
  assert.equal(result.utilization, 100);
  assert.equal(result.available, 0);
});

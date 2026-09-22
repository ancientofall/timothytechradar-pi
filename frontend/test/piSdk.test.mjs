import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/piSdk.ts', import.meta.url), 'utf8');
function load(Pi) {
  const exports = {};
  const context = { exports, window: { Pi } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return exports.getPiSdk;
}
test('SDK waits for initialization and shares it across simultaneous callers', async () => {
  let finish, calls = 0, resolved = false;
  const pi = { init: options => {
    assert.equal(JSON.stringify(options), '{"version":"2.0"}'); calls++;
    return new Promise(resolve => { finish = resolve; });
  } };
  const get = load(pi);
  const first = get().then(value => { resolved = true; return value; });
  const second = get();
  await Promise.resolve(); assert.equal(resolved, false); assert.equal(calls, 1);
  finish(); assert.equal(await first, pi); assert.equal(await second, pi);
  await get(); assert.equal(calls, 1);
});
test('SDK failure is visible and initialization can be retried', async () => {
  await assert.rejects(load(undefined)(), /did not load/);
  let count = 0;
  const get = load({ init: async () => { if (++count === 1) throw new Error('init failed'); } });
  await assert.rejects(get(), /init failed/); await get(); assert.equal(count, 2);
});

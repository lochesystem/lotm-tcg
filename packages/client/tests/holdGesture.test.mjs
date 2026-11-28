import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from '../node_modules/typescript/lib/typescript.js';
const source = readFileSync(new URL('../src/utils/holdGesture.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { createHoldGesture } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('short tap remains a normal selection/play click', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let inspected = 0;
  const gesture = createHoldGesture(() => inspected++);
  gesture.start(1, 20, 20); t.mock.timers.tick(150); gesture.end(); t.mock.timers.tick(500);
  assert.equal(inspected, 0); assert.equal(gesture.consumeClick(), false);
});
test('long press opens once and consumes its trailing click, next tap works', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let inspected = 0;
  const gesture = createHoldGesture(() => inspected++);
  gesture.start(1, 20, 20); t.mock.timers.tick(450); t.mock.timers.tick(1000); gesture.end();
  assert.equal(inspected, 1); assert.equal(gesture.consumeClick(), true);
  gesture.start(2, 20, 20); gesture.end(); assert.equal(gesture.consumeClick(), false);
});
test('horizontal scroll cancels inspection and cannot play on release', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let inspected = 0;
  const gesture = createHoldGesture(() => inspected++);
  gesture.start(1, 20, 20); gesture.move(1, 40, 20); t.mock.timers.tick(600); gesture.end();
  assert.equal(inspected, 0); assert.equal(gesture.consumeClick(), true);
});
test('pointer cancellation and unmount clear the pending hold', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let inspected = 0;
  const gesture = createHoldGesture(() => inspected++);
  gesture.start(1, 20, 20); gesture.cancel(); t.mock.timers.tick(600);
  assert.equal(inspected, 0); assert.equal(gesture.consumeClick(), true);
  gesture.start(2, 20, 20); gesture.dispose(); t.mock.timers.tick(600); assert.equal(inspected, 0);
});

test('leaving an idle card does not swallow a keyboard click', () => {
  const gesture = createHoldGesture(() => {});
  gesture.cancel(); assert.equal(gesture.consumeClick(), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync('public/sp/meta-pixel.js', 'utf8');
function fixture(accept = true) {
  const calls = [], listeners = {}, store = new Map();
  if (accept) store.set('sp_advertising_choices', JSON.stringify({ version: 'meta-measurement-2026-10-26', advertising: true }));
  const doc = { readyState: 'loading', head: { appendChild() {} }, createElement: () => ({}), addEventListener: (n, fn) => { listeners[n] = fn; } };
  const w = { document: doc, location: { origin: 'http://localhost', href: 'http://localhost/', search: '' }, history: { replaceState() {} }, navigator: {}, localStorage: { getItem: k => store.get(k) || null }, addEventListener() {} };
  w.top = w;
  vm.runInNewContext(source, { window: w, document: doc, location: w.location, URL, WeakSet, AbortController, setTimeout, clearTimeout });
  return { w, listeners, calls: () => w.fbq?.queue || calls };
}
test('initializes only the requested pixel with Lovable agent', () => {
  const f = fixture(); f.w.spMeta.checkout();
  const init = f.calls().find(c => c[0] === 'init');
  assert.equal(init[1], '1769881247639430'); assert.equal(init[3].agent, 'lovable');
});
test('only PageView and InitiateCheckout can be sent; no other event API is exposed', () => {
  const f = fixture(); f.w.spMeta.checkout();
  assert.deepEqual(Object.keys(f.w.spMeta).sort(), ['checkout', 'settings']);
  assert.equal(f.calls().filter(c => c[0] === 'track').length, 1);
  assert.equal(f.calls().find(c => c[0] === 'track')[1], 'InitiateCheckout');
});
test('checkout emits once for repeated clicks on the same checkout button', () => {
  const f = fixture(); const target = { hasAttribute: () => true };
  const e = { target: { closest: () => target } };
  f.listeners.click(e); f.listeners.click(e);
  assert.equal(f.calls().filter(c => c[0] === 'track' && c[1] === 'InitiateCheckout').length, 1);
});
test('unresolved region without consent blocks initialization and checkout', () => {
  const f = fixture(false); assert.equal(f.w.spMeta.checkout(), false); assert.equal(f.w.fbq, undefined);
});
test('embedded document reuses top-level pixel without initialization', () => {
  const f = fixture(); const doc = { addEventListener() {} };
  const child = { top: f.w, location: f.w.location, history: { replaceState() {} } };
  vm.runInNewContext(source, { window: child, document: doc, location: f.w.location, URL });
  assert.equal(child.spMeta, f.w.spMeta); assert.equal(child.fbq, undefined);
});
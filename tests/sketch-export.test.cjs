const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, 'work'), { recursive: true });
const output = fs.mkdtempSync(path.join(root, 'work', 'sketch-export-'));
execFileSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--ignoreConfig', '--module', 'commonjs', '--target', 'es2020', '--skipLibCheck', '--outDir', output, 'lib/sketch-export.ts'], { cwd: root });
const { prepareSketchExport, sketchPng, downloadSketch } = require(path.join(output, 'sketch-export.js'));
test.after(() => fs.rmSync(output, { recursive: true, force: true }));

function fixture() {
  const artwork = '<defs><pattern id="drawing-paper"><circle fill="#c6c9bf"/></pattern></defs><rect fill="#fcfbf6"/><rect fill="url(#drawing-paper)"/><circle r=".9" fill="#34412f" opacity="0.2"/><polyline points="10,20 30,40" stroke="#34412f" stroke-width="1.7" opacity="0.9"/>';
  const make = () => ({
    attrs: { class: 'surface', style: 'touch-action:none', role: 'img', 'aria-label': 'canvas', viewBox: '0 0 640 230' },
    text: '<text>placeholder</text>',
    cloneNode() { return make(); },
    querySelectorAll(selector) { assert.equal(selector, 'text'); return [{ remove: () => { this.text = ''; } }]; },
    removeAttribute(key) { delete this.attrs[key]; },
    setAttribute(key, value) { this.attrs[key] = value; },
    serialize() { return `<svg ${Object.entries(this.attrs).map(([k,v]) => `${k}="${v}"`).join(' ')}>${artwork}${this.text}</svg>`; },
  });
  return make();
}
function mockGlobal(t, key, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  t.after(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]);
}
function browser(t, failure) {
  const revoked = [], blobs = [], drawn = [];
  t.mock.method(URL, 'createObjectURL', (blob) => { blobs.push(blob); return `blob:${blobs.length}`; });
  t.mock.method(URL, 'revokeObjectURL', (url) => revoked.push(url));
  mockGlobal(t, 'XMLSerializer', class { serializeToString(svg) { return svg.serialize(); } });
  mockGlobal(t, 'Image', class {
    set src(value) { queueMicrotask(() => failure === 'image' ? this.onerror() : this.onload()); }
  });
  const canvas = {
    getContext: () => failure === 'context' ? null : { drawImage: (...args) => drawn.push(args) },
    toBlob: (callback, type) => { assert.equal(type, 'image/png'); if (failure === 'throw') throw new Error('encoding'); callback(failure === 'blob' ? null : new Blob(['png'], { type })); },
  };
  mockGlobal(t, 'document', { createElement: () => canvas });
  return { revoked, blobs, drawn, canvas };
}
test('standalone SVG retains paper, geometry and individual opacity; removes only UI and leaves original intact', (t) => {
  browser(t);
  const svg = fixture();
  const original = svg.serialize();
  const result = prepareSketchExport(svg);
  assert.equal(svg.serialize(), original);
  assert.match(result.source, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  for (const value of ['#fcfbf6', 'url(#drawing-paper)', 'opacity="0.2"', 'opacity="0.9"', 'points="10,20 30,40"', 'stroke-width="1.7"']) assert(result.source.includes(value));
  assert(!/placeholder|<text|class=|style=|aria-label=|role=/.test(result.source));
});
test('export resolution is crisp on low DPI and bounded on high or invalid DPI', (t) => {
  browser(t);
  for (const [ratio, scale] of [[1,2], [2,2], [2.5,2.5], [3,3], [8,3], [NaN,2], [Infinity,2]]) {
    const result = prepareSketchExport(fixture(), ratio);
    assert.equal(result.width, 640 * scale);
    assert.equal(result.height, 230 * scale);
  }
});
test('rasterization uses export dimensions and releases SVG URL on success', async (t) => {
  const state = browser(t);
  const blob = await sketchPng(fixture(), 3);
  assert.equal(blob.type, 'image/png');
  assert.equal(state.canvas.width, 1920);
  assert.equal(state.canvas.height, 690);
  assert.deepEqual(state.drawn[0].slice(1), [0,0,1920,690]);
  assert.deepEqual(state.revoked, ['blob:1']);
});
for (const failure of ['image', 'context', 'blob', 'throw']) test(`export rejects and releases resources after ${failure} failure`, async (t) => {
  const state = browser(t, failure);
  await assert.rejects(sketchPng(fixture()));
  assert.deepEqual(state.revoked, ['blob:1']);
});
test('download cleans up anchor and delays URL release for mobile browsers, including click failure', (t) => {
  const state = browser(t);
  let removed = 0, clicked = 0;
  const link = { click() { clicked++; }, remove() { removed++; } };
  mockGlobal(t, 'document', { createElement: () => link, body: { appendChild(node) { assert.equal(node, link); } } });
  let cleanup;
  t.mock.method(globalThis, 'setTimeout', (callback, delay) => { assert.equal(delay, 60000); cleanup = callback; });
  downloadSketch(new Blob(['png']));
  assert.match(link.download, /^无边春-排线练习-.*\.png$/);
  assert.equal(clicked, 1);
  assert.equal(removed, 1);
  assert.deepEqual(state.revoked, []);
  cleanup();
  assert.deepEqual(state.revoked, ['blob:1']);
  link.click = () => { throw new Error('download'); };
  assert.throws(() => downloadSketch(new Blob()));
  assert.equal(removed, 2);
  cleanup();
  assert.deepEqual(state.revoked, ['blob:1','blob:2']);
});

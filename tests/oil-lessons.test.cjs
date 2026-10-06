const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { createRequire } = require("node:module");
const vm = require("node:vm");
const file = path.join(__dirname, "..", "lib", "oil-lessons.ts");
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;
const moduleExports = {};
const scope = {
  exports: moduleExports,
  require: createRequire(file),
  Uint8ClampedArray,
};
vm.runInNewContext(output, scope, { filename: file });
const { parseOilProgress, luminanceGray, renderValuePixels } = moduleExports;

test("oil progress accepts only known lessons and recovers from corrupt saved state", () => {
  for (const raw of [null, "invalid", "null", "[]", '{"completed":"bad"}']) {
    assert.equal(parseOilProgress(raw).length, 0);
  }
  assert.equal(
    JSON.stringify(
      parseOilProgress(
        '{"completed":["edge-control","unknown","edge-control",4,"relative-color"]}',
      ),
    ),
    '["edge-control","relative-color"]',
  );
});

test("value study preserves neutral luminance and correctly weights green above red above blue", () => {
  for (const value of [0, 32, 128, 200, 255])
    assert.equal(luminanceGray(value, value, value), value);
  assert(luminanceGray(0, 255, 0) > luminanceGray(255, 0, 0));
  assert(luminanceGray(255, 0, 0) > luminanceGray(0, 0, 255));
});

test("three-value transformation retains alpha, leaves source intact and excludes transparent pixels from ratios", () => {
  const source = new Uint8ClampedArray([
    0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255, 0, 0, 0, 0,
  ]);
  const before = source.slice();
  const result = renderValuePixels(source, "three", 80, 180);
  assert.deepEqual(
    Array.from(result.pixels),
    [42, 42, 42, 255, 133, 133, 133, 255, 226, 226, 226, 255, 42, 42, 42, 0],
  );
  assert.equal(JSON.stringify(result.percentages), "[34,33,33]");
  assert.deepEqual(source, before);
  assert.deepEqual(renderValuePixels(source, "color", 80, 180).pixels, source);
  assert.equal(
    JSON.stringify(
      renderValuePixels(new Uint8ClampedArray(4), "three", 80, 180).percentages,
    ),
    "[0,0,0]",
  );
});

test("nonempty value area shares use largest remainders and always total 100 percent", () => {
  for (const [counts, expected] of [
    [
      [16, 567, 417],
      [1, 57, 42],
    ],
    [
      [1, 1, 1],
      [34, 33, 33],
    ],
    [
      [0, 1, 2],
      [0, 33, 67],
    ],
    [
      [0, 0, 4],
      [0, 0, 100],
    ],
  ]) {
    const pixels = new Uint8ClampedArray(
      counts.flatMap((count, group) =>
        Array.from({ length: count }, () => {
          const gray = [0, 128, 255][group];
          return [gray, gray, gray, 255];
        }).flat(),
      ),
    );
    const { percentages } = renderValuePixels(pixels, "three", 80, 180);
    assert.deepEqual(Array.from(percentages), expected);
    assert.equal(
      percentages.reduce((sum, value) => sum + value, 0),
      100,
    );
  }
});

test("moving value boundaries changes grouping without changing the underlying image", () => {
  const source = new Uint8ClampedArray([100, 100, 100, 255]);
  assert.equal(renderValuePixels(source, "three", 80, 180).pixels[0], 133);
  assert.equal(renderValuePixels(source, "three", 120, 180).pixels[0], 42);
  assert.equal(renderValuePixels(source, "three", 20, 90).pixels[0], 226);
  const ramp = new Uint8ClampedArray(
    Array.from({ length: 256 }, (_, i) => [i, i, i, 255]).flat(),
  );
  const rendered = renderValuePixels(ramp, "five", 80, 180).pixels;
  const levels = new Set(
    Array.from(rendered).filter((_, index) => index % 4 === 0),
  );
  assert.equal(levels.size, 5);
});

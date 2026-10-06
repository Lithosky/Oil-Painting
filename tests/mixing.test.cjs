const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
fs.mkdirSync(path.join(root, "work"), { recursive: true });
const output = fs.mkdtempSync(path.join(root, "work", "mixing-tests-"));
execFileSync(
  process.execPath,
  [
    path.join(root, "node_modules/typescript/bin/tsc"),
    "--ignoreConfig",
    "--module",
    "commonjs",
    "--target",
    "es2020",
    "--skipLibCheck",
    "--outDir",
    output,
    "lib/colors.ts",
    "lib/mixing-training.ts",
    "lib/mixing-spectral.d.ts",
  ],
  { cwd: root, stdio: "pipe" },
);
const colors = require(path.join(output, "colors.js"));
const training = require(path.join(output, "mixing-training.js"));
test.after(() => fs.rmSync(output, { recursive: true, force: true }));
const blue = [0, 33, 133],
  yellow = [252, 210, 0];

test("spectral mixing produces a green blue/yellow mixture, with valid RGB channels", () => {
  const mixed = colors.mixPaints([
    { rgb: blue, ratio: 1 },
    { rgb: yellow, ratio: 1 },
  ]);
  assert(
    mixed[1] > mixed[0] && mixed[1] > mixed[2],
    `expected green; got ${mixed}`,
  );
  assert(mixed.every((c) => Number.isInteger(c) && c >= 0 && c <= 255));
});
test("mixture is invariant to ordering, scale, and splitting an identical paint", () => {
  const expected = colors.mixPaints([
    { rgb: blue, ratio: 2 },
    { rgb: yellow, ratio: 1 },
  ]);
  assert.deepEqual(
    colors.mixPaints([
      { rgb: yellow, ratio: 5 },
      { rgb: blue, ratio: 10 },
    ]),
    expected,
  );
  assert.deepEqual(
    colors.mixPaints([
      { rgb: blue, ratio: 1 },
      { rgb: yellow, ratio: 1 },
      { rgb: blue, ratio: 1 },
    ]),
    expected,
  );
});
test("empty, zero, negative and invalid ratios cannot corrupt the preview", () => {
  assert.deepEqual(colors.mixPaints([]), [255, 255, 255]);
  assert.deepEqual(
    colors.mixPaints([
      { rgb: blue, ratio: 0 },
      { rgb: yellow, ratio: NaN },
    ]),
    [255, 255, 255],
  );
  assert.deepEqual(
    colors.mixPaints([
      { rgb: blue, ratio: 2 },
      { rgb: yellow, ratio: -1 },
    ]),
    blue,
  );
});
test("all guided targets are reproducible from available lesson pigments", () => {
  for (const lesson of training.MIX_LESSONS) {
    for (let variant = 0; variant < lesson.recipes.length; variant++) {
      const recipe = training.lessonRecipe(lesson, variant);
      assert(
        recipe.every((p) => p.color && lesson.paletteIds.includes(p.color.id)),
      );
      const hex = training.mixtureHex(recipe);
      assert.match(hex, /^#[0-9a-f]{6}$/i);
      assert.equal(
        colors.colorMatchScore(
          colors.hexToRgb(hex),
          training.mixtureRgb(recipe),
        ),
        100,
      );
      for (const id of lesson.paletteIds) {
        const pure = colors.ALL_COLORS.find((c) => c.id === id);
        assert(
          colors.colorMatchScore(colors.hexToRgb(hex), pure.rgb) < 90,
          `${lesson.id}/${variant} should require mixing`,
        );
      }
    }
  }
});
test("reference search returns a bounded, exactly normalized usable recipe", () => {
  for (const target of [
    [255, 255, 255],
    [0, 0, 0],
    [95, 132, 80],
    [0, 255, 255],
  ]) {
    const recipe = colors.getOptimalMix(target, training.STARTER_COLORS);
    assert(recipe.length > 0 && recipe.length <= 3);
    assert.equal(
      recipe.reduce((s, c) => s + c.ratio, 0),
      100,
    );
    assert(recipe.every((c) => c.ratio > 0 && Number.isInteger(c.ratio)));
    assert(
      colors
        .mixPaints(recipe.map((c) => ({ rgb: c.color.rgb, ratio: c.ratio })))
        .every(Number.isFinite),
    );
  }
});
test("saved progress recovers safely from corrupt data and rejects unknown pigments", () => {
  const empty = { version: 1, completed: [], attempts: [] };
  assert.deepEqual(training.parseMixProgress("{broken"), empty);
  assert.deepEqual(training.parseMixProgress("null"), empty);
  assert.deepEqual(
    training.parseMixProgress(JSON.stringify({ version: 2 })),
    empty,
  );
  const data = {
    version: 1,
    completed: ["value", "value", "bad"],
    attempts: [
      {
        id: "x",
        label: "test",
        targetHex: "#ffffff",
        mixedHex: "#ffffff",
        score: 100,
        createdAt: "2026-10-06",
        recipe: [{ colorId: "unknown", parts: 1 }],
      },
    ],
  };
  assert.deepEqual(training.parseMixProgress(JSON.stringify(data)), {
    version: 1,
    completed: ["value"],
    attempts: [],
  });
});
test("close color feedback emphasizes transferring the practice to real paint", () => {
  const mix = [{ color: training.STARTER_COLORS[0], parts: 1 }];
  assert.match(
    training.suggestNextColor(
      training.mixtureRgb(mix),
      mix,
      training.STARTER_COLORS,
    ),
    /试色/,
  );
});

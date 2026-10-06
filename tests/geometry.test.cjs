const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
fs.mkdirSync(path.join(root, "work"), { recursive: true });
const output = fs.mkdtempSync(path.join(root, "work", "geometry-tests-"));
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
    "lib/geometry.ts",
  ],
  { cwd: root, stdio: "pipe" },
);
const geometry = require(path.join(output, "geometry.js"));
test.after(() => fs.rmSync(output, { recursive: true, force: true }));
const kinds = [
  "cube",
  "block",
  "cylinder",
  "cut-cylinder",
  "cone",
  "prism",
  "group",
];

test("each study form is a closed, outward-facing solid without open seams", () => {
  for (const kind of kinds) {
    const { meshes } = geometry.createStudyScene(kind);
    for (const mesh of meshes) {
      const edgeUses = new Map();
      const center = mesh.vertices.reduce(
        (p, v) => ({
          x: p.x + v.x / mesh.vertices.length,
          y: p.y + v.y / mesh.vertices.length,
          z: p.z + v.z / mesh.vertices.length,
        }),
        { x: 0, y: 0, z: 0 },
      );
      for (const face of mesh.faces) {
        const normal = geometry.faceNormal(mesh, face);
        assert(
          Math.abs(Math.hypot(normal.x, normal.y, normal.z) - 1) < 1e-9,
          `${kind} has a degenerate face`,
        );
        assert(
          geometry.dot(
            normal,
            geometry.subtract(geometry.faceCenter(mesh, face), center),
          ) > 0,
          `${kind} has an inward face`,
        );
        face.vertices.forEach((a, i) => {
          const b = face.vertices[(i + 1) % face.vertices.length];
          const key = [a, b].sort((x, y) => x - y).join(":");
          edgeUses.set(key, (edgeUses.get(key) || 0) + 1);
        });
      }
      assert(
        [...edgeUses.values()].every((count) => count === 2),
        `${kind} has an open or multiply used edge`,
      );
      assert.equal(
        mesh.vertices.length - edgeUses.size + mesh.faces.length,
        2,
        `${kind} violates the closed-solid Euler characteristic`,
      );
    }
  }
});

test("the cut-cylinder rim is the actual planar intersection and stays above its base", () => {
  for (const proportion of [65, 100, 145]) {
    for (const angle of [-38, -12, 0, 24, 38]) {
      const scene = geometry.createStudyScene(
        "cut-cylinder",
        proportion,
        angle,
      );
      const mesh = scene.meshes[0];
      const top = mesh.faces.find((face) => face.cut);
      assert(
        top,
        "the cut face remains identifiable even for a horizontal cut",
      );
      const slope = Math.tan((angle * Math.PI) / 180);
      for (const index of top.vertices) {
        const vertex = mesh.vertices[index];
        assert(
          Math.abs(vertex.y - (1.85 * proportion) / 100 - slope * vertex.x) <
            1e-10,
        );
        assert(Math.abs(Math.hypot(vertex.x, vertex.z) - 0.84) < 1e-10);
        assert(vertex.y > 0, "the rim must never cross the cylinder base");
      }
    }
  }
});

test("all extreme view and proportion settings stay finite and inside the drawing area", () => {
  for (const kind of kinds)
    for (const yaw of [-150, -90, 0, 32, 150])
      for (const elevation of [0, 24, 65])
        for (const proportion of [65, 145])
          for (const cut of [-38, 38]) {
            const scene = geometry.createStudyScene(kind, proportion, cut);
            const camera = geometry.studyCamera(scene, yaw, elevation);
            for (const vertex of scene.meshes.flatMap(
              (mesh) => mesh.vertices,
            )) {
              const p = geometry.projectPoint(vertex, camera);
              assert(
                Number.isFinite(p.x) && Number.isFinite(p.y) && p.depth > 0.1,
              );
              assert(
                p.x >= 139.99 && p.x <= 580.01 && p.y >= 62.99 && p.y <= 389.01,
                `${kind} clips at ${yaw}/${elevation}/${proportion}/${cut}: ${p.x},${p.y}`,
              );
            }
          }
});

test("pinhole projection shortens equally sized far-away segments", () => {
  const camera = geometry.makeCamera(0, 0, { x: 0, y: 0, z: 0 });
  const nearWidth =
    geometry.projectPoint({ x: 1, y: 0, z: 2 }, camera).x -
    geometry.projectPoint({ x: -1, y: 0, z: 2 }, camera).x;
  const farWidth =
    geometry.projectPoint({ x: 1, y: 0, z: -2 }, camera).x -
    geometry.projectPoint({ x: -1, y: 0, z: -2 }, camera).x;
  assert(nearWidth > farWidth);
  assert(Math.abs(nearWidth / farWidth - 11 / 7) < 1e-10);
});

test("cylinder drawing uses silhouettes and rims rather than showing mesh tessellation", () => {
  const scene = geometry.createStudyScene("cylinder");
  const camera = geometry.studyCamera(scene, 32, 24);
  const edges = geometry.meshEdges(scene.meshes[0], camera);
  const vertical = edges.filter((edge) => Math.abs(edge.a.y - edge.b.y) > 1);
  assert.equal(
    vertical.length,
    2,
    "a smooth cylinder should have two side silhouettes",
  );
  assert(
    edges.some((edge) => !edge.visible),
    "back rim should be available as hidden structure",
  );
  assert(edges.some((edge) => edge.visible));
});

// Rasterize surface triangles with perspective-correct reciprocal depth. This is
// independent of the painter's ordering and catches real occlusion mistakes.
function occlusionErrors(scene, camera, ordered, spacing = 4) {
  const left = 140,
    top = 63,
    cols = Math.floor(440 / spacing) + 1,
    rows = Math.floor(326 / spacing) + 1;
  const nearestDepth = new Float64Array(cols * rows).fill(Infinity);
  const nearestMesh = new Int8Array(cols * rows).fill(-1);
  const paintedMesh = new Int8Array(cols * rows).fill(-1);
  for (const mesh of ordered) {
    const meshId = scene.meshes.indexOf(mesh);
    for (const face of mesh.faces.filter((face) =>
      geometry.faceVisible(mesh, face, camera),
    )) {
      const projected = face.vertices.map((i) =>
        geometry.projectPoint(mesh.vertices[i], camera),
      );
      for (let triangle = 1; triangle < projected.length - 1; triangle++) {
        const [a, b, c] = [
          projected[0],
          projected[triangle],
          projected[triangle + 1],
        ];
        const determinant =
          (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
        if (Math.abs(determinant) < 1e-9) continue;
        const minColumn = Math.max(
          0,
          Math.ceil((Math.min(a.x, b.x, c.x) - left) / spacing),
        );
        const maxColumn = Math.min(
          cols - 1,
          Math.floor((Math.max(a.x, b.x, c.x) - left) / spacing),
        );
        const minRow = Math.max(
          0,
          Math.ceil((Math.min(a.y, b.y, c.y) - top) / spacing),
        );
        const maxRow = Math.min(
          rows - 1,
          Math.floor((Math.max(a.y, b.y, c.y) - top) / spacing),
        );
        for (let row = minRow; row <= maxRow; row++)
          for (let col = minColumn; col <= maxColumn; col++) {
            const x = left + col * spacing,
              y = top + row * spacing;
            const u =
              ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / determinant;
            const v =
              ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / determinant;
            const w = 1 - u - v;
            if (Math.min(u, v, w) < 1e-5) continue;
            const depth = 1 / (u / a.depth + v / b.depth + w / c.depth);
            const index = row * cols + col;
            paintedMesh[index] = meshId;
            if (depth < nearestDepth[index]) {
              nearestDepth[index] = depth;
              nearestMesh[index] = meshId;
            }
          }
      }
    }
  }
  return [...paintedMesh].filter((mesh, i) => mesh !== nearestMesh[i]).length;
}

test("group drawing matches ray depth across 610 views, including level-view contact overlaps", () => {
  for (let yaw = -150; yaw <= 150; yaw += 5)
    for (const elevation of [0, 1, 5, 24, 65])
      for (const proportion of [65, 145]) {
        const scene = geometry.createStudyScene("group", proportion);
        const camera = geometry.studyCamera(scene, yaw, elevation);
        assert.equal(
          occlusionErrors(
            scene,
            camera,
            geometry.orderStudyMeshes(scene.meshes, camera),
          ),
          0,
          `wrong overlap at yaw=${yaw}, elevation=${elevation}, proportion=${proportion}`,
        );
      }
  const regression = geometry.createStudyScene("group", 65);
  const camera = geometry.studyCamera(regression, -50, 0);
  const legacyOrder = [...regression.meshes].sort((a, b) => {
    const averageDepth = (mesh) =>
      mesh.vertices.reduce(
        (sum, p) => sum + geometry.projectPoint(p, camera).depth,
        0,
      ) / mesh.vertices.length;
    return averageDepth(b) - averageDepth(a);
  });
  assert(
    occlusionErrors(regression, camera, legacyOrder) > 0,
    "the sampler must detect the original centroid-order regression",
  );
});

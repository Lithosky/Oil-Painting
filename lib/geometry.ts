/** Small, shared perspective model for the drawing studio. World Y points up. */
export type Vec3 = { x: number; y: number; z: number };
export type Point2 = { x: number; y: number; depth: number };
export type FormKind =
  "cube" | "block" | "cylinder" | "cut-cylinder" | "cone" | "prism" | "group";
export type Face = { vertices: number[]; cut?: boolean };
export type Mesh = { vertices: Vec3[]; faces: Face[]; name: string };
export type Guide = {
  points: Vec3[];
  closed?: boolean;
  kind: "axis" | "section";
};
export type StudyScene = { meshes: Mesh[]; guides: Guide[] };
export type Camera = {
  position: Vec3;
  target: Vec3;
  right: Vec3;
  up: Vec3;
  towardEye: Vec3;
  distance: number;
  focal: number;
  cx: number;
  cy: number;
};

export const add = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});
export const subtract = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
export const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const normalize = (v: Vec3): Vec3 => {
  const size = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / size, y: v.y / size, z: v.z / size };
};
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const bounded = (n: number, min: number, max: number, fallback: number) =>
  Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;

export function faceNormal(mesh: Mesh, face: Face): Vec3 {
  const [a, b, c] = face.vertices.map((index) => mesh.vertices[index]);
  return normalize(cross(subtract(b, a), subtract(c, a)));
}

export function faceCenter(mesh: Mesh, face: Face): Vec3 {
  const sum = face.vertices.reduce(
    (value, index) => add(value, mesh.vertices[index]),
    { x: 0, y: 0, z: 0 },
  );
  return {
    x: sum.x / face.vertices.length,
    y: sum.y / face.vertices.length,
    z: sum.z / face.vertices.length,
  };
}

export function faceVisible(mesh: Mesh, face: Face, camera: Camera): boolean {
  return (
    dot(
      faceNormal(mesh, face),
      subtract(camera.position, faceCenter(mesh, face)),
    ) > 1e-8
  );
}

/** A pinhole camera, so parallel world edges converge and circles project as conics. */
export function makeCamera(
  yaw: number,
  elevation: number,
  target: Vec3,
): Camera {
  const azimuth = radians(bounded(yaw, -180, 180, 32));
  const pitch = radians(bounded(elevation, 0, 65, 24));
  const towardEye = {
    x: Math.sin(azimuth) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: Math.cos(azimuth) * Math.cos(pitch),
  };
  const distance = 9;
  return {
    position: add(target, {
      x: towardEye.x * distance,
      y: towardEye.y * distance,
      z: towardEye.z * distance,
    }),
    target,
    towardEye,
    distance,
    right: { x: Math.cos(azimuth), y: 0, z: -Math.sin(azimuth) },
    up: {
      x: -Math.sin(azimuth) * Math.sin(pitch),
      y: Math.cos(pitch),
      z: -Math.cos(azimuth) * Math.sin(pitch),
    },
    focal: 1050,
    cx: 360,
    cy: 226,
  };
}

export function projectPoint(point: Vec3, camera: Camera): Point2 {
  const relative = subtract(point, camera.target);
  const depth = camera.distance - dot(relative, camera.towardEye);
  // Study meshes and the finite ground grid are always in front of this near plane.
  const safeDepth = Math.max(0.1, depth);
  return {
    x: camera.cx + (camera.focal * dot(relative, camera.right)) / safeDepth,
    y: camera.cy - (camera.focal * dot(relative, camera.up)) / safeDepth,
    depth,
  };
}

/** Keep the complete silhouette inside the sheet, including the extreme cut-angle presets. */
export function studyCamera(
  scene: StudyScene,
  yaw: number,
  elevation: number,
): Camera {
  const vertices = scene.meshes.flatMap((mesh) => mesh.vertices);
  const minY = Math.min(...vertices.map((p) => p.y));
  const maxY = Math.max(...vertices.map((p) => p.y));
  const camera = makeCamera(yaw, elevation, {
    x: 0,
    y: (minY + maxY) / 2,
    z: 0,
  });
  let projected = vertices.map((p) => projectPoint(p, camera));
  const width =
    Math.max(...projected.map((p) => p.x)) -
    Math.min(...projected.map((p) => p.x));
  const height =
    Math.max(...projected.map((p) => p.y)) -
    Math.min(...projected.map((p) => p.y));
  camera.focal *= Math.min(1, 440 / width, 326 / height);
  projected = vertices.map((p) => projectPoint(p, camera));
  camera.cx +=
    360 -
    (Math.min(...projected.map((p) => p.x)) +
      Math.max(...projected.map((p) => p.x))) /
      2;
  camera.cy +=
    226 -
    (Math.min(...projected.map((p) => p.y)) +
      Math.max(...projected.map((p) => p.y))) /
      2;
  return camera;
}

function extruded(name: string, ring: Vec3[], height: number, slope = 0): Mesh {
  const count = ring.length;
  const vertices = [
    ...ring,
    ...ring.map((p) => ({ ...p, y: height + slope * p.x })),
  ];
  const faces: Face[] = [
    { vertices: Array.from({ length: count }, (_, i) => i) },
    {
      vertices: Array.from({ length: count }, (_, i) => 2 * count - 1 - i),
      cut: slope !== 0,
    },
    ...ring.map((_, i) => ({
      vertices: [i, i + count, ((i + 1) % count) + count, (i + 1) % count],
    })),
  ];
  return { name, vertices, faces };
}

function ringPoints(radius: number, count: number, y = 0): Vec3[] {
  return Array.from({ length: count }, (_, i) => ({
    x: radius * Math.cos((2 * Math.PI * i) / count),
    y,
    z: radius * Math.sin((2 * Math.PI * i) / count),
  }));
}

function block(width: number, height: number, depth: number): Mesh {
  return extruded(
    "方体",
    [
      { x: -width / 2, y: 0, z: -depth / 2 },
      { x: width / 2, y: 0, z: -depth / 2 },
      { x: width / 2, y: 0, z: depth / 2 },
      { x: -width / 2, y: 0, z: depth / 2 },
    ],
    height,
  );
}

function cylinder(radius: number, height: number, slope = 0, sides = 64): Mesh {
  return extruded(
    slope ? "斜切圆柱" : "圆柱",
    ringPoints(radius, sides),
    height,
    slope,
  );
}

function cone(radius: number, height: number): Mesh {
  const count = 64;
  return {
    name: "圆锥",
    vertices: [...ringPoints(radius, count), { x: 0, y: height, z: 0 }],
    faces: [
      { vertices: Array.from({ length: count }, (_, i) => i) },
      ...Array.from({ length: count }, (_, i) => ({
        vertices: [i, count, (i + 1) % count],
      })),
    ],
  };
}

function translated(mesh: Mesh, offset: Vec3): Mesh {
  return { ...mesh, vertices: mesh.vertices.map((p) => add(p, offset)) };
}

export function createStudyScene(
  kind: FormKind,
  proportion = 100,
  cutAngle = 24,
): StudyScene {
  const ratio = bounded(proportion, 65, 145, 100) / 100;
  const slope = Math.tan(radians(bounded(cutAngle, -38, 38, 24)));
  const height = 1.85 * ratio;
  let meshes: Mesh[];
  let guides: Guide[] = [];
  const axis = (top: number, x = 0, z = 0): Guide => ({
    kind: "axis",
    points: [
      { x, y: -0.1, z },
      { x, y: top + 0.16, z },
    ],
  });
  if (kind === "group") {
    meshes = [
      translated(block(1.45, 0.82 * ratio, 1.35), { x: -0.8, y: 0, z: -0.2 }),
      translated(cone(0.59, 1.18 * ratio), {
        x: -0.8,
        y: 0.82 * ratio,
        z: -0.2,
      }),
      translated(cylinder(0.52, 1.5 * ratio), { x: 0.85, y: 0, z: 0.4 }),
    ];
    guides = [
      axis(2 * ratio, -0.8, -0.2),
      axis(1.5 * ratio, 0.85, 0.4),
      {
        kind: "section",
        closed: true,
        points: ringPoints(0.52, 64, 0.75 * ratio).map((p) =>
          add(p, { x: 0.85, y: 0, z: 0.4 }),
        ),
      },
    ];
  } else if (kind === "cube" || kind === "block") {
    const width = kind === "cube" ? 1.7 : 2.35;
    const depth = kind === "cube" ? 1.7 : 1.25;
    const h = kind === "cube" ? 1.7 : height;
    meshes = [block(width, h, depth)];
    guides = [
      axis(h),
      {
        kind: "section",
        closed: true,
        points: meshes[0].vertices.slice(0, 4).map((p) => ({ ...p, y: h / 2 })),
      },
    ];
  } else if (kind === "cone") {
    meshes = [cone(0.86, height + 0.25)];
    guides = [
      axis(height + 0.25),
      {
        kind: "section",
        closed: true,
        points: ringPoints(0.43, 64, (height + 0.25) / 2),
      },
    ];
  } else {
    const cut = kind === "cut-cylinder" ? slope : 0;
    meshes = [cylinder(0.84, height, cut, kind === "prism" ? 6 : 64)];
    if (kind === "cut-cylinder") meshes[0].faces[1].cut = true;
    const sectionY =
      kind === "cut-cylinder"
        ? (height - Math.abs(cut) * 0.84) / 2
        : height / 2;
    guides = [
      axis(height),
      {
        kind: "section",
        closed: true,
        points: ringPoints(0.84, kind === "prism" ? 6 : 64, sectionY),
      },
    ];
    if (kind === "cut-cylinder") {
      guides.push({
        kind: "axis",
        points: [
          { x: -0.84, y: height - 0.84 * cut, z: 0 },
          { x: 0.84, y: height + 0.84 * cut, z: 0 },
        ],
      });
    }
  }
  return { meshes, guides };
}

/** Only creases and silhouettes are drawn: smooth-cylinder tessellation stays invisible. */
export function meshEdges(
  mesh: Mesh,
  camera: Camera,
): { a: Vec3; b: Vec3; visible: boolean }[] {
  const edges = new Map<string, { a: number; b: number; faces: number[] }>();
  mesh.faces.forEach((face, faceIndex) =>
    face.vertices.forEach((a, i) => {
      const b = face.vertices[(i + 1) % face.vertices.length];
      const key = [a, b].sort((x, y) => x - y).join(":");
      const edge = edges.get(key) || { a, b, faces: [] };
      edge.faces.push(faceIndex);
      edges.set(key, edge);
    }),
  );
  const visible = mesh.faces.map((face) => faceVisible(mesh, face, camera));
  const normals = mesh.faces.map((face) => faceNormal(mesh, face));
  return [...edges.values()]
    .filter(
      (edge) =>
        edge.faces.length !== 2 ||
        visible[edge.faces[0]] !== visible[edge.faces[1]] ||
        dot(normals[edge.faces[0]], normals[edge.faces[1]]) < 0.96,
    )
    .map((edge) => ({
      a: mesh.vertices[edge.a],
      b: mesh.vertices[edge.b],
      visible: edge.faces.some((i) => visible[i]),
    }));
}

/**
 * The teaching group consists of convex solids whose bounding boxes are separated
 * horizontally or touch at a supporting plane. Those planes give a true occlusion
 * order; centroid depth alone is ambiguous for the cone sitting on its base.
 */
export function orderStudyMeshes(meshes: Mesh[], camera: Camera): Mesh[] {
  const axes = ["x", "y", "z"] as const;
  const bounds = meshes.map(
    (mesh) =>
      Object.fromEntries(
        axes.map((axis) => [
          axis,
          {
            min: Math.min(...mesh.vertices.map((p) => p[axis])),
            max: Math.max(...mesh.vertices.map((p) => p[axis])),
          },
        ]),
      ) as Record<(typeof axes)[number], { min: number; max: number }>,
  );
  const depths = meshes.map(
    (mesh) =>
      mesh.vertices.reduce((sum, p) => sum + projectPoint(p, camera).depth, 0) /
      mesh.vertices.length,
  );
  const dependencies = meshes.map(() => new Set<number>());
  for (let a = 0; a < meshes.length; a++)
    for (let b = a + 1; b < meshes.length; b++) {
      for (const axis of axes) {
        let low = a,
          high = b;
        if (bounds[b][axis].max <= bounds[a][axis].min + 1e-8) {
          low = b;
          high = a;
        } else if (bounds[a][axis].max > bounds[b][axis].min + 1e-8) continue;
        const eye = camera.position[axis];
        // If the eye is in the gap, no forward ray can hit both separated solids.
        if (eye < bounds[low][axis].max - 1e-8) dependencies[low].add(high);
        else if (eye > bounds[high][axis].min + 1e-8)
          dependencies[high].add(low);
        else continue;
        break;
      }
    }
  const remaining = new Set(meshes.map((_, i) => i));
  const result: Mesh[] = [];
  while (remaining.size) {
    const available = [...remaining].filter((i) =>
      [...dependencies[i]].every((j) => !remaining.has(j)),
    );
    // Single or overlapping future study forms retain the ordinary depth fallback.
    const candidates = available.length ? available : [...remaining];
    candidates.sort((a, b) => depths[b] - depths[a] || a - b);
    const next = candidates[0];
    result.push(meshes[next]);
    remaining.delete(next);
  }
  return result;
}

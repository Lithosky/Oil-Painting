import {
  ALL_COLORS,
  PaintColor,
  mixPaints,
  rgbToHex,
  rgbToLab,
  rgbToHsl,
  deltaE,
} from "./colors";

export type RGB = [number, number, number];
export interface Mixture {
  color: PaintColor;
  parts: number;
}
export interface MixLesson {
  id: string;
  title: string;
  subtitle: string;
  concept: string;
  prompt: string;
  realPractice: string;
  paletteIds: string[];
  recipes: [string, number][][];
}
export const STARTER_IDS = [
  "w-tw",
  "m-ib",
  "m-ly",
  "w-cym",
  "w-crl",
  "w-ac",
  "w-ul",
  "w-pb",
  "m-yo",
  "m-bs",
  "m-bu",
  "m-sg",
];
export const STARTER_COLORS = STARTER_IDS.map(
  (id) => ALL_COLORS.find((c) => c.id === id)!,
);
export const MIX_LESSONS: MixLesson[] = [
  {
    id: "value",
    title: "先看明暗",
    subtitle: "只用黑白 · 约 3 分钟",
    concept: "先判断颜色是亮还是暗。把色相拿掉，明度关系就更容易看清。",
    prompt: "用钛白与象牙黑，调出右侧这块灰。少量加黑，观察每一次变化。",
    realPractice:
      "在纸上画 5 个小方格，用黑白画出从亮到暗的 5 级灰阶。眯眼看，检查相邻两格是否拉开。",
    paletteIds: ["w-tw", "m-ib"],
    recipes: [
      [
        ["w-tw", 4],
        ["m-ib", 1],
      ],
      [
        ["w-tw", 2],
        ["m-ib", 3],
      ],
      [
        ["w-tw", 5],
        ["m-ib", 2],
      ],
      [
        ["w-tw", 1],
        ["m-ib", 4],
      ],
    ],
  },
  {
    id: "hue",
    title: "调出一片绿",
    subtitle: "两色混合 · 约 4 分钟",
    concept:
      "同样是黄和蓝，比例变化也会让绿偏黄或偏蓝。每次只改一个比例，更容易记住方向。",
    prompt: "从柠檬黄和群青开始。先判断目标偏黄绿还是蓝绿，再调整比例。",
    realPractice:
      "用你手边的一种黄与一种蓝，画 5 格渐变并记下大致比例。不同颜料会得到不同的绿，亲手试色才是你的色谱。",
    paletteIds: ["m-ly", "w-ul", "w-tw"],
    recipes: [
      [
        ["m-ly", 3],
        ["w-ul", 2],
      ],
      [
        ["m-ly", 1],
        ["w-ul", 3],
      ],
      [
        ["m-ly", 5],
        ["w-ul", 1],
      ],
      [
        ["m-ly", 3],
        ["w-ul", 2],
        ["w-tw", 1],
      ],
    ],
  },
  {
    id: "muted",
    title: "让鲜色安静下来",
    subtitle: "降低彩度 · 约 4 分钟",
    concept:
      "自然物很少处处鲜艳。少量对比色能让颜色趋向中性，但通常也会改变明度。",
    prompt:
      "用橙色、群青和钛白调出目标灰色调。先找主色，少量加入另一色，再观察明暗。",
    realPractice:
      "把一小堆橙色分成 4 份，逐份加入少量蓝色。并排比较它们的鲜灰与明暗，别一次把整堆颜料调灰。",
    paletteIds: ["m-co", "w-ul", "w-tw"],
    recipes: [
      [
        ["m-co", 3],
        ["w-ul", 2],
        ["w-tw", 2],
      ],
      [
        ["m-co", 4],
        ["w-ul", 1],
        ["w-tw", 3],
      ],
      [
        ["m-co", 2],
        ["w-ul", 3],
        ["w-tw", 2],
      ],
      [
        ["m-co", 2],
        ["w-ul", 2],
        ["w-tw", 4],
      ],
    ],
  },
  {
    id: "earth",
    title: "找到自然的土色",
    subtitle: "有限色板 · 约 5 分钟",
    concept: "用少数几支常见颜色练习，更容易掌握主色、明暗和冷暖的关系。",
    prompt:
      "用土黄、熟赭、群青、钛白寻找目标色。先用黄与赭打底，再微调明度和冷暖。",
    realPractice:
      "找一只纸盒或陶杯，观察受光、半明与背光 3 个大色块。先比较明暗，再分别调色，不急着画细节。",
    paletteIds: ["m-yo", "m-bs", "w-ul", "w-tw"],
    recipes: [
      [
        ["m-yo", 3],
        ["m-bs", 1],
        ["w-tw", 3],
      ],
      [
        ["m-bs", 4],
        ["w-ul", 1],
        ["w-tw", 2],
      ],
      [
        ["m-yo", 2],
        ["w-ul", 1],
        ["w-tw", 3],
      ],
      [
        ["m-yo", 2],
        ["m-bs", 2],
        ["w-tw", 5],
      ],
    ],
  },
];
export function lessonRecipe(lesson: MixLesson, variant: number): Mixture[] {
  return lesson.recipes[variant % lesson.recipes.length].map(([id, parts]) => ({
    color: ALL_COLORS.find((c) => c.id === id)!,
    parts,
  }));
}
export function mixtureRgb(mixture: Mixture[]): RGB {
  return mixPaints(mixture.map((c) => ({ rgb: c.color.rgb, ratio: c.parts })));
}
export function mixtureHex(mixture: Mixture[]): string {
  return rgbToHex(...mixtureRgb(mixture));
}
export function hueLabel(rgb: RGB): string {
  const [h, s] = rgbToHsl(...rgb);
  if (s < 8) return "中性灰";
  return [
    "红",
    "橙",
    "黄",
    "黄绿",
    "绿",
    "青绿",
    "青",
    "青蓝",
    "蓝",
    "蓝紫",
    "紫",
    "紫红",
  ][Math.round(h / 30) % 12];
}
export function colorFeedback(target: RGB, mixed: RGB) {
  const t = rgbToLab(...target),
    m = rgbToLab(...mixed);
  const targetChroma = Math.hypot(t[1], t[2]),
    mixedChroma = Math.hypot(m[1], m[2]);
  const lightness = m[0] - t[0],
    chroma = mixedChroma - targetChroma;
  return [
    {
      name: "明度",
      label:
        Math.abs(lightness) < 3 ? "明暗接近" : lightness > 0 ? "偏亮" : "偏暗",
      good: Math.abs(lightness) < 3,
      text:
        Math.abs(lightness) < 3
          ? "先保住这个明暗关系。"
          : lightness > 0
            ? "减少白色，或少量加入较暗的色。"
            : "少量加白或提高亮色比例，再比较。",
    },
    {
      name: "彩度",
      label: Math.abs(chroma) < 5 ? "鲜灰接近" : chroma > 0 ? "偏鲜艳" : "偏灰",
      good: Math.abs(chroma) < 5,
      text:
        Math.abs(chroma) < 5
          ? "鲜艳程度已在附近。"
          : chroma > 0
            ? "试着加入少量对比色，留意明暗也会改变。"
            : "试着减少中和色，提高主色比例。",
    },
    {
      name: "色相",
      label: targetChroma < 6 ? "目标接近中性" : `向${hueLabel(target)}靠近`,
      good: targetChroma < 6 || Math.hypot(t[1] - m[1], t[2] - m[2]) < 6,
      text:
        targetChroma < 6
          ? "先把明度与彩度调好，再看细微偏色。"
          : `目标偏${hueLabel(target)}，当前偏${hueLabel(mixed)}；每次只微调一种色。`,
    },
  ];
}
export function suggestNextColor(
  target: RGB,
  selected: Mixture[],
  palette: PaintColor[],
): string {
  const total = selected.reduce((sum, item) => sum + item.parts, 0);
  if (total <= 0) return "先选一种主色，加入调色盘，再做比较。";
  const currentError = deltaE(target, mixtureRgb(selected));
  if (currentError < 3)
    return "已经很接近，先检验并记下配方，再到纸上做一小块试色。";
  let best = currentError,
    colorName = "";
  for (const color of palette) {
    for (const extra of [0.05, 0.15]) {
      const nextError = deltaE(
        target,
        mixtureRgb([...selected, { color, parts: total * extra }]),
      );
      if (nextError < best - 0.1) {
        best = nextError;
        colorName = color.name;
      }
    }
  }
  return colorName
    ? `下一步试着少量增加「${colorName}」，再看明度与彩度的变化。这是当前屏幕模型下的试调方向。`
    : "当前色板下加色帮助不大，先减少比例最大的颜色，或清空后换一种主色重新开始。";
}

export const MIX_STORAGE_KEY = "atelier-mix-progress-v1";
export interface MixAttempt {
  id: string;
  label: string;
  targetHex: string;
  mixedHex: string;
  score: number;
  recipe: { colorId: string; parts: number }[];
  createdAt: string;
  assisted?: boolean;
}
export interface MixProgress {
  version: 1;
  completed: string[];
  attempts: MixAttempt[];
}
export function parseMixProgress(raw: string | null): MixProgress {
  const empty: MixProgress = { version: 1, completed: [], attempts: [] };
  try {
    const p = JSON.parse(raw ?? "null");
    if (!p || p.version !== 1) return empty;
    const completed = Array.isArray(p.completed)
      ? p.completed.filter(
          (id: unknown) =>
            typeof id === "string" && MIX_LESSONS.some((l) => l.id === id),
        )
      : [];
    const attempts = Array.isArray(p.attempts)
      ? p.attempts.filter(
          (a: MixAttempt) =>
            a &&
            typeof a.id === "string" &&
            typeof a.label === "string" &&
            /^#[0-9a-f]{6}$/i.test(a.targetHex) &&
            /^#[0-9a-f]{6}$/i.test(a.mixedHex) &&
            Number.isFinite(a.score) &&
            a.score >= 0 &&
            a.score <= 100 &&
            typeof a.createdAt === "string" &&
            Array.isArray(a.recipe) &&
            a.recipe.length > 0 &&
            a.recipe.every(
              (r) =>
                r &&
                ALL_COLORS.some((c) => c.id === r.colorId) &&
                Number.isFinite(r.parts) &&
                r.parts >= 0 &&
                r.parts <= 100,
            ),
        )
      : [];
    return {
      version: 1,
      completed: [...new Set<string>(completed)],
      attempts: attempts.slice(0, 20),
    };
  } catch {
    return empty;
  }
}

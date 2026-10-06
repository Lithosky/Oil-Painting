export const OIL_PROGRESS_KEY = "atelier-oil-progress-v1";
export const OIL_LESSONS = [
  {
    id: "relative-color",
    title: "颜色会互相影响",
    subtitle: "把颜色放回它的环境",
    duration: "4 分钟",
    task: "先判断两块中心色是否相同，再移开背景。换一组环境，重做一次观察。",
    question: "一块调好的灰，放到画布上却显得不一样，下一步怎么做？",
    choices: [
      "立即加白，直到它看起来更亮",
      "先和旁边的颜色、明暗一起比较",
      "只看调色板上的那一小块颜色",
    ],
    answer: 1,
    explanation:
      "邻近颜色和明暗会改变我们的观看感受。先比较它与周围的关系，再决定要改亮暗、冷暖还是鲜灰；不要仅凭孤立色块下判断。",
    practiceTitle: "一块灰，两种环境",
    practice: [
      "用同一管灰色笔，或同一份调好的颜料，做两块大小相同的色块。",
      "分别把它放在深色和浅色纸上；再剪一个小孔，只露出中心色，比较感受。",
      "画静物时，每调一块色，都先与背景、邻近物体比一比，再落笔。",
    ],
    sourceTitle: "英国国家美术馆 · 印象派与颜色对比",
    sourceUrl:
      "https://www.nationalgallery.org.uk/paintings/learn-about-art/guide-to-impressionism?viewPage=3",
  },
  {
    id: "value-masses",
    title: "先画三大明暗",
    subtitle: "把细节归进大色块",
    duration: "5 分钟",
    task: "从原色切到灰度，再看三阶归纳。调整分界，观察哪些花朵或背景被归进同一大块。",
    question: "把名画变成三阶灰后，怎样用它来起稿？",
    choices: [
      "逐个描下所有碎片的轮廓",
      "颜色越多，起稿就一定越准确",
      "自己合并相邻小块，先画清楚大明暗关系",
    ],
    answer: 2,
    explanation:
      "灰度分组帮助你看清明暗分布，但不会替你完成构图。先眯眼找大的亮、中、暗形状，主动合并零碎细节，之后才逐步细化。",
    practiceTitle: "用三种深浅，画一张小稿",
    practice: [
      "在纸上画一个约 6 × 8 厘米的小框；准备浅、中、深三个灰度。铅笔也可以。",
      "只画背景、主体、投影的大形状，把小笔触合进附近的大块；先不画花瓣或五官。",
      "退远一步：主体是否仍然清楚？若不清楚，先调整大块的面积与明暗，再增加细节。",
    ],
    sourceTitle: "Getty · 明度的含义与视觉分析",
    sourceUrl:
      "https://www.getty.edu/education/teachers/classroom_resources/formal_analysis.html",
  },
  {
    id: "edge-control",
    title: "让边缘有主次",
    subtitle: "硬边、软边与消失的边",
    duration: "5 分钟",
    task: "把中间一块的过渡调宽，再让右边色块的右侧融入背景。比较：变软与消失有什么区别？",
    question: "一个物体的部分轮廓几乎看不见，可能是什么原因？",
    choices: [
      "轮廓附近的颜色和明暗接近背景",
      "画家给所有边缘都画了黑线",
      "物体越远，轮廓就一定完全消失",
    ],
    answer: 0,
    explanation:
      "软边是有宽度的渐变；消失的边是相邻区域非常接近，局部轮廓难以分辨。用少量清楚的边说明形状，其余边缘依照观察处理，画面就不必处处一样抢眼。",
    practiceTitle: "一只杯子，三种边缘",
    practice: [
      "把浅色杯子放在有明暗变化的背景前。眯眼寻找最清楚、较柔和、最难分辨的三段轮廓。",
      "用三到五个色块先画体积，保留一小段清楚的边；在观察到的地方轻接两侧颜色形成软边。",
      "在轮廓与背景接近的地方，不额外勾线。离远看，能否凭其余线索认出杯子？",
    ],
    sourceTitle: "英国国家美术馆 · Sfumato 的渐变与轮廓",
    sourceUrl: "https://www.nationalgallery.org.uk/paintings/glossary/sfumato",
  },
] as const;

export type OilLessonId = (typeof OIL_LESSONS)[number]["id"];
export type ValueMode = "color" | "gray" | "three" | "five";

export function parseOilProgress(raw: string | null): OilLessonId[] {
  try {
    const saved = JSON.parse(raw || "{}");
    if (!saved || !Array.isArray(saved.completed)) return [];
    return Array.from(
      new Set<OilLessonId>(
        saved.completed.filter((id: unknown) =>
          OIL_LESSONS.some((lesson) => lesson.id === id),
        ),
      ),
    );
  } catch {
    return [];
  }
}

/** Convert sRGB to a neutral sRGB gray with the same relative luminance. */
export function luminanceGray(r: number, g: number, b: number): number {
  const linear = (value: number) => {
    const c = Math.max(0, Math.min(255, value)) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const y = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return Math.round(
    255 * (y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055),
  );
}

export function valueGroup(
  gray: number,
  darkBoundary: number,
  lightBoundary: number,
): 0 | 1 | 2 {
  return gray < darkBoundary ? 0 : gray < lightBoundary ? 1 : 2;
}

export function renderValuePixels(
  source: Uint8ClampedArray,
  mode: ValueMode,
  darkBoundary: number,
  lightBoundary: number,
) {
  const pixels = new Uint8ClampedArray(source);
  const counts = [0, 0, 0];
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = luminanceGray(source[i], source[i + 1], source[i + 2]);
    const group = valueGroup(gray, darkBoundary, lightBoundary);
    if (source[i + 3] > 0) counts[group]++;
    if (mode === "color") continue;
    const value =
      mode === "gray"
        ? gray
        : mode === "three"
          ? [42, 133, 226][group]
          : Math.round(gray / 63.75) * 63.75;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
  }
  const total = counts.reduce((sum, count) => sum + count, 0);
  const percentages = counts.map((count) =>
    total ? Math.floor((count * 100) / total) : 0,
  );
  if (total) {
    // Largest remainders keep the visible integer shares at exactly 100%.
    // Integer remainders also give equal groups a deterministic dark-first tie.
    const order = counts
      .map((count, index) => ({ index, remainder: (count * 100) % total }))
      .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    const remaining = 100 - percentages.reduce((sum, value) => sum + value, 0);
    for (let i = 0; i < remaining; i++) percentages[order[i].index]++;
  }
  return { pixels, percentages };
}

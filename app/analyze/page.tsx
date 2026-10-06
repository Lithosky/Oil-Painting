"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  FAMOUS_PAINTINGS,
  PAINTERS,
  PAINTING_SUBJECTS,
  STUDY_TOPICS,
  type Painting,
} from "@/lib/paintings";
import { rgbToHex, rgbToHsl, hexToRgb } from "@/lib/colors";
import { proxyImg } from "@/lib/imgProxy";
import PaintingImage from "@/components/PaintingImage";

type RGB = [number, number, number];
interface ExtractedColor {
  hex: string;
  rgb: RGB;
  percentage: number | null;
  name: string;
}

function describeColor(rgb: RGB): string {
  const [h, s, l] = rgbToHsl(...rgb);
  if (l > 92) return "近白色";
  if (l < 8) return "近黑色";
  if (s < 15) return l > 50 ? "浅灰" : "深灰";
  const hues: [number, number, string][] = [
    [0, 15, "红"],
    [15, 40, "橙红"],
    [40, 65, "黄"],
    [65, 90, "黄绿"],
    [90, 150, "绿"],
    [150, 190, "青绿"],
    [190, 220, "青蓝"],
    [220, 255, "蓝"],
    [255, 290, "蓝紫"],
    [290, 330, "紫"],
    [330, 360, "紫红"],
  ];
  const hue = hues.find(([a, b]) => h >= a && h < b)?.[2] ?? "彩色";
  return `${l > 65 ? "浅" : l < 35 ? "深" : ""}${s < 30 ? "灰" : ""}${hue}`;
}

const distance = (a: RGB, b: RGB) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/** Small deterministic RGB clusters. Coverage refers to sampled opaque pixels only. */
function extractDominantColors(imageData: ImageData, k = 7): ExtractedColor[] {
  const pixels: RGB[] = [];
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] >= 128) pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (!pixels.length) return [];
  const centers: RGB[] = [[...pixels[0]]];
  while (centers.length < Math.min(k, pixels.length)) {
    let farthest = pixels[0],
      maxDistance = 0;
    for (const pixel of pixels) {
      const d = Math.min(...centers.map((c) => distance(pixel, c)));
      if (d > maxDistance) {
        maxDistance = d;
        farthest = pixel;
      }
    }
    if (maxDistance === 0) break;
    centers.push([...farthest]);
  }
  const nearest = (pixel: RGB) =>
    centers.reduce(
      (best, center, i) =>
        distance(pixel, center) < distance(pixel, centers[best]) ? i : best,
      0,
    );
  for (let iteration = 0; iteration < 15; iteration++) {
    const totals = centers.map(() => ({ count: 0, rgb: [0, 0, 0] as RGB }));
    for (const pixel of pixels) {
      const cluster = totals[nearest(pixel)];
      cluster.count++;
      pixel.forEach((v, i) => {
        cluster.rgb[i] += v;
      });
    }
    let moved = false;
    totals.forEach((cluster, i) => {
      if (!cluster.count) return;
      const next = cluster.rgb.map((v) => Math.round(v / cluster.count)) as RGB;
      if (distance(next, centers[i]) > 0) moved = true;
      centers[i] = next;
    });
    if (!moved) break;
  }
  const counts = centers.map(() => 0);
  pixels.forEach((pixel) => {
    counts[nearest(pixel)]++;
  });
  const result = centers
    .map((rgb, i) => ({
      hex: rgbToHex(...rgb),
      rgb,
      percentage: (counts[i] / pixels.length) * 100,
      name: describeColor(rgb),
    }))
    .filter((c) => c.percentage >= 0.5)
    .sort((a, b) => b.percentage - a.percentage);
  const total = result.reduce((sum, c) => sum + c.percentage, 0);
  const percentages = result.map((c) =>
    Math.floor((c.percentage / total) * 100),
  );
  const remainderOrder = result
    .map((c, i) => ({
      i,
      fraction: (c.percentage / total) * 100 - percentages[i],
    }))
    .sort((a, b) => b.fraction - a.fraction);
  const remainder = 100 - percentages.reduce((sum, p) => sum + p, 0);
  for (let i = 0; i < remainder; i++) percentages[remainderOrder[i].i]++;
  return result.map((c, i) => ({ ...c, percentage: percentages[i] }));
}

export default function AnalyzePage() {
  const [mode, setMode] = useState<"famous" | "upload">("famous");
  const [painting, setPainting] = useState<Painting>(FAMOUS_PAINTINGS[0]);
  const [painter, setPainter] = useState("");
  const [subject, setSubject] = useState("");
  const [studyTopic, setStudyTopic] = useState("");
  const [newOnly, setNewOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [colors, setColors] = useState<ExtractedColor[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedImg, setUploadedImg] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("我的参考图片");
  const [error, setError] = useState("");
  const [referenceOnly, setReferenceOnly] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [retry, setRetry] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const source = mode === "famous" ? proxyImg(painting.imageUrl) : uploadedImg;

  useEffect(
    () => () => {
      if (uploadedImg) URL.revokeObjectURL(uploadedImg);
    },
    [uploadedImg],
  );

  useEffect(() => {
    setColors([]);
    setError("");
    setReferenceOnly(false);
    setAnalyzing(Boolean(source));
    if (!source) return;
    let active = true;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    const fail = () => {
      if (!active) return;
      active = false;
      clearTimeout(timer);
      if (mode === "famous") {
        setColors(
          painting.dominantColors.map((hex) => {
            const rgb = hexToRgb(hex) as RGB;
            return { hex, rgb, percentage: null, name: describeColor(rgb) };
          }),
        );
        setReferenceOnly(true);
        setError(
          "图片暂时无法读取，下面显示预设参考色。参考色没有实测面积占比。",
        );
      } else
        setError("无法读取这张图片，请重新选择有效的 JPG、PNG 或 WebP 图片。");
      setAnalyzing(false);
    };
    const timer = window.setTimeout(fail, 15000);
    img.onload = () => {
      if (!active) return;
      try {
        if (!img.naturalWidth || !img.naturalHeight)
          throw new Error("Empty image");
        const scale = Math.min(
          1,
          200 / Math.max(img.naturalWidth, img.naturalHeight),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const extracted = extractDominantColors(
          ctx.getImageData(0, 0, canvas.width, canvas.height),
        );
        if (!extracted.length) throw new Error("No opaque pixels");
        setColors(extracted);
        setAnalyzing(false);
        active = false;
        clearTimeout(timer);
      } catch {
        fail();
      }
    };
    img.onerror = fail;
    img.src = source;
    return () => {
      active = false;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      img.src = "";
    };
  }, [source, mode, painting, retry]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("请选择 JPG、PNG 或 WebP 格式。");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("图片超过 12 MB，请缩小后重试。");
      return;
    }
    setUploadName(file.name);
    setUploadedImg(URL.createObjectURL(file));
  };
  const filtered = FAMOUS_PAINTINGS.filter(
    (p) =>
      (!painter || p.artistZh === painter) &&
      (!subject || p.subject === subject) &&
      (!studyTopic || p.studyTags?.includes(studyTopic)) &&
      (!newOnly || p.id.startsWith("aic-")) &&
      (!search.trim() ||
        `${p.titleZh} ${p.artistZh} ${p.title} ${p.artist}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())),
  );
  const colorStyle = { color: "var(--ink-3)" };
  const newCount = FAMOUS_PAINTINGS.filter((p) =>
    p.id.startsWith("aic-"),
  ).length;
  const hasFilters = Boolean(
    painter || subject || studyTopic || newOnly || search,
  );
  const clearFilters = () => {
    setPainter("");
    setSubject("");
    setStudyTopic("");
    setNewOnly(false);
    setSearch("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p
            className="text-xs uppercase tracking-[0.2em] mb-2"
            style={{ color: "var(--viridian)" }}
          >
            LOOK CLOSELY · 观察室
          </p>
          <h1
            className="text-3xl font-semibold"
            style={{ color: "var(--ink)" }}
          >
            从名画里，借一抹颜色。
          </h1>
          <p className="text-sm mt-2" style={colorStyle}>
            {FAMOUS_PAINTINGS.length} 幅名画，{STUDY_TOPICS.length}{" "}
            种观察方向。先观察明暗，再把喜欢的一笔带到调色台。
          </p>
        </div>
        <Link href="/sketch" className="btn-secondary text-sm">
          练习素描基础 ↗
        </Link>
      </div>
      <div
        className="flex gap-1.5 p-1 rounded-xl w-fit"
        style={{
          background: "var(--parchment)",
          border: "1px solid var(--border)",
        }}
      >
        {(["famous", "upload"] as const).map((m) => (
          <button
            key={m}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className="px-5 py-2 rounded-lg text-sm font-medium"
            style={{
              background: mode === m ? "var(--card)" : "transparent",
              color: mode === m ? "var(--viridian)" : "var(--ink-2)",
            }}
          >
            {m === "famous" ? "名画观察" : "上传我的参考"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-6">
        <div className="space-y-4 min-w-0">
          {mode === "famous" ? (
            <>
              <div className="art-card p-4 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <p className="text-sm font-semibold">今天想练什么？</p>
                  <span className="text-xs" style={colorStyle}>
                    先选一个目标，比看很多幅更有用
                  </span>
                </div>
                <div
                  className="flex flex-wrap gap-2"
                  aria-label="按学习目标筛选"
                >
                  {["", ...STUDY_TOPICS].map((topic) => (
                    <button
                      key={topic || "all"}
                      type="button"
                      aria-pressed={studyTopic === topic}
                      onClick={() => setStudyTopic(topic)}
                      className="rounded-full px-3 py-1.5 text-xs transition-colors"
                      style={{
                        background:
                          studyTopic === topic
                            ? "var(--viridian)"
                            : "var(--parchment)",
                        color: studyTopic === topic ? "#fff" : "var(--ink-2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {topic || "自由观察"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  aria-label="搜索画作或画家"
                  type="search"
                  placeholder="搜索画作或画家…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="min-w-[200px] flex-1 px-3 py-2 rounded-xl text-sm"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                />
                <select
                  aria-label="按画家筛选"
                  value={painter}
                  onChange={(e) => setPainter(e.target.value)}
                  className="max-w-[45%] px-2 py-2 rounded-xl text-sm"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <option value="">全部画家</option>
                  {PAINTERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="按题材筛选"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="px-2 py-2 rounded-xl text-sm"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <option value="">全部题材</option>
                  {PAINTING_SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-secondary text-sm"
                  disabled={filtered.length === 0}
                  onClick={() => {
                    const pool = filtered.filter((p) => p.id !== painting.id);
                    if (pool.length)
                      setPainting(
                        pool[Math.floor(Math.random() * pool.length)],
                      );
                  }}
                >
                  随机看一幅
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <p style={colorStyle} role="status">
                  找到 {filtered.length} 幅 / 共 {FAMOUS_PAINTINGS.length} 幅
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-pressed={newOnly}
                    onClick={() => setNewOnly((v) => !v)}
                    className="rounded-full px-3 py-1.5"
                    style={{
                      background: newOnly
                        ? "var(--viridian-lt)"
                        : "var(--parchment)",
                      color: "var(--viridian)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {newOnly ? "✓ " : "+ "}新增馆藏 {newCount} 幅
                  </button>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="underline"
                      style={colorStyle}
                    >
                      清除筛选
                    </button>
                  )}
                </div>
              </div>
              <div
                className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1"
                aria-label="名画列表"
              >
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPainting(p)}
                    title={`${p.titleZh} · ${p.artistZh}`}
                    aria-pressed={painting.id === p.id}
                    className="rounded-lg overflow-hidden text-left painting-thumb"
                    style={{
                      border: `2px solid ${painting.id === p.id ? "var(--viridian)" : "var(--border)"}`,
                    }}
                  >
                    <PaintingImage
                      src={proxyImg(p.imageUrl)}
                      alt={p.titleZh}
                      dominantColors={p.dominantColors}
                      className="w-full h-20 object-cover"
                      loading="lazy"
                    />
                    <div
                      className="p-1.5 text-[11px]"
                      style={{ background: "var(--card)" }}
                    >
                      <p className="truncate">{p.titleZh}</p>
                      <p
                        className="truncate mt-0.5 text-[10px]"
                        style={colorStyle}
                      >
                        {p.subject} · {p.studyTags?.[0]}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              {!filtered.length && (
                <p className="text-sm" style={colorStyle}>
                  没有找到画作，试试其他关键词。
                </p>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed rounded-2xl p-7 text-center"
                style={{
                  borderColor: "var(--border-dk)",
                  background: "var(--parchment)",
                }}
              >
                <span className="block font-medium">选择一张想画的图片</span>
                <span className="block text-xs mt-2" style={colorStyle}>
                  JPG、PNG、WebP · 最大 12 MB · 图片仅在本机浏览器中处理
                </span>
              </button>
              <input
                aria-label="上传参考图片"
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          )}
          {source && (
            <div className="art-card overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold truncate">
                    {mode === "famous" ? painting.titleZh : uploadName}
                  </h2>
                  {mode === "famous" && (
                    <p className="text-xs mt-1" style={colorStyle}>
                      {painting.artistZh} · {painting.year}
                    </p>
                  )}
                </div>
                <button
                  aria-pressed={grayscale}
                  onClick={() => setGrayscale((v) => !v)}
                  className="btn-secondary text-xs shrink-0"
                >
                  {grayscale ? "恢复彩色" : "查看黑白"}
                </button>
              </div>
              <PaintingImage
                key={`${source}-${retry}`}
                src={source}
                alt={mode === "famous" ? painting.titleZh : uploadName}
                dominantColors={
                  mode === "famous" ? painting.dominantColors : ["#DEDACF"]
                }
                className="w-full h-72 sm:h-96 object-contain"
                style={{
                  background: "var(--parchment)",
                  filter: grayscale ? "grayscale(1)" : undefined,
                }}
              />
              <p className="p-4 text-xs leading-relaxed" style={colorStyle}>
                {grayscale
                  ? "眯起眼看：最亮和最暗的区域在哪里？先用铅笔画出亮、中、暗三块，再回到彩色观察。"
                  : "先找面积最大的颜色，再找最亮的地方。选右侧一个颜色，试着亲手调出来。"}
              </p>
              {mode === "famous" && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[painting.subject, ...(painting.studyTags ?? [])]
                      .filter(Boolean)
                      .map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full px-2.5 py-1 text-[11px]"
                          style={{
                            background: "var(--parchment)",
                            color: "var(--ink-2)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                  {painting.sourceUrl && (
                    <p
                      className="text-[11px] leading-relaxed"
                      style={colorStyle}
                    >
                      图片来源：
                      <a
                        href={painting.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {painting.museum} ↗
                      </a>
                      {" · "}
                      <a
                        href={painting.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {painting.license}
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-4" aria-live="polite">
          {error && (
            <div
              role="alert"
              className="rounded-xl p-4 text-sm leading-relaxed"
              style={{
                background: "var(--parchment)",
                border: "1px solid var(--border-dk)",
              }}
            >
              {error}
              {referenceOnly && (
                <button
                  onClick={() => setRetry((n) => n + 1)}
                  className="underline ml-2"
                >
                  重新读取
                </button>
              )}
            </div>
          )}
          {analyzing ? (
            <div
              role="status"
              className="art-card p-12 text-center text-sm"
              style={colorStyle}
            >
              正在从图片中提取颜色…
            </div>
          ) : colors.length ? (
            <>
              <div className="art-card p-5 space-y-4">
                <div>
                  <h2 className="font-semibold">
                    {referenceOnly ? "参考色板" : "这幅画的主要色群"}
                  </h2>
                  <p
                    className="text-xs leading-relaxed mt-1.5"
                    style={colorStyle}
                  >
                    {referenceOnly
                      ? "作品资料中的预设色板，可作为练习灵感。"
                      : "对缩小后的图片进行颜色聚类；占比为近似值，已四舍五入。提取结果保留原图色彩。"}
                  </p>
                </div>
                <div
                  className="h-14 rounded-xl overflow-hidden flex"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {colors.map((c, i) => (
                    <div
                      key={i}
                      style={{ flex: c.percentage ?? 1, background: c.hex }}
                      title={`${c.name}${c.percentage === null ? "" : ` · 约 ${c.percentage}%`}`}
                    />
                  ))}
                </div>
                <div className="space-y-1">
                  {colors.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-2 border-b last:border-b-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl shrink-0"
                        style={{
                          background: c.hex,
                          border: "1px solid var(--border)",
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {c.name}
                          {c.percentage !== null && (
                            <span className="text-xs ml-2" style={colorStyle}>
                              约 {c.percentage}%
                            </span>
                          )}
                        </p>
                        <p
                          className="text-xs font-mono mt-0.5"
                          style={colorStyle}
                        >
                          {c.hex.toUpperCase()}
                        </p>
                      </div>
                      <Link
                        href={`/mix?target=${encodeURIComponent(c.hex)}`}
                        className="btn-secondary text-xs px-3 py-2"
                      >
                        练这个色 ↗
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{
                  background: "var(--viridian-lt)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-xs tracking-wider font-semibold"
                  style={{ color: "var(--viridian)" }}
                >
                  把观察变成练习 · 5 分钟
                </p>
                {mode === "famous" && painting.studyPrompt && (
                  <div
                    className="rounded-xl p-3.5"
                    style={{ background: "var(--card)" }}
                  >
                    <p
                      className="text-xs font-semibold"
                      style={{ color: "var(--viridian)" }}
                    >
                      这一幅，重点看这里
                    </p>
                    <p
                      className="text-sm leading-relaxed mt-2"
                      style={{ color: "var(--ink-2)" }}
                    >
                      {painting.studyPrompt}
                    </p>
                  </div>
                )}
                <ol
                  className="text-sm leading-relaxed space-y-2 list-decimal pl-5"
                  style={{ color: "var(--ink-2)" }}
                >
                  <li>切到黑白，用铅笔概括亮、中、暗三块。</li>
                  <li>回到彩色，选一个主色，在调色台尝试 2–3 种颜料。</li>
                  <li>在纸上涂一块真实色样，比较它是偏亮、偏灰，还是偏冷。</li>
                </ol>
                <p className="text-xs leading-relaxed" style={colorStyle}>
                  屏幕颜色会受图片和显示器影响。数字练习用于训练观察，实际颜料要通过小色样校准。
                </p>
              </div>
            </>
          ) : (
            !analyzing &&
            !error && (
              <div
                className="art-card p-12 text-center text-sm"
                style={colorStyle}
              >
                上传图片后，主色会出现在这里。
                <br />
                <span className="block mt-2">从一块颜色开始，就很好。</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

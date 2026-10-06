"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { FAMOUS_PAINTINGS, type Painting } from "@/lib/paintings";
import { proxyImg } from "@/lib/imgProxy";
import PaintingImage from "@/components/PaintingImage";
import {
  MARIE_COLORS,
  type PaintColor,
  deltaE,
  hexToRgb,
  rgbToLab,
} from "@/lib/colors";

interface SelectedColor {
  color: PaintColor;
  weight: number;
}
interface PaintingMatch {
  painting: Painting;
  distance: number;
}
const SERIES_ORDER = [
  "白/黑",
  "黄色系",
  "橙色系",
  "红色系",
  "紫色系",
  "蓝色系",
  "绿色系",
  "褐色系",
];
const PRESETS = [
  { name: "暖光静物", colors: ["#DDAF54", "#B46336", "#435A51", "#EAE0C9"] },
  { name: "冷暖对照", colors: ["#3D608F", "#DC9857", "#ADA78D", "#F0E6CC"] },
  { name: "灰调风景", colors: ["#788C79", "#A5A79B", "#606976", "#CFC3A5"] },
];

function customColor(hex: string): PaintColor {
  const normalized = hex.toUpperCase();
  return {
    id: `custom-${normalized}`,
    name: normalized,
    nameEn: "Custom",
    hex: normalized,
    rgb: hexToRgb(normalized),
    series: "自定义",
  };
}

/** Bidirectional palette distance; preset painting colors have unknown coverage. */
function matchPaintings(selected: SelectedColor[]): PaintingMatch[] {
  if (!selected.length) return [];
  const totalWeight = selected.reduce((sum, c) => sum + c.weight, 0);
  return FAMOUS_PAINTINGS.map((painting) => {
    const reference = painting.dominantColors.map(hexToRgb);
    const forward = selected.reduce(
      (sum, s) =>
        sum +
        (Math.min(...reference.map((c) => deltaE(s.color.rgb, c))) * s.weight) /
          totalWeight,
      0,
    );
    const backward =
      reference.reduce(
        (sum, c) =>
          sum + Math.min(...selected.map((s) => deltaE(c, s.color.rgb))),
        0,
      ) / reference.length;
    return { painting, distance: (forward + backward) / 2 };
  }).sort((a, b) => a.distance - b.distance);
}

function observation(selected: SelectedColor[]): string {
  if (!selected.length) return "";
  if (selected.length === 1)
    return "单色也能画出丰富层次。先用这一色练习从亮到暗的五阶变化，再考虑增加颜色。";
  const values = selected.map((c) => rgbToLab(...c.color.rgb)[0]);
  const span = Math.max(...values) - Math.min(...values);
  const message =
    span < 25
      ? "这些颜色的明度比较接近。切到黑白看一看；如果想让主体更突出，可以加入一块明显更亮或更暗的颜色。"
      : "色板里已经有比较明显的明暗差异。选一色作为大面积主色，把最强的对比留给你想让人先看到的地方。";
  return selected.length >= 6
    ? `${message} 颜色较多，试着先用其中三色完成一张小稿。`
    : message;
}

export default function MatchPage() {
  const [selected, setSelected] = useState<SelectedColor[]>([]);
  const [tab, setTab] = useState<"palette" | "custom">("palette");
  const [customHex, setCustomHex] = useState("#3C7060");
  const [grayscale, setGrayscale] = useState(false);
  const matches = useMemo(() => matchPaintings(selected), [selected]);
  const comment = useMemo(() => observation(selected), [selected]);
  const totalWeight = selected.reduce((sum, c) => sum + c.weight, 0);
  const validCustom = /^#[0-9a-f]{6}$/i.test(customHex);
  const add = (color: PaintColor) =>
    setSelected((prev) =>
      prev.length >= 8 ||
      prev.some((s) => s.color.hex.toLowerCase() === color.hex.toLowerCase())
        ? prev
        : [...prev, { color, weight: 1 }],
    );
  const remove = (hex: string) =>
    setSelected((prev) =>
      prev.filter((s) => s.color.hex.toLowerCase() !== hex.toLowerCase()),
    );
  const secondary = { color: "var(--ink-3)" };

  return (
    <div className="space-y-6">
      <div>
        <p
          className="text-xs uppercase tracking-[0.2em] mb-2"
          style={{ color: "var(--viridian)" }}
        >
          COLOR STORIES · 配色灵感
        </p>
        <h1 className="text-3xl font-semibold">给颜色，安排一个主角。</h1>
        <p className="text-sm mt-2" style={secondary}>
          选颜色、调面积、看明暗。向名画借一点灵感，再画自己的小稿。
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs mr-1" style={secondary}>
          从一组灵感开始
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() =>
              setSelected(
                p.colors.map((hex, i) => ({
                  color: customColor(hex),
                  weight: i === 0 ? 6 : i === 1 ? 3 : 1,
                })),
              )
            }
            className="flex items-center gap-2 py-2 px-3 rounded-full text-xs"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="flex -space-x-1" aria-hidden="true">
              {p.colors.map((hex) => (
                <span
                  key={hex}
                  className="w-4 h-4 rounded-full border border-white"
                  style={{ background: hex }}
                />
              ))}
            </span>
            {p.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="space-y-4 min-w-0">
          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{
              background: "var(--parchment)",
              border: "1px solid var(--border)",
            }}
          >
            {(["palette", "custom"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: tab === t ? "var(--card)" : "transparent",
                  color: tab === t ? "var(--viridian)" : "var(--ink-2)",
                }}
              >
                {t === "palette" ? "颜料参考色" : "自由选色"}
              </button>
            ))}
          </div>
          {tab === "palette" ? (
            <div className="art-card p-5 space-y-4 max-h-[560px] overflow-y-auto">
              <p className="text-xs leading-relaxed" style={secondary}>
                点击添加，最多 8 色。屏幕色仅作观察参考。
              </p>
              {SERIES_ORDER.map((series) => {
                const colors = MARIE_COLORS.filter((c) => c.series === series);
                if (!colors.length) return null;
                return (
                  <div key={series}>
                    <h2 className="text-xs mb-2" style={secondary}>
                      {series}
                    </h2>
                    <div className="grid grid-cols-6 gap-2">
                      {colors.map((color) => {
                        const isSelected = selected.some(
                          (s) =>
                            s.color.hex.toLowerCase() ===
                            color.hex.toLowerCase(),
                        );
                        return (
                          <button
                            key={color.id}
                            onClick={() =>
                              isSelected ? remove(color.hex) : add(color)
                            }
                            title={color.name}
                            aria-label={color.name}
                            aria-pressed={isSelected}
                            disabled={!isSelected && selected.length >= 8}
                            className="aspect-square color-swatch relative"
                            style={{
                              background: color.hex,
                              border: isSelected
                                ? "3px solid var(--viridian)"
                                : "1px solid var(--border-dk)",
                            }}
                          >
                            {isSelected && (
                              <span
                                className="absolute inset-0 flex items-center justify-center font-bold"
                                style={{
                                  color: "#172D24",
                                  background: "#FFFFFF80",
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="art-card p-5 space-y-4">
              <h2 className="text-sm font-semibold">任意一种屏幕颜色</h2>
              <div className="flex gap-3 items-center">
                <input
                  aria-label="自由选择颜色"
                  type="color"
                  value={validCustom ? customHex : "#3C7060"}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="w-12 h-11 cursor-pointer shrink-0"
                  style={{ background: "transparent" }}
                />
                <input
                  aria-label="十六进制颜色值"
                  type="text"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  placeholder="#3C7060"
                  maxLength={7}
                  className="min-w-0 flex-1 px-3 py-3 rounded-xl font-mono text-sm"
                  style={{
                    background: "var(--parchment)",
                    border: "1px solid var(--border)",
                  }}
                />
              </div>
              <div
                className="h-24 rounded-xl"
                style={{
                  background: validCustom ? customHex : "var(--parchment)",
                  border: "1px solid var(--border)",
                }}
              />
              <button
                onClick={() => {
                  if (validCustom) add(customColor(customHex));
                }}
                disabled={
                  !validCustom ||
                  selected.length >= 8 ||
                  selected.some(
                    (s) =>
                      s.color.hex.toLowerCase() === customHex.toLowerCase(),
                  )
                }
                className="btn-primary w-full text-sm"
              >
                添加到色板
              </button>
              {!validCustom && (
                <p className="text-xs" style={secondary}>
                  输入 # 和 6 位十六进制字符，例如 #3C7060。
                </p>
              )}
            </div>
          )}
        </div>
        <div className="space-y-4 min-w-0">
          <div className="art-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                我的色板{" "}
                <span className="font-normal" style={secondary}>
                  {selected.length}/8
                </span>
              </h2>
              {!!selected.length && (
                <button
                  onClick={() => setSelected([])}
                  className="text-xs underline"
                  style={secondary}
                >
                  清空
                </button>
              )}
            </div>
            {!selected.length ? (
              <div
                className="h-40 flex items-center justify-center rounded-xl text-sm text-center p-4"
                style={{
                  background: "var(--parchment)",
                  color: "var(--ink-3)",
                }}
              >
                从左侧选几个颜色，
                <br />
                或试试上方的灵感组合。
              </div>
            ) : (
              <>
                <div
                  className="h-32 rounded-xl overflow-hidden flex"
                  style={{
                    border: "1px solid var(--border)",
                    filter: grayscale ? "grayscale(1)" : undefined,
                  }}
                >
                  {selected.map((s) => (
                    <div
                      key={s.color.id}
                      className="h-full"
                      style={{ flex: s.weight, background: s.color.hex }}
                      title={`${s.color.name}，约 ${Math.round((s.weight / totalWeight) * 100)}% 面积`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs" style={secondary}>
                    滑动分配画面面积
                  </span>
                  <button
                    aria-pressed={grayscale}
                    onClick={() => setGrayscale((v) => !v)}
                    className="text-xs underline"
                    style={{ color: "var(--viridian)" }}
                  >
                    {grayscale ? "恢复彩色" : "检查黑白关系"}
                  </button>
                </div>
                <div className="space-y-4">
                  {selected.map((s) => (
                    <div key={s.color.id}>
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{
                            background: s.color.hex,
                            border: "1px solid var(--border)",
                          }}
                        />
                        <span className="flex-1 truncate">{s.color.name}</span>
                        <span style={secondary}>
                          约 {Math.round((s.weight / totalWeight) * 100)}%
                        </span>
                        <button
                          onClick={() => remove(s.color.hex)}
                          aria-label={`移除 ${s.color.name}`}
                          className="px-2 py-1"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex gap-3 items-center mt-1.5">
                        <input
                          type="range"
                          aria-label={`${s.color.name} 面积权重`}
                          min={1}
                          max={10}
                          step={1}
                          value={s.weight}
                          onChange={(e) => {
                            const weight = Number(e.target.value);
                            setSelected((prev) =>
                              prev.map((c) =>
                                c.color.id === s.color.id
                                  ? { ...c, weight }
                                  : c,
                              ),
                            );
                          }}
                          className="flex-1 min-w-0"
                        />
                        <Link
                          href={`/mix?target=${encodeURIComponent(s.color.hex)}`}
                          className="text-xs shrink-0 underline"
                          style={{ color: "var(--viridian)" }}
                        >
                          练这个色
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed" style={secondary}>
                  这里的比例表示构图面积，不是颜料混合比例。
                </p>
              </>
            )}
          </div>
          {comment && (
            <div
              className="p-5 rounded-2xl space-y-2"
              style={{
                background: "var(--viridian-lt)",
                border: "1px solid var(--border)",
              }}
            >
              <h2
                className="text-xs font-semibold"
                style={{ color: "var(--viridian)" }}
              >
                观察提示 · 基于色值规则
              </h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--ink-2)" }}
              >
                {comment}
              </p>
            </div>
          )}
          <div className="art-card p-5">
            <h2 className="text-sm font-semibold">今天就能做的小练习</h2>
            <p
              className="text-sm leading-relaxed mt-2"
              style={{ color: "var(--ink-2)" }}
            >
              画三个邮票大小的构图，颜色相同，主色面积分别大、中、小。比较哪一张更能突出主体。
            </p>
            <Link
              href="/sketch"
              className="inline-block text-xs mt-3 underline"
              style={{ color: "var(--viridian)" }}
            >
              先练明暗与构图 ↗
            </Link>
          </div>
        </div>
        <div className="space-y-3 min-w-0">
          <div>
            <h2 className="text-sm font-semibold">去这些画里找灵感</h2>
            <p className="text-xs leading-relaxed mt-1.5" style={secondary}>
              按预设参考色板的色差排序。色差越小，颜色越接近；结果不评价作品好坏，也不代表风格相同。
            </p>
          </div>
          {!selected.length ? (
            <div
              className="art-card p-10 text-center text-sm"
              style={secondary}
            >
              选色后，相近色板的画作会出现在这里。
            </div>
          ) : (
            <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
              {matches.slice(0, 8).map(({ painting, distance }, i) => (
                <article key={painting.id} className="art-card p-4">
                  <div className="flex gap-3">
                    <PaintingImage
                      src={proxyImg(painting.imageUrl)}
                      alt={painting.titleZh}
                      dominantColors={painting.dominantColors}
                      className="w-20 h-20 object-cover rounded-lg shrink-0"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[10px] uppercase tracking-widest mb-1"
                        style={secondary}
                      >
                        参考 {String(i + 1).padStart(2, "0")}
                      </p>
                      <h3 className="text-sm font-medium truncate">
                        {painting.titleZh}
                      </h3>
                      <p className="text-xs mt-1" style={secondary}>
                        {painting.artistZh}
                      </p>
                      <p
                        className="text-xs mt-2"
                        style={{ color: "var(--viridian)" }}
                      >
                        参考色差 {distance.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex h-5 overflow-hidden rounded-md mt-3"
                    aria-label="作品预设参考色板"
                  >
                    {painting.dominantColors.map((hex, j) => (
                      <Link
                        key={j}
                        href={`/mix?target=${encodeURIComponent(hex)}`}
                        className="flex-1"
                        style={{ background: hex }}
                        title={`练习参考色 ${hex}`}
                        aria-label={`练习 ${painting.titleZh} 的参考色 ${hex}`}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

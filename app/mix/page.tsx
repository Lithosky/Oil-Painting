"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_COLORS,
  PAINT_BRANDS,
  PaintColor,
  colorMatchScore,
  getOptimalMix,
  hexToRgb,
  rgbToHex,
} from "@/lib/colors";
import { FAMOUS_PAINTINGS } from "@/lib/paintings";
import {
  Mixture,
  MixProgress,
  MIX_LESSONS,
  MIX_STORAGE_KEY,
  STARTER_COLORS,
  colorFeedback,
  lessonRecipe,
  mixtureHex,
  mixtureRgb,
  parseMixProgress,
  suggestNextColor,
} from "@/lib/mixing-training";
import "./mix.css";

type Mode = "guided" | "free" | "painting";
const freshProgress: MixProgress = { version: 1, completed: [], attempts: [] };

export default function MixPage() {
  const [mode, setMode] = useState<Mode>("guided");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [variant, setVariant] = useState(0);
  const [paintingIndex, setPaintingIndex] = useState(0);
  const [paintingColor, setPaintingColor] = useState(0);
  const [customHex, setCustomHex] = useState("#7B8B70");
  const [hexDraft, setHexDraft] = useState("#7B8B70");
  const [hexError, setHexError] = useState("");
  const [selected, setSelected] = useState<Mixture[]>([]);
  const [history, setHistory] = useState<Mixture[][]>([]);
  const [paletteTab, setPaletteTab] = useState("starter");
  const [family, setFamily] = useState("全部色系");
  const [search, setSearch] = useState("");
  const [showReference, setShowReference] = useState(false);
  const [reference, setReference] = useState<Mixture[]>([]);
  const [assisted, setAssisted] = useState(false);
  const [hint, setHint] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<MixProgress>(freshProgress);
  const [storageReady, setStorageReady] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const dragging = useRef(false);

  useEffect(() => {
    try {
      setProgress(parseMixProgress(localStorage.getItem(MIX_STORAGE_KEY)));
    } catch {
      setStatus("浏览器暂时不能保存记录，你仍然可以继续练习。");
    }
    setStorageReady(true);
    const params = new URLSearchParams(window.location.search);
    const target = params.get("target");
    if (target && /^#[\da-f]{6}$/i.test(target)) {
      setCustomHex(target);
      setHexDraft(target);
      setMode("free");
    }
    const lessonId = params.get("lesson");
    const index = MIX_LESSONS.findIndex((l) => l.id === lessonId);
    if (!target && index >= 0) setLessonIndex(index);
  }, []);

  const lesson = MIX_LESSONS[lessonIndex];
  const painting = FAMOUS_PAINTINGS[paintingIndex];
  const guidedRecipe = useMemo(
    () => lessonRecipe(lesson, variant),
    [lesson, variant],
  );
  const targetHex =
    mode === "guided"
      ? mixtureHex(guidedRecipe)
      : mode === "painting"
        ? painting.dominantColors[paintingColor]
        : customHex;
  const targetRgb = useMemo(() => hexToRgb(targetHex), [targetHex]);
  const mixedRgb = useMemo(() => mixtureRgb(selected), [selected]);
  const mixedHex = rgbToHex(...mixedRgb);
  const total = selected.reduce((sum, c) => sum + c.parts, 0);
  const hasPaint = total > 0;
  const score = hasPaint ? colorMatchScore(targetRgb, mixedRgb) : 0;
  const feedback = useMemo(
    () => colorFeedback(targetRgb, mixedRgb),
    [targetRgb, mixedRgb],
  );
  const recommended =
    mode === "guided"
      ? lesson.paletteIds.map((id) => ALL_COLORS.find((c) => c.id === id)!)
      : STARTER_COLORS;
  const palette =
    paletteTab === "starter"
      ? recommended
      : paletteTab === "all"
        ? ALL_COLORS
        : (PAINT_BRANDS.find((b) => b.id === paletteTab)?.colors ??
          STARTER_COLORS);
  const shownColors = palette.filter(
    (c) =>
      (family === "全部色系" || c.series === family) &&
      `${c.name} ${c.nameEn}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );
  const label =
    mode === "guided"
      ? `${lesson.title} · 第 ${variant + 1} 题`
      : mode === "painting"
        ? `《${painting.titleZh}》色彩练习`
        : "自由调色";

  function resetExercise() {
    setSelected([]);
    setHistory([]);
    setHint("");
    setStatus("");
    setShowReference(false);
    setReference([]);
    setAssisted(false);
    dragging.current = false;
  }
  function changeMode(next: Mode) {
    setMode(next);
    resetExercise();
    setPaletteTab("starter");
    setSearch("");
    setFamily("全部色系");
  }
  function changeLesson(index: number) {
    setLessonIndex(index);
    setVariant(0);
    changeMode("guided");
  }
  function changeMixture(next: Mixture[], remember = true) {
    if (remember)
      setHistory((h) => [...h, selected.map((c) => ({ ...c }))].slice(-40));
    setSelected(next);
    setHint("");
    setStatus("");
  }
  function addColor(color: PaintColor) {
    const exists = selected.find((c) => c.color.id === color.id);
    changeMixture(
      exists
        ? selected.map((c) =>
            c.color.id === color.id
              ? { ...c, parts: Math.min(20, c.parts + 1) }
              : c,
          )
        : [...selected, { color, parts: 1 }],
    );
  }
  function updateParts(id: string, parts: number) {
    if (!Number.isFinite(parts)) return;
    changeMixture(
      selected.map((c) =>
        c.color.id === id
          ? { ...c, parts: Math.max(0, Math.min(20, parts)) }
          : c,
      ),
      !dragging.current,
    );
  }
  function undo() {
    if (!history.length) return;
    setSelected(history[history.length - 1]);
    setHistory(history.slice(0, -1));
    setHint("");
    setStatus("");
  }
  function applyHex(value: string) {
    const hex = value.startsWith("#") ? value : `#${value}`;
    if (!/^#[\da-f]{6}$/i.test(hex)) {
      setHexError("请输入 6 位颜色值，例如 #7B8B70。");
      return;
    }
    setCustomHex(hex);
    setHexDraft(hex);
    setHexError("");
    resetExercise();
  }
  function revealReference() {
    if (showReference) {
      setShowReference(false);
      return;
    }
    const next =
      mode === "guided"
        ? guidedRecipe
        : getOptimalMix(targetRgb, STARTER_COLORS).map((c) => ({
            color: c.color,
            parts: c.ratio / 5,
          }));
    setReference(next);
    setShowReference(true);
    setAssisted(true);
  }
  function persist(next: MixProgress): boolean {
    setProgress(next);
    try {
      localStorage.setItem(MIX_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("atelier-progress"));
      return true;
    } catch {
      return false;
    }
  }
  function saveAttempt(check = false) {
    if (!hasPaint || !storageReady) return;
    const completed =
      mode === "guided" && check && score >= 90 && !assisted
        ? [...new Set([...progress.completed, lesson.id])]
        : progress.completed;
    const recipe = selected
      .filter((c) => c.parts > 0)
      .map((c) => ({ colorId: c.color.id, parts: c.parts }));
    const last = progress.attempts[0];
    const duplicate =
      last &&
      last.targetHex === targetHex &&
      JSON.stringify(last.recipe) === JSON.stringify(recipe);
    const attempt = {
      id: `${Date.now()}`,
      label,
      targetHex,
      mixedHex,
      score,
      recipe,
      createdAt: new Date().toISOString(),
      assisted,
    };
    const next: MixProgress = {
      version: 1,
      completed,
      attempts: duplicate
        ? progress.attempts
        : [attempt, ...progress.attempts].slice(0, 20),
    };
    const saved = persist(next);
    if (!saved) {
      setStatus("这次结果已保留在当前页面，但浏览器没有允许保存到本机。");
      return;
    }
    setStatus(
      check
        ? score >= 90
          ? assisted
            ? "参考练习完成。再来一题，不看配方达到 90 分，就能点亮这节课。"
            : "这一题完成！已保存配方。接着做纸上小练习，让眼睛与手一起记住。"
          : `已记录这次 ${score} 分的尝试。先看明度，再根据下方提示改一个变量。`
        : "配方已保存到这台设备，下次可以继续调。",
    );
  }
  function nextQuestion() {
    resetExercise();
    setVariant((v) => (v + 1) % lesson.recipes.length);
  }
  const referenceScore = reference.length
    ? colorMatchScore(targetRgb, mixtureRgb(reference))
    : 0;
  const referenceTotal = reference.reduce((sum, c) => sum + c.parts, 0);

  return (
    <div className="mix-page">
      <header className="mix-page-heading">
        <div>
          <span className="mix-eyebrow">COLOR LAB / 调色实验室</span>
          <h1>调色，先学会看见。</h1>
          <p>
            先看明暗，再看鲜灰，最后微调色相。每一次只改一点，慢慢调出自己的感觉。
          </p>
        </div>
        <div className="mix-progress-label">
          <span>
            {progress.completed.length}
            <small> / {MIX_LESSONS.length}</small>
          </span>
          <p>基础练习已点亮</p>
        </div>
      </header>

      <div className="mix-mode-tabs" role="tablist" aria-label="选择调色模式">
        {(
          [
            { id: "guided", title: "循序练习", sub: "从两支颜料开始" },
            { id: "free", title: "自由调色", sub: "探索任意目标色" },
            { id: "painting", title: "名画里的颜色", sub: "向大师借一点灵感" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={mode === t.id}
            onClick={() => {
              if (mode !== t.id) changeMode(t.id);
            }}
            className={mode === t.id ? "is-active" : ""}
          >
            <strong>{t.title}</strong>
            <span>{t.sub}</span>
          </button>
        ))}
      </div>
      {mode === "guided" && (
        <div className="mix-lesson-tabs" aria-label="基础调色课程">
          {MIX_LESSONS.map((item, i) => (
            <button
              key={item.id}
              onClick={() => {
                if (lessonIndex !== i) changeLesson(i);
              }}
              aria-current={lessonIndex === i ? "step" : undefined}
              className={lessonIndex === i ? "is-active" : ""}
            >
              <span className="mix-step-number">
                {progress.completed.includes(item.id) ? "✓" : `0${i + 1}`}
              </span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mix-workspace">
        <aside className="mix-sidebar">
          {mode === "guided" ? (
            <section className="mix-brief">
              <span className="mix-eyebrow">
                TODAY’S STUDY / 第 {variant + 1} 题
              </span>
              <h2>{lesson.title}</h2>
              <p>{lesson.concept}</p>
              <div className="mix-task-text">
                <span>这次的任务</span>
                <p>{lesson.prompt}</p>
              </div>
              <button className="mix-link-button" onClick={nextQuestion}>
                换一个目标色 <span aria-hidden="true">↗</span>
              </button>
            </section>
          ) : mode === "free" ? (
            <section className="mix-brief">
              <span className="mix-eyebrow">YOUR OWN COLOR</span>
              <h2>今天想调什么颜色？</h2>
              <p>
                从任意颜色开始。某些屏幕色可能超出现有色板能调出的范围，接近它也是一次有用的练习。
              </p>
              <label className="mix-field-label" htmlFor="target-color">
                选择目标色
              </label>
              <div className="mix-custom-picker">
                <input
                  id="target-color"
                  type="color"
                  value={customHex}
                  aria-label="选择自定义目标色"
                  onChange={(e) => applyHex(e.target.value)}
                />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    applyHex(hexDraft);
                  }}
                >
                  <input
                    aria-label="目标色十六进制值"
                    value={hexDraft}
                    onChange={(e) => setHexDraft(e.target.value)}
                    maxLength={7}
                    spellCheck={false}
                  />
                  <button type="submit">应用</button>
                </form>
              </div>
              {hexError && (
                <p role="alert" className="mix-error">
                  {hexError}
                </p>
              )}
            </section>
          ) : (
            <section className="mix-painting-card">
              <img
                src={painting.imageUrl}
                alt={`《${painting.titleZh}》，${painting.artistZh}`}
              />
              <div>
                <label className="mix-field-label" htmlFor="painting-select">
                  挑一幅喜欢的画
                </label>
                <select
                  id="painting-select"
                  value={paintingIndex}
                  onChange={(e) => {
                    setPaintingIndex(Number(e.target.value));
                    setPaintingColor(0);
                    resetExercise();
                  }}
                >
                  {FAMOUS_PAINTINGS.map((p, i) => (
                    <option key={p.id} value={i}>
                      {p.titleZh} · {p.artistZh}
                    </option>
                  ))}
                </select>
                <p>
                  {painting.artistZh} · {painting.year}
                </p>
                <div className="mix-painting-colors">
                  {painting.dominantColors.map((hex, i) => (
                    <button
                      key={`${hex}-${i}`}
                      aria-label={`选择画作色 ${i + 1}：${hex}`}
                      aria-pressed={paintingColor === i}
                      onClick={() => {
                        setPaintingColor(i);
                        resetExercise();
                      }}
                      style={{ background: hex }}
                    />
                  ))}
                </div>
                <small>画作代表色为学习用示意色，不是原作实测数据。</small>
              </div>
            </section>
          )}
          <section className="mix-paper-task">
            <span className="mix-eyebrow">TAKE IT TO PAPER</span>
            <h3>把眼睛学到的，交给手。</h3>
            <p>
              {mode === "guided"
                ? lesson.realPractice
                : "把目标色、第一次尝试和最后结果画成 3 块并排的小色块。写一句话：这次是哪一种颜色加多了？实际用量以手边颜料的试色为准。"}
            </p>
            <a href="/sketch">
              先练明暗？去素描教室 <span aria-hidden="true">↗</span>
            </a>
          </section>
        </aside>

        <section className="mix-lab">
          <div className="mix-card-title">
            <div>
              <span className="mix-eyebrow">LOOK · MIX · COMPARE</span>
              <h2>你的调色台</h2>
            </div>
            <span className="mix-live-dot">实时预览</span>
          </div>
          <div className="mix-comparison">
            <div>
              <div
                className="mix-color-preview"
                style={{ background: targetHex }}
              />
              <div className="mix-swatch-caption">
                <strong>观察目标</strong>
                <span>{targetHex.toUpperCase()}</span>
              </div>
            </div>
            <div>
              <div
                className={`mix-color-preview ${!hasPaint ? "mix-empty-preview" : ""}`}
                style={hasPaint ? { background: mixedHex } : {}}
              >
                {!hasPaint && (
                  <span>
                    选一支练习色
                    <br />
                    开始你的第一次尝试
                  </span>
                )}
              </div>
              <div className="mix-swatch-caption">
                <strong>你的混合色</strong>
                <span>
                  {hasPaint ? mixedHex.toUpperCase() : "等待加入颜色"}
                </span>
              </div>
            </div>
          </div>
          <div className="mix-score-row">
            <div>
              <strong>
                {hasPaint ? score : "—"}
                <small> / 100</small>
              </strong>
              <span>
                {!hasPaint
                  ? "先观察，再动手"
                  : score >= 90
                    ? "很接近了，记住这次调整"
                    : score >= 70
                      ? "方向不错，试着微调"
                      : "从明暗关系开始比较"}
              </span>
            </div>
            <div className="mix-score-track" aria-hidden="true">
              <span style={{ width: `${score}%` }} />
            </div>
          </div>
          {hasPaint && (
            <div className="mix-feedback">
              {feedback.map((item) => (
                <div key={item.name}>
                  <span>{item.name}</span>
                  <strong className={item.good ? "is-good" : ""}>
                    {item.label}
                  </strong>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mix-quick-palette">
            <span>点选练习色</span>
            <div>
              {recommended.map((color) => (
                <button
                  key={color.id}
                  onClick={() => addColor(color)}
                  aria-label={`加入推荐色${color.name}`}
                >
                  <i style={{ background: color.hex }} />
                  <strong>{color.name}</strong>
                  <small>+</small>
                </button>
              ))}
            </div>
          </div>
          <div className="mix-palette-heading">
            <h3>
              调色盘 <small>{selected.length} 色</small>
            </h3>
            <div>
              <button onClick={undo} disabled={!history.length}>
                ↶ 撤销
              </button>
              <button
                onClick={() => changeMixture([])}
                disabled={!selected.length}
              >
                清空
              </button>
            </div>
          </div>
          {!selected.length ? (
            <div className="mix-empty-bowl">
              点选上方练习色，把颜色加入调色盘。
              <span>先用 2–3 色，往往更容易看清变化。</span>
            </div>
          ) : (
            <div className="mix-mixture-list">
              {selected.map(({ color, parts }) => (
                <div className="mix-mixture-row" key={color.id}>
                  <span className="mix-dot" style={{ background: color.hex }} />
                  <div className="mix-mixture-control">
                    <div>
                      <strong>{color.name}</strong>
                      <span>
                        {total ? Math.round((parts / total) * 100) : 0}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="0.25"
                      value={parts}
                      aria-label={`${color.name}份量`}
                      onPointerDown={() => {
                        dragging.current = true;
                        setHistory((h) =>
                          [...h, selected.map((c) => ({ ...c }))].slice(-40),
                        );
                      }}
                      onPointerUp={() => {
                        dragging.current = false;
                      }}
                      onPointerCancel={() => {
                        dragging.current = false;
                      }}
                      onBlur={() => {
                        dragging.current = false;
                      }}
                      onChange={(e) =>
                        updateParts(color.id, Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="mix-parts-input">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.25"
                      value={parts}
                      aria-label={`${color.name}份数`}
                      onChange={(e) =>
                        updateParts(color.id, Number(e.target.value))
                      }
                    />
                    <span>份</span>
                  </div>
                  <button
                    className="mix-remove"
                    aria-label={`移除${color.name}`}
                    onClick={() =>
                      changeMixture(
                        selected.filter((c) => c.color.id !== color.id),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mix-units-note">
            “份”是练习用相对量，百分比会自动计算；不代表真实颜料的体积或重量。
          </p>
          <div className="mix-actions">
            <button
              className="mix-primary"
              disabled={!hasPaint || !storageReady}
              onClick={() => saveAttempt(true)}
            >
              检验这次调色 <span aria-hidden="true">→</span>
            </button>
            <button
              disabled={!hasPaint || !storageReady}
              onClick={() => saveAttempt()}
            >
              保存配方
            </button>
            <button
              disabled={!hasPaint}
              onClick={() =>
                setHint(suggestNextColor(targetRgb, selected, palette))
              }
            >
              给我一点提示
            </button>
          </div>
          {hint && (
            <div className="mix-hint" role="status">
              <strong>试一小步</strong>
              <p>{hint}</p>
            </div>
          )}
          {status && (
            <div className="mix-status" role="status">
              {status}
              {mode === "guided" && score >= 90 && (
                <button onClick={nextQuestion}>再来一题 →</button>
              )}
            </div>
          )}
          <div className="mix-reference-toggle">
            <button onClick={revealReference}>
              {showReference ? "收起参考配方 −" : "卡住了？看一份参考配方 +"}
            </button>
            <span>
              {mode === "guided"
                ? "独立调到 90 分，点亮课程"
                : "屏幕色可能超出当前色板范围"}
            </span>
          </div>
          {showReference && (
            <div className="mix-reference">
              <div className="mix-reference-heading">
                <strong>
                  {mode === "guided" ? "本题的生成配方" : "入门色板的近似配方"}
                </strong>
                <span>屏幕相似度 {referenceScore} 分</span>
              </div>
              <div className="mix-recipe-chips">
                {reference.map((c) => (
                  <span key={c.color.id}>
                    <i style={{ background: c.color.hex }} />
                    {c.color.name}{" "}
                    <b>{Math.round((c.parts / referenceTotal) * 100)}%</b>
                  </span>
                ))}
              </div>
              <p>
                {mode === "guided"
                  ? "本题目标由这份配方生成，所以可以达到。看完后换一道题，再试着独立完成。"
                  : "最多 3 色的近似搜索结果，可能无法完全达到目标。不同配方也可能得到相近的屏幕颜色。"}
              </p>
              <button
                onClick={() => {
                  changeMixture(reference.map((c) => ({ ...c })));
                  setAssisted(true);
                }}
              >
                放到调色盘里观察
              </button>
            </div>
          )}
        </section>
      </div>

      <section className="mix-color-library">
        <div className="mix-library-title">
          <div>
            <span className="mix-eyebrow">PICK YOUR PALETTE</span>
            <h2>少一点犹豫，多一点尝试。</h2>
          </div>
          <span>{shownColors.length} 个练习色</span>
        </div>
        <div className="mix-library-filters">
          <div className="mix-library-tabs">
            {[
              {
                id: "starter",
                name: mode === "guided" ? "本课推荐" : "入门 12 色",
              },
              { id: "all", name: `全部 ${ALL_COLORS.length} 色` },
              ...PAINT_BRANDS.map((b) => ({ id: b.id, name: b.name })),
            ].map((tab) => (
              <button
                key={tab.id}
                aria-pressed={paletteTab === tab.id}
                onClick={() => {
                  setPaletteTab(tab.id);
                  setFamily("全部色系");
                }}
                className={paletteTab === tab.id ? "is-active" : ""}
              >
                {tab.name}
              </button>
            ))}
          </div>
          <div className="mix-search-row">
            <input
              type="search"
              aria-label="搜索颜料名称"
              placeholder="搜索颜色，如 群青 / blue"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="按色系筛选"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
            >
              {[
                "全部色系",
                ...Array.from(
                  new Set(palette.map((c) => c.series).filter(Boolean)),
                ),
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mix-library-grid">
          {shownColors.map((color) => {
            const active = selected.some((c) => c.color.id === color.id);
            return (
              <button
                key={color.id}
                onClick={() => addColor(color)}
                className={active ? "is-selected" : ""}
                aria-label={`加入${color.name}（${PAINT_BRANDS.find((b) => b.colors.some((c) => c.id === color.id))?.name}）`}
              >
                <span
                  className="mix-library-swatch"
                  style={{ background: color.hex }}
                >
                  <i>{active ? "＋1" : "+"}</i>
                </span>
                <strong>{color.name}</strong>
                <small>
                  {paletteTab === "all"
                    ? PAINT_BRANDS.find((b) =>
                        b.colors.some((c) => c.id === color.id),
                      )?.name
                    : color.nameEn}
                </small>
              </button>
            );
          })}
        </div>
        {!shownColors.length && (
          <p className="mix-no-results">
            没有找到这个颜色。换个名称，或切换到“全部色”试试。
          </p>
        )}
        <p className="mix-model-note">
          屏幕颜色仅作学习示意，品牌分类沿用原色库，并非品牌实测色卡。采用{" "}
          <a
            href="https://github.com/rvanwijnen/spectral.js"
            target="_blank"
            rel="noreferrer"
          >
            Spectral.js
          </a>{" "}
          近似模拟颜料混合；真实颜料的着色力、透明度、光照和底色会影响结果，请用手边颜料再试色。分数是屏幕色差的练习指标。
        </p>
      </section>

      {progress.attempts.length > 0 && (
        <section className="mix-saved">
          <div className="mix-library-title">
            <div>
              <span className="mix-eyebrow">YOUR COLOR NOTES</span>
              <h2>留下有用的那一次。</h2>
            </div>
            <span>最近 {progress.attempts.length} 次 · 仅存本机</span>
          </div>
          <div className="mix-saved-grid">
            {progress.attempts
              .slice(0, showAllNotes ? 20 : 6)
              .map((attempt) => (
                <button
                  key={attempt.id}
                  onClick={() => {
                    changeMode("free");
                    setCustomHex(attempt.targetHex);
                    setHexDraft(attempt.targetHex);
                    setSelected(
                      attempt.recipe.map((r) => ({
                        color: ALL_COLORS.find((c) => c.id === r.colorId)!,
                        parts: r.parts,
                      })),
                    );
                    setAssisted(Boolean(attempt.assisted));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <div className="mix-saved-swatches">
                    <i style={{ background: attempt.targetHex }} />
                    <i style={{ background: attempt.mixedHex }} />
                  </div>
                  <div>
                    <strong>{attempt.label}</strong>
                    <span>
                      {attempt.recipe.length} 色 · {attempt.score} 分
                      {attempt.assisted ? " · 参考练习" : ""}
                    </span>
                  </div>
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
          </div>
          {progress.attempts.length > 6 && (
            <button
              className="mix-link-button"
              aria-expanded={showAllNotes}
              onClick={() => setShowAllNotes((v) => !v)}
            >
              {showAllNotes
                ? "收起笔记"
                : `查看全部 ${progress.attempts.length} 条笔记`}
            </button>
          )}
        </section>
      )}
    </div>
  );
}

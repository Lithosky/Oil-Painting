"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  OIL_LESSONS,
  OIL_PROGRESS_KEY,
  OilLessonId,
  parseOilProgress,
  renderValuePixels,
  ValueMode,
} from "@/lib/oil-lessons";
import "./oil.css";

function OilRange({
  id,
  label,
  value,
  min,
  max,
  onChange,
  ends,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  ends: [string, string];
}) {
  return (
    <div className="oil-range">
      <label htmlFor={id}>
        {label}
        <output htmlFor={id}>{value}</output>
      </label>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div>
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
    </div>
  );
}

function RelativeColor() {
  const [environment, setEnvironment] = useState(0);
  const [isolated, setIsolated] = useState(false);
  const [guess, setGuess] = useState<number | null>(null);
  const backgrounds = [
    ["#32382f", "#e9e3ce"],
    ["#bd795c", "#598d8f"],
    ["#6f5686", "#aea951"],
  ];
  const environmentNames = ["深与浅", "暖与冷", "紫与黄绿"];
  const center = "#a39c86";
  return (
    <div className="oil-lab">
      <div className="oil-visual">
        <div className="oil-visual-top">
          <span>同一个颜色，换一个邻居</span>
          <small>COLOR IN CONTEXT</small>
        </div>
        <div className={`oil-context-scene ${isolated ? "is-isolated" : ""}`}>
          {backgrounds[environment].map((color, index) => (
            <div className="oil-context-pair" key={index}>
              <div
                className="oil-context-surround"
                style={{ background: isolated ? "#eeeae0" : color }}
              >
                <div
                  className="oil-context-center"
                  style={{ background: center }}
                  role="img"
                  aria-label={`${index ? "右" : "左"}侧中心色，${isolated ? "与另一侧完全相同" : "等待你的观察"}`}
                />
              </div>
              <span>{index ? "右侧" : "左侧"}</span>
            </div>
          ))}
        </div>
        <div className="oil-scene-caption">
          {isolated
            ? "背景移开后，两块中心色完全相同：#A39C86。"
            : "先盯住中心色几秒。它们给你的明暗、冷暖感受一样吗？"}
        </div>
      </div>
      <aside className="oil-controls">
        <span className="oil-small-label">01 / 先观察，再验证</span>
        <h2>
          是颜色变了，
          <br />
          还是感觉变了？
        </h2>
        <p>周围的颜色会影响观看感受。这里两块中心色保持固定，只有背景变化。</p>
        <div className="oil-control-label">切换环境</div>
        <div className="oil-segments">
          {environmentNames.map((name, index) => (
            <button
              type="button"
              key={name}
              aria-pressed={index === environment}
              onClick={() => {
                setEnvironment(index);
                setIsolated(false);
                setGuess(null);
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="oil-control-label">你觉得两个中心色的色值是？</div>
        <div className="oil-segments">
          {["相同", "不同"].map((name, index) => (
            <button
              type="button"
              key={name}
              aria-pressed={guess === index}
              onClick={() => setGuess(index)}
            >
              {name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="oil-action"
          onClick={() => setIsolated(!isolated)}
        >
          {isolated ? "放回背景，再看一次" : "移开背景，验证判断"}
          <span aria-hidden="true">↗</span>
        </button>
        <div className="oil-observation" aria-live="polite">
          {isolated
            ? `${guess === 0 ? "判断正确。" : guess === 1 ? "感受可以不同，色值其实相同。" : "验证结果：中心色相同。"} 调色时，要把颜色放回画面中的关系里比较。`
            : "不必追求某种固定的视觉错觉；屏幕、环境光和个人观察都会影响感受。"}
        </div>
      </aside>
    </div>
  );
}

const VALUE_IMAGES = [
  {
    id: "sunflowers",
    name: "梵高《向日葵》",
    alt: "黄色背景前的花瓶和向日葵，花心、枯叶形成较暗的小块",
  },
  {
    id: "girl-with-pearl",
    name: "维米尔《戴珍珠耳环的少女》",
    alt: "暗背景中侧身回望的少女，面部和头巾的亮部形成主要亮块",
  },
];

function ValueMasses() {
  const [imageIndex, setImageIndex] = useState(0);
  const [mode, setMode] = useState<ValueMode>("color");
  const [darkBoundary, setDarkBoundary] = useState(94);
  const [lightBoundary, setLightBoundary] = useState(180);
  const [original, setOriginal] = useState<{
    pixels: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);
  const [percentages, setPercentages] = useState([0, 0, 0]);
  const [error, setError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reference = VALUE_IMAGES[imageIndex];
  const modes: { id: ValueMode; label: string }[] = [
    { id: "color", label: "原色" },
    { id: "gray", label: "灰度" },
    { id: "three", label: "三阶归纳" },
    { id: "five", label: "五阶归纳" },
  ];
  useEffect(() => {
    let cancelled = false;
    setOriginal(null);
    setError(false);
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      try {
        const work = document.createElement("canvas");
        const scale = Math.min(1, 560 / image.naturalHeight);
        work.width = Math.round(image.naturalWidth * scale);
        work.height = Math.round(image.naturalHeight * scale);
        const context = work.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        context.drawImage(image, 0, 0, work.width, work.height);
        setOriginal({
          pixels: context.getImageData(0, 0, work.width, work.height).data,
          width: work.width,
          height: work.height,
        });
      } catch {
        setError(true);
      }
    };
    image.onerror = () => {
      if (!cancelled) setError(true);
    };
    image.src = `/paintings/${reference.id}.jpg`;
    return () => {
      cancelled = true;
    };
  }, [reference.id]);
  useEffect(() => {
    if (!original || !canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    if (!context) {
      setError(true);
      return;
    }
    canvasRef.current.width = original.width;
    canvasRef.current.height = original.height;
    const result = renderValuePixels(
      original.pixels,
      mode,
      darkBoundary,
      lightBoundary,
    );
    context.putImageData(
      new ImageData(result.pixels, original.width, original.height),
      0,
      0,
    );
    setPercentages(result.percentages);
  }, [original, mode, darkBoundary, lightBoundary]);
  return (
    <div className="oil-lab">
      <div className="oil-visual">
        <div className="oil-visual-top">
          <span>从颜色中，抽出明暗关系</span>
          <small>VALUE STUDY</small>
        </div>
        <div className="oil-value-scene">
          {error ? (
            <p role="alert">这张图暂时无法读取，请切换另一幅再试。</p>
          ) : (
            <>
              {!original && <span role="status">正在准备画作…</span>}
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={`${reference.name}，${modes.find((item) => item.id === mode)?.label}视图。${reference.alt}`}
                style={{ visibility: original ? "visible" : "hidden" }}
              />
            </>
          )}
        </div>
        <div className="oil-scene-caption">
          {reference.name} · {modes.find((item) => item.id === mode)?.label}
          。数字复制品用于观察，色彩可能与原作不同。
        </div>
      </div>
      <aside className="oil-controls">
        <span className="oil-small-label">02 / 从整体开始</span>
        <h2>
          暂时忘掉细节，
          <br />
          只看大的深浅。
        </h2>
        <label className="oil-control-label" htmlFor="oil-reference">
          观察哪幅画
        </label>
        <select
          id="oil-reference"
          value={imageIndex}
          onChange={(event) => setImageIndex(Number(event.target.value))}
        >
          {VALUE_IMAGES.map((item, index) => (
            <option value={index} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <div className="oil-control-label">观看方式</div>
        <div className="oil-segments oil-segments-four">
          {modes.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={mode === item.id}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {mode === "three" ? (
          <>
            <OilRange
              id="oil-dark-boundary"
              label="暗 → 中的分界"
              min={20}
              max={lightBoundary - 15}
              value={darkBoundary}
              onChange={setDarkBoundary}
              ends={["暗块更少", "暗块更多"]}
            />
            <OilRange
              id="oil-light-boundary"
              label="中 → 亮的分界"
              min={darkBoundary + 15}
              max={240}
              value={lightBoundary}
              onChange={setLightBoundary}
              ends={["亮块更多", "亮块更少"]}
            />
            <div className="oil-value-ratios" aria-label="三阶明暗面积估计">
              {["暗", "中", "亮"].map((label, index) => (
                <div key={label}>
                  <i
                    style={{
                      background: ["#2a2a2a", "#858585", "#e2e2e2"][index],
                    }}
                  />
                  <span>{label}</span>
                  <b>{percentages[index]}%</b>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="oil-mode-hint">
            切到「三阶归纳」后，可以调整明暗分界，观察大块如何连在一起。
          </p>
        )}
        <div className="oil-observation">
          灰度分组是观察工具。它保留了不少碎片，你仍需主动归纳形状；没有一个分界值适合所有构图。
        </div>
      </aside>
    </div>
  );
}

function EdgeControl() {
  const [softness, setSoftness] = useState(3);
  const [contrast, setContrast] = useState(60);
  const background = "#b9b3a0";
  const rightValue = [185, 179, 160].map((channel, index) =>
    Math.round(channel + (([105, 110, 92][index] - channel) * contrast) / 100),
  );
  const rightColor = `rgb(${rightValue.join(",")})`;
  return (
    <div className="oil-lab">
      <div className="oil-visual">
        <div className="oil-visual-top">
          <span>边缘，是两个色块相遇的地方</span>
          <small>HARD · SOFT · LOST</small>
        </div>
        <div className="oil-edge-scene">
          <svg
            viewBox="0 0 620 345"
            role="img"
            aria-label={`三块圆形色面：左边有清楚硬边；中间边界过渡宽度 ${softness}；右边右侧与背景的差异为 ${contrast}，降到零时局部边缘消失。`}
          >
            <defs>
              <filter
                id="oil-soft-edge"
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
              >
                <feGaussianBlur stdDeviation={softness} />
              </filter>
              <linearGradient id="oil-lost-edge">
                <stop offset="0" stopColor="#e1d7b4" />
                <stop offset="0.42" stopColor="#c9bfa0" />
                <stop offset="0.82" stopColor={rightColor} />
                <stop offset="1" stopColor={rightColor} />
              </linearGradient>
              <linearGradient id="oil-form">
                <stop offset="0" stopColor="#e1d7b4" />
                <stop offset="1" stopColor="#7e836a" />
              </linearGradient>
            </defs>
            <rect width="620" height="345" fill={background} />
            <circle cx="115" cy="152" r="68" fill="url(#oil-form)" />
            <circle
              cx="310"
              cy="152"
              r="68"
              fill="url(#oil-form)"
              filter="url(#oil-soft-edge)"
            />
            <circle cx="505" cy="152" r="68" fill="url(#oil-lost-edge)" />
            <g fill="#3d4739" textAnchor="middle" fontSize="14">
              <text x="115" y="270">
                硬边
              </text>
              <text x="310" y="270">
                {softness === 0 ? "过渡收窄，接近硬边" : "软边"}
              </text>
              <text x="505" y="270">
                {contrast <= 5 ? "右侧局部消失" : "右侧还看得见"}
              </text>
            </g>
            <g fill="#56604e" textAnchor="middle" fontSize="11">
              <text x="115" y="293">
                明暗变化很突然
              </text>
              <text x="310" y="293">
                明暗逐渐过渡
              </text>
              <text x="505" y="293">
                让两侧颜色接近
              </text>
            </g>
          </svg>
        </div>
        <div className="oil-scene-caption">
          这是边缘关系示意。右侧圆面的左边仍可辨认，因此局部轮廓消失后，形状仍可被推断。
        </div>
      </div>
      <aside className="oil-controls">
        <span className="oil-small-label">03 / 留一点，藏一点</span>
        <h2>
          不用一圈黑线，
          <br />
          也能说清形状。
        </h2>
        <p>
          硬边、软边、消失的边，是相邻区域不同的关系。把最清楚的边留给你希望强调的地方。
        </p>
        <OilRange
          id="oil-softness"
          label="中间：过渡宽度"
          min={0}
          max={15}
          value={softness}
          onChange={setSoftness}
          ends={["窄，边缘清楚", "宽，边缘柔和"]}
        />
        <OilRange
          id="oil-edge-contrast"
          label="右边：右侧与背景的差异"
          min={0}
          max={100}
          value={contrast}
          onChange={setContrast}
          ends={["接近，局部消失", "不同，边缘可见"]}
        />
        <button
          className="oil-action"
          type="button"
          onClick={() => {
            setSoftness(7);
            setContrast(0);
          }}
        >
          看看三种关系并置<span aria-hidden="true">↗</span>
        </button>
        <div className="oil-observation" aria-live="polite">
          {contrast <= 5
            ? "右边没有被整体模糊；只是部分边界两侧的颜色很接近。消失的边与软边并不等同。"
            : "试着把第二个滑块移到左端：当颜色接近背景，右边的一段轮廓会逐渐消失。"}
        </div>
      </aside>
    </div>
  );
}

export default function OilPage() {
  const [lessonId, setLessonId] = useState<OilLessonId>("relative-color");
  const [completed, setCompleted] = useState<OilLessonId[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("lesson");
    if (OIL_LESSONS.some((item) => item.id === requested))
      setLessonId(requested as OilLessonId);
    try {
      setCompleted(parseOilProgress(localStorage.getItem(OIL_PROGRESS_KEY)));
    } catch {
      setStorageWarning(true);
    }
  }, []);
  const lesson = OIL_LESSONS.find((item) => item.id === lessonId)!;
  const currentIndex = OIL_LESSONS.findIndex((item) => item.id === lessonId);
  const isComplete = completed.includes(lessonId);
  function chooseLesson(id: OilLessonId) {
    setLessonId(id);
    setSelectedAnswer(null);
    window.history.replaceState(null, "", `/oil?lesson=${id}`);
  }
  function toggleComplete() {
    const next = isComplete
      ? completed.filter((id) => id !== lessonId)
      : [...completed, lessonId];
    setCompleted(next);
    try {
      localStorage.setItem(
        OIL_PROGRESS_KEY,
        JSON.stringify({ completed: next }),
      );
      window.dispatchEvent(new Event("atelier-progress"));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }
  return (
    <div className="oil-page">
      <header className="oil-header">
        <div>
          <div className="oil-eyebrow">
            <span /> THE PAINTING ROOM / 油画基础
          </div>
          <h1>调对颜色，也画对关系。</h1>
          <p>
            把素描里的明暗带进颜色里。从色彩、色块到边缘，每次只练一个观察习惯。
          </p>
        </div>
        <div className="oil-progress">
          <strong>{completed.length}</strong>
          <span>
            {" "}
            / {OIL_LESSONS.length}
            <small>实践记录 · 保存在此浏览器</small>
          </span>
        </div>
      </header>
      <div className="oil-tabs" role="tablist" aria-label="油画基础课程">
        {OIL_LESSONS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`oil-tab-${item.id}`}
            aria-selected={lessonId === item.id}
            aria-controls="oil-lesson-panel"
            tabIndex={lessonId === item.id ? 0 : -1}
            onClick={() => chooseLesson(item.id)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const nextIndex =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? OIL_LESSONS.length - 1
                    : (currentIndex +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        OIL_LESSONS.length) %
                      OIL_LESSONS.length;
              chooseLesson(OIL_LESSONS[nextIndex].id);
              document
                .getElementById(`oil-tab-${OIL_LESSONS[nextIndex].id}`)
                ?.focus();
            }}
          >
            <span className="oil-tab-number">
              {completed.includes(item.id) ? "✓" : `0${index + 1}`}
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </span>
            <em>{item.duration}</em>
          </button>
        ))}
      </div>
      <section
        id="oil-lesson-panel"
        role="tabpanel"
        aria-labelledby={`oil-tab-${lessonId}`}
        tabIndex={0}
      >
        <div className="oil-task">
          <b>这一轮，只做一件事</b>
          <span>{lesson.task}</span>
        </div>
        <div hidden={lessonId !== "relative-color"}>
          <RelativeColor />
        </div>
        <div hidden={lessonId !== "value-masses"}>
          <ValueMasses />
        </div>
        <div hidden={lessonId !== "edge-control"}>
          <EdgeControl />
        </div>
        <div className="oil-practice">
          <div className="oil-real-practice">
            <span className="oil-small-label">从屏幕，回到画纸 · 5–8 分钟</span>
            <h2>{lesson.practiceTitle}</h2>
            <ol>
              {lesson.practice.map((step, index) => (
                <li key={step}>
                  <span>0{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="oil-bridge">
              不限定颜料品牌。先用手边的纸笔练观察，再把同样的比较方法带到油画里。
            </p>
          </div>
          <div className="oil-selfcheck">
            <span className="oil-small-label">给自己一个小检查</span>
            <h3>{lesson.question}</h3>
            <div className="oil-quiz">
              {lesson.choices.map((choice, index) => (
                <button
                  type="button"
                  key={choice}
                  aria-pressed={selectedAnswer === index}
                  onClick={() => setSelectedAnswer(index)}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  {choice}
                </button>
              ))}
            </div>
            {selectedAnswer !== null && (
              <p
                className={`oil-answer ${selectedAnswer === lesson.answer ? "correct" : ""}`}
                role="status"
              >
                {selectedAnswer === lesson.answer
                  ? "对，抓住了这一课的重点。"
                  : "再想一想。"}
                {lesson.explanation}
              </p>
            )}
          </div>
        </div>
        <div className="oil-completion">
          <div>
            <strong>
              {isComplete ? "这次练习已经记下了" : "动手练过，再留下记录"}
            </strong>
            <p>
              {isComplete
                ? "随时可以再练一次；记录可以取消。"
                : selectedAnswer === lesson.answer
                  ? "完成纸上或实物练习后，点击右侧记录。"
                  : "先完成自检，再做一次纸上或实物练习。"}
            </p>
          </div>
          <button
            type="button"
            className={isComplete ? "btn-secondary" : "btn-primary"}
            disabled={!isComplete && selectedAnswer !== lesson.answer}
            onClick={toggleComplete}
          >
            {isComplete ? "✓ 已练习 · 点击取消" : "我已完成这次实践"}
          </button>
        </div>
        {storageWarning && (
          <p className="oil-save-warning" role="status">
            浏览器暂时不能保存记录，你仍然可以继续练习。
          </p>
        )}
        <div className="oil-next">
          <Link href="/mix">
            把观察带到调色里 <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/analyze">
            去名画里找这些关系 <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <details className="oil-sources">
          <summary>这一课的参考与练习说明</summary>
          <p>
            概念参考：
            <a href={lesson.sourceUrl} target="_blank" rel="noreferrer">
              {lesson.sourceTitle} ↗
            </a>
            。互动和纸上任务为本画室设计的入门练习，不是对原作技法的逐步复原。
          </p>
          {lessonId === "value-masses" && (
            <p>
              灰度按数字图像亮度转换；三阶与五阶是辅助归纳的屏幕示意，不能代表唯一正确的画法。
            </p>
          )}
        </details>
      </section>
    </div>
  );
}

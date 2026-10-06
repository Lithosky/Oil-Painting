"use client";

import { useState } from "react";
import "./observation-lab.css";

type ObjectKind = "bottle" | "pear" | "cup";
const subjects: { id: ObjectKind; name: string; ratio: number; tip: string }[] =
  [
    {
      id: "bottle",
      name: "长颈瓶",
      ratio: 42,
      tip: "先确定瓶身最宽处，再比较瓶颈宽度。别一上来就描瓶口。",
    },
    {
      id: "pear",
      name: "梨",
      ratio: 76,
      tip: "先找到最高、最低、最左、最右四个点，再用长线连接大外形。",
    },
    {
      id: "cup",
      name: "带把手的杯子",
      ratio: 128,
      tip: "这次把把手也算进总宽度。比较杯身与把手各占了多少。",
    },
  ];

// All three silhouettes occupy an exact 100 × 100 bounding box.
function Subject({
  kind,
  fill,
  background,
  stroke = "none",
}: {
  kind: ObjectKind;
  fill: string;
  background: string;
  stroke?: string;
}) {
  if (kind === "bottle")
    return (
      <path
        d="M35 0H65V24C65 34 90 34 100 46V96Q100 100 96 100H4Q0 100 0 96V46C10 34 35 34 35 24Z"
        fill={fill}
        stroke={stroke}
        strokeWidth=".7"
      />
    );
  if (kind === "pear")
    return (
      <path
        d="M50 0C28 0 35 20 21 38C9 51 0 59 0 76C0 92 21 100 40 100H60C81 100 100 91 100 76C100 58 85 49 76 32C68 18 72 0 50 0Z"
        fill={fill}
        stroke={stroke}
        strokeWidth=".7"
      />
    );
  return (
    <>
      <ellipse
        cx="79"
        cy="39"
        rx="21"
        ry="30"
        fill={fill}
        stroke={stroke}
        strokeWidth=".7"
      />
      <ellipse
        cx="79"
        cy="39"
        rx="12"
        ry="19"
        fill={background}
        stroke={stroke}
        strokeWidth=".7"
      />
      <path
        d="M0 0H73V79Q73 100 50 100H23Q0 100 0 79Z"
        fill={fill}
        stroke={stroke}
        strokeWidth=".7"
      />
    </>
  );
}

export function ProportionLab() {
  const [kind, setKind] = useState<ObjectKind>("bottle");
  const [estimate, setEstimate] = useState(75);
  const [revealed, setRevealed] = useState(false);
  const [axis, setAxis] = useState(true);
  const subject = subjects.find((s) => s.id === kind)!;
  const height = 210,
    actualWidth = (height * subject.ratio) / 100,
    guessWidth = (height * estimate) / 100;
  const difference = estimate - subject.ratio;
  return (
    <div className="observation-lab">
      <div
        className="observation-tools"
        role="group"
        aria-label="选择比例练习物体"
      >
        {subjects.map((s) => (
          <button
            key={s.id}
            aria-pressed={kind === s.id}
            onClick={() => {
              setKind(s.id);
              setRevealed(false);
              setEstimate(75);
            }}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="observation-workspace">
        <div className="observation-scene">
          <div className="observation-scene-label">
            <span>先估比例，再看辅助框</span>
            <span>LOOK BEFORE YOU MEASURE</span>
          </div>
          <svg
            viewBox="0 0 660 390"
            role="img"
            aria-label={`${subject.name}比例练习。左边是参考物体，右边是你估计的外接框。`}
          >
            <rect width="660" height="390" fill="#f5f3eb" />
            <path d="M330 35V345" stroke="#d6d9cd" strokeDasharray="4 5" />
            <text
              x="165"
              y="39"
              textAnchor="middle"
              fill="#748069"
              fontSize="12"
            >
              参考物体 · {subject.name}
            </text>
            <text
              x="495"
              y="39"
              textAnchor="middle"
              fill="#748069"
              fontSize="12"
            >
              你的外接框 · 宽高关系
            </text>
            <path d="M24 325H310M350 325H636" stroke="#b9c1ac" />
            <svg
              x={165 - actualWidth / 2}
              y={105}
              width={actualWidth}
              height={height}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <Subject kind={kind} fill="#737b66" background="#f5f3eb" />
            </svg>
            {axis && (
              <g stroke="#a6ad95" strokeWidth="1" strokeDasharray="5 4">
                <path d="M165 75V337M495 75V337" />
                <path d="M25 210H310M350 210H635" />
              </g>
            )}
            <rect
              x={495 - guessWidth / 2}
              y="105"
              width={guessWidth}
              height={height}
              fill="#d9b776"
              fillOpacity=".06"
              stroke="#af8d4c"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <text
              x="495"
              y="358"
              textAnchor="middle"
              fill="#967943"
              fontSize="13"
            >
              你估计的宽 : 高 = {estimate} : 100
            </text>
            {revealed && (
              <g>
                <rect
                  x={165 - actualWidth / 2}
                  y="105"
                  width={actualWidth}
                  height={height}
                  fill="none"
                  stroke="#456951"
                  strokeWidth="1.6"
                />
                <rect
                  x={495 - actualWidth / 2}
                  y="105"
                  width={actualWidth}
                  height={height}
                  fill="none"
                  stroke="#456951"
                  strokeWidth="1.6"
                />
                <text
                  x="165"
                  y="358"
                  textAnchor="middle"
                  fill="#456951"
                  fontSize="13"
                >
                  参考宽 : 高 = {subject.ratio} : 100
                </text>
              </g>
            )}
          </svg>
          <div className="observation-key">
            <span>
              <i style={{ background: "#af8d4c" }} />
              你的估计
            </span>
            {revealed && (
              <span>
                <i style={{ background: "#456951" }} />
                参考外接框
              </span>
            )}
            <span>图中只比较比例，大小不是对错标准。</span>
          </div>
        </div>
        <aside className="observation-settings">
          <span className="sketch-small-label">不要急着画细节</span>
          <h2>它有多宽，又有多高？</h2>
          <p>
            把高度当作
            100，先凭眼睛估计整个物体的宽度。用滑块调整右侧框，再打开参考线比较。
          </p>
          <label className="observation-range" htmlFor="proportion-estimate">
            你估计的宽度<output>{estimate} : 100</output>
            <input
              id="proportion-estimate"
              type="range"
              min="25"
              max="135"
              value={estimate}
              onChange={(e) => {
                setEstimate(Number(e.target.value));
                setRevealed(false);
              }}
            />
          </label>
          <label className="observation-toggle">
            <input
              type="checkbox"
              checked={axis}
              onChange={(e) => setAxis(e.target.checked)}
            />
            显示中轴与半高线
          </label>
          <button
            className="btn-primary"
            onClick={() => setRevealed((v) => !v)}
            aria-expanded={revealed}
          >
            {revealed ? "隐藏参考框，再观察" : "叠上参考框，检查比例"}
          </button>
          {revealed && (
            <div className="observation-feedback" role="status">
              <strong>
                {Math.abs(difference) <= 4
                  ? "宽高关系已经很接近。"
                  : difference > 0
                    ? "你估计的外形偏宽。"
                    : "你估计的外形偏窄。"}
              </strong>
              <p>
                {Math.abs(difference) <= 4
                  ? "下一步比较物体内部的比例，再决定轮廓转折的位置。"
                  : `保持高度不变，把框${difference > 0 ? "收窄" : "放宽"}一些。先找最宽处，别让某一个细节决定整体宽度。`}
              </p>
            </div>
          )}
          <p className="observation-tip">{subject.tip}</p>
          <p className="observation-small">
            本练习是比例观察，不是完整造型评分。换到实物时，固定眼睛和手臂的位置，用同一把“尺”比较。
          </p>
        </aside>
      </div>
    </div>
  );
}

const gapTargets = [
  { ratio: 0.5, label: "瓶身宽度的一半" },
  { ratio: 1, label: "与瓶身一样宽" },
  { ratio: 0.75, label: "瓶身宽度的四分之三" },
];
export function NegativeSpaceLab() {
  const [view, setView] = useState<"objects" | "negative" | "contour">(
    "objects",
  );
  const [gap, setGap] = useState(34);
  const [task, setTask] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [guides, setGuides] = useState(false);
  const target = gapTargets[task],
    targetGap = 100 * target.ratio;
  const negative = view === "negative",
    contour = view === "contour";
  const background = negative ? "#7d9184" : "#f5f3eb",
    fill = negative ? "#f5f3eb" : contour ? "#f5f3eb" : "#757c6b";
  return (
    <div className="observation-lab">
      <div
        className="observation-tools"
        role="group"
        aria-label="物体与负形观察模式"
      >
        {(
          [
            { id: "objects", name: "观察物体" },
            { id: "negative", name: "只看负形" },
            { id: "contour", name: "观察轮廓" },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
          >
            {v.name}
          </button>
        ))}
      </div>
      <div className="observation-workspace">
        <div className="observation-scene">
          <div className="observation-scene-label">
            <span>
              {negative
                ? "绿色部分就是物体之外的空隙"
                : "瓶子、杯子，还有它们之间的空隙"}
            </span>
            <span>DRAW THE SPACE BETWEEN</span>
          </div>
          <svg
            viewBox="0 0 660 390"
            role="img"
            aria-label={`${negative ? "负形" : contour ? "轮廓" : "物体"}示意。移动杯子，改变它与瓶子之间的空隙。`}
          >
            <rect width="660" height="390" fill={background} />
            <path
              d="M35 317H625"
              stroke={negative ? "#d2decf" : "#bdc5b1"}
              strokeWidth="1"
            />
            <svg
              x="165"
              y="95"
              width="100"
              height="220"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <Subject
                kind="bottle"
                fill={fill}
                background={background}
                stroke={contour ? "#5b6e59" : "none"}
              />
            </svg>
            <svg
              x={265 + gap}
              y="195"
              width="175"
              height="120"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <Subject
                kind="cup"
                fill={fill}
                background={background}
                stroke={contour ? "#5b6e59" : "none"}
              />
            </svg>
            {(guides || revealed) && (
              <g
                stroke={negative ? "#ecf0e5" : "#a58446"}
                strokeWidth="1"
                fill="none"
              >
                <path
                  d={`M265 219H${265 + gap}M265 211V227M${265 + gap} 211V227`}
                />
                <path d="M165 346H265M165 339V353M265 339V353" />
                <g
                  fill={negative ? "#f5f5ed" : "#786342"}
                  stroke="none"
                  fontSize="12"
                >
                  <text x="215" y="370" textAnchor="middle">
                    瓶身宽度 = 1
                  </text>
                  {revealed && (
                    <text x={265 + gap / 2} y="206" textAnchor="middle">
                      {(gap / 100).toFixed(2)}
                    </text>
                  )}
                </g>
              </g>
            )}
            <text
              x="34"
              y="37"
              fill={negative ? "#f3f4e9" : "#7c856f"}
              fontSize="12"
            >
              {negative
                ? "也看看杯把里面：没有画的地方，同样有形状。"
                : "先看整体摆放，再看外轮廓。"}
            </text>
          </svg>
          <div className="observation-key">
            <span>负形是物体周围、之间以及孔洞中的空间。</span>
          </div>
        </div>
        <aside className="observation-settings">
          <span className="sketch-small-label">换一种看法</span>
          <h2>也画“没有东西”的地方。</h2>
          <p>
            把注意力从物体名字移开。看看空隙是细长还是宽阔，转折在哪里，再用它反查物体的位置。
          </p>
          <div className="observation-target">
            <span>
              小任务 {task + 1} / {gapTargets.length}
            </span>
            <strong>
              让瓶与杯之间的间隙，{task === 1 ? "约" : "约为"}
              {target.label}。
            </strong>
            <p>比较的是图中瓶身最宽处与杯身左侧之间的水平距离。</p>
          </div>
          <label className="observation-range" htmlFor="negative-gap">
            左右移动杯子
            <input
              id="negative-gap"
              type="range"
              min="10"
              max="130"
              value={gap}
              onChange={(e) => {
                setGap(Number(e.target.value));
                setRevealed(false);
              }}
            />
          </label>
          <label className="observation-toggle">
            <input
              type="checkbox"
              checked={guides}
              onChange={(e) => setGuides(e.target.checked)}
            />
            显示宽度比较线
          </label>
          <div className="observation-actions">
            <button className="btn-primary" onClick={() => setRevealed(true)}>
              检查我的间距
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setTask((task + 1) % gapTargets.length);
                setGap(34);
                setRevealed(false);
              }}
            >
              换一个任务
            </button>
          </div>
          {revealed && (
            <div className="observation-feedback" role="status">
              <strong>
                {Math.abs(gap - targetGap) <= 5
                  ? "空隙的宽度接近目标。"
                  : gap > targetGap
                    ? "空隙偏宽，让杯子靠近一点。"
                    : "空隙偏窄，让杯子离远一点。"}
              </strong>
              <p>
                当前空隙是瓶身宽度的 {(gap / 100).toFixed(2)}{" "}
                倍。再切换负形模式，看它是否更容易判断。
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

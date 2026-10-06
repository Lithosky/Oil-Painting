"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import Link from "next/link";
import "./sketch.css";
import PerspectiveLab from "@/components/PerspectiveLab";
import { ProportionLab, NegativeSpaceLab } from "@/components/ObservationLab";

type LessonId =
  "perspective" | "light" | "hatching" | "proportion" | "negative-space";
type Point = { x: number; y: number };
type Stroke = { points: Point[]; opacity: number };
const PROGRESS_KEY = "atelier-sketch-progress-v1";
const LESSONS: {
  id: LessonId;
  number: string;
  title: string;
  subtitle: string;
  duration: string;
}[] = [
  {
    id: "perspective",
    number: "01",
    title: "空间与透视",
    subtitle: "形体、旋转与切面",
    duration: "5 分钟",
  },
  {
    id: "light",
    number: "02",
    title: "光影与体积",
    subtitle: "先看明暗，再看颜色",
    duration: "5 分钟",
  },
  {
    id: "hatching",
    number: "03",
    title: "排线与笔触",
    subtitle: "让每一根线有方向",
    duration: "5 分钟",
  },
  {
    id: "proportion",
    number: "04",
    title: "观察与比例",
    subtitle: "先定大形，再画细节",
    duration: "5 分钟",
  },
  {
    id: "negative-space",
    number: "05",
    title: "轮廓与负形",
    subtitle: "也观察物体之间",
    duration: "5 分钟",
  },
];

function RangeControl({
  id,
  label,
  value,
  min,
  max,
  onChange,
  display,
  ends,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  display: string;
  ends: [string, string];
}) {
  return (
    <div className="sketch-control">
      <label htmlFor={id}>
        {label}
        <output htmlFor={id}>{display}</output>
      </label>
      <input
        id={id}
        type="range"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="sketch-range-ends">
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
    </div>
  );
}

function Observation({ children }: { children: React.ReactNode }) {
  return (
    <div className="sketch-observation">
      <span className="sketch-small-label">停一下，观察</span>
      <p>{children}</p>
    </div>
  );
}

function LightLesson() {
  const [lightSide, setLightSide] = useState(-70);
  const [elevation, setElevation] = useState(55);
  const [labels, setLabels] = useState(true);
  const lx = 350 + lightSide * 2.4;
  const ly = 150 - elevation * 1.45;
  const shadowShift = (-lightSide * (100 - elevation)) / 65;
  const shadowWidth = 105 + (85 - elevation) * 0.65;
  const lightName =
    lightSide < -20 ? "左上方" : lightSide > 20 ? "右上方" : "上方";
  return (
    <div className="sketch-lab">
      <div className="sketch-visual">
        <div className="sketch-visual-top">
          <span>球体明暗 · 移动一盏灯</span>
          <span>INTERACTIVE STUDY 02</span>
        </div>
        <svg
          className="sketch-scene"
          viewBox="0 0 720 390"
          role="img"
          aria-label={`光从${lightName}照向球体，亮部朝向光源，投影向相反一侧延伸。`}
        >
          <defs>
            <radialGradient
              id="sphere-tone"
              cx={`${50 + lightSide * 0.31}%`}
              cy={`${50 - elevation * 0.47}%`}
              r="85%"
              fx={`${50 + lightSide * 0.31}%`}
              fy={`${50 - elevation * 0.47}%`}
            >
              <stop offset="0" stopColor="#fffef7" />
              <stop offset=".25" stopColor="#e6e4d9" />
              <stop offset=".57" stopColor="#a4a69b" />
              <stop offset=".81" stopColor="#575d51" />
              <stop offset=".96" stopColor="#656b5d" />
              <stop offset="1" stopColor="#7e8474" />
            </radialGradient>
            <radialGradient id="cast-tone">
              <stop stopColor="#4d5245" stopOpacity=".48" />
              <stop offset=".65" stopColor="#626656" stopOpacity=".28" />
              <stop offset="1" stopColor="#626656" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="contact-tone">
              <stop stopColor="#34392f" stopOpacity=".66" />
              <stop offset="1" stopColor="#34392f" stopOpacity="0" />
            </radialGradient>
            <pattern
              id="light-paper"
              width="4"
              height="4"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r=".35" fill="#6b6757" opacity=".12" />
            </pattern>
          </defs>
          <rect width="720" height="390" fill="#f4f2ea" />
          <path
            d="M 0 285 Q 350 245 720 285 L 720 390 L 0 390 Z"
            fill="#eae8dd"
          />
          <ellipse
            cx={350 + shadowShift}
            cy="311"
            rx={shadowWidth}
            ry={21 + (85 - elevation) * 0.18}
            fill="url(#cast-tone)"
          />
          <ellipse
            cx="350"
            cy="312"
            rx="62"
            ry="11"
            fill="url(#contact-tone)"
          />
          <circle cx="350" cy="215" r="97" fill="url(#sphere-tone)" />
          <circle cx="350" cy="215" r="97" fill="url(#light-paper)" />
          <g stroke="#a58e57" strokeWidth="1.2">
            <line
              x1={lx}
              y1={ly + 15}
              x2={350 + lightSide * 0.65}
              y2={164 - elevation * 0.15}
              strokeDasharray="4 5"
              opacity=".7"
            />
            <circle cx={lx} cy={ly} r="11" fill="#efdeb1" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const a = (angle * Math.PI) / 180;
              return (
                <line
                  key={angle}
                  x1={lx + Math.cos(a) * 17}
                  y1={ly + Math.sin(a) * 17}
                  x2={lx + Math.cos(a) * 22}
                  y2={ly + Math.sin(a) * 22}
                />
              );
            })}
          </g>
          <text
            x={lx}
            y={ly + 42}
            textAnchor="middle"
            fill="#8b7648"
            fontSize="12"
          >
            光源
          </text>
          {labels && (
            <g fill="#606653" fontSize="12" stroke="#89917e" strokeWidth=".8">
              <path
                d={`M ${lightSide <= 0 ? 170 : 545} 160 L ${350 + lightSide * 0.55} ${185 - elevation * 0.35}`}
                fill="none"
              />
              <text x={lightSide <= 0 ? 128 : 551} y="162" stroke="none">
                亮部
              </text>
              <path
                d={`M ${lightSide <= 0 ? 540 : 162} 246 L ${350 - lightSide * 0.8} 244`}
                fill="none"
              />
              <text x={lightSide <= 0 ? 547 : 128} y="250" stroke="none">
                暗部
              </text>
              <path
                d={`M ${350 + shadowShift} 324 L ${350 + shadowShift} 349`}
                fill="none"
              />
              <text
                x={350 + shadowShift}
                y="367"
                textAnchor="middle"
                stroke="none"
              >
                投影 · 落在承接面上
              </text>
            </g>
          )}
        </svg>
        <div className="sketch-scene-caption">
          <span className="sketch-caption-dot" />
          光从{lightName}来。先把亮部与暗部作为两大块观察。
        </div>
      </div>
      <aside className="sketch-settings">
        <span className="sketch-small-label">动手改变光源</span>
        <h2>让圆，变成球。</h2>
        <p className="sketch-muted">形体没变，明暗的位置却会随着光源移动。</p>
        <RangeControl
          id="light-direction"
          label="光源方向"
          value={lightSide}
          min={-100}
          max={100}
          onChange={setLightSide}
          display={lightName}
          ends={["左侧", "右侧"]}
        />
        <RangeControl
          id="light-elevation"
          label="光源高度"
          value={elevation}
          min={20}
          max={85}
          onChange={setElevation}
          display={elevation < 40 ? "低" : elevation > 65 ? "高" : "适中"}
          ends={["低 · 影子较长", "高 · 影子较短"]}
        />
        <label className="sketch-toggle">
          <input
            type="checkbox"
            checked={labels}
            onChange={(event) => setLabels(event.target.checked)}
          />
          <span>显示明暗标注</span>
        </label>
        <Observation>
          把灯从左移到右：暗部与投影如何变化？在纸上画之前，先画一个表示来光方向的小箭头。
        </Observation>
        <p className="sketch-footnote">
          简化光影示意。真实明暗还受材质、环境反光和光源大小影响；亮部不等于每次都有白色高光。
        </p>
      </aside>
    </div>
  );
}

function HatchLines({
  spacing,
  angle,
  opacity = 0.75,
}: {
  spacing: number;
  angle: number;
  opacity?: number;
}) {
  return (
    <g
      transform={`rotate(${angle} 125 125)`}
      stroke="#3b4437"
      strokeWidth="1.3"
      strokeLinecap="round"
      opacity={opacity}
    >
      {Array.from({ length: Math.ceil(400 / spacing) + 1 }, (_, i) => (
        <line
          key={i}
          x1={-75 + i * spacing}
          y1="-65"
          x2={-75 + i * spacing}
          y2="315"
        />
      ))}
    </g>
  );
}

function DrawingPad() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [active, setActive] = useState<Stroke | null>(null);
  const [pencil, setPencil] = useState(55);
  const activeRef = useRef<Stroke | null>(null);
  const pointerRef = useRef<number | null>(null);
  const point = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(640, ((event.clientX - rect.left) * 640) / rect.width),
      ),
      y: Math.max(
        0,
        Math.min(230, ((event.clientY - rect.top) * 230) / rect.height),
      ),
    };
  };
  const start = (event: PointerEvent<SVGSVGElement>) => {
    if (pointerRef.current !== null || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = event.pointerId;
    const stroke = { points: [point(event)], opacity: pencil / 100 };
    activeRef.current = stroke;
    setActive(stroke);
  };
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (pointerRef.current !== event.pointerId || !activeRef.current) return;
    const stroke = {
      ...activeRef.current,
      points: [...activeRef.current.points, point(event)],
    };
    activeRef.current = stroke;
    setActive(stroke);
  };
  const end = (event: PointerEvent<SVGSVGElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    const stroke = activeRef.current;
    if (stroke) setStrokes((previous) => [...previous, stroke]);
    activeRef.current = null;
    pointerRef.current = null;
    setActive(null);
  };
  const addSample = () => {
    const startX = 62 + (strokes.length % 5) * 100;
    const sample = Array.from({ length: 12 }, (_, i) => ({
      points: [
        { x: startX + i * 5, y: 170 },
        { x: startX + i * 5 + 35, y: 65 },
      ],
      opacity: pencil / 100,
    }));
    setStrokes((previous) => [...previous, ...sample]);
  };
  return (
    <div className="sketch-drawing-pad">
      <div className="sketch-pad-heading">
        <div>
          <span className="sketch-small-label">你的练习纸</span>
          <h3>试着铺一块均匀的灰</h3>
        </div>
        <span className="sketch-muted">鼠标 / 触控笔 / 手指</span>
      </div>
      <svg
        viewBox="0 0 640 230"
        preserveAspectRatio="none"
        className="sketch-drawing-surface"
        role="img"
        aria-label="自由排线练习画布，可用鼠标或触控笔绘画；也可通过下方按钮添加示范排线。"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        <defs>
          <pattern
            id="drawing-paper"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="10" cy="10" r=".6" fill="#c6c9bf" />
          </pattern>
        </defs>
        <rect width="640" height="230" fill="#fcfbf6" />
        <rect width="640" height="230" fill="url(#drawing-paper)" />
        {strokes.length === 0 && !active && (
          <text
            x="320"
            y="120"
            textAnchor="middle"
            fill="#858b7e"
            fontSize="14"
            pointerEvents="none"
          >
            轻轻起笔，试着让线条保持平行
          </text>
        )}
        {[...strokes, ...(active ? [active] : [])].map((stroke, i) =>
          stroke.points.length === 1 ? (
            <circle
              key={i}
              cx={stroke.points[0].x}
              cy={stroke.points[0].y}
              r=".9"
              fill="#34412f"
              opacity={stroke.opacity}
            />
          ) : (
            <polyline
              key={i}
              points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#34412f"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={stroke.opacity}
            />
          ),
        )}
      </svg>
      <div className="sketch-pad-tools">
        <label htmlFor="pencil-strength">
          笔触深浅
          <input
            id="pencil-strength"
            type="range"
            value={pencil}
            min={20}
            max={90}
            onChange={(event) => setPencil(Number(event.target.value))}
          />
        </label>
        <div>
          <button
            type="button"
            className="sketch-text-button"
            onClick={addSample}
          >
            添加示范排线
          </button>
          <button
            type="button"
            className="sketch-text-button"
            disabled={!strokes.length}
            onClick={() => setStrokes((previous) => previous.slice(0, -1))}
          >
            撤销一笔
          </button>
          <button
            type="button"
            className="sketch-text-button"
            disabled={!strokes.length}
            onClick={() => setStrokes([])}
          >
            清空
          </button>
        </div>
      </div>
      <p className="sketch-footnote">
        练习纸只保留在本次页面中。屏幕上的笔触深浅帮助理解层次，手部力度仍需要在纸上练习。
      </p>
    </div>
  );
}

function HatchingLesson() {
  const [density, setDensity] = useState(45);
  const [angle, setAngle] = useState(30);
  const [layers, setLayers] = useState(1);
  const spacing = 19 - density * 0.15;
  return (
    <>
      <div className="sketch-lab">
        <div className="sketch-visual">
          <div className="sketch-visual-top">
            <span>线条实验 · 从疏到密，从轻到重</span>
            <span>INTERACTIVE STUDY 03</span>
          </div>
          <div className="sketch-hatch-preview">
            <svg
              viewBox="0 0 250 250"
              role="img"
              aria-label={`${layers} 层排线，密度 ${density}%，倾斜角度 ${angle} 度。`}
            >
              <defs>
                <clipPath id="hatch-circle">
                  <circle cx="125" cy="125" r="99" />
                </clipPath>
              </defs>
              <circle
                cx="125"
                cy="125"
                r="100"
                fill="#f7f5ed"
                stroke="#c0c5b8"
              />
              <g clipPath="url(#hatch-circle)">
                <HatchLines spacing={spacing} angle={angle} />
                {layers >= 2 && (
                  <HatchLines
                    spacing={spacing}
                    angle={angle + 65}
                    opacity={0.6}
                  />
                )}
                {layers >= 3 && (
                  <HatchLines
                    spacing={spacing}
                    angle={angle + 125}
                    opacity={0.5}
                  />
                )}
              </g>
            </svg>
            <div className="sketch-hatch-note">
              <span>{layers === 1 ? "平行排线" : "交叉排线"}</span>
              <p>
                {layers === 1
                  ? "保持一个方向，先练均匀。"
                  : "换一个角度叠加，逐渐压深。"}
              </p>
            </div>
            <div className="sketch-value-scale">
              {["#f9f8f2", "#d9dcd0", "#a6ad9b", "#737d69", "#394534"].map(
                (color, i) => (
                  <div key={color}>
                    <span style={{ backgroundColor: color }} />
                    <small>{i + 1}</small>
                  </div>
                ),
              )}
            </div>
            <p className="sketch-footnote">目标：画出能分辨的五阶灰度。</p>
          </div>
          <div className="sketch-scene-caption">
            <span className="sketch-caption-dot" />
            密度和叠加改变灰度；别一开始就把暗部压到最黑。
          </div>
        </div>
        <aside className="sketch-settings">
          <span className="sketch-small-label">动手改变线条</span>
          <h2>灰色，也可以用线织出来。</h2>
          <p className="sketch-muted">
            先练平直与间距，再把线条顺着物体的形状组织起来。
          </p>
          <RangeControl
            id="hatching-density"
            label="排线密度"
            value={density}
            min={10}
            max={100}
            onChange={setDensity}
            display={`${density}%`}
            ends={["疏 · 浅", "密 · 深"]}
          />
          <RangeControl
            id="hatching-angle"
            label="线条倾斜"
            value={angle}
            min={-75}
            max={75}
            onChange={setAngle}
            display={`${angle}°`}
            ends={["向左倾斜", "向右倾斜"]}
          />
          <div className="sketch-control">
            <span className="sketch-control-label">叠加层数</span>
            <div
              className="sketch-segments"
              role="group"
              aria-label="排线叠加层数"
            >
              {[1, 2, 3].map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={layers === value}
                  onClick={() => setLayers(value)}
                >
                  {value} 层
                </button>
              ))}
            </div>
          </div>
          <Observation>
            保持密度不变，增加一层交叉线。灰度变深了吗？只改角度，画面的方向感又有什么变化？
          </Observation>
        </aside>
      </div>
      <DrawingPad />
    </>
  );
}

const PRACTICE: Record<
  LessonId,
  {
    title: string;
    steps: string[];
    question: string;
    answer: string;
    bridge: string;
  }
> = {
  perspective: {
    title: "用 5 分钟，把几何形体画成结构稿",
    steps: [
      "选一个圆柱或纸盒，先用中轴和外接框确定整体宽高，不急着涂明暗。",
      "切换观察高度，分别画出眼前形体的上、下端面。圆柱先画完整椭圆，再区分可见与遮挡部分。",
      "换成斜切圆柱，先补出未切前的完整形体，再沿同一个平面画出切口；比较两张结构稿。",
    ],
    question: "为什么先画完整形体，再找切面的位置？",
    answer:
      "完整形体给出统一的中轴、宽高和空间方向。切口属于同一个平面，不能只凭轮廓随意连线。圆柱端面在透视下通常呈椭圆；它的开合随视角改变，不能把每一个端面都画成同样扁的椭圆。",
    bridge:
      "画油画静物前，先用淡线确定桌面和物体的透视。颜色再漂亮，也需要可信的空间。",
  },
  light: {
    title: "用 5 分钟，把一个鸡蛋画成立体的",
    steps: [
      "拿一个鸡蛋或浅色球体，用一盏台灯从侧上方照亮。先画轮廓和来光方向。",
      "眯眼看：用一层浅灰把暗部与投影铺成两个大块，亮部先留白。",
      "比较物体接触桌面的地方、暗部和亮部，再逐步加深最暗的区域。",
    ],
    question: "物体上的暗部，和桌面上的投影是一回事吗？",
    answer:
      "不是。暗部是物体表面背离光源的部分；投影是物体挡住光后落在承接面上的影子。画之前先分清两者，投影通常向光源的相反方向延伸。",
    bridge:
      "调颜色前，先判断它属于亮部还是暗部。明度关系明确了，油画就更容易有体积感。",
  },
  hatching: {
    title: "用 5 分钟，铺出五个深浅不同的格子",
    steps: [
      "在纸上画五个小方格。第一格接近留白，最后一格最深。",
      "先轻轻铺同方向的线，通过间距与叠加，逐格加深；保持每格内部尽量均匀。",
      "离远一点看，检查相邻灰度是否分得清。不要用力来回涂出发亮的纸面。",
    ],
    question: "想把一个灰面加深，除了加大力度，还能怎样做？",
    answer:
      "缩小线条间距，或轻轻叠加另一层排线。改变交叉角度可帮助覆盖空隙；保持手轻、分层加深，更容易控制灰度，也更容易修改。",
    bridge:
      "排线练的是笔触控制与层次观察。转到油画时，也可以先铺大色块，再逐层调整笔触与明暗。",
  },
  proportion: {
    title: "用 5 分钟，先画出一个物体的四个极点",
    steps: [
      "把一个杯子或瓶子放在眼前，固定坐姿，用同一段铅笔长度比较总宽和总高。",
      "先在纸上轻点最高、最低、最左、最右四个点，再画外接框与中轴线。",
      "退远看比例是否接近，再补瓶颈、杯把等局部。每加一个细节，都回头与整体比较。",
    ],
    question: "描了很多细节，为什么物体还是显得太胖或太瘦？",
    answer:
      "细节依附于整体比例。先检查宽高、轴线和关键转折点，局部描得再精细也无法纠正一个过宽的外接框。测量时保持相同的观察位置与手臂距离。",
    bridge:
      "油画起稿同样先比较大形。外形与比例可信，后面的色块才有可靠的位置。",
  },
  "negative-space": {
    title: "用 5 分钟，只画瓶子与杯子之间的空隙",
    steps: [
      "在桌上摆一个瓶子和带把手的杯子，先观察它们之间、把手里面的空白形状。",
      "只画空隙的外边界，暂时不想它叫瓶子还是杯子；比较上宽下窄与倾斜方向。",
      "再补物体轮廓，检查空隙是否仍与实物相似。位置不对时，优先移动大轮廓。",
    ],
    question: "负形为什么能帮助我们把物体画准？",
    answer:
      "同一条边既属于物体，也围出周围的空隙。换成观察空隙的宽窄与角度，可以绕开脑中对“杯子应该长什么样”的印象，检查真正看见的位置关系。",
    bridge:
      "油画铺背景时，也是在修正主体的轮廓。背景和主体共同决定形，不必把背景留到最后才考虑。",
  },
};

export default function SketchPage() {
  const [lesson, setLesson] = useState<LessonId>("perspective");
  const [completed, setCompleted] = useState<string[]>([]);
  const [answerShown, setAnswerShown] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  useEffect(() => {
    const requestedLesson = new URLSearchParams(window.location.search).get(
      "lesson",
    );
    if (LESSONS.some((item) => item.id === requestedLesson))
      setLesson(requestedLesson as LessonId);
    try {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      if (Array.isArray(saved.completed))
        setCompleted(
          Array.from(
            new Set<string>(
              saved.completed.filter((id: unknown) =>
                LESSONS.some((item) => item.id === id),
              ),
            ),
          ),
        );
    } catch {
      /* A fresh session still works when local storage is unavailable. */
    }
  }, []);
  const selectLesson = (id: LessonId) => {
    setLesson(id);
    setAnswerShown(false);
    window.history.replaceState(null, "", `/sketch?lesson=${id}`);
  };
  const markComplete = () => {
    const next = completed.includes(lesson)
      ? completed.filter((id) => id !== lesson)
      : [...completed, lesson];
    setCompleted(next);
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ completed: next }));
      window.dispatchEvent(new Event("atelier-progress"));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  };
  const practice = PRACTICE[lesson];
  const isCompleted = completed.includes(lesson);
  const currentIndex = LESSONS.findIndex((item) => item.id === lesson);
  return (
    <div className="sketch-page">
      <header className="sketch-header">
        <div>
          <div className="sketch-eyebrow">
            <span /> THE DRAWING ROOM{" "}
            <span className="sketch-eyebrow-divider">/</span> 素描基础
          </div>
          <h1>先看懂，再画出来。</h1>
          <p>从几何结构到比例与负形。每次选一课，把观察练成手上的感觉。</p>
        </div>
        <div className="sketch-progress">
          <span>
            <strong>{completed.length}</strong> / {LESSONS.length}
          </span>
          <span>基础练习已完成</span>
          <div className="sketch-progress-track">
            <div
              style={{ width: `${(completed.length / LESSONS.length) * 100}%` }}
            />
          </div>
        </div>
      </header>
      <div
        className="sketch-lesson-tabs"
        role="tablist"
        aria-label="素描基础课程"
      >
        {LESSONS.map((item) => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={lesson === item.id}
            aria-controls="sketch-lesson-panel"
            tabIndex={lesson === item.id ? 0 : -1}
            onClick={() => selectLesson(item.id)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const index =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? LESSONS.length - 1
                    : (currentIndex +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        LESSONS.length) %
                      LESSONS.length;
              selectLesson(LESSONS[index].id);
              document.getElementById(`tab-${LESSONS[index].id}`)?.focus();
            }}
          >
            <span className="sketch-tab-number">
              {completed.includes(item.id) ? "✓" : item.number}
            </span>
            <span className="sketch-tab-copy">
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </span>
            <span className="sketch-tab-duration">{item.duration}</span>
          </button>
        ))}
      </div>
      <section
        id="sketch-lesson-panel"
        role="tabpanel"
        aria-labelledby={`tab-${lesson}`}
        tabIndex={0}
      >
        <div hidden={lesson !== "perspective"}>
          <PerspectiveLab />
        </div>
        <div hidden={lesson !== "light"}>
          <LightLesson />
        </div>
        <div hidden={lesson !== "hatching"}>
          <HatchingLesson />
        </div>
        <div hidden={lesson !== "proportion"}>
          <ProportionLab />
        </div>
        <div hidden={lesson !== "negative-space"}>
          <NegativeSpaceLab />
        </div>
        <div className="sketch-practice">
          <div className="sketch-practice-task">
            <span className="sketch-small-label">从屏幕，回到画纸</span>
            <h2>{practice.title}</h2>
            <ol>
              {practice.steps.map((step, index) => (
                <li key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="sketch-check">
            <span className="sketch-small-label">给自己一个小检查</span>
            <h3>{practice.question}</h3>
            <button
              className="sketch-answer-button"
              type="button"
              aria-expanded={answerShown}
              aria-controls="sketch-answer"
              onClick={() => setAnswerShown(!answerShown)}
            >
              {answerShown ? "收起提示" : "想一想，再看提示"}
              <span aria-hidden="true">{answerShown ? "−" : "+"}</span>
            </button>
            {answerShown && (
              <p id="sketch-answer" className="sketch-answer">
                {practice.answer}
              </p>
            )}
            <button
              type="button"
              className={`sketch-complete-button${isCompleted ? " is-complete" : ""}`}
              onClick={markComplete}
              aria-pressed={isCompleted}
            >
              {isCompleted ? "✓ 已完成这次纸上练习" : "我完成了纸上练习"}
              <span aria-hidden="true">{isCompleted ? "↶" : "→"}</span>
            </button>
            <p className="sketch-footnote" aria-live="polite">
              {storageWarning
                ? "当前浏览器无法保存，进度仅保留在本次页面。"
                : isCompleted
                  ? "进度已保存在此浏览器。再次点击可撤销。"
                  : "完成记录由你自评；看懂之后，记得亲手画一次。"}
            </p>
          </div>
        </div>
        <div className="sketch-bridge">
          <div>
            <span className="sketch-small-label">素描 × 油画</span>
            <p>{practice.bridge}</p>
          </div>
          <Link href="/mix">
            把观察用到调色中 <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <p className="sketch-sources">
        延伸阅读：
        <a
          href="https://www.nga.gov/educational-resources/explore-basics-drawing"
          target="_blank"
          rel="noreferrer"
        >
          美国国家美术馆 · 素描基础 ↗
        </a>
        <span> / </span>
        <a
          href="https://www.getty.edu/art/exhibitions/hatched/"
          target="_blank"
          rel="noreferrer"
        >
          盖蒂博物馆 · 用线塑造形体 ↗
        </a>
        <span> / </span>
        <a
          href="https://www.getty.edu/education/teachers/classroom_resources/curricula/arts_lang_arts/a_la_lesson28.html"
          target="_blank"
          rel="noreferrer"
        >
          盖蒂博物馆 · 静物与负形 ↗
        </a>
      </p>
    </div>
  );
}

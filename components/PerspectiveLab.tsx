"use client";

import { useMemo, useState } from "react";
import {
  createStudyScene,
  studyCamera,
  projectPoint,
  faceVisible,
  faceCenter,
  faceNormal,
  meshEdges,
  orderStudyMeshes,
  dot,
  normalize,
} from "@/lib/geometry";
import type { FormKind, Vec3 } from "@/lib/geometry";
import "./perspective-lab.css";

const FORMS: {
  id: FormKind;
  name: string;
  short: string;
  note: string;
  watch: string;
  mistake: string;
}[] = [
  {
    id: "cube",
    name: "正方体",
    short: "从三个面开始",
    note: "先画外轮廓，再找三组边的方向。转角变了，左右两个面的宽度也会交换。",
    watch: "从「正面」切到「转角」：同样长的边，在纸上还一样长吗？",
    mistake: "不要把每一条边都画成相同的长度；先比较眼睛实际看到的宽窄。",
  },
  {
    id: "block",
    name: "长方体",
    short: "练习长宽高",
    note: "把书、盒子、房子先看作长方体。长、宽、高的比例和透视缩短需要一起观察。",
    watch: "转到侧面，再改变高宽比例：区分「物体变形」和「视角改变」。",
    mistake: "不要用记忆里的长方形替代观察；朝远处延伸的一组平行边会收拢。",
  },
  {
    id: "cylinder",
    name: "圆柱体",
    short: "轴线与椭圆",
    note: "用一根轴线和上下两个圆面搭起圆柱。俯视程度、圆面所在高度都会影响椭圆的开合。",
    watch:
      "先选「正面」，再缓缓提高观察高度：顶面从窄到宽，侧面同时发生什么变化？",
    mistake: "椭圆两端要圆润，别画成尖杏仁。上下椭圆也不应机械地复制粘贴。",
  },
  {
    id: "cut-cylinder",
    name: "斜切圆柱",
    short: "让截面转起来",
    note: "斜平面切过圆柱，会留下椭圆形截面。改变切面角度，再绕着它看，截面的投影会一起变化。",
    watch:
      "把斜切角度从负值移到正值，再旋转 90°：哪一侧更高，切口看起来更开还是更窄？",
    mistake:
      "切面的方向由切割平面决定，不一定与底面平行。先找高点、低点和中心。",
  },
  {
    id: "cone",
    name: "圆锥体",
    short: "顶点与底面",
    note: "先确定底面的中心和轴线，顶点位于轴线上。可见的两条侧轮廓从顶点切向底面圆周。",
    watch:
      "打开结构模式：半高处的截面半径只有底面的一半，观察它如何落在轮廓内。",
    mistake: "不要把顶点随意放在纸面底面椭圆的正上方；先沿空间轴线寻找位置。",
  },
  {
    id: "prism",
    name: "六棱柱",
    short: "从棱角到曲面",
    note: "每一组平行侧棱遵循相同的透视关系。把圆柱理解成很多小平面，也更容易看懂体积。",
    watch: "交替查看六棱柱和圆柱：平面转折变成连续转折，明暗如何连接？",
    mistake: "别把每个侧面画成一样宽；正对你的面与偏向侧面的面，投影宽度不同。",
  },
  {
    id: "group",
    name: "组合体",
    short: "穿插与遮挡",
    note: "把复杂静物拆成简单几何体。先比较整体高宽、前后和接触位置，再画局部。",
    watch: "从左侧转到右侧：圆柱会遮住哪些边？打开隐藏边，检查被遮挡的结构。",
    mistake:
      "不要逐个画完再拼在一起；先用一个大轮廓包住全部物体，再确定相互位置。",
  },
];

function FormIcon({ kind }: { kind: FormKind }) {
  return (
    <svg
      viewBox="0 0 44 40"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    >
      {kind === "cube" || kind === "block" ? (
        <g
          transform={
            kind === "block" ? "translate(-4 4) scale(1.15 .82)" : undefined
          }
        >
          <path d="M9 12 23 5 36 12 22 19Z M9 12v17l13 7 14-7V12 M22 19v17" />
          <path
            d="m9 29 14-7 13 7 M23 5v17"
            strokeDasharray="2 2"
            opacity=".35"
          />
        </g>
      ) : kind === "cylinder" ? (
        <>
          <ellipse cx="22" cy="10" rx="12" ry="5" />
          <path d="M10 10v21c0 7 24 7 24 0V10" />
          <path d="M10 31c0-7 24-7 24 0" strokeDasharray="2 2" opacity=".35" />
        </>
      ) : kind === "cut-cylinder" ? (
        <>
          <ellipse
            cx="22"
            cy="12"
            rx="13"
            ry="5"
            transform="rotate(-24 22 12)"
          />
          <path d="M10.1 17.3V32c0 6 23.8 6 23.8 0V6.7" />
          <path
            d="M10.1 32c0-6 23.8-6 23.8 0"
            strokeDasharray="2 2"
            opacity=".35"
          />
        </>
      ) : kind === "cone" ? (
        <>
          <path d="M9 31 22 5 35 31c0 7-26 7-26 0Z" />
          <path
            d="M9 31c0-7 26-7 26 0 M22 5v31"
            strokeDasharray="2 2"
            opacity=".35"
          />
        </>
      ) : kind === "prism" ? (
        <>
          <path d="m9 12 7-6h13l7 6-7 6H16Z M9 12v17l7 6h13l7-6V12 M16 18v17 M29 18v17" />
        </>
      ) : (
        <>
          <path d="m6 21 12-5 11 5-11 5Z M6 21v11l12 5 11-5 M18 26v11 M9 20l9-15 9 15" />
          <ellipse cx="33" cy="22" rx="6" ry="3" />
          <path d="M27 22v12c0 4 12 4 12 0V22" />
        </>
      )}
    </svg>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  suffix,
  onChange,
  left,
  right,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
  left: string;
  right: string;
}) {
  return (
    <div className="formlab-slider">
      <label htmlFor={id}>
        {label}
        <output htmlFor={id}>
          {value}
          {suffix}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div>
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

export default function PerspectiveLab() {
  const [kind, setKind] = useState<FormKind>("cut-cylinder");
  const [yaw, setYaw] = useState(-32);
  const [elevation, setElevation] = useState(24);
  const [proportion, setProportion] = useState(100);
  const [cut, setCut] = useState(24);
  const [wireframe, setWireframe] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [guides, setGuides] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const form = FORMS.find((item) => item.id === kind)!;
  const scene = useMemo(
    () => createStudyScene(kind, proportion, cut),
    [kind, proportion, cut],
  );
  const camera = useMemo(
    () => studyCamera(scene, yaw, elevation),
    [scene, yaw, elevation],
  );
  const light = normalize({ x: -3, y: 6, z: 4 });
  const point = (p: Vec3) => projectPoint(p, camera);
  const points = (ps: Vec3[]) =>
    ps
      .map((p) => {
        const q = point(p);
        return `${q.x.toFixed(2)},${q.y.toFixed(2)}`;
      })
      .join(" ");
  const meshes = orderStudyMeshes(scene.meshes, camera);
  const faceColor = (normal: Vec3, isCut?: boolean) => {
    const amount = Math.max(0, dot(normal, light));
    const base = isCut ? [150, 174, 145] : [166, 171, 158];
    return `rgb(${base.map((channel) => Math.round(channel + (247 - channel) * amount)).join(",")})`;
  };
  const applyPreset = (nextYaw: number, nextElevation: number) => {
    setYaw(nextYaw);
    setElevation(nextElevation);
  };
  const selectForm = (id: FormKind) => {
    setKind(id);
    setRevealed(false);
  };

  return (
    <section className="formlab" aria-label="几何体与透视实验室">
      <div className="formlab-form-picker" role="group" aria-label="选择几何体">
        {FORMS.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={kind === item.id}
            onClick={() => selectForm(item.id)}
          >
            <FormIcon kind={item.id} />
            <strong>{item.name}</strong>
            <small>{item.short}</small>
          </button>
        ))}
      </div>
      <div className="formlab-workbench">
        <div className="formlab-sheet">
          <div className="formlab-sheet-heading">
            <span>
              <i />
              {form.name} · {wireframe ? "结构观察" : "体积观察"}
            </span>
            <span>FORM STUDY</span>
          </div>
          <svg
            className="formlab-scene"
            viewBox="0 0 720 460"
            role="img"
            aria-label={`${form.name}的透视图，水平转角${yaw}度，观察高度${elevation}度${kind === "cut-cylinder" ? `，斜切角度${cut}度` : ""}。${guides ? "绿线表示中轴线与辅助截面。" : ""}`}
          >
            <defs>
              <pattern
                id="formlab-paper"
                width="7"
                height="7"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r=".45" fill="#8b927f" opacity=".16" />
              </pattern>
              <clipPath id="formlab-clip">
                <rect x="0" y="0" width="720" height="425" />
              </clipPath>
            </defs>
            <rect width="720" height="460" fill="#f7f7f0" />
            <rect width="720" height="460" fill="url(#formlab-paper)" />
            <g clipPath="url(#formlab-clip)">
              <g stroke="#c4cbbb" strokeWidth=".75" opacity=".36">
                {[-3, -2, -1, 0, 1, 2, 3].map((n) => (
                  <g key={n}>
                    <polyline
                      points={points([
                        { x: n, y: -0.015, z: -3 },
                        { x: n, y: -0.015, z: 3 },
                      ])}
                    />
                    <polyline
                      points={points([
                        { x: -3, y: -0.015, z: n },
                        { x: 3, y: -0.015, z: n },
                      ])}
                    />
                  </g>
                ))}
              </g>
              {meshes.map((mesh, meshIndex) => {
                const faces = mesh.faces
                  .filter((face) => faceVisible(mesh, face, camera))
                  .sort(
                    (a, b) =>
                      point(faceCenter(mesh, b)).depth -
                      point(faceCenter(mesh, a)).depth,
                  );
                const edges = meshEdges(mesh, camera);
                return (
                  <g key={`${mesh.name}-${meshIndex}`}>
                    {!wireframe &&
                      faces.map((face, i) => {
                        const fill = faceColor(
                          faceNormal(mesh, face),
                          face.cut,
                        );
                        return (
                          <polygon
                            key={i}
                            points={points(
                              face.vertices.map((j) => mesh.vertices[j]),
                            )}
                            fill={fill}
                            stroke={fill}
                            strokeWidth=".65"
                            strokeLinejoin="round"
                          />
                        );
                      })}
                    {(hidden || wireframe) &&
                      edges
                        .filter((edge) => !edge.visible)
                        .map((edge, i) => (
                          <polyline
                            key={`hidden-${i}`}
                            points={points([edge.a, edge.b])}
                            fill="none"
                            stroke="#71816b"
                            strokeWidth="1"
                            strokeDasharray="4 5"
                            opacity={wireframe ? ".58" : ".35"}
                          />
                        ))}
                    {edges
                      .filter((edge) => edge.visible)
                      .map((edge, i) => (
                        <polyline
                          key={`edge-${i}`}
                          points={points([edge.a, edge.b])}
                          fill="none"
                          stroke="#4a5b47"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                  </g>
                );
              })}
              {guides &&
                scene.guides.map((guide, i) => (
                  <polyline
                    key={i}
                    points={points(
                      guide.closed
                        ? [...guide.points, guide.points[0]]
                        : guide.points,
                    )}
                    fill="none"
                    stroke={guide.kind === "axis" ? "#8b7847" : "#577f6a"}
                    strokeWidth={guide.kind === "axis" ? "1.2" : "1"}
                    strokeDasharray={guide.kind === "axis" ? "8 4 2 4" : "4 4"}
                    opacity=".8"
                  />
                ))}
            </g>
          </svg>
          <p className="formlab-scene-note">
            {kind === "cut-cylinder"
              ? "浅绿色为真实斜切面；虚线帮助你看见背面的结构。"
              : "先看整体，再看轴线；让每一条线都有空间上的依据。"}
          </p>
          <div className="formlab-view-tools">
            <div className="formlab-mode" role="group" aria-label="显示模式">
              <button
                type="button"
                aria-pressed={!wireframe}
                onClick={() => setWireframe(false)}
              >
                明暗体积
              </button>
              <button
                type="button"
                aria-pressed={wireframe}
                onClick={() => setWireframe(true)}
              >
                结构线稿
              </button>
            </div>
            <div className="formlab-legend">
              <span>
                <i />
                可见轮廓
              </span>
              <span>
                <i />
                隐藏边
              </span>
              <span>
                <i />
                轴线 / 截面
              </span>
            </div>
          </div>
          <div className="formlab-observation">
            <span>观察这一处</span>
            <p>{form.watch}</p>
            <button
              type="button"
              aria-expanded={revealed}
              onClick={() => setRevealed(!revealed)}
            >
              {revealed ? "收起提醒" : "看看容易画错的地方"}
              <span aria-hidden="true">{revealed ? "−" : "+"}</span>
            </button>
            {revealed && <p className="formlab-mistake">{form.mistake}</p>}
          </div>
        </div>
        <aside className="formlab-controls">
          <span className="formlab-eyebrow">从一个角度，看到另一个</span>
          <h2>转一转，就懂了。</h2>
          <p>{form.note}</p>
          <div className="formlab-presets" role="group" aria-label="视角预设">
            <button type="button" onClick={() => applyPreset(0, 0)}>
              正面
            </button>
            <button type="button" onClick={() => applyPreset(32, 24)}>
              转角
            </button>
            <button type="button" onClick={() => applyPreset(32, 58)}>
              俯视
            </button>
          </div>
          <Slider
            id="formlab-yaw"
            label="水平转角"
            value={yaw}
            min={-150}
            max={150}
            suffix="°"
            onChange={setYaw}
            left="绕到左侧"
            right="绕到右侧"
          />
          <Slider
            id="formlab-elevation"
            label="观察高度"
            value={elevation}
            min={0}
            max={65}
            suffix="°"
            onChange={setElevation}
            left="平视中心"
            right="高处俯视"
          />
          {kind !== "cube" && (
            <Slider
              id="formlab-proportion"
              label="形体高度"
              value={proportion}
              min={65}
              max={145}
              suffix="%"
              onChange={setProportion}
              left="低而宽"
              right="高而细"
            />
          )}
          {kind === "cut-cylinder" && (
            <Slider
              id="formlab-cut"
              label="斜切角度"
              value={cut}
              min={-38}
              max={38}
              suffix="°"
              onChange={setCut}
              left="一侧抬高"
              right="另一侧抬高"
            />
          )}
          <div className="formlab-toggles">
            <label>
              <input
                type="checkbox"
                checked={guides}
                onChange={(event) => setGuides(event.target.checked)}
              />
              轴线与辅助截面
            </label>
            <label>
              <input
                type="checkbox"
                checked={wireframe || hidden}
                disabled={wireframe}
                onChange={(event) => setHidden(event.target.checked)}
              />
              {wireframe ? "结构模式已显示隐藏边" : "显示形体的隐藏边"}
            </label>
          </div>
          <p className="formlab-footnote">
            观察高度升高时，视线也向下俯转。画面上的平行边可能向远方收拢；辅助截面表示结构，并非物体上的花纹。明暗为固定光源示意。
          </p>
        </aside>
      </div>
    </section>
  );
}

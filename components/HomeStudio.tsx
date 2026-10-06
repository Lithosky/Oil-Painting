"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "./StudioIcon";
import { FAMOUS_PAINTINGS } from "@/lib/paintings";
const dailySteps = [
  {
    title: "先看明暗",
    text: "移动光源，观察球体的亮面与暗面。",
    time: "3 分钟",
    href: "/sketch?lesson=light",
    icon: "sun",
  },
  {
    title: "再调一个颜色",
    text: "只用两种颜料，练习把颜色调浅。",
    time: "5 分钟",
    href: "/mix?lesson=value",
    icon: "palette",
  },
  {
    title: "最后落到纸上",
    text: "画 5 格灰阶，从轻到重排线。",
    time: "4 分钟",
    href: "/sketch?lesson=hatching",
    icon: "pencil",
  },
];
function dayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
export default function HomeStudio() {
  const [done, setDone] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(0);
  const [lessons, setLessons] = useState(0);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let activeDay = dayKey();
    function read() {
      try {
        const today = dayKey();
        const v = JSON.parse(localStorage.getItem("atelier-daily-v1") || "{}");
        setDone(
          v.date === today && Array.isArray(v.done)
            ? v.done.filter(
                (n: unknown) => typeof n === "number" && n >= 0 && n < 3,
              )
            : [],
        );
        const mix = JSON.parse(
          localStorage.getItem("atelier-mix-progress-v1") || "{}",
        );
        const sketch = JSON.parse(
          localStorage.getItem("atelier-sketch-progress-v1") || "{}",
        );
        const oil = JSON.parse(
          localStorage.getItem("atelier-oil-progress-v1") || "{}",
        );
        setSaved(Array.isArray(mix?.attempts) ? mix.attempts.length : 0);
        setLessons(
          (Array.isArray(mix?.completed) ? mix.completed.length : 0) +
            (Array.isArray(sketch?.completed) ? sketch.completed.length : 0) +
            (Array.isArray(oil?.completed) ? oil.completed.length : 0),
        );
        activeDay = today;
      } catch {
        setStorageError(true);
      }
      setLoaded(true);
    }
    read();
    const onFocus = () => {
      if (dayKey() !== activeDay) read();
    };
    window.addEventListener("atelier-progress", read);
    window.addEventListener("storage", read);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("atelier-progress", read);
      window.removeEventListener("storage", read);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  function toggle(i: number) {
    const next = done.includes(i) ? done.filter((n) => n !== i) : [...done, i];
    setDone(next);
    try {
      localStorage.setItem(
        "atelier-daily-v1",
        JSON.stringify({ date: dayKey(), done: next }),
      );
    } catch {
      setStorageError(true);
    }
  }
  return (
    <div className="home-studio">
      <div className="home-greeting">
        <div>
          <p className="eyebrow">A LITTLE PRACTICE, EVERY DAY</p>
          <h1>今天，也来画一会儿。</h1>
        </div>
        <span className="greeting-tag">
          <span className="tiny-dot" />
          从零开始，慢慢有感觉
        </span>
      </div>
      <section className="studio-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span />
            谁言一点红，解寄无边春。
          </span>
          <h2 id="hero-title">
            让眼睛学会观察，
            <br />
            让颜色有迹可循。
          </h2>
          <p>
            从一抹颜色、一束光开始。
            <br />
            在小小的互动练习里，找到画画的手感。
          </p>
          <div className="hero-actions">
            <Link href="/mix?lesson=value" className="btn-primary">
              开始第一课 <Icon name="arrow" size={17} />
            </Link>
            <Link href="/sketch" className="hero-text-link">
              探索素描 <span>↗</span>
            </Link>
          </div>
          <div className="hero-caption">
            <span>零基础友好</span>
            <i />
            短练习，即时反馈
            <i />
            <span>把练习带到纸上</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-art-label">
            STUDY NO. 01 <span>光 · 色 · 形</span>
          </div>
          <div className="painting-mat">
            <img
              src="/paintings/woman-parasol.jpg"
              alt="莫奈《撑阳伞的女人》：明亮天空、柔和绿地与人物光影"
            />
            <span className="painting-signature">Claude Monet, 1875</span>
          </div>
          <div className="hero-swatch-note">
            <div>
              {["#e6e3ce", "#acbdbc", "#72908b", "#516b60", "#b7a775"].map(
                (c) => (
                  <i key={c} style={{ background: c }} />
                ),
              )}
            </div>
            <span>从一幅画里，发现五种颜色。</span>
          </div>
        </div>
      </section>
      <section className="daily-section" aria-labelledby="daily-title">
        <div className="section-heading">
          <div>
            <span className="section-overline">TODAY'S LITTLE PRACTICE</span>
            <h2 id="daily-title">
              今日练习 <small>从「看懂」到「画出来」</small>
            </h2>
          </div>
          <span className="daily-count" aria-live="polite">
            {done.length === 3
              ? "今天的练习完成了 ✓"
              : `${done.length} / 3 已完成`}
          </span>
        </div>
        <div className="daily-track">
          {dailySteps.map((step, i) => (
            <div
              className={`daily-step ${done.includes(i) ? "is-done" : ""}`}
              key={step.title}
            >
              <span className="step-number">0{i + 1}</span>
              <div className="step-copy">
                <Link href={step.href}>
                  <h3>
                    {step.title} <Icon name="arrow" size={15} />
                  </h3>
                </Link>
                <p>{step.text}</p>
                <span>
                  <Icon name="clock" size={12} />
                  {step.time}
                </span>
              </div>
              <button
                className="step-check"
                aria-label={`${done.includes(i) ? "取消完成" : "标记完成"}：${step.title}`}
                aria-pressed={done.includes(i)}
                disabled={!loaded}
                onClick={() => toggle(i)}
              >
                {done.includes(i) && <Icon name="check" size={15} />}
              </button>
            </div>
          ))}
        </div>
        <p className="daily-footnote">
          完成实际练习后，点右侧圆圈记录。
          {storageError
            ? "浏览器无法保存记录，本次仍可继续练习。"
            : "进度保存在当前浏览器。"}
        </p>
      </section>
      <section aria-labelledby="explore-title">
        <div className="section-heading">
          <div>
            <span className="section-overline">FIND YOUR WAY IN</span>
            <h2 id="explore-title">从造型，到色彩，再到画面</h2>
          </div>
        </div>
        <div className="learning-grid">
          <Link className="learning-card color-course" href="/mix">
            <div className="learning-card-top">
              <span className="course-category">COLOR STUDIES / 色彩</span>
              <Icon name="arrow" size={20} />
            </div>
            <div className="course-art color-study" aria-hidden="true">
              {["#d5b357", "#b96b45", "#658481", "#3b5750", "#d7cdc0"].map(
                (c, i) => (
                  <span
                    key={c}
                    style={{
                      background: c,
                      transform: `rotate(${[-12, 8, -8, 12, -5][i]}deg)`,
                    }}
                  />
                ),
              )}
            </div>
            <div className="course-info">
              <span className="course-icon">
                <Icon name="palette" />
              </span>
              <div>
                <h3>调色实验室</h3>
                <p>从明度、色相到灰色调，练出颜色判断力。</p>
              </div>
            </div>
            <div className="course-tags">
              <span>分步练习</span>
              <span>自由调色</span>
              <span>配方笔记</span>
              <b>进入画室 ↗</b>
            </div>
          </Link>
          <Link className="learning-card sketch-course" href="/sketch">
            <div className="learning-card-top">
              <span className="course-category">DRAWING STUDIES / 素描</span>
              <span className="new-tag">新课程</span>
            </div>
            <div className="course-art sketch-study" aria-hidden="true">
              <svg viewBox="0 0 430 150">
                <defs>
                  <radialGradient id="homeSphere" cx="30%" cy="25%" r="80%">
                    <stop offset="0" stopColor="#faf8f1" />
                    <stop offset=".45" stopColor="#d5d2c8" />
                    <stop offset=".85" stopColor="#70736c" />
                    <stop offset="1" stopColor="#96988c" />
                  </radialGradient>
                  <pattern
                    id="homeHatch"
                    width="5"
                    height="5"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(30)"
                  >
                    <path d="M0 0v5" stroke="#6e756c" strokeWidth="1" />
                  </pattern>
                </defs>
                <path
                  d="m58 105 62-28 238 55-146 12Z"
                  fill="#c4c5ba"
                  opacity=".45"
                />
                <path
                  d="m69 47 57-19 45 28-55 24Z"
                  fill="#f3f1e8"
                  stroke="#81887d"
                />
                <path
                  d="m69 47 47 33v55l-47-34Z"
                  fill="#dfdfd2"
                  stroke="#81887d"
                />
                <path
                  d="m116 80 55-24v57l-55 22Z"
                  fill="url(#homeHatch)"
                  stroke="#81887d"
                />
                <ellipse
                  cx="298"
                  cy="126"
                  rx="64"
                  ry="11"
                  fill="#a8ada1"
                  opacity=".5"
                />
                <circle cx="274" cy="77" r="48" fill="url(#homeSphere)" />
                <path
                  d="M39 137h350M53 26l127 115M204 22v114"
                  stroke="#92988c"
                  strokeWidth=".5"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>
            <div className="course-info">
              <span className="course-icon">
                <Icon name="pencil" />
              </span>
              <div>
                <h3>素描基础</h3>
                <p>旋转形体、观察切面，再练比例与负形。</p>
              </div>
            </div>
            <div className="course-tags">
              <span>空间透视</span>
              <span>光影明暗</span>
              <span>排线练习</span>
              <b>拿起画笔 ↗</b>
            </div>
          </Link>
        </div>
      </section>
      <section className="oil-home-section" aria-labelledby="oil-home-title">
        <div className="oil-home-intro">
          <span className="section-overline">FROM PALETTE TO PAINTING</span>
          <h2 id="oil-home-title">颜色调好了，怎样画成一幅画？</h2>
          <p>先归纳大关系，再决定哪里清晰、哪里安静。</p>
          <Link href="/oil" className="underlined-link">
            进入油画基础 <Icon name="arrow" size={16} />
          </Link>
        </div>
        <div className="oil-home-links">
          <Link href="/oil?lesson=relative-color">
            <span>01</span>
            <div>
              <b>颜色的相互影响</b>
              <small>同一块颜色，为什么看起来不同？</small>
            </div>
            <Icon name="arrow" size={15} />
          </Link>
          <Link href="/oil?lesson=value-masses">
            <span>02</span>
            <div>
              <b>先画三大明暗</b>
              <small>眯眼看画面，把细节留到后面。</small>
            </div>
            <Icon name="arrow" size={15} />
          </Link>
          <Link href="/oil?lesson=edge-control">
            <span>03</span>
            <div>
              <b>让边缘有主次</b>
              <small>硬边、软边与消失的轮廓。</small>
            </div>
            <Icon name="arrow" size={15} />
          </Link>
        </div>
      </section>
      <div className="home-bottom-grid">
        <section className="observation-card">
          <img
            src="/paintings/impression-sunrise.jpg"
            alt="莫奈《印象·日出》"
          />
          <div>
            <span className="section-overline">LEARN TO SEE</span>
            <h2>{FAMOUS_PAINTINGS.length} 幅名画，带着问题看。</h2>
            <p>
              橙色的太阳，为什么在蓝灰色的水面上格外醒目？切换黑白，再观察一次。
            </p>
            <Link href="/analyze" className="underlined-link">
              带着问题看名画 <Icon name="arrow" size={16} />
            </Link>
          </div>
        </section>
        <section className="practice-record">
          <span className="section-overline">SMALL STEPS COUNT</span>
          <h2>每次尝试，都算数。</h2>
          <div className="record-numbers">
            <div>
              <b>{lessons.toString().padStart(2, "0")}</b>
              <span>已完成基础课</span>
            </div>
            <div>
              <b>{saved.toString().padStart(2, "0")}</b>
              <span>已保存调色笔记</span>
            </div>
          </div>
          <p>
            先看明暗，再看颜色。
            <br />
            比起一次画对，多一次认真比较更重要。
          </p>
        </section>
      </div>
    </div>
  );
}

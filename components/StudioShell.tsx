"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./StudioIcon";
const links = [
  { href: "/", name: "我的画室", icon: "home" },
  { href: "/mix", name: "调色实验室", icon: "palette" },
  { href: "/sketch", name: "素描基础", icon: "pencil" },
  { href: "/oil", name: "油画基础", icon: "brush", badge: "NEW" },
  { href: "/analyze", name: "名画观察", icon: "image" },
  { href: "/match", name: "配色探索", icon: "layers" },
];
export default function StudioShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const title = links.find((l) => l.href === path)?.name || "我的画室";
  return (
    <div className="studio-shell">
      <a href="#studio-main" className="skip-link">
        跳到内容
      </a>
      <aside className="studio-sidebar">
        <Link href="/" className="studio-brand">
          <span className="brand-mark">
            <Icon name="palette" size={27} />
          </span>
          <span>
            <b>无边春</b>
            <small>PAINTING STUDIO</small>
          </span>
        </Link>
        <div className="sidebar-label">一笔一色，皆是春意</div>
        <nav aria-label="主导航" className="studio-nav">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={path === l.href ? "active" : ""}
              aria-current={path === l.href ? "page" : undefined}
            >
              <Icon name={l.icon} />
              <span>{l.name}</span>
              {l.badge && <small>{l.badge}</small>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <Icon name="sun" size={22} />
          <p>谁言一点红，</p>
          <span>
            解寄无边春。
            <br />
            —— 苏轼
          </span>
          <div className="sidebar-pigments">
            {["#d7ab53", "#b66843", "#708778", "#436274", "#f4eee0"].map(
              (c) => (
                <i key={c} style={{ background: c }} />
              ),
            )}
          </div>
        </div>
        <div className="sidebar-bottom">
          <span className="tiny-dot" />
          属于你的日常画室 <small>VOL. 01</small>
        </div>
      </aside>
      <div className="studio-body">
        <header className="studio-topbar">
          <div>
            <span>我的学习空间</span>
            <span className="topbar-slash">/</span>
            <b>{title}</b>
          </div>
          <span className="studio-top-tip">
            <Icon name="clock" size={15} />
            每天 10–15 分钟
          </span>
        </header>
        <main id="studio-main" className="studio-main">
          {children}
        </main>
        <footer className="studio-footer">
          <span>无边春 · 把看见的，慢慢画出来。</span>
          <span>观察 → 尝试 → 比较 → 再练习</span>
        </footer>
      </div>
    </div>
  );
}

import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '油画调色训练师',
  description: '学习油画调色，分析世界名画配色，提升色彩感知能力',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        {/* 顶部导航 */}
        <nav style={{
          background: 'rgba(250,247,242,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              {/* 调色板图标 */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                style={{ background: 'linear-gradient(135deg, #B8621A 0%, #DAA520 50%, #3C7060 100%)' }}>
                <span className="text-white font-bold text-sm">油</span>
              </div>
              <div>
                <div className="font-bold text-base leading-tight" style={{ color: 'var(--ink)' }}>
                  油画调色训练师
                </div>
                <div className="text-xs leading-none" style={{ color: 'var(--ink-3)' }}>
                  Oil Color Trainer
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <NavLink href="/mix"     label="调色练习" sub="Mixing"   dot="#B8621A" />
              <NavLink href="/analyze" label="画作分析" sub="Analysis" dot="#2B5988" />
              <NavLink href="/match"   label="配色匹配" sub="Matching" dot="#3C7060" />
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-5 py-8">
          {children}
        </main>

        <footer style={{ borderTop: '1px solid var(--border)', marginTop: '64px' }}
          className="py-8 text-center text-sm">
          <p style={{ color: 'var(--ink-3)' }}>油画调色训练师 · 以色彩之眼，观世界名画之美</p>
        </footer>
      </body>
    </html>
  )
}

function NavLink({ href, label, sub, dot }: { href: string; label: string; sub: string; dot: string }) {
  return (
    <Link href={href}
      className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all hover:bg-[var(--parchment)]"
      style={{ color: 'var(--ink-2)' }}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
      <div>
        <div className="text-sm font-medium leading-none">{label}</div>
        <div className="text-[10px] leading-none mt-0.5" style={{ color: 'var(--ink-3)' }}>{sub}</div>
      </div>
    </Link>
  )
}

import Link from 'next/link'
import { FAMOUS_PAINTINGS } from '@/lib/paintings'
import { proxyImg } from '@/lib/imgProxy'
import PaintingImage from '@/components/PaintingImage'

export default function Home() {
  const features = [
    {
      href: '/mix',
      dot: '#B8621A',
      title: '调色练习',
      sub: 'Color Mixing',
      desc: '从世界名画中随机抽取目标色，使用马利牌颜料搭配调出相近颜色，实时评分，还可查看参考答案。',
      cta: '开始练习',
      bg: '#FDF5EE',
      border: '#E8C4A0',
    },
    {
      href: '/analyze',
      dot: '#2B5988',
      title: '画作分析',
      sub: 'Color Analysis',
      desc: '分析世界名画或上传自己的图片，自动提取主要颜色并按占比排列，深入理解色彩构成。',
      cta: '开始分析',
      bg: '#EDF3FB',
      border: '#B0C8E0',
    },
    {
      href: '/match',
      dot: '#3C7060',
      title: '配色匹配',
      sub: 'Color Matching',
      desc: '自由选择颜色组合，智能匹配风格相近的世界名画，并对你的配色方案进行美学评分与建议。',
      cta: '探索配色',
      bg: '#EDF6F2',
      border: '#A0C8BC',
    },
  ]

  // 随机展示几幅名画缩略图
  const previewPaintings = FAMOUS_PAINTINGS.slice(0, 6)

  return (
    <div className="space-y-16">
      {/* Hero */}
      <div className="pt-8 pb-4 text-center space-y-5">
        {/* 颜料点装饰 */}
        <div className="flex justify-center gap-2 mb-2">
          {['#B8621A','#DAA520','#3C7060','#2B5988','#8B1A1A','#4A3728'].map(c => (
            <div key={c} className="w-3 h-3 rounded-full opacity-70" style={{ background: c }} />
          ))}
        </div>

        <div className="inline-block px-3 py-1 rounded-full text-xs font-medium badge badge-sienna mb-2">
          基于世界名画的色彩训练平台
        </div>

        <h1 className="text-5xl font-bold leading-tight" style={{ color: 'var(--ink)' }}>
          学会用油画颜料
          <br />
          <span style={{ color: 'var(--sienna)' }}>调出任何颜色</span>
        </h1>

        <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          通过 {FAMOUS_PAINTINGS.length} 幅世界名画，系统训练色彩感知与调色能力
          <br />
          <span style={{ color: 'var(--ink-3)', fontSize: '0.9em' }}>
            梵高 · 莫奈 · 达芬奇 · 伦勃朗 · 克里姆特 · 塞尚 · 雷诺阿…
          </span>
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/mix" className="btn-primary px-7 py-3 text-base inline-block">
            立即开始训练
          </Link>
          <Link href="/analyze" className="btn-secondary px-7 py-3 text-base inline-block">
            探索名画配色
          </Link>
        </div>
      </div>

      {/* 名画预览横幅 */}
      <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--border)' }}>
        <div className="flex h-32">
          {previewPaintings.map(p => (
            <Link key={p.id} href="/analyze"
              className="flex-1 relative overflow-hidden group"
              title={`${p.titleZh} — ${p.artistZh}`}
            >
              <PaintingImage
                src={proxyImg(p.imageUrl)}
                alt={p.titleZh}
                dominantColors={p.dominantColors}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end p-2 opacity-0 group-hover:opacity-100">
                <span className="text-white text-[10px] font-medium leading-tight">{p.titleZh}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="px-4 py-2 text-xs flex items-center gap-1" style={{ background: 'var(--parchment)', color: 'var(--ink-3)' }}>
          <span>共收录</span>
          <span className="font-semibold" style={{ color: 'var(--sienna)' }}>{FAMOUS_PAINTINGS.length}</span>
          <span>幅世界名画 · 点击图片进入画作分析</span>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {features.map(f => (
          <Link
            key={f.href}
            href={f.href}
            className="p-6 rounded-2xl block transition-all duration-200 painting-thumb"
            style={{ background: f.bg, border: `1.5px solid ${f.border}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ background: f.dot }} />
              <span className="font-bold text-base" style={{ color: 'var(--ink)' }}>{f.title}</span>
              <span className="text-xs ml-auto" style={{ color: 'var(--ink-3)' }}>{f.sub}</span>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--ink-2)' }}>{f.desc}</p>
            <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: f.dot }}>
              {f.cta}
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* 色相轮装饰 */}
      <div className="flex justify-center gap-1.5 pb-4 opacity-50">
        {['#C83228','#E67E22','#F5D042','#4CAF50','#2196F3','#7C4DBA','#E91E8C'].map(c => (
          <div key={c} className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ background: c }} />
        ))}
      </div>
    </div>
  )
}

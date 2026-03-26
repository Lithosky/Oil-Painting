'use client'

import { useState, useMemo } from 'react'
import { FAMOUS_PAINTINGS, type Painting } from '@/lib/paintings'
import { proxyImg } from '@/lib/imgProxy'
import PaintingImage from '@/components/PaintingImage'
import { MARIE_COLORS, type PaintColor, deltaE, hexToRgb, analyzeColorHarmony, rgbToHex } from '@/lib/colors'

interface SelectedColor { color: PaintColor; weight: number }
interface PaintingMatch { painting: Painting; score: number; reason: string }

const SERIES_ORDER = ['基础色','黄色系','橙色系','红色系','紫色系','蓝色系','绿色系','褐色系']

function matchPaintings(selected: SelectedColor[]): PaintingMatch[] {
  if (!selected.length) return []
  const userPalette = selected.map(s => s.color.rgb as [number,number,number])

  return FAMOUS_PAINTINGS.map(p => {
    const paintColors = p.dominantColors.map(hex => hexToRgb(hex) as [number,number,number])
    let total = 0
    for (const uc of userPalette) {
      const min = Math.min(...paintColors.map(pc => deltaE(uc, pc)))
      total += min
    }
    const avgDist = total / userPalette.length
    const score = Math.round(Math.max(0, 100 - avgDist * 1.8))
    const reason = score >= 80 ? '配色高度相似，色调与情感基调非常接近'
      : score >= 60 ? '主色调相近，整体氛围有共鸣'
      : '部分颜色接近，风格存在一定差异'
    return { painting: p, score, reason }
  }).sort((a,b) => b.score - a.score)
}

function aiComment(selected: SelectedColor[], harmony: {type:string;score:number;description:string}|null): string {
  if (!selected.length) return ''
  if (selected.length === 1) return `单色方案——${selected[0].color.name}。纯粹专注，适合强调特定情绪，但画面层次较弱。`
  const names = selected.map(c => c.color.name).join('、')
  const parts = [`选用了 ${names}。`]
  if (harmony) parts.push(`整体属于${harmony.type}，${harmony.description}`)
  const hasWarm = selected.some(c => ['cadmium-red','vermillion','cadmium-orange','cadmium-yellow','cadmium-yellow-light'].includes(c.color.id))
  const hasCool = selected.some(c => ['ultramarine','cobalt-blue','prussian-blue','cerulean-blue'].includes(c.color.id))
  if (hasWarm && hasCool) parts.push('冷暖对比能营造空间感与光感，是古典油画的常用技法。')
  if (selected.length >= 5) parts.push('颜色较多，注意确立主次关系，避免画面显得杂乱。')
  return parts.join(' ')
}

export default function MatchPage() {
  const [selected, setSelected] = useState<SelectedColor[]>([])
  const [tab, setTab]           = useState<'palette'|'custom'>('palette')
  const [customHex, setCustomHex] = useState('#3C7060')

  const harmony = useMemo(() => {
    if (selected.length < 2) return null
    return analyzeColorHarmony(selected.map(c => c.color.rgb as [number,number,number]))
  }, [selected])

  const matches = useMemo(() => matchPaintings(selected), [selected])
  const comment = useMemo(() => aiComment(selected, harmony), [selected, harmony])

  const add = (c: PaintColor) => {
    if (selected.length >= 8 || selected.some(s => s.color.id === c.id)) return
    setSelected(p => [...p, { color: c, weight: 1 }])
  }
  const remove = (id: string) => setSelected(p => p.filter(c => c.color.id !== id))

  const addCustom = () => {
    if (customHex.length !== 7) return
    const rgb = hexToRgb(customHex) as [number,number,number]
    const c: PaintColor = { id: `custom-${customHex}`, name: customHex.toUpperCase(), nameEn: 'Custom', hex: customHex, rgb, series: '自定义' }
    if (!selected.some(s => s.color.id === c.id)) setSelected(p => [...p, { color: c, weight: 1 }])
  }

  const scoreStyle = (s: number) => ({
    color: s>=80 ? '#2E7A3A' : s>=60 ? '#B8621A' : s>=40 ? '#9A7020' : '#7A7A7A',
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>配色匹配</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>选择颜色组合，智能匹配相近风格的名画，并评价你的配色方案</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── 左列：选色 ─────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex gap-1 p-1 rounded-xl w-full"
            style={{ background: 'var(--parchment)', border: '1px solid var(--border)' }}>
            {(['palette','custom'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: tab===t ? 'var(--card)' : 'transparent',
                  color: tab===t ? 'var(--sienna)' : 'var(--ink-2)',
                  boxShadow: tab===t ? '0 1px 4px var(--shadow)' : 'none',
                }}>
                {t==='palette' ? '颜料色板' : '自定义颜色'}
              </button>
            ))}
          </div>

          {tab === 'palette' ? (
            <div className="art-card p-4 space-y-4 max-h-[500px] overflow-y-auto">
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>点击颜色添加（最多8种）</div>
              {SERIES_ORDER.map(series => {
                const colors = MARIE_COLORS.filter(c => c.series === series)
                return (
                  <div key={series}>
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--ink-3)' }}>{series}</div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {colors.map(color => {
                        const isSel = selected.some(s => s.color.id === color.id)
                        return (
                          <button key={color.id} onClick={() => isSel ? remove(color.id) : add(color)}
                            title={color.name}
                            className="aspect-square color-swatch"
                            style={{
                              backgroundColor: color.hex,
                              border: isSel ? '2px solid var(--sienna)' : '1px solid rgba(0,0,0,0.1)',
                              transform: isSel ? 'scale(0.88)' : undefined,
                            }}>
                            {isSel && (
                              <div className="w-full h-full flex items-center justify-center rounded-lg"
                                style={{ background: 'rgba(255,255,255,0.4)' }}>
                                <span className="text-[10px] font-bold text-white drop-shadow">✓</span>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="art-card p-4 space-y-4">
              <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>自定义颜色</div>
              <div className="flex gap-3 items-center">
                <input type="color" value={customHex} onChange={e => setCustomHex(e.target.value)}
                  className="w-12 h-10 rounded-xl cursor-pointer border-0"
                  style={{ background: 'transparent' }} />
                <input type="text" value={customHex}
                  onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setCustomHex(e.target.value) }}
                  className="flex-1 px-3 py-2 rounded-xl font-mono text-sm focus:outline-none"
                  style={{ background: 'var(--parchment)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
                <button onClick={addCustom} disabled={customHex.length!==7||selected.length>=8}
                  className="btn-secondary text-sm px-3 py-2">添加</button>
              </div>
              <div className="h-20 rounded-xl border shadow-sm"
                style={{ backgroundColor: customHex.length===7?customHex:'#ccc', borderColor: 'var(--border-dk)' }} />
            </div>
          )}
        </div>

        {/* ── 中列：配色方案 + 评分 ────────────────── */}
        <div className="space-y-4">
          <div className="art-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                我的配色方案 ({selected.length}/8)
              </span>
              {selected.length > 0 && (
                <button onClick={() => setSelected([])} className="text-xs" style={{ color: '#A03020' }}>清空</button>
              )}
            </div>

            {selected.length === 0 ? (
              <div className="h-20 flex items-center justify-center rounded-xl text-sm"
                style={{ background: 'var(--parchment)', border: '1.5px dashed var(--border-dk)', color: 'var(--ink-3)' }}>
                从颜料板选择颜色
              </div>
            ) : (
              <>
                {/* 颜色条 */}
                <div className="h-10 rounded-xl overflow-hidden flex shadow-sm"
                  style={{ border: '1px solid var(--border-dk)' }}>
                  {selected.map(s => (
                    <div key={s.color.id} className="flex-1 h-full" style={{ backgroundColor: s.color.hex }} />
                  ))}
                </div>
                {/* 标签 */}
                <div className="flex flex-wrap gap-1.5">
                  {selected.map(s => (
                    <div key={s.color.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                      style={{
                        background: s.color.hex + '22',
                        border: `1px solid ${s.color.hex}66`,
                        color: 'var(--ink)',
                      }}>
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color.hex }} />
                      {s.color.name}
                      <button onClick={() => remove(s.color.id)} className="opacity-50 hover:opacity-100">✕</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 美学评分 */}
          {harmony && selected.length >= 2 && (
            <div className="art-card p-5 space-y-3">
              <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>配色美学评分</div>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="28" fill="none" stroke="var(--parchment-dk)" strokeWidth="8" />
                    <circle cx="36" cy="36" r="28" fill="none"
                      stroke={harmony.score>=80?'#3C7060':harmony.score>=60?'#B8621A':'#9A7020'}
                      strokeWidth="8" strokeDasharray="175.9"
                      strokeDashoffset={175.9*(1-harmony.score/100)}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold" style={{ color: 'var(--ink)' }}>{harmony.score}</span>
                  </div>
                </div>
                <div>
                  <span className="badge badge-sienna inline-block mb-1.5">{harmony.type}</span>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>{harmony.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* AI点评 */}
          {comment && (
            <div className="p-4 rounded-xl space-y-1.5"
              style={{ background: '#F0F5FF', border: '1px solid #C0CFEC' }}>
              <div className="text-xs font-semibold" style={{ color: '#2B5988' }}>AI 配色点评</div>
              <p className="text-sm leading-relaxed" style={{ color: '#3A4A6A' }}>{comment}</p>
            </div>
          )}
        </div>

        {/* ── 右列：相似名画 ────────────────────────── */}
        <div className="space-y-3">
          <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            相似配色名画
            {selected.length > 0 && (
              <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--ink-3)' }}>按相似度排列</span>
            )}
          </div>

          {selected.length === 0 ? (
            <div className="art-card flex items-center justify-center h-48 text-center"
              style={{ color: 'var(--ink-3)' }}>
              <div>
                <div className="text-4xl mb-2 opacity-40">✨</div>
                <div className="text-sm">选色后自动匹配相似名画</div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {matches.slice(0,8).map(({ painting, score, reason }) => (
                <div key={painting.id} className="art-card p-3 flex gap-3 hover:shadow-md transition-shadow">
                  <PaintingImage src={proxyImg(painting.imageUrl)} alt={painting.titleZh}
                    dominantColors={painting.dominantColors}
                    className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                    referrerPolicy="no-referrer" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{painting.titleZh}</div>
                        <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{painting.artistZh}</div>
                      </div>
                      <span className="text-base font-bold flex-shrink-0 tabular-nums" style={scoreStyle(score)}>
                        {score}%
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: 'var(--ink-3)' }}>
                      {reason}
                    </p>
                    <div className="flex gap-1 mt-1.5">
                      {painting.dominantColors.map((hex, i) => (
                        <div key={i} className="w-3.5 h-3.5 rounded-sm border"
                          style={{ backgroundColor: hex, borderColor: 'var(--border)' }} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

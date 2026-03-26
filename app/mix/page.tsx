'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { FAMOUS_PAINTINGS, type Painting } from '@/lib/paintings'
import {
  PAINT_BRANDS, type PaintColor,
  mixPaints, colorMatchScore, getMixingSuggestion, getOptimalMix,
  rgbToHex, hexToRgb,
} from '@/lib/colors'
import { proxyImg } from '@/lib/imgProxy'
import PaintingImage from '@/components/PaintingImage'

interface SelectedColor { color: PaintColor; ratio: number }  // ratio: 0–100 always sums to 100

// ── 比例规范化 ────────────────────────────────────────────────
function normalizeRatios(items: SelectedColor[]): SelectedColor[] {
  const total = items.reduce((s, c) => s + c.ratio, 0)
  if (!total) return items
  return items.map(c => ({ ...c, ratio: (c.ratio / total) * 100 }))
}

export default function MixPage() {
  const [painting, setPainting]     = useState<Painting>(FAMOUS_PAINTINGS[0])
  const [targetIdx, setTargetIdx]   = useState(0)
  const [selected, setSelected]     = useState<SelectedColor[]>([])
  const [showSug, setShowSug]       = useState(false)
  const [showAns, setShowAns]       = useState(false)
  const [brandTab, setBrandTab]     = useState(0)
  // 手动输入时保存临时字符串
  const [editMap, setEditMap]       = useState<Record<string, string>>({})
  const numInputRefs  = useRef<Record<string, HTMLInputElement | null>>({})  // number inputs
  const sliderRefs    = useRef<Record<string, HTMLInputElement | null>>({})  // range sliders
  const liveRatiosRef = useRef<Record<string, number>>({})                  // ratios during drag
  const isDraggingRef = useRef(false)

  const targetHex = painting.dominantColors[targetIdx] ?? '#888'
  const targetRgb = hexToRgb(targetHex) as [number, number, number]

  const mixedRgb = useMemo<[number, number, number]>(() => {
    if (!selected.length) return [245, 240, 230]
    const total = selected.reduce((s, c) => s + c.ratio, 0)
    if (!total) return [245, 240, 230]
    return mixPaints(selected.map(c => ({ rgb: c.color.rgb as [number, number, number], ratio: c.ratio / total })))
  }, [selected])

  const score    = selected.length ? colorMatchScore(targetRgb, mixedRgb) : 0
  const mixedHex = rgbToHex(...mixedRgb)
  const refMix   = useMemo(() => getOptimalMix(targetRgb), [targetRgb])
  const suggestion = useMemo(() => selected.length ? getMixingSuggestion(targetRgb, mixedRgb) : '', [targetRgb, mixedRgb, selected.length])

  // ── 添加颜色：新颜色取 20%，其余按比例稀释 ─────────────────
  const addColor = useCallback((color: PaintColor) => {
    setSelected(prev => {
      if (prev.some(c => c.color.id === color.id)) return prev
      if (prev.length === 0) return [{ color, ratio: 100 }]
      const newShare = 20
      const scale = (100 - newShare) / 100
      return normalizeRatios([
        ...prev.map(c => ({ ...c, ratio: c.ratio * scale })),
        { color, ratio: newShare },
      ])
    })
    setShowSug(false); setShowAns(false)
  }, [])

  const removeColor = useCallback((id: string) => {
    setSelected(prev => {
      const next = prev.filter(c => c.color.id !== id)
      return next.length ? normalizeRatios(next) : []
    })
    setShowSug(false)
  }, [])

  // ── 当 selected 从外部改变时（加色/删色/随机），同步滑块 DOM ─
  useEffect(() => {
    if (isDraggingRef.current) return
    liveRatiosRef.current = Object.fromEntries(selected.map(c => [c.color.id, c.ratio]))
    selected.forEach(sc => {
      const rounded = Math.round(sc.ratio)
      const sliderEl = sliderRefs.current[sc.color.id]
      if (sliderEl) sliderEl.value = String(rounded)
      const numEl = numInputRefs.current[sc.color.id]
      if (numEl && document.activeElement !== numEl) numEl.value = String(rounded)
    })
  }, [selected])

  // ── 滑块拖动开始：初始化 liveRatios ──────────────────────────
  const handleSliderPointerDown = useCallback((id: string) => {
    isDraggingRef.current = true
    liveRatiosRef.current = Object.fromEntries(selected.map(c => [c.color.id, c.ratio]))
  }, [selected])

  // ── 滑块拖动中：直接更新 DOM，不触发 React re-render ─────────
  const handleSliderInput = useCallback((id: string, newVal: number) => {
    const clamped = Math.max(1, Math.min(99, newVal))
    const live = liveRatiosRef.current
    const otherIds = selected.filter(c => c.color.id !== id).map(c => c.color.id)
    const othersSum = otherIds.reduce((s, oid) => s + (live[oid] ?? 1), 0)
    const remaining = 100 - clamped
    live[id] = clamped
    otherIds.forEach(oid => {
      const old = live[oid] ?? 1
      live[oid] = othersSum > 0 ? Math.max(0.1, old * (remaining / othersSum)) : remaining / otherIds.length
    })
    // 直接写入 DOM，不经过 React
    for (const colorId of [id, ...otherIds]) {
      const rounded = Math.round(live[colorId])
      const sliderEl = sliderRefs.current[colorId]
      if (sliderEl) sliderEl.value = String(rounded)
      const numEl = numInputRefs.current[colorId]
      if (numEl && document.activeElement !== numEl) numEl.value = String(rounded)
    }
  }, [selected])

  // ── 滑块释放：提交到 React 状态（每次拖动只触发一次 re-render）
  const handleSliderCommit = useCallback(() => {
    isDraggingRef.current = false
    const live = { ...liveRatiosRef.current }
    setSelected(prev => normalizeRatios(prev.map(c => ({ ...c, ratio: live[c.color.id] ?? c.ratio }))))
    setShowSug(false)
  }, [])

  // ── 手动输入比例（保留原有逻辑，走 React state）────────────────
  const updateRatioSlider = useCallback((id: string, newRatio: number) => {
    setSelected(prev => {
      const clamped = Math.max(1, Math.min(99, newRatio))
      const others = prev.filter(c => c.color.id !== id)
      if (!others.length) return prev
      const othersSum = others.reduce((s, c) => s + c.ratio, 0)
      const remaining = 100 - clamped
      const scale = othersSum > 0 ? remaining / othersSum : 1
      return [
        ...others.map(c => ({ ...c, ratio: Math.max(0.1, c.ratio * scale) })),
        { color: prev.find(c => c.color.id === id)!.color, ratio: clamped },
      ]
    })
    setShowSug(false)
  }, [])

  const commitManualInput = useCallback((id: string, raw: string) => {
    const v = parseFloat(raw)
    if (!isNaN(v) && v >= 1 && v <= 99) updateRatioSlider(id, v)
    setEditMap(m => { const n = { ...m }; delete n[id]; return n })
  }, [updateRatioSlider])

  const randomize = useCallback(() => {
    const p = FAMOUS_PAINTINGS[Math.floor(Math.random() * FAMOUS_PAINTINGS.length)]
    setPainting(p); setTargetIdx(0); setSelected([]); setShowSug(false); setShowAns(false)
  }, [])

  const scoreClass = score >= 90 ? 'score-great' : score >= 70 ? 'score-good' : score >= 50 ? 'score-ok' : 'score-low'
  const scoreLabel = score >= 95 ? '近乎完美' : score >= 85 ? '非常接近' : score >= 70 ? '基本接近' : '继续调整'
  const progColor  = score >= 90 ? '#2E7A3A' : score >= 70 ? '#B8621A' : score >= 50 ? '#9A7020' : '#A03020'
  const curBrand   = PAINT_BRANDS[brandTab]

  // 计算参考答案的实际分数
  const refScore = useMemo(() => {
    if (!refMix.length) return 0
    const total = refMix.reduce((s, c) => s + c.ratio, 0)
    const mixed = mixPaints(refMix.map(c => ({ rgb: c.color.rgb as [number, number, number], ratio: c.ratio / total })))
    return colorMatchScore(targetRgb, mixed)
  }, [refMix, targetRgb])

  return (
    <div className="space-y-5">
      {/* 页头 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>调色练习</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
            选择颜料，用比例滑块混合出目标颜色 · 支持手动输入百分比 · 加入新色自动稀释原有比例
          </p>
        </div>
        <button onClick={randomize} className="btn-secondary flex items-center gap-1.5 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          换一幅画
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── 左列：画作 + 目标色 ─────────────────────── */}
        <div className="space-y-4">
          <div className="art-card overflow-hidden">
            <div className="relative" style={{ paddingBottom: '66%' }}>
              <PaintingImage
                src={proxyImg(painting.imageUrl)}
                alt={painting.titleZh}
                dominantColors={painting.dominantColors}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <span className="absolute top-2 left-2 badge badge-sienna text-[11px]">{painting.style}</span>
            </div>
            <div className="p-3">
              <div className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{painting.titleZh}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{painting.artistZh} · {painting.year}</div>
            </div>
          </div>

          <div className="art-card p-4 space-y-3">
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>选择训练目标色</div>
            <div className="flex gap-2 flex-wrap">
              {painting.dominantColors.map((hex, i) => (
                <button key={i} onClick={() => { setTargetIdx(i); setSelected([]); setShowSug(false); setShowAns(false) }}
                  className="w-9 h-9 rounded-xl border-2 transition-all"
                  style={{
                    backgroundColor: hex,
                    borderColor: targetIdx === i ? 'var(--sienna)' : 'transparent',
                    boxShadow: targetIdx === i ? '0 0 0 3px rgba(184,98,26,0.25)' : '0 1px 3px rgba(0,0,0,0.12)',
                    transform: targetIdx === i ? 'scale(1.12)' : 'scale(1)',
                  }} />
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className="w-14 h-14 rounded-xl shadow-sm"
                style={{ backgroundColor: targetHex, border: '1px solid var(--border-dk)' }} />
              <div>
                <div className="text-xs mb-0.5" style={{ color: 'var(--ink-3)' }}>目标颜色</div>
                <div className="font-mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>{targetHex.toUpperCase()}</div>
                <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                  rgb({targetRgb[0]}, {targetRgb[1]}, {targetRgb[2]})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 中列：调色 ──────────────────────────────── */}
        <div className="space-y-4">
          {/* 颜色对比 + 评分 */}
          <div className="art-card p-4 space-y-3">
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>颜色对比</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '目标颜色', hex: targetHex },
                { label: '混合结果', hex: selected.length ? mixedHex : '#F3EDE2' },
              ].map(({ label, hex }) => (
                <div key={label} className="space-y-1">
                  <div className="text-xs text-center" style={{ color: 'var(--ink-3)' }}>{label}</div>
                  <div className="h-20 rounded-xl transition-colors duration-300"
                    style={{ backgroundColor: hex, border: '1px solid var(--border-dk)' }} />
                  <div className="text-xs font-mono text-center" style={{ color: 'var(--ink-3)' }}>{hex.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {selected.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className={`text-3xl font-bold tabular-nums ${scoreClass}`}>{score}%</span>
                  <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{scoreLabel}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${score}%`, background: progColor }} />
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          {selected.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setShowSug(!showSug); setShowAns(false) }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-all"
                style={{
                  background: showSug ? 'var(--prussian-lt)' : 'var(--card)',
                  borderColor: showSug ? '#B0C8E0' : 'var(--border)',
                  color: showSug ? 'var(--prussian)' : 'var(--ink-2)',
                }}>
                💡 调色建议
              </button>
              <button onClick={() => { setShowAns(!showAns); setShowSug(false) }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-all"
                style={{
                  background: showAns ? '#FFF8F0' : 'var(--card)',
                  borderColor: showAns ? '#E8C4A0' : 'var(--border)',
                  color: showAns ? 'var(--sienna)' : 'var(--ink-2)',
                }}>
                🔍 参考答案
              </button>
            </div>
          )}

          {showSug && suggestion && (
            <div className="p-3.5 rounded-xl text-sm leading-relaxed"
              style={{ background: 'var(--prussian-lt)', border: '1px solid #B0C8E0', color: 'var(--prussian)' }}>
              <div className="font-semibold text-xs mb-1 opacity-70">专业调色建议</div>
              {suggestion}
            </div>
          )}

          {/* 参考答案（跨品牌最优解） */}
          {showAns && (
            <div className="p-4 rounded-xl space-y-3"
              style={{ background: '#FFF8F0', border: '1.5px solid #E8C4A0' }}>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--sienna-dk)' }}>参考调色方案</span>
                <span className="badge badge-sienna text-[11px]">跨品牌最优 · {refScore}%匹配</span>
              </div>
              <div className="space-y-2.5">
                {refMix.map(({ color, ratio, brand, note }) => (
                  <div key={color.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: color.hex, border: '1px solid var(--border-dk)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{color.name}</span>
                        <span className="text-[10px] px-1.5 rounded-sm font-medium"
                          style={{ background: 'var(--parchment)', color: 'var(--ink-3)' }}>
                          {brand}
                        </span>
                        <span className="text-[10px] px-1.5 rounded-sm"
                          style={{ background: 'var(--parchment)', color: 'var(--sienna)' }}>
                          {note}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--parchment-dk)' }}>
                        <div className="h-full rounded-full" style={{ width: `${ratio}%`, backgroundColor: color.hex }} />
                      </div>
                      <span className="font-mono text-xs font-semibold w-7 text-right" style={{ color: 'var(--sienna)' }}>
                        {ratio}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                此方案搜索 4 个品牌共 {88} 种颜料，通过算法优化得出。实际效果因颜料批次略有差异。
              </p>
            </div>
          )}

          {/* 调色盘 */}
          <div className="art-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                调色盘 {selected.length > 0 && `(${selected.length}色)`}
              </span>
              {selected.length > 0 && (
                <button onClick={() => setSelected([])} className="text-xs" style={{ color: '#A03020' }}>清空</button>
              )}
            </div>

            {selected.length === 0 ? (
              <div className="text-center py-5 rounded-xl text-sm"
                style={{ background: 'var(--parchment)', color: 'var(--ink-3)' }}>
                从右侧颜料板点击选色 · 加入时自动稀释现有比例
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {selected.map(sc => {
                  const pct  = Math.round(sc.ratio)
                  const edit = editMap[sc.color.id]
                  return (
                    <div key={sc.color.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md flex-shrink-0"
                          style={{ backgroundColor: sc.color.hex, border: '1px solid var(--border-dk)' }} />
                        <span className="text-xs flex-1 truncate" style={{ color: 'var(--ink-2)' }}>
                          {sc.color.name}
                        </span>
                        {/* 手动输入百分比 */}
                        <input
                          ref={el => { numInputRefs.current[sc.color.id] = el }}
                          type="number"
                          min="1" max="99" step="1"
                          defaultValue={pct}
                          onChange={e => setEditMap(m => ({ ...m, [sc.color.id]: e.target.value }))}
                          onBlur={e => commitManualInput(sc.color.id, e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitManualInput(sc.color.id, (e.target as HTMLInputElement).value)
                          }}
                          className="w-12 text-center text-xs font-mono rounded-lg py-1 focus:outline-none"
                          style={{
                            background: 'var(--parchment)',
                            border: '1px solid var(--border-dk)',
                            color: 'var(--sienna)',
                          }}
                        />
                        <span className="text-xs" style={{ color: 'var(--ink-3)' }}>%</span>
                        <button onClick={() => removeColor(sc.color.id)}
                          className="text-xs w-4 h-4 flex items-center justify-center"
                          style={{ color: 'var(--ink-3)' }}>✕</button>
                      </div>
                      {/* 非受控滑块：拖动时直接操作 DOM，释放才触发 re-render */}
                      <input
                        ref={el => { sliderRefs.current[sc.color.id] = el }}
                        type="range" min="1" max="99"
                        defaultValue={pct}
                        onPointerDown={() => handleSliderPointerDown(sc.color.id)}
                        onInput={e => handleSliderInput(sc.color.id, parseFloat((e.target as HTMLInputElement).value))}
                        onPointerUp={handleSliderCommit}
                        onTouchEnd={handleSliderCommit}
                        className="w-full"
                        style={{ accentColor: sc.color.hex }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 右列：颜料色板（品牌标签页） ───────────── */}
        <div className="art-card overflow-hidden flex flex-col" style={{ maxHeight: '820px' }}>
          {/* 品牌标签 */}
          <div className="flex border-b overflow-x-auto flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            {PAINT_BRANDS.map((brand, i) => (
              <button
                key={brand.id}
                onClick={() => setBrandTab(i)}
                className="flex-1 py-2.5 px-2 text-center text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  color: brandTab === i ? brand.accent : 'var(--ink-3)',
                  background: brandTab === i ? 'var(--card)' : 'var(--parchment)',
                  borderBottom: brandTab === i ? `2px solid ${brand.accent}` : '2px solid transparent',
                }}
              >
                <div className="font-semibold">{brand.name}</div>
                <div className="text-[10px] opacity-70">{brand.nameEn}</div>
              </button>
            ))}
          </div>

          {/* 颜料列表 */}
          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
              点击颜色添加到调色盘（{curBrand.colors.length} 种颜料）
            </div>

            {/* 按系列分组 */}
            {['白/黑','黄色系','橙色系','红色系','紫色系','蓝色系','绿色系','褐色系'].map(series => {
              const seriesColors = curBrand.colors.filter(c => c.series === series)
              if (!seriesColors.length) return null
              return (
                <div key={series}>
                  <div className="text-xs font-medium mb-2 flex items-center gap-1.5"
                    style={{ color: 'var(--ink-3)' }}>
                    <span className="w-1.5 h-1.5 rounded-full"
                      style={{ background: seriesColors[0].hex, display: 'inline-block' }} />
                    {series}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {seriesColors.map(color => {
                      const isSel = selected.some(c => c.color.id === color.id)
                      return (
                        <button
                          key={color.id}
                          onClick={() => isSel ? removeColor(color.id) : addColor(color)}
                          title={`${color.name} (${color.nameEn})`}
                          className="relative aspect-square color-swatch"
                          style={{
                            backgroundColor: color.hex,
                            border: isSel
                              ? `2.5px solid ${curBrand.accent}`
                              : '1.5px solid rgba(0,0,0,0.10)',
                            transform: isSel ? 'scale(0.88)' : undefined,
                            boxShadow: isSel ? `0 0 0 3px ${curBrand.accent}33` : undefined,
                          }}
                        >
                          {isSel && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg"
                              style={{ background: 'rgba(255,255,255,0.35)' }}>
                              <svg className="w-3 h-3 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
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
        </div>
      </div>

      <div className="p-4 rounded-xl text-sm leading-relaxed"
        style={{ background: '#FEFBF0', border: '1px solid #E8D890', color: '#6A5A20' }}>
        <span className="font-semibold">使用提示：</span>
        点击颜料添加时，现有颜色会自动等比稀释。拖动滑块或手动输入百分比可精确调整比例，其余颜色同步变化。
        调不出来时点击「参考答案」，会跨 4 个品牌搜索最优调色组合。
      </div>
    </div>
  )
}

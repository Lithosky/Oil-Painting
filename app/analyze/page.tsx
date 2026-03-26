'use client'

import { useState, useRef, useCallback } from 'react'
import { FAMOUS_PAINTINGS, PAINTERS, type Painting } from '@/lib/paintings'
import { rgbToHex, rgbToHsl, analyzeColorHarmony } from '@/lib/colors'
import { proxyImg } from '@/lib/imgProxy'
import PaintingImage from '@/components/PaintingImage'

interface ExtractedColor {
  hex: string
  rgb: [number, number, number]
  percentage: number
  name: string
}

function extractDominantColors(imageData: ImageData, k = 8): ExtractedColor[] {
  const data = imageData.data
  const pixels: [number, number, number][] = []
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3]
    if (a < 128) continue
    pixels.push([r, g, b])
  }
  if (pixels.length === 0) return []

  let centers: [number,number,number][] = []
  const step = Math.floor(pixels.length / k)
  for (let i = 0; i < k; i++) centers.push([...pixels[i * step]] as [number,number,number])

  for (let iter = 0; iter < 15; iter++) {
    const clusters: [number,number,number][][] = Array.from({ length: k }, () => [])
    for (const px of pixels) {
      let minD = Infinity, mi = 0
      for (let j = 0; j < centers.length; j++) {
        const d = (px[0]-centers[j][0])**2 + (px[1]-centers[j][1])**2 + (px[2]-centers[j][2])**2
        if (d < minD) { minD = d; mi = j }
      }
      clusters[mi].push(px)
    }
    let moved = false
    for (let j = 0; j < k; j++) {
      if (!clusters[j].length) continue
      const nc: [number,number,number] = [
        Math.round(clusters[j].reduce((s,p) => s+p[0],0) / clusters[j].length),
        Math.round(clusters[j].reduce((s,p) => s+p[1],0) / clusters[j].length),
        Math.round(clusters[j].reduce((s,p) => s+p[2],0) / clusters[j].length),
      ]
      if (nc[0]!==centers[j][0]||nc[1]!==centers[j][1]||nc[2]!==centers[j][2]) { moved=true; centers[j]=nc }
    }
    if (!moved) break
  }

  const counts = new Array(k).fill(0)
  for (const px of pixels) {
    let minD = Infinity, mi = 0
    for (let j = 0; j < centers.length; j++) {
      const d = (px[0]-centers[j][0])**2 + (px[1]-centers[j][1])**2 + (px[2]-centers[j][2])**2
      if (d < minD) { minD = d; mi = j }
    }
    counts[mi]++
  }

  const total = pixels.length
  return centers
    .map((rgb, i) => ({ hex: rgbToHex(...rgb), rgb, percentage: Math.round((counts[i]/total)*100), name: describeColor(rgb) }))
    .filter(c => c.percentage > 0)
    .sort((a,b) => b.percentage - a.percentage)
}

function describeColor(rgb: [number,number,number]): string {
  const [h, s, l] = rgbToHsl(...rgb)
  if (l > 90) return '白色调'
  if (l < 10) return '黑色调'
  if (s < 15) return l > 50 ? '浅灰' : '深灰'
  const hues: [number,number,string][] = [
    [0,15,'红'],[15,40,'橙红'],[40,65,'黄'],[65,90,'黄绿'],
    [90,150,'绿'],[150,190,'青绿'],[190,220,'青蓝'],[220,255,'蓝'],
    [255,290,'蓝紫'],[290,330,'紫'],[330,360,'紫红'],
  ]
  const hue = hues.find(([a,b]) => h>=a && h<b)?.[2] ?? '彩色'
  const light = l > 65 ? '浅' : l < 35 ? '深' : ''
  const sat = s > 70 ? '鲜艳' : s < 30 ? '低饱和' : ''
  return `${light}${sat}${hue}`
}

export default function AnalyzePage() {
  const [mode, setMode]         = useState<'famous'|'upload'>('famous')
  const [painting, setPainting] = useState<Painting|null>(null)
  const [painter, setPainter]   = useState('')
  const [search, setSearch]     = useState('')
  const [colors, setColors]     = useState<ExtractedColor[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadedImg, setUploadedImg] = useState<string|null>(null)
  const [harmony, setHarmony]   = useState<{type:string;score:number;description:string}|null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  const filtered = FAMOUS_PAINTINGS.filter(p => {
    const byPainter = !painter || p.artistZh === painter
    const bySearch  = !search  || p.titleZh.includes(search) || p.artistZh.includes(search)
    return byPainter && bySearch
  })

  const analyzeUrl = useCallback((url: string, fallbackColors?: string[]) => {
    setAnalyzing(true); setColors([]); setHarmony(null)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = 200
      canvas.height = Math.round((img.height / img.width) * 200)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      try {
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const ex = extractDominantColors(id, 8)
        setColors(ex)
        setHarmony(analyzeColorHarmony(ex.slice(0,5).map(c => c.rgb)))
      } catch {
        useFallback(fallbackColors)
      }
      setAnalyzing(false)
    }
    img.onerror = () => { useFallback(fallbackColors); setAnalyzing(false) }
    img.src = url
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const useFallback = (hexes?: string[]) => {
    if (!hexes?.length) return
    const ex: ExtractedColor[] = hexes.map((hex, i) => {
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
      const rgb: [number,number,number] = [r,g,b]
      return { hex, rgb, percentage: [35,25,18,12,10][i] ?? 5, name: describeColor(rgb) }
    })
    setColors(ex)
    setHarmony(analyzeColorHarmony(ex.slice(0,5).map(c => c.rgb)))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = ev => {
      const url = ev.target?.result as string
      setUploadedImg(url)
      analyzeUrl(url)
    }
    reader.readAsDataURL(f)
  }

  return (
    <div className="space-y-5">
      <canvas ref={canvasRef} className="hidden" />

      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>画作颜色分析</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>分析世界名画或上传图片，提取主要颜色与配色规律</p>
      </div>

      {/* 模式切换 */}
      <div className="flex gap-1.5 p-1 rounded-xl w-fit" style={{ background: 'var(--parchment)', border: '1px solid var(--border)' }}>
        {(['famous','upload'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setColors([]); setHarmony(null) }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: mode===m ? 'var(--card)' : 'transparent',
              color: mode===m ? 'var(--sienna)' : 'var(--ink-2)',
              boxShadow: mode===m ? '0 1px 4px var(--shadow)' : 'none',
            }}>
            {m === 'famous' ? '🖼️ 世界名画' : '📤 上传图片'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 左侧：选择区 */}
        <div className="space-y-4">
          {mode === 'famous' ? (
            <>
              {/* 搜索筛选 */}
              <div className="flex gap-2">
                <input
                  type="text" placeholder="搜索画作或画家…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none"
                  style={{
                    background: 'var(--card)', border: '1.5px solid var(--border)',
                    color: 'var(--ink)',
                  }}
                />
                <select value={painter} onChange={e => setPainter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm focus:outline-none"
                  style={{ background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--ink)' }}>
                  <option value="">全部画家</option>
                  {PAINTERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button
                  onClick={() => {
                    const p = FAMOUS_PAINTINGS[Math.floor(Math.random() * FAMOUS_PAINTINGS.length)]
                    setPainting(p); setColors([]); setHarmony(null)
                  }}
                  className="btn-secondary px-3 py-2 text-sm">随机</button>
              </div>

              {/* 名画列表 */}
              <div className="grid grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {filtered.map(p => (
                  <button key={p.id} onClick={() => { setPainting(p); setColors([]); setHarmony(null) }}
                    className="rounded-xl overflow-hidden text-left transition-all painting-thumb"
                    style={{
                      border: `2px solid ${painting?.id===p.id ? 'var(--sienna)' : 'var(--border)'}`,
                      boxShadow: painting?.id===p.id ? '0 0 0 3px rgba(184,98,26,0.15)' : 'none',
                    }}>
                    <div className="relative h-20">
                      <PaintingImage src={proxyImg(p.imageUrl)} alt={p.titleZh}
                        dominantColors={p.dominantColors}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer" loading="lazy" />
                    </div>
                    <div className="p-1.5" style={{ background: 'var(--parchment)' }}>
                      <div className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>{p.titleZh}</div>
                      <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--ink-3)' }}>{p.artistZh}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>共 {filtered.length} 幅名画</div>

              {painting && (
                <div className="art-card p-3 flex items-center gap-3">
                  <PaintingImage src={proxyImg(painting.imageUrl)} alt={painting.titleZh}
                    dominantColors={painting.dominantColors}
                    className="w-14 h-14 object-cover rounded-xl flex-shrink-0"
                    referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>{painting.titleZh}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{painting.artistZh} · {painting.year}</div>
                    <div className="flex gap-1 mt-1">
                      {painting.dominantColors.map(hex => (
                        <div key={hex} className="w-4 h-4 rounded-md border"
                          style={{ backgroundColor: hex, borderColor: 'var(--border)' }} />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => analyzeUrl(proxyImg(painting.imageUrl), painting.dominantColors)}
                    disabled={analyzing}
                    className="btn-primary text-sm px-4 py-2 flex-shrink-0"
                    style={{ opacity: analyzing ? 0.6 : 1 }}>
                    {analyzing ? '分析中…' : '分析'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all hover:border-[var(--sienna)]"
                style={{
                  borderColor: 'var(--border-dk)',
                  background: 'var(--parchment)',
                  color: 'var(--ink-3)',
                }}
              >
                <div className="text-4xl mb-2">📤</div>
                <div className="font-medium" style={{ color: 'var(--ink-2)' }}>点击上传图片</div>
                <div className="text-sm mt-1">支持 JPG、PNG、WebP</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              {uploadedImg && (
                <div className="art-card overflow-hidden">
                  <img src={uploadedImg} alt="上传图片" className="w-full max-h-56 object-contain"
                    style={{ background: 'var(--parchment)' }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧：分析结果 */}
        <div className="space-y-4">
          {analyzing ? (
            <div className="art-card flex items-center justify-center h-64">
              <div className="text-center space-y-3">
                <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto"
                  style={{ borderColor: 'var(--parchment-dk)', borderTopColor: 'var(--sienna)' }} />
                <div className="text-sm" style={{ color: 'var(--ink-3)' }}>正在提取颜色…</div>
              </div>
            </div>
          ) : colors.length > 0 ? (
            <>
              {/* 颜色条 */}
              <div className="art-card p-5 space-y-4">
                <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>主要颜色分布</div>
                <div className="h-10 rounded-xl overflow-hidden flex shadow-sm"
                  style={{ border: '1px solid var(--border)' }}>
                  {colors.map((c, i) => (
                    <div key={i} className="h-full" style={{ width: `${c.percentage}%`, backgroundColor: c.hex }}
                      title={`${c.name}: ${c.percentage}%`} />
                  ))}
                </div>
                <div className="space-y-2.5">
                  {colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: c.hex, border: '1px solid var(--border-dk)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium" style={{ color: 'var(--ink)' }}>{c.name}</span>
                          <span className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>{c.hex.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 progress-bar h-1.5">
                            <div className="progress-fill" style={{ width: `${c.percentage}%`, backgroundColor: c.hex }} />
                          </div>
                          <span className="text-xs w-7 text-right" style={{ color: 'var(--sienna)' }}>{c.percentage}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 配色分析 */}
              {harmony && (
                <div className="art-card p-5 space-y-3">
                  <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>配色分析</div>
                  <div className="flex items-center gap-4">
                    {/* 圆形评分 */}
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                        <circle cx="36" cy="36" r="28" fill="none" stroke="var(--parchment-dk)" strokeWidth="8" />
                        <circle cx="36" cy="36" r="28" fill="none"
                          stroke={harmony.score>=80 ? '#3C7060' : harmony.score>=60 ? '#B8621A' : '#9A7020'}
                          strokeWidth="8"
                          strokeDasharray="175.9"
                          strokeDashoffset={175.9 * (1 - harmony.score / 100)}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{harmony.score}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className="badge badge-sienna mb-2 inline-block">{harmony.type}</span>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>{harmony.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {colors.slice(0,6).map((c,i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: c.hex }} title={c.hex} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="art-card flex items-center justify-center h-64">
              <div className="text-center" style={{ color: 'var(--ink-3)' }}>
                <div className="text-5xl mb-3 opacity-40">🎨</div>
                <div className="text-sm">选择一幅画或上传图片<br />开始颜色分析</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

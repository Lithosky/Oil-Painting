// ── 类型定义 ─────────────────────────────────────────────────
export interface PaintColor {
  id: string
  name: string
  nameEn: string
  hex: string
  rgb: [number, number, number]
  series?: string
}

export interface PaintBrand {
  id: string
  name: string
  nameEn: string
  accent: string
  colors: PaintColor[]
}

// ── 颜色工具函数 ──────────────────────────────────────────────
export function hexToRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!r) return [0, 0, 0]
  return [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)]
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v =>
    Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  ).join('')
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  let rr = r / 255, gg = g / 255, bb = b / 255
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92
  let x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047
  let y = (rr * 0.2126 + gg * 0.7152 + bb * 0.0722) / 1.00000
  let z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883
  x = x > 0.008856 ? Math.pow(x, 1/3) : 7.787 * x + 16/116
  y = y > 0.008856 ? Math.pow(y, 1/3) : 7.787 * y + 16/116
  z = z > 0.008856 ? Math.pow(z, 1/3) : 7.787 * z + 16/116
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

export function deltaE(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const [l1, a1, b1] = rgbToLab(...rgb1)
  const [l2, a2, b2] = rgbToLab(...rgb2)
  return Math.sqrt((l1-l2)**2 + (a1-a2)**2 + (b1-b2)**2)
}

/** 匹配分数：deltaE=0→100%, deltaE=1→98%, deltaE=10→80% */
export function colorMatchScore(
  rgb1: [number, number, number],
  rgb2: [number, number, number],
): number {
  return Math.max(0, Math.round(100 - deltaE(rgb1, rgb2) * 2))
}

/** 减色混合（Lab 空间加权平均） */
export function mixPaints(
  colors: { rgb: [number, number, number]; ratio: number }[],
): [number, number, number] {
  if (!colors.length) return [255, 255, 255]
  const total = colors.reduce((s, c) => s + c.ratio, 0)
  if (!total) return [255, 255, 255]
  const labs = colors.map(c => ({ lab: rgbToLab(...c.rgb), w: c.ratio / total }))
  const [L, A, B] = labs.reduce(
    (acc, c) => [acc[0] + c.lab[0] * c.w, acc[1] + c.lab[1] * c.w, acc[2] + c.lab[2] * c.w],
    [0, 0, 0],
  )
  let y = (L + 16) / 116
  let x = A / 500 + y
  let z = y - B / 200
  x = (x**3 > 0.008856 ? x**3 : (x - 16/116) / 7.787) * 0.95047
  y = (y**3 > 0.008856 ? y**3 : (y - 16/116) / 7.787)
  z = (z**3 > 0.008856 ? z**3 : (z - 16/116) / 7.787) * 1.08883
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415
  let b = x * 0.0557 + y * -0.2040 + z * 1.0570
  r = r > 0.0031308 ? 1.055 * r**(1/2.4) - 0.055 : 12.92 * r
  g = g > 0.0031308 ? 1.055 * g**(1/2.4) - 0.055 : 12.92 * g
  b = b > 0.0031308 ? 1.055 * b**(1/2.4) - 0.055 : 12.92 * b
  return [
    Math.round(Math.max(0, Math.min(255, r * 255))),
    Math.round(Math.max(0, Math.min(255, g * 255))),
    Math.round(Math.max(0, Math.min(255, b * 255))),
  ]
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

// ── 马利牌 (Marie's) ──────────────────────────────────────────
export const MARIE_COLORS: PaintColor[] = [
  { id: 'm-tw',  name: '钛白',      nameEn: 'Titanium White',    hex: '#F5F5F0', rgb: [245,245,240], series: '白/黑' },
  { id: 'm-zw',  name: '锌白',      nameEn: 'Zinc White',        hex: '#F0F0EB', rgb: [240,240,235], series: '白/黑' },
  { id: 'm-ib',  name: '象牙黑',    nameEn: 'Ivory Black',       hex: '#1C1C1A', rgb: [28,28,26],    series: '白/黑' },
  { id: 'm-ly',  name: '柠檬黄',    nameEn: 'Lemon Yellow',      hex: '#FFF44F', rgb: [255,244,79],  series: '黄色系' },
  { id: 'm-cyl', name: '镉黄浅',    nameEn: 'Cadmium Yellow Lt', hex: '#FFD700', rgb: [255,215,0],   series: '黄色系' },
  { id: 'm-cy',  name: '镉黄',      nameEn: 'Cadmium Yellow',    hex: '#FFC300', rgb: [255,195,0],   series: '黄色系' },
  { id: 'm-cyd', name: '镉黄深',    nameEn: 'Cadmium Yellow Dp', hex: '#FFB300', rgb: [255,179,0],   series: '黄色系' },
  { id: 'm-yo',  name: '土黄',      nameEn: 'Yellow Ochre',      hex: '#C8922A', rgb: [200,146,42],  series: '黄色系' },
  { id: 'm-ny',  name: '那不勒斯黄',nameEn: 'Naples Yellow',     hex: '#FADA5E', rgb: [250,218,94],  series: '黄色系' },
  { id: 'm-co',  name: '镉橙',      nameEn: 'Cadmium Orange',    hex: '#FF6B35', rgb: [255,107,53],  series: '橙色系' },
  { id: 'm-or',  name: '橙色',      nameEn: 'Orange',            hex: '#FF8C00', rgb: [255,140,0],   series: '橙色系' },
  { id: 'm-vm',  name: '朱红',      nameEn: 'Vermillion',        hex: '#E34234', rgb: [227,66,52],   series: '红色系' },
  { id: 'm-cr',  name: '镉红',      nameEn: 'Cadmium Red',       hex: '#CC0000', rgb: [204,0,0],     series: '红色系' },
  { id: 'm-rm',  name: '玫瑰茜红',  nameEn: 'Rose Madder',       hex: '#C7294E', rgb: [199,41,78],   series: '红色系' },
  { id: 'm-ca',  name: '深红',      nameEn: 'Carmine',           hex: '#960018', rgb: [150,0,24],    series: '红色系' },
  { id: 'm-ac',  name: '茜素深红',  nameEn: 'Alizarin Crimson',  hex: '#E32636', rgb: [227,38,54],   series: '红色系' },
  { id: 'm-cv',  name: '钴紫',      nameEn: 'Cobalt Violet',     hex: '#8A2BE2', rgb: [138,43,226],  series: '紫色系' },
  { id: 'm-mv',  name: '紫罗兰',    nameEn: 'Mauve',             hex: '#7C4DBA', rgb: [124,77,186],  series: '紫色系' },
  { id: 'm-ul',  name: '群青',      nameEn: 'Ultramarine',       hex: '#3F00FF', rgb: [63,0,255],    series: '蓝色系' },
  { id: 'm-cb',  name: '钴蓝',      nameEn: 'Cobalt Blue',       hex: '#0047AB', rgb: [0,71,171],    series: '蓝色系' },
  { id: 'm-ce',  name: '天蓝',      nameEn: 'Cerulean Blue',     hex: '#2A52BE', rgb: [42,82,190],   series: '蓝色系' },
  { id: 'm-pb',  name: '普鲁士蓝',  nameEn: 'Prussian Blue',     hex: '#003153', rgb: [0,49,83],     series: '蓝色系' },
  { id: 'm-mb',  name: '锰蓝',      nameEn: 'Manganese Blue',    hex: '#1B8FA8', rgb: [27,143,168],  series: '蓝色系' },
  { id: 'm-eg',  name: '翡翠绿',    nameEn: 'Emerald Green',     hex: '#50C878', rgb: [80,200,120],  series: '绿色系' },
  { id: 'm-cg',  name: '铬绿',      nameEn: 'Chrome Green',      hex: '#008000', rgb: [0,128,0],     series: '绿色系' },
  { id: 'm-sg',  name: '树绿',      nameEn: 'Sap Green',         hex: '#4A7C4E', rgb: [74,124,78],   series: '绿色系' },
  { id: 'm-vg',  name: '翠绿',      nameEn: 'Viridian',          hex: '#40826D', rgb: [64,130,109],  series: '绿色系' },
  { id: 'm-rs',  name: '生赭',      nameEn: 'Raw Sienna',        hex: '#C68642', rgb: [198,134,66],  series: '褐色系' },
  { id: 'm-bs',  name: '熟赭',      nameEn: 'Burnt Sienna',      hex: '#8B4513', rgb: [139,69,19],   series: '褐色系' },
  { id: 'm-ru',  name: '生褐',      nameEn: 'Raw Umber',         hex: '#72552C', rgb: [114,85,44],   series: '褐色系' },
  { id: 'm-bu',  name: '熟褐',      nameEn: 'Burnt Umber',       hex: '#4E2B0C', rgb: [78,43,12],    series: '褐色系' },
]

// ── 温莎牛顿 (Winsor & Newton Artists' Oil) ───────────────────
export const WINSOR_COLORS: PaintColor[] = [
  { id: 'w-tw',  name: '钛白',       nameEn: 'Titanium White',     hex: '#F8F8F5', rgb: [248,248,245], series: '白/黑' },
  { id: 'w-fw',  name: '铅白',       nameEn: 'Flake White',        hex: '#F0EEE5', rgb: [240,238,229], series: '白/黑' },
  { id: 'w-ib',  name: '象牙黑',     nameEn: 'Ivory Black',        hex: '#1A1A18', rgb: [26,26,24],    series: '白/黑' },
  { id: 'w-cyl', name: '镉柠檬黄',   nameEn: 'Cadmium Lemon',      hex: '#FFF018', rgb: [255,240,24],  series: '黄色系' },
  { id: 'w-cym', name: '镉黄中',     nameEn: 'Cadmium Yellow Mid', hex: '#FFD800', rgb: [255,216,0],   series: '黄色系' },
  { id: 'w-ny',  name: '那不勒斯黄深',nameEn: 'Naples Yellow Dp',  hex: '#F0C850', rgb: [240,200,80],  series: '黄色系' },
  { id: 'w-iy',  name: '印度黄',     nameEn: 'Indian Yellow',      hex: '#E8A020', rgb: [232,160,32],  series: '黄色系' },
  { id: 'w-yo',  name: '土黄',       nameEn: 'Yellow Ochre',       hex: '#C89030', rgb: [200,144,48],  series: '黄色系' },
  { id: 'w-rs',  name: '生赭',       nameEn: 'Raw Sienna',         hex: '#C07828', rgb: [192,120,40],  series: '黄色系' },
  { id: 'w-co',  name: '镉橙',       nameEn: 'Cadmium Orange',     hex: '#FF7800', rgb: [255,120,0],   series: '橙色系' },
  { id: 'w-vm',  name: '朱砂',       nameEn: 'Vermilion Hue',      hex: '#E83828', rgb: [232,56,40],   series: '红色系' },
  { id: 'w-crl', name: '镉红浅',     nameEn: 'Cadmium Red Light',  hex: '#FF3020', rgb: [255,48,32],   series: '红色系' },
  { id: 'w-crd', name: '镉红深',     nameEn: 'Cadmium Red Deep',   hex: '#C81000', rgb: [200,16,0],    series: '红色系' },
  { id: 'w-ac',  name: '茜素深红',   nameEn: 'Alizarin Crimson',   hex: '#B80050', rgb: [184,0,80],    series: '红色系' },
  { id: 'w-vr',  name: '威尼斯红',   nameEn: 'Venetian Red',       hex: '#9A3020', rgb: [154,48,32],   series: '红色系' },
  { id: 'w-cv',  name: '钴紫',       nameEn: 'Cobalt Violet',      hex: '#7040B0', rgb: [112,64,176],  series: '紫色系' },
  { id: 'w-ul',  name: '法国群青',   nameEn: 'French Ultramarine', hex: '#2040C0', rgb: [32,64,192],   series: '蓝色系' },
  { id: 'w-cb',  name: '钴蓝',       nameEn: 'Cobalt Blue',        hex: '#2860C8', rgb: [40,96,200],   series: '蓝色系' },
  { id: 'w-ce',  name: '天蓝',       nameEn: 'Cerulean Blue',      hex: '#3890C8', rgb: [56,144,200],  series: '蓝色系' },
  { id: 'w-pb',  name: '普鲁士蓝',   nameEn: 'Prussian Blue',      hex: '#1C3060', rgb: [28,48,96],    series: '蓝色系' },
  { id: 'w-vg',  name: '翠绿',       nameEn: 'Viridian',           hex: '#3B7C6C', rgb: [59,124,108],  series: '绿色系' },
  { id: 'w-bs',  name: '熟赭',       nameEn: 'Burnt Sienna',       hex: '#8B3818', rgb: [139,56,24],   series: '褐色系' },
  { id: 'w-ru',  name: '生褐',       nameEn: 'Raw Umber',          hex: '#705030', rgb: [112,80,48],   series: '褐色系' },
  { id: 'w-bu',  name: '熟褐',       nameEn: 'Burnt Umber',        hex: '#6A3520', rgb: [106,53,32],   series: '褐色系' },
]

// ── 贝碧欧 (Pébéo XL Oil) ─────────────────────────────────────
export const PEBEO_COLORS: PaintColor[] = [
  { id: 'p-tw',  name: '钛白',      nameEn: 'Titanium White',     hex: '#F8F8F5', rgb: [248,248,245], series: '白/黑' },
  { id: 'p-ib',  name: '象牙黑',    nameEn: 'Ivory Black',        hex: '#1E1E1C', rgb: [30,30,28],    series: '白/黑' },
  { id: 'p-ly',  name: '柠檬黄',    nameEn: 'Lemon Yellow',       hex: '#FFF200', rgb: [255,242,0],   series: '黄色系' },
  { id: 'p-cyh', name: '镉黄色调',  nameEn: 'Cadmium Yellow Hue', hex: '#FFD800', rgb: [255,216,0],   series: '黄色系' },
  { id: 'p-yo',  name: '土黄',      nameEn: 'Yellow Ochre',       hex: '#C89030', rgb: [200,144,48],  series: '黄色系' },
  { id: 'p-coh', name: '镉橙色调',  nameEn: 'Cadmium Orange Hue', hex: '#FF8800', rgb: [255,136,0],   series: '橙色系' },
  { id: 'p-crh', name: '镉红色调',  nameEn: 'Cadmium Red Hue',    hex: '#E02010', rgb: [224,32,16],   series: '红色系' },
  { id: 'p-vm',  name: '朱红色调',  nameEn: 'Vermilion Hue',      hex: '#E83428', rgb: [232,52,40],   series: '红色系' },
  { id: 'p-rm',  name: '玫瑰茜红',  nameEn: 'Rose Madder',        hex: '#C03868', rgb: [192,56,104],  series: '红色系' },
  { id: 'p-mg',  name: '品红',      nameEn: 'Magenta',            hex: '#C01878', rgb: [192,24,120],  series: '红色系' },
  { id: 'p-vl',  name: '紫罗兰',    nameEn: 'Violet',             hex: '#7040A8', rgb: [112,64,168],  series: '紫色系' },
  { id: 'p-ul',  name: '群青',      nameEn: 'Ultramarine',        hex: '#3050CC', rgb: [48,80,204],   series: '蓝色系' },
  { id: 'p-ce',  name: '天蓝色调',  nameEn: 'Cerulean Blue Hue',  hex: '#4898CC', rgb: [72,152,204],  series: '蓝色系' },
  { id: 'p-pb',  name: '普鲁士蓝',  nameEn: 'Prussian Blue',      hex: '#1C3060', rgb: [28,48,96],    series: '蓝色系' },
  { id: 'p-vg',  name: '翠绿色调',  nameEn: 'Viridian Hue',       hex: '#428870', rgb: [66,136,112],  series: '绿色系' },
  { id: 'p-sg',  name: '树绿',      nameEn: 'Sap Green',          hex: '#4A7840', rgb: [74,120,64],   series: '绿色系' },
  { id: 'p-pgl', name: '浅永固绿',  nameEn: 'Perm. Green Light',  hex: '#60A848', rgb: [96,168,72],   series: '绿色系' },
  { id: 'p-bs',  name: '熟赭',      nameEn: 'Burnt Sienna',       hex: '#8B3818', rgb: [139,56,24],   series: '褐色系' },
  { id: 'p-bu',  name: '熟褐',      nameEn: 'Burnt Umber',        hex: '#6A3520', rgb: [106,53,32],   series: '褐色系' },
  { id: 'p-ru',  name: '生褐',      nameEn: 'Raw Umber',          hex: '#705030', rgb: [112,80,48],   series: '褐色系' },
]

// ── 史明克 (Schmincke Norma Oil) ──────────────────────────────
export const SCHMINCKE_COLORS: PaintColor[] = [
  { id: 's-tw',  name: '钛白',        nameEn: 'Titanium White',       hex: '#F8F8F5', rgb: [248,248,245], series: '白/黑' },
  { id: 's-zw',  name: '锌白',        nameEn: 'Zinc White',           hex: '#F5F5F0', rgb: [245,245,240], series: '白/黑' },
  { id: 's-ib',  name: '象牙黑',      nameEn: 'Ivory Black',          hex: '#181818', rgb: [24,24,24],    series: '白/黑' },
  { id: 's-cyl', name: '镉柠檬黄',    nameEn: 'Cadmium Yellow Lemon', hex: '#FFF018', rgb: [255,240,24],  series: '黄色系' },
  { id: 's-cym', name: '镉黄中',      nameEn: 'Cadmium Yellow Mid',   hex: '#FFD000', rgb: [255,208,0],   series: '黄色系' },
  { id: 's-yo',  name: '土黄',        nameEn: 'Yellow Ochre',         hex: '#C89030', rgb: [200,144,48],  series: '黄色系' },
  { id: 's-tr',  name: '透明赭黄',    nameEn: 'Transparent Oxide Yw', hex: '#C07020', rgb: [192,112,32],  series: '黄色系' },
  { id: 's-co',  name: '镉橙',        nameEn: 'Cadmium Orange',       hex: '#FF7C00', rgb: [255,124,0],   series: '橙色系' },
  { id: 's-crl', name: '镉红浅',      nameEn: 'Cadmium Red Light',    hex: '#FF3020', rgb: [255,48,32],   series: '红色系' },
  { id: 's-crm', name: '镉红中',      nameEn: 'Cadmium Red Mid',      hex: '#E81A10', rgb: [232,26,16],   series: '红色系' },
  { id: 's-ac',  name: '茜素深红',    nameEn: 'Alizarin Crimson',     hex: '#B80050', rgb: [184,0,80],    series: '红色系' },
  { id: 's-qm',  name: '喹吖啶酮品红',nameEn: 'Quinacridone Magenta', hex: '#C01068', rgb: [192,16,104],  series: '红色系' },
  { id: 's-cv',  name: '钴紫',        nameEn: 'Cobalt Violet',        hex: '#6038A8', rgb: [96,56,168],   series: '紫色系' },
  { id: 's-dv',  name: '二噁嗪紫',    nameEn: 'Dioxazine Violet',     hex: '#502080', rgb: [80,32,128],   series: '紫色系' },
  { id: 's-ul',  name: '深群青',      nameEn: 'Ultramarine Deep',     hex: '#1838B8', rgb: [24,56,184],   series: '蓝色系' },
  { id: 's-cb',  name: '钴蓝',        nameEn: 'Cobalt Blue',          hex: '#2858C0', rgb: [40,88,192],   series: '蓝色系' },
  { id: 's-ce',  name: '天蓝',        nameEn: 'Cerulean Blue',        hex: '#3890C8', rgb: [56,144,200],  series: '蓝色系' },
  { id: 's-pb',  name: '普鲁士蓝',    nameEn: 'Prussian Blue',        hex: '#1C3060', rgb: [28,48,96],    series: '蓝色系' },
  { id: 's-vg',  name: '翠绿',        nameEn: 'Viridian',             hex: '#3B7C6C', rgb: [59,124,108],  series: '绿色系' },
  { id: 's-sg',  name: '树绿',        nameEn: 'Sap Green',            hex: '#4A7840', rgb: [74,120,64],   series: '绿色系' },
  { id: 's-rs',  name: '生赭',        nameEn: 'Raw Sienna',           hex: '#C07828', rgb: [192,120,40],  series: '褐色系' },
  { id: 's-bs',  name: '熟赭',        nameEn: 'Burnt Sienna',         hex: '#8B3818', rgb: [139,56,24],   series: '褐色系' },
  { id: 's-bu',  name: '熟褐',        nameEn: 'Burnt Umber',          hex: '#6A3520', rgb: [106,53,32],   series: '褐色系' },
]

// ── 品牌注册表 ────────────────────────────────────────────────
export const PAINT_BRANDS: PaintBrand[] = [
  { id: 'marie',     name: '马利',    nameEn: "Marie's",          accent: '#B8621A', colors: MARIE_COLORS },
  { id: 'winsor',    name: '温莎牛顿',nameEn: 'Winsor & Newton',  accent: '#1A5E91', colors: WINSOR_COLORS },
  { id: 'pebeo',     name: '贝碧欧',  nameEn: 'Pébéo XL',        accent: '#2A7A3A', colors: PEBEO_COLORS },
  { id: 'schmincke', name: '史明克',  nameEn: 'Schmincke',        accent: '#6A1A8A', colors: SCHMINCKE_COLORS },
]

/** 跨品牌全色库（参考答案搜索用） */
export const ALL_COLORS: PaintColor[] = [
  ...MARIE_COLORS, ...WINSOR_COLORS, ...PEBEO_COLORS, ...SCHMINCKE_COLORS,
]

// ── 最优调色方案（搜索所有品牌，争取 98%+） ──────────────────
export function getOptimalMix(
  targetRgb: [number, number, number],
): Array<{ color: PaintColor; ratio: number; brand: string; note: string }> {
  type Active = { color: PaintColor; ratio: number }

  const score = (active: Active[]) => {
    const total = active.reduce((s, c) => s + c.ratio, 0)
    if (!total) return 0
    const mixed = mixPaints(active.map(c => ({ rgb: c.color.rgb, ratio: c.ratio / total })))
    return colorMatchScore(targetRgb, mixed)
  }

  let active: Active[] = []
  let cur = 0

  // 阶段1：贪心 —— 每轮加入最能提升分数的颜色
  for (let round = 0; round < 8 && cur < 98; round++) {
    let bestGain = 0, bestColor: PaintColor | null = null, bestPct = 0

    for (const color of ALL_COLORS) {
      if (active.some(c => c.color.id === color.id)) continue
      for (const pct of [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0]) {
        const candidate: Active[] = round === 0
          ? [{ color, ratio: 1 }]
          : [...active.map(c => ({ ...c, ratio: c.ratio * (1 - pct) })), { color, ratio: pct }]
        const s = score(candidate)
        if (s > cur + bestGain + 0.2) { bestGain = s - cur; bestColor = color; bestPct = pct }
      }
    }

    if (!bestColor || bestGain < 0.2) break
    active = round === 0
      ? [{ color: bestColor, ratio: 1 }]
      : [...active.map(c => ({ ...c, ratio: c.ratio * (1 - bestPct) })), { color: bestColor, ratio: bestPct }]
    cur = score(active)
  }

  // 阶段2：梯度微调
  const lr = 0.006
  let improved = true, iter = 0
  while (improved && iter++ < 400 && cur < 98) {
    improved = false
    for (let i = 0; i < active.length; i++) {
      for (const d of [lr, -lr]) {
        const trial = active.map((c, j) => ({
          ...c, ratio: Math.max(0.005, j === i ? c.ratio + d : c.ratio),
        }))
        const s = score(trial)
        if (s > cur + 0.1) { active = trial; cur = s; improved = true; break }
      }
      if (improved) break
    }
  }

  // 归一化，去掉 < 3% 的颜色
  const totalR = active.reduce((s, c) => s + c.ratio, 0)
  const filtered = active
    .map(c => ({ ...c, ratio: c.ratio / totalR }))
    .filter(c => c.ratio >= 0.03)
  const ft = filtered.reduce((s, c) => s + c.ratio, 0)

  const getBrand = (id: string) =>
    PAINT_BRANDS.find(b => b.colors.some(c => c.id === id))?.name ?? ''

  return filtered
    .map((c, i) => ({
      color: c.color,
      ratio: Math.round((c.ratio / ft) * 100),
      brand: getBrand(c.color.id),
      note: i === 0 ? '主色' : c.ratio / ft > 0.15 ? '辅色' : '微调',
    }))
    .sort((a, b) => b.ratio - a.ratio)
}

// ── 调色建议 ─────────────────────────────────────────────────
export function getMixingSuggestion(
  targetRgb: [number, number, number],
  mixedRgb: [number, number, number],
): string {
  const tLab = rgbToLab(...targetRgb)
  const mLab = rgbToLab(...mixedRgb)
  const [tH, , tL] = rgbToHsl(...targetRgb)
  const [, , mL] = rgbToHsl(...mixedRgb)
  const de = deltaE(targetRgb, mixedRgb)
  const tips: string[] = []

  if (de < 3) return '调色非常精准！颜色几乎完美匹配。'

  if (mL > tL + 10) tips.push('混合色偏亮，减少白色比例，或加少量象牙黑/熟褐压暗。')
  else if (mL < tL - 10) tips.push('混合色偏暗，适量增加白色或明亮色比例。')

  const cMix = Math.sqrt(mLab[1]**2 + mLab[2]**2)
  const cTgt = Math.sqrt(tLab[1]**2 + tLab[2]**2)
  if (cMix > cTgt + 15) {
    tips.push(`饱和度过高，加入少量${hueName((tH + 180) % 360)}（互补色）降低饱和度使颜色更沉稳。`)
  } else if (cMix < cTgt - 15) {
    tips.push('饱和度不足，减少白色与互补色，增大主色比例。')
  }

  if (!tips.length) tips.push(`色差约 ${Math.round(de)}，继续微调各颜色比例。`)
  return tips.join(' ')
}

function hueName(h: number): string {
  const names: [number, number, string][] = [
    [0,20,'红色'],[20,45,'橙红'],[45,70,'黄色'],[70,100,'黄绿'],
    [100,155,'绿色'],[155,195,'青绿'],[195,225,'青蓝'],[225,260,'蓝色'],
    [260,290,'蓝紫'],[290,330,'紫色'],[330,360,'紫红'],
  ]
  return names.find(([a, b]) => h >= a && h < b)?.[2] ?? '彩色'
}

// ── 配色和谐度分析 ────────────────────────────────────────────
export function analyzeColorHarmony(colors: [number, number, number][]): {
  type: string; score: number; description: string
} {
  if (colors.length < 2) return { type: '单色', score: 70, description: '单一颜色，稳定但缺乏变化。' }
  const hsls = colors.map(c => rgbToHsl(...c))
  const hues = hsls.map(h => h[0])
  const avgSat = hsls.reduce((s, h) => s + h[1], 0) / hsls.length
  const sorted = [...hues].sort((a, b) => a - b)
  const maxDiff = sorted[sorted.length - 1] - sorted[0]

  let type = '多色调', score = 60, description = ''
  if (maxDiff < 30) {
    type = '类比色'; score = 80; description = '相近色相，视觉和谐自然，适合表达统一的情感基调。'
  } else if (Math.abs(maxDiff - 180) < 30) {
    type = '互补色'; score = 85; description = '对比强烈，充满活力与张力，能产生强烈的视觉冲击。'
  } else if (colors.length === 3 && Math.abs(maxDiff - 120) < 40) {
    type = '三角色'; score = 88; description = '三色等分色相环，平衡而富有活力，经典艺术配色。'
  } else if (maxDiff > 150) {
    type = '对比色'; score = 75; description = '对比明显，注意平衡主次关系。'
  }

  if (avgSat > 60) score += 5
  if (avgSat < 20) { score -= 10; description += ' 饱和度较低，整体偏灰调。' }
  return { type, score: Math.min(100, score), description }
}

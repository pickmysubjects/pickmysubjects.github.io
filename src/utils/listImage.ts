/**
 * A ranked list (the easiest or hardest subjects) as a picture to share, laid out like a league
 * table: the site's mark and name, a big title, then one row per subject with its place, a
 * coloured tag for its area, code and name, and three stat columns. Deep plum with the site's
 * pink and violet; the address at the bottom so a passed-around screenshot says where it's from.
 * Made on a <canvas> in the browser; nothing is uploaded.
 */
import { downloadOrShare } from './planImage'

export interface ListImageRow {
  code: string
  title: string
  /** The three stat cells, already formatted ("1", "40%", "3"). */
  stats: [string, string, string]
}

export interface ListImageInput {
  site: string
  url: string
  title: string
  subtitle: string
  /** The three stat columns' headings. */
  columns: [string, string, string]
  rows: ListImageRow[]
}

export const LIST_IMAGE_WIDTH = 1080
export const LIST_IMAGE_HEIGHT = 1350 // 4:5, what 小红书 and Instagram show whole

const C = {
  top: '#2b0b2e',
  bottom: '#170a26',
  glowPink: 'rgba(226, 80, 155, 0.45)',
  glowViolet: 'rgba(122, 99, 240, 0.40)',
  ink: '#ffffff',
  soft: 'rgba(255, 255, 255, 0.72)',
  faint: 'rgba(255, 255, 255, 0.5)',
  pink: '#ff7ab8',
  rowA: 'rgba(255, 255, 255, 0.07)',
  rowB: 'rgba(255, 255, 255, 0.03)',
  podium: 'rgba(226, 80, 155, 0.26)',
} as const

// A colour per subject area (the code's four letters), so rows read like clubs with their crests.
const AREA_COLOURS = ['#e2509b', '#7a63f0', '#2fb5a3', '#f2a33a', '#4f9cf0', '#e5603f', '#9bc53d', '#c86dd7']
export function areaColour(code: string): string {
  let h = 0
  for (const ch of code.slice(0, 4)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AREA_COLOURS[h % AREA_COLOURS.length]!
}

/** A file name that says what it is: PickMySubjects-墨大水课榜-Bachelor-of-Science-2026.png. */
export function listImageFileName(site: string, title: string, subtitle: string): string {
  const clean = (s: string) =>
    s
      .replace(/[\\/:*?"<>|·]+/g, ' ')
      .trim()
      .replace(/\s+/g, '-')
  return `${[site, title, subtitle].map(clean).filter(Boolean).join('-')}.png`
}

const font = (weight: number, size: number, family: string) => `${weight} ${size}px ${family}`

function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text
  let s = text
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1)
  return `${s}…`
}

/** The site's mark: a white mortarboard on a pink glass tile (src/components/AppLogo.vue). */
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 72, size / 72)
  const glass = ctx.createLinearGradient(0, 0, 43, 72)
  glass.addColorStop(0, '#e2509b')
  glass.addColorStop(1, '#a81a68')
  ctx.beginPath()
  ctx.roundRect(2, 2, 68, 68, 20)
  ctx.fillStyle = glass
  ctx.fill()
  const sheen = ctx.createLinearGradient(0, 2, 0, 70)
  sheen.addColorStop(0, 'rgba(255,255,255,0.45)')
  sheen.addColorStop(0.45, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fill(new Path2D('M22 34v9c0 4 6 8 14 8s14-4 14-8v-9'))
  ctx.fillStyle = '#fff'
  ctx.fill(new Path2D('M36 16l25 11-25 11-25-11z'))
  ctx.strokeStyle = '#ffd6ea'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.stroke(new Path2D('M36 27l18 4v12'))
  ctx.beginPath()
  ctx.arc(54, 45, 4, 0, Math.PI * 2)
  ctx.fillStyle = '#ffd6ea'
  ctx.fill()
  ctx.restore()
}

export function drawListImage(canvas: HTMLCanvasElement, input: ListImageInput, fonts: { ui: string; code: string }): void {
  const W = LIST_IMAGE_WIDTH
  const H = LIST_IMAGE_HEIGHT
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D canvas')

  // Background: deep plum, a pink glow top right and a violet one bottom left.
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, C.top)
  bg.addColorStop(1, C.bottom)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  for (const [gx, gy, r, colour] of [
    [W * 0.92, 80, 520, C.glowPink],
    [W * 0.05, H * 0.92, 560, C.glowViolet],
  ] as const) {
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r)
    g.addColorStop(0, colour)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }

  const PAD = 64
  ctx.textBaseline = 'alphabetic'

  // Header: the mark and the site's name, then the title large and the degree and year in pink.
  drawMark(ctx, PAD, 56, 64)
  ctx.font = font(750, 34, fonts.ui)
  ctx.fillStyle = C.ink
  ctx.fillText(input.site, PAD + 84, 100)
  // The title as large as fits on one line (92px, down to 56px for a long English one).
  let size = 92
  do ctx.font = font(900, size, fonts.ui)
  while (ctx.measureText(input.title).width > W - PAD * 2 && (size -= 4) >= 56)
  ctx.fillText(fit(ctx, input.title, W - PAD * 2), PAD, 236)
  ctx.font = font(700, 38, fonts.ui)
  ctx.fillStyle = C.pink
  ctx.fillText(fit(ctx, input.subtitle, W - PAD * 2), PAD, 296)

  // The table: column headings, then a row per subject.
  const statX = [W - PAD - 250, W - PAD - 140, W - PAD - 30] // right edges of the three stat cells
  const top = 352
  ctx.font = font(700, 24, fonts.ui)
  ctx.fillStyle = C.faint
  ctx.textAlign = 'right'
  input.columns.forEach((c, i) => ctx.fillText(c, statX[i]!, top))
  ctx.textAlign = 'left'

  const rowH = 74
  const gap = 8
  const tableTop = top + 22
  input.rows.forEach((r, i) => {
    const y = tableTop + i * (rowH + gap)
    ctx.beginPath()
    ctx.roundRect(PAD - 16, y, W - PAD * 2 + 32, rowH, 18)
    ctx.fillStyle = i < 3 ? C.podium : i % 2 ? C.rowB : C.rowA
    ctx.fill()
    const mid = y + rowH / 2 + 12
    // Place.
    ctx.font = font(900, 36, fonts.ui)
    ctx.fillStyle = i < 3 ? C.pink : C.ink
    ctx.textAlign = 'right'
    ctx.fillText(String(i + 1), PAD + 44, mid)
    ctx.textAlign = 'left'
    // The area's tag, like a club crest.
    const tagX = PAD + 64
    ctx.beginPath()
    ctx.roundRect(tagX, y + (rowH - 40) / 2, 40, 40, 12)
    ctx.fillStyle = areaColour(r.code)
    ctx.fill()
    ctx.font = font(800, 15, fonts.code)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.fillText(r.code.slice(0, 4), tagX + 20, y + rowH / 2 + 5)
    ctx.textAlign = 'left'
    // Code, then the name in what's left before the stats.
    const textX = tagX + 58
    ctx.font = font(800, 30, fonts.code)
    ctx.fillStyle = C.ink
    ctx.fillText(r.code, textX, mid)
    const codeW = ctx.measureText(r.code).width
    ctx.font = font(600, 28, fonts.ui)
    ctx.fillStyle = C.soft
    ctx.fillText(fit(ctx, r.title, statX[0]! - 90 - (textX + codeW + 18)), textX + codeW + 18, mid)
    // Stats.
    ctx.font = font(800, 32, fonts.ui)
    ctx.fillStyle = C.ink
    ctx.textAlign = 'right'
    r.stats.forEach((v, k) => ctx.fillText(v, statX[k]!, mid))
    ctx.textAlign = 'left'
  })

  // Footer: the address, in pink, by the mark.
  const fy = H - 64
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.fillRect(PAD, fy - 58, W - PAD * 2, 2)
  drawMark(ctx, PAD, fy - 38, 44)
  ctx.font = font(700, 30, fonts.code)
  ctx.fillStyle = C.pink
  ctx.fillText(input.url, PAD + 60, fy - 4)
}

/** Draws the list in the page's own typefaces and hands it over (share sheet, else a download). */
export async function shareListImage(input: ListImageInput): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const style = getComputedStyle(document.documentElement)
  const fonts = {
    ui: style.getPropertyValue('--font-ui').trim() || 'system-ui, sans-serif',
    code: style.getPropertyValue('--font-code').trim() || 'ui-monospace, monospace',
  }
  const sample = [input.title, input.subtitle, ...input.rows.map((r) => r.title)].join(' ')
  await Promise.all([
    document.fonts.load(font(900, 92, fonts.ui), sample),
    document.fonts.load(font(600, 28, fonts.ui), sample),
    document.fonts.load(font(800, 30, fonts.code), 'ABCD10001'),
  ]).catch(() => undefined)
  const canvas = document.createElement('canvas')
  drawListImage(canvas, input, fonts)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG failed'))), 'image/png'))
  return downloadOrShare(blob, listImageFileName(input.site, input.title, input.subtitle), input.site)
}

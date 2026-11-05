/**
 * A ranked list (the easiest or hardest subjects) as an A4 picture to share or print, laid out
 * like a league table: the site's mark and name, the title, how the list is ranked, then one row
 * per subject: its place, a coloured tag for its area, code and name, five fact columns, and a
 * second line with its English name and why it's there. Deep plum with the site's pink and
 * violet; the address at the bottom so a passed-around screenshot says where it's from.
 * Made on a <canvas> in the browser; nothing is uploaded.
 */
import { downloadOrShare } from './planImage'

export interface ListImageRow {
  code: string
  title: string
  /** The second line: the English name (when the title is a translation) and why it's listed. */
  sub: string
  /** One cell per column, already formatted ("S1 · S2", "1", "40%"). */
  stats: string[]
}

export interface ListImageInput {
  site: string
  url: string
  title: string
  subtitle: string
  /** How the list is ranked, one sentence under the title. */
  lede: string
  /** The fact columns' headings, one per stat cell. */
  columns: string[]
  rows: ListImageRow[]
  /** The last line: check with the official Handbook. */
  note: string
}

// A4 portrait (1 : √2), so it prints whole as well as showing on a phone.
export const LIST_IMAGE_WIDTH = 1240
export const LIST_IMAGE_HEIGHT = 1754

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

  const PAD = 72
  ctx.textBaseline = 'alphabetic'

  // Header: the mark and the site's name, the title, the degree and year in pink, how it's ranked.
  drawMark(ctx, PAD, 60, 56)
  ctx.font = font(750, 28, fonts.ui)
  ctx.fillStyle = C.ink
  ctx.fillText(input.site, PAD + 72, 98)
  let size = 64
  do ctx.font = font(900, size, fonts.ui)
  while (ctx.measureText(input.title).width > W - PAD * 2 && (size -= 4) >= 40)
  ctx.fillText(fit(ctx, input.title, W - PAD * 2), PAD, 196)
  ctx.font = font(700, 28, fonts.ui)
  ctx.fillStyle = C.pink
  ctx.fillText(fit(ctx, input.subtitle, W - PAD * 2), PAD, 244)
  ctx.font = font(500, 21, fonts.ui)
  ctx.fillStyle = C.soft
  ctx.fillText(fit(ctx, input.lede, W - PAD * 2), PAD, 282)

  // Columns: the stat cells on the right, each centred on its x; widths from the widest cell.
  const statFont = font(700, 20, fonts.ui)
  const headFont = font(700, 16, fonts.ui)
  const widths = input.columns.map((c, k) => {
    ctx.font = headFont
    let w = ctx.measureText(c).width
    ctx.font = statFont
    for (const r of input.rows) w = Math.max(w, ctx.measureText(r.stats[k] ?? '').width)
    return w + 22
  })
  const right = W - PAD
  const centres: number[] = []
  let x = right
  for (let k = widths.length - 1; k >= 0; k--) {
    centres[k] = x - widths[k]! / 2
    x -= widths[k]!
  }
  const statsLeft = x
  const top = 336
  ctx.font = headFont
  ctx.fillStyle = C.faint
  ctx.textAlign = 'center'
  input.columns.forEach((c, k) => ctx.fillText(c, centres[k]!, top))
  ctx.textAlign = 'left'

  const footH = 120
  const tableTop = top + 18
  const gap = 6
  const rowH = Math.min(84, Math.floor((H - footH - tableTop - gap * input.rows.length) / Math.max(1, input.rows.length)))
  input.rows.forEach((r, i) => {
    const y = tableTop + i * (rowH + gap)
    ctx.beginPath()
    ctx.roundRect(PAD - 14, y, W - PAD * 2 + 28, rowH, 14)
    ctx.fillStyle = i < 3 ? C.podium : i % 2 ? C.rowB : C.rowA
    ctx.fill()
    const line1 = y + rowH * 0.44
    const line2 = y + rowH * 0.8
    // Place.
    ctx.font = font(900, 26, fonts.ui)
    ctx.fillStyle = i < 3 ? C.pink : C.ink
    ctx.textAlign = 'right'
    ctx.fillText(String(i + 1), PAD + 34, y + rowH / 2 + 9)
    ctx.textAlign = 'left'
    // The area's tag, like a club crest.
    const tagX = PAD + 48
    ctx.beginPath()
    ctx.roundRect(tagX, y + (rowH - 36) / 2, 44, 36, 10)
    ctx.fillStyle = areaColour(r.code)
    ctx.fill()
    ctx.font = font(800, 13, fonts.code)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.fillText(r.code.slice(0, 4), tagX + 22, y + rowH / 2 + 5)
    ctx.textAlign = 'left'
    // Code and name, then the second line.
    const textX = tagX + 60
    const textMax = statsLeft - 16 - textX
    ctx.font = font(800, 22, fonts.code)
    ctx.fillStyle = C.ink
    ctx.fillText(r.code, textX, line1)
    const codeW = ctx.measureText(r.code).width
    ctx.font = font(650, 22, fonts.ui)
    ctx.fillText(fit(ctx, r.title, textMax - codeW - 12), textX + codeW + 12, line1)
    ctx.font = font(500, 16, fonts.ui)
    ctx.fillStyle = C.faint
    ctx.fillText(fit(ctx, r.sub, textMax), textX, line2)
    // Facts.
    ctx.font = statFont
    ctx.fillStyle = C.ink
    ctx.textAlign = 'center'
    r.stats.forEach((v, k) => ctx.fillText(v, centres[k]!, y + rowH / 2 + 7))
    ctx.textAlign = 'left'
  })

  // Footer: the mark and address, and the reminder to check the Handbook.
  const fy = H - footH + 24
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.fillRect(PAD, fy, W - PAD * 2, 2)
  drawMark(ctx, PAD, fy + 26, 40)
  ctx.font = font(700, 24, fonts.code)
  ctx.fillStyle = C.pink
  ctx.fillText(input.url, PAD + 54, fy + 54)
  ctx.font = font(500, 18, fonts.ui)
  ctx.fillStyle = C.faint
  ctx.textAlign = 'right'
  ctx.fillText(fit(ctx, input.note, W - PAD * 2 - 520), W - PAD, fy + 52)
  ctx.textAlign = 'left'
}

/** Draws the list in the page's own typefaces and hands it over (share sheet, else a download). */
export async function shareListImage(input: ListImageInput): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const style = getComputedStyle(document.documentElement)
  const fonts = {
    ui: style.getPropertyValue('--font-ui').trim() || 'system-ui, sans-serif',
    code: style.getPropertyValue('--font-code').trim() || 'ui-monospace, monospace',
  }
  const sample = [input.title, input.subtitle, input.lede, ...input.rows.map((r) => `${r.title} ${r.sub}`)].join(' ')
  await Promise.all([
    document.fonts.load(font(900, 64, fonts.ui), sample),
    document.fonts.load(font(650, 22, fonts.ui), sample),
    document.fonts.load(font(800, 22, fonts.code), 'ABCD10001'),
  ]).catch(() => undefined)
  const canvas = document.createElement('canvas')
  drawListImage(canvas, input, fonts)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG failed'))), 'image/png'))
  return downloadOrShare(blob, listImageFileName(input.site, input.title, input.subtitle), input.site)
}

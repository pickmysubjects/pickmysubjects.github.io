/**
 * A ranked list (the easiest or hardest subjects) as an A4 picture to share or print, laid out
 * like a league table: the site's mark and name, the title, the degree and year, then one row
 * per subject: its place, a coloured tag for its area, code and name, its official (English) name
 * under it, and the fact columns. Facts only, every word in full: text wraps, never "…". Deep plum with the site's pink and
 * violet; the address at the bottom so a passed-around screenshot says where it's from.
 * Made on a <canvas> in the browser; nothing is uploaded.
 */
import { downloadOrShare, wrapText } from './planImage'

export interface ListImageRow {
  code: string
  title: string
  /** The official (English) name, when the title shown is a translation; '' otherwise. */
  sub: string
  /** One cell per column, already formatted ("S1 · S2", "1", "40%"). */
  stats: string[]
}

export interface ListImageInput {
  site: string
  url: string
  title: string
  subtitle: string
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

/** Lines of `text` in `f` no wider than `max`: breaks at spaces (or between CJK characters), never cut. */
function lines(ctx: CanvasRenderingContext2D, text: string, max: number, f: string): string[] {
  if (!text) return []
  return wrapText(text, max, f, (t, ff) => {
    ctx.font = ff
    return ctx.measureText(t).width
  })
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

  // Header: the mark and the site's name, the title (as large as fits, then wrapped), the degree and year.
  drawMark(ctx, PAD, 60, 56)
  ctx.font = font(750, 28, fonts.ui)
  ctx.fillStyle = C.ink
  ctx.fillText(input.site, PAD + 72, 98)
  let size = 64
  do ctx.font = font(900, size, fonts.ui)
  while (ctx.measureText(input.title).width > W - PAD * 2 && (size -= 4) >= 44)
  let y = 150
  for (const l of lines(ctx, input.title, W - PAD * 2, font(900, size, fonts.ui))) {
    ctx.font = font(900, size, fonts.ui)
    ctx.fillStyle = C.ink
    y += size
    ctx.fillText(l, PAD, y)
  }
  for (const l of lines(ctx, input.subtitle, W - PAD * 2, font(700, 28, fonts.ui))) {
    ctx.font = font(700, 28, fonts.ui)
    ctx.fillStyle = C.pink
    y += 40
    ctx.fillText(l, PAD, y)
  }

  // Columns: the fact cells on the right, each centred. A cell wider than CELL_MAX wraps at its
  // " · " separators; a heading wraps to its column's width rather than widening it.
  const statFont = font(700, 19, fonts.ui)
  const headFont = font(700, 15, fonts.ui)
  const CELL_MAX = 120
  const cellLines = (v: string): string[] => {
    ctx.font = statFont
    if (ctx.measureText(v).width <= CELL_MAX) return [v]
    const out: string[] = []
    for (const part of v.split(' · ')) {
      const last = out.at(-1)
      if (last !== undefined && ctx.measureText(`${last} · ${part}`).width <= CELL_MAX) out[out.length - 1] = `${last} · ${part}`
      else out.push(part)
    }
    return out
  }
  const cells = input.rows.map((r) => r.stats.map(cellLines))
  const widths = input.columns.map((c, k) => {
    // At least the heading's longest word, so a heading wraps between words, never inside one.
    ctx.font = headFont
    let w = Math.max(44, ...c.split(/\s+/).map((word) => ctx.measureText(word).width))
    ctx.font = statFont
    for (const row of cells) for (const l of row[k] ?? []) w = Math.max(w, ctx.measureText(l).width)
    return w + 22
  })
  const heads = input.columns.map((c, k) => lines(ctx, c, widths[k]! - 8, headFont))
  const centres: number[] = []
  let x = W - PAD
  for (let k = widths.length - 1; k >= 0; k--) {
    centres[k] = x - widths[k]! / 2
    x -= widths[k]!
  }
  const statsLeft = x
  const headLines = Math.max(1, ...heads.map((h) => h.length))
  const top = y + 40 + headLines * 18
  ctx.font = headFont
  ctx.fillStyle = C.faint
  ctx.textAlign = 'center'
  heads.forEach((h, k) => h.forEach((l, j) => ctx.fillText(l, centres[k]!, top - (h.length - 1 - j) * 18)))
  ctx.textAlign = 'left'

  // Each row's lines worked out first, so a long name wraps and the row grows with it.
  const tagX = PAD + 48
  const textX = tagX + 60
  const textMax = statsLeft - 16 - textX
  const codeFont = font(800, 21, fonts.code)
  const titleFont = font(650, 21, fonts.ui)
  const subFont = font(500, 16, fonts.ui)
  const laid = input.rows.map((r, i) => {
    ctx.font = codeFont
    const codeW = ctx.measureText(r.code).width + 12
    // The name beside the code when it fits on that line; otherwise under it, at full width.
    const beside = lines(ctx, r.title, textMax - codeW, titleFont).length === 1
    const title = beside ? [r.title] : lines(ctx, r.title, textMax, titleFont)
    const sub = lines(ctx, r.sub, textMax, subFont)
    const statH = Math.max(...cells[i]!.map((c) => c.length)) * 24
    const textH = (beside ? 0 : 28) + title.length * 28 + sub.length * 21
    return { r, i, codeW, beside, title, sub, h: 24 + Math.max(textH, statH) }
  })
  const footH = 120
  const gap = 6
  const tableTop = top + 16
  ctx.textBaseline = 'alphabetic'
  let rowY = tableTop
  for (const [i, { r, codeW, beside, title, sub, h }] of laid.entries()) {
    // A row that would run into the footer ends the list there (a short list rather than a cut
    // one), so a shorter row after it never shows with a number skipped.
    if (rowY + h > H - footH) break
    ctx.beginPath()
    ctx.roundRect(PAD - 14, rowY, W - PAD * 2 + 28, h, 14)
    ctx.fillStyle = i < 3 ? C.podium : i % 2 ? C.rowB : C.rowA
    ctx.fill()
    const mid = rowY + h / 2
    ctx.font = font(900, 26, fonts.ui)
    ctx.fillStyle = i < 3 ? C.pink : C.ink
    ctx.textAlign = 'right'
    ctx.fillText(String(i + 1), PAD + 34, mid + 9)
    ctx.textAlign = 'left'
    ctx.beginPath()
    ctx.roundRect(tagX, mid - 18, 44, 36, 10)
    ctx.fillStyle = areaColour(r.code)
    ctx.fill()
    ctx.font = font(800, 13, fonts.code)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.fillText(r.code.slice(0, 4), tagX + 22, mid + 5)
    ctx.textAlign = 'left'
    let ty = rowY + 12
    ctx.font = codeFont
    ctx.fillStyle = C.ink
    ctx.fillText(r.code, textX, ty + 22)
    if (!beside) ty += 28
    ctx.font = titleFont
    for (const l of title) {
      ty += 28
      ctx.fillText(l, beside ? textX + codeW : textX, ty - 6)
    }
    ctx.font = subFont
    ctx.fillStyle = C.faint
    for (const l of sub) {
      ty += 21
      ctx.fillText(l, textX, ty - 2)
    }
    ctx.font = statFont
    ctx.fillStyle = C.ink
    ctx.textAlign = 'center'
    cells[i]!.forEach((c, k) => c.forEach((l, j) => ctx.fillText(l, centres[k]!, mid + 7 + (j - (c.length - 1) / 2) * 24)))
    ctx.textAlign = 'left'
    rowY += h + gap
  }

  // Footer: the mark and address, and the reminder to check the Handbook (wrapped, never cut).
  const fy = H - footH + 24
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.fillRect(PAD, fy, W - PAD * 2, 2)
  drawMark(ctx, PAD, fy + 26, 40)
  ctx.font = font(700, 24, fonts.code)
  ctx.fillStyle = C.pink
  ctx.fillText(input.url, PAD + 54, fy + 54)
  const noteLines = lines(ctx, input.note, 520, font(500, 17, fonts.ui))
  ctx.font = font(500, 17, fonts.ui)
  ctx.fillStyle = C.faint
  ctx.textAlign = 'right'
  noteLines.forEach((l, i) => ctx.fillText(l, W - PAD, fy + 52 - (noteLines.length - 1 - i) * 22))
  ctx.textAlign = 'left'
}

/** Draws the list in the page's own typefaces and hands it over (share sheet, else a download). */
export async function shareListImage(input: ListImageInput): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const style = getComputedStyle(document.documentElement)
  const fonts = {
    ui: style.getPropertyValue('--font-ui').trim() || 'system-ui, sans-serif',
    code: style.getPropertyValue('--font-code').trim() || 'ui-monospace, monospace',
  }
  const sample = [input.title, input.subtitle, ...input.rows.map((r) => `${r.title} ${r.sub}`)].join(' ')
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

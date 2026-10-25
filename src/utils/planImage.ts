/**
 * The plan as a picture to share (a phone-sized PNG made on a <canvas>, in the browser; nothing
 * is uploaded). Only the plan goes in it: degree, major, each semester's subjects and the rule
 * check. Never marks, WAM or anything else from the student's record.
 *
 * `planImageLayout` is pure: it turns the plan into boxes and lines of text at fixed positions,
 * measuring text with the function it's given, so it can be tested without a browser.
 * `renderPlanImage` then paints those onto a canvas.
 */

export const IMAGE_WIDTH = 1080
/** At least 3:4, the shape 小红书 and most phones show whole; taller when the plan needs it. */
export const IMAGE_MIN_HEIGHT = 1440

/** The light theme's colours (src/assets/main.css), so the picture looks like the site. */
export const IMAGE_COLOURS = {
  bg: '#fafaf9',
  card: '#ffffff',
  line: '#e7e5e4',
  ink: '#0b0b0c',
  inkSoft: '#5d5d63',
  accent: '#c2227a',
  accentSoft: '#fbe9f2',
  good: '#1f8a52',
  goodSoft: '#e5f4ec',
  warn: '#a96a00',
  warnSoft: '#fdf2dc',
  bad: '#c0352b',
  badSoft: '#fbe7e5',
} as const

export type Tone = 'good' | 'warn' | 'bad'

export interface PlanImageInput {
  site: string // "PickMySubjects"
  url: string // shown at the bottom, without https://
  course: string
  major: string
  status: { text: string; tone: Tone }
  terms: { label: string; subjects: { code: string; title: string }[] }[]
}

export interface Fonts {
  ui: string // a CSS font-family list
  code: string
}

export type Op =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number; fill: string; stroke?: string }
  | { kind: 'text'; x: number; y: number; text: string; font: string; colour: string }

export interface PlanImageLayout {
  width: number
  height: number
  ops: Op[]
}

/** Width of `text` drawn in `font` (a CSS font shorthand), in pixels. */
export type Measure = (text: string, font: string) => number

const PAD = 64
const CJK = /[⺀-鿿가-힯豈-﫿＀-￯]/

/**
 * Splits text into lines no wider than `max`. Words break at spaces; Chinese, Japanese and Korean
 * break between characters; a word too long for a line on its own is cut between characters.
 * With `maxLines`, the last line kept ends in "…" when text is left over.
 */
export function wrapText(text: string, max: number, font: string, measure: Measure, maxLines = Infinity): string[] {
  const tokens = text.match(new RegExp(`${CJK.source}|[^\\s\\u2e80-\\u9fff\\uac00-\\ud7af\\uf900-\\ufaff\\uff00-\\uffef]+\\s*|\\s+`, 'g')) ?? []
  const lines: string[] = []
  let line = ''
  const push = () => {
    if (line.trim()) lines.push(line.trimEnd())
    line = ''
  }
  for (const tok of tokens) {
    if (measure(line + tok.trimEnd(), font) <= max) {
      line += tok
      continue
    }
    if (line.trim()) push()
    if (/^\s+$/.test(tok)) continue
    if (measure(tok.trimEnd(), font) <= max) {
      line = tok
      continue
    }
    for (const ch of tok) {
      if (measure(line + ch, font) > max && line) push()
      line += ch
    }
  }
  push()
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]!
  while (last && measure(`${last}…`, font) > max) last = [...last].slice(0, -1).join('')
  kept[maxLines - 1] = `${last.trimEnd()}…`
  return kept
}

const font = (weight: number, size: number, family: string) => `${weight} ${size}px ${family}`

/** Lays the plan out on a 1080-wide portrait page: header, status, one card per semester, footer. */
export function planImageLayout(input: PlanImageInput, measure: Measure, fonts: Fonts): PlanImageLayout {
  const C = IMAGE_COLOURS
  const ops: Op[] = []
  const inner = IMAGE_WIDTH - PAD * 2
  let y = PAD

  const text = (x: number, t: string, f: string, colour: string, lineHeight: number, max: number, maxLines?: number) => {
    for (const l of wrapText(t, max, f, measure, maxLines)) {
      ops.push({ kind: 'text', x, y: y + lineHeight * 0.78, text: l, font: f, colour })
      y += lineHeight
    }
  }

  // Header: the site, then the degree in large type and the major under it.
  text(PAD, input.site, font(700, 30, fonts.ui), C.accent, 40, inner)
  y += 12
  text(PAD, input.course, font(800, 56, fonts.ui), C.ink, 68, inner, 3)
  if (input.major) {
    y += 4
    text(PAD, input.major, font(500, 34, fonts.ui), C.inkSoft, 46, inner, 3)
  }

  // The rule check, in its tone.
  y += 28
  const tone: readonly [string, string] = ({ good: [C.good, C.goodSoft], warn: [C.warn, C.warnSoft], bad: [C.bad, C.badSoft] } as const)[input.status.tone]
  const statusFont = font(650, 30, fonts.ui)
  const statusLines = wrapText(input.status.text, inner - 56, statusFont, measure, 2)
  const statusH = statusLines.length * 40 + 32
  ops.push({ kind: 'rect', x: PAD, y, w: inner, h: statusH, r: 20, fill: tone[1] })
  ops.push({ kind: 'rect', x: PAD + 24, y: y + statusH / 2 - 8, w: 16, h: 16, r: 8, fill: tone[0] })
  const statusTop = y
  y += 16
  for (const l of statusLines) {
    ops.push({ kind: 'text', x: PAD + 56, y: y + 40 * 0.78, text: l, font: statusFont, colour: tone[0] })
    y += 40
  }
  y = statusTop + statusH + 36

  // One card per semester: its label, then each subject's code and short title.
  const codeFont = font(700, 30, fonts.code)
  const titleFont = font(500, 30, fonts.ui)
  const labelFont = font(750, 32, fonts.ui)
  const codeW = Math.max(...input.terms.flatMap((t) => t.subjects.map((s) => measure(s.code, codeFont))), 0) + 28
  for (const term of input.terms) {
    const top = y
    const at = ops.length
    y += 28
    text(PAD + 32, term.label, labelFont, C.accent, 42, inner - 64)
    y += 6
    for (const [i, s] of term.subjects.entries()) {
      if (i > 0) {
        ops.push({ kind: 'rect', x: PAD + 32, y: y + 6, w: inner - 64, h: 2, r: 0, fill: C.line })
        y += 14
      }
      const rowTop = y
      ops.push({ kind: 'text', x: PAD + 32, y: y + 42 * 0.78, text: s.code, font: codeFont, colour: C.ink })
      text(PAD + 32 + codeW, s.title, titleFont, C.inkSoft, 42, inner - 64 - codeW, 2)
      y = Math.max(y, rowTop + 42)
    }
    y += 24
    ops.splice(at, 0, { kind: 'rect', x: PAD, y: top, w: inner, h: y - top, r: 24, fill: C.card, stroke: C.line })
    y += 24
  }

  // Footer: where it was made, and the address (pinned to the bottom of a short page).
  const footerH = 40 + 44 + PAD
  const height = Math.max(IMAGE_MIN_HEIGHT, Math.ceil(y + 24 + footerH))
  y = height - footerH
  ops.push({ kind: 'rect', x: PAD, y: y - 24, w: inner, h: 2, r: 0, fill: C.line })
  text(PAD, input.site, font(750, 32, fonts.ui), C.ink, 40, inner)
  text(PAD, input.url, font(500, 30, fonts.code), C.accent, 44, inner)

  return { width: IMAGE_WIDTH, height, ops }
}

/** Paints a layout onto a canvas (sized to it). */
export function renderPlanImage(layout: PlanImageLayout, canvas: HTMLCanvasElement): void {
  canvas.width = layout.width
  canvas.height = layout.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D canvas')
  ctx.fillStyle = IMAGE_COLOURS.bg
  ctx.fillRect(0, 0, layout.width, layout.height)
  ctx.textBaseline = 'alphabetic'
  for (const op of layout.ops) {
    if (op.kind === 'rect') {
      ctx.beginPath()
      ctx.roundRect(op.x, op.y, op.w, op.h, op.r)
      ctx.fillStyle = op.fill
      ctx.fill()
      if (op.stroke) {
        ctx.strokeStyle = op.stroke
        ctx.lineWidth = 2
        ctx.stroke()
      }
    } else {
      ctx.font = op.font
      ctx.fillStyle = op.colour
      ctx.fillText(op.text, op.x, op.y)
    }
  }
}

/**
 * Makes the PNG in the page's own typefaces (waiting for them to load) and hands it over: the
 * share sheet when the device can share files, otherwise a download. Returns how it went.
 */
export async function sharePlanImage(input: PlanImageInput, fileName: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const style = getComputedStyle(document.documentElement)
  const fonts: Fonts = {
    ui: style.getPropertyValue('--font-ui').trim() || 'system-ui, sans-serif',
    code: style.getPropertyValue('--font-code').trim() || 'ui-monospace, monospace',
  }
  const sample = [input.course, input.major, ...input.terms.flatMap((t) => t.subjects.map((s) => s.title))].join(' ')
  await Promise.all([
    document.fonts.load(font(500, 30, fonts.ui), sample),
    document.fonts.load(font(800, 56, fonts.ui), sample),
    document.fonts.load(font(700, 30, fonts.code), 'ABCD10001'),
  ]).catch(() => undefined)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D canvas')
  const measure: Measure = (t, f) => {
    ctx.font = f
    return ctx.measureText(t).width
  }
  renderPlanImage(planImageLayout(input, measure, fonts), canvas)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG failed'))), 'image/png'))
  const file = new File([blob], fileName, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: input.site })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      // Sharing refused (no user gesture left, say): fall back to saving it.
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  return 'downloaded'
}

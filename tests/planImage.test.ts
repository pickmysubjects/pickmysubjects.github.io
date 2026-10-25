import { describe, expect, it } from 'vitest'
import { IMAGE_MIN_HEIGHT, IMAGE_WIDTH, planImageLayout, wrapText, type Measure, type PlanImageInput } from '../src/utils/planImage'

// A fixed-width stand-in for canvas text measuring: CJK characters are twice as wide.
const measure: Measure = (text, font) => {
  const size = Number(/(\d+)px/.exec(font)?.[1] ?? 16)
  return [...text].reduce((w, ch) => w + (/[⺀-鿿]/.test(ch) ? size : size * 0.5), 0)
}
const fonts = { ui: 'sans-serif', code: 'monospace' }

const input = (terms = 6, per = 4): PlanImageInput => ({
  site: 'PickMySubjects',
  url: 'pickmysubjects.github.io',
  course: 'Bachelor of Science',
  major: 'Computing and Software Systems',
  status: { text: 'Your plan meets every rule we know about.', tone: 'good' },
  terms: Array.from({ length: terms }, (_, i) => ({
    label: `${2026 + Math.floor(i / 2)} Sem ${(i % 2) + 1}`,
    subjects: Array.from({ length: per }, (_, j) => ({ code: `COMP${10001 + i * 10 + j}`, title: 'Foundations of Computing' })),
  })),
})

const texts = (l: ReturnType<typeof planImageLayout>) => l.ops.flatMap((o) => (o.kind === 'text' ? [o.text] : []))

describe('wrapText', () => {
  it('breaks words at spaces and CJK between characters', () => {
    expect(wrapText('aaaa bbbb cccc', 50, '20px x', measure)).toEqual(['aaaa', 'bbbb', 'cccc'])
    expect(wrapText('计算基础入门', 40, '20px x', measure)).toEqual(['计算', '基础', '入门'])
  })
  it('ends the last kept line with … when there is more', () => {
    const lines = wrapText('one two three four five six', 80, '20px x', measure, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1]!.endsWith('…')).toBe(true)
  })
})

describe('planImageLayout', () => {
  it('is phone-portrait: 1080 wide, at least 3:4, taller for a long plan', () => {
    const short = planImageLayout(input(1, 1), measure, fonts)
    expect(short.width).toBe(IMAGE_WIDTH)
    expect(short.height).toBe(IMAGE_MIN_HEIGHT)
    const long = planImageLayout(input(8, 4), measure, fonts)
    expect(long.height).toBeGreaterThan(IMAGE_MIN_HEIGHT)
  })

  it('has the degree, major, status, every term and subject, and the site and address at the bottom', () => {
    const l = planImageLayout(input(), measure, fonts)
    const all = texts(l)
    for (const t of ['Bachelor of Science', 'Computing and Software Systems', 'Your plan meets every rule we know about.', '2026 Sem 1', 'COMP10001', 'COMP10054', 'pickmysubjects.github.io']) expect(all).toContain(t)
    const last = l.ops.filter((o) => o.kind === 'text').at(-1)!
    expect(last.kind === 'text' && last.text).toBe('pickmysubjects.github.io')
    expect(last.y).toBeLessThanOrEqual(l.height)
  })

  it('keeps everything inside the page and in reading order', () => {
    const l = planImageLayout(input(8, 5), measure, fonts)
    for (const o of l.ops) {
      expect(o.x).toBeGreaterThanOrEqual(0)
      if (o.kind === 'rect') expect(o.x + o.w).toBeLessThanOrEqual(l.width)
      else expect(o.x + measure(o.text, o.font)).toBeLessThanOrEqual(l.width - 64 + 0.01)
      expect(o.y).toBeLessThan(l.height)
    }
    const codes = l.ops.flatMap((o) => (o.kind === 'text' && /^COMP\d{5}$/.test(o.text) ? [o.y] : []))
    expect(codes).toEqual([...codes].sort((a, b) => a - b))
  })

  it('wraps a long title to at most two lines', () => {
    const one = input(1, 1)
    one.terms[0]!.subjects[0]!.title = 'A very long subject title that goes on and on and on and on and on and on and on and on and on'
    const lines = texts(planImageLayout(one, measure, fonts)).filter((t) => t.startsWith('A very') || t.endsWith('…') || t.includes('on and'))
    expect(lines.length).toBe(2)
  })

  it('puts in nothing but what it is given (no marks or WAM)', () => {
    const all = texts(planImageLayout(input(), measure, fonts)).join(' ')
    expect(all).not.toMatch(/WAM|\b\d{2}\s*%/)
  })
})

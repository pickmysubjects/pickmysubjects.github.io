import { describe, expect, it } from 'vitest'
import { assessmentTimingTexts, parseHandbookPaste } from '../src/engine/handbookPaste'
import { normaliseTiming } from '../src/engine/timing'

describe('normaliseTiming (real Handbook cells)', () => {
  it.each([
    ['Week 6', { kind: 'week', from: 6 }],
    ['From Week 4 to Week 12', { kind: 'week', from: 4, to: 12 }],
    ['Weeks 6-8', { kind: 'week', from: 6, to: 8 }],
    ['Weeks 10 to 12', { kind: 'week', from: 10, to: 12 }],
    ['Weeks 3, 6, 9 and 12.', { kind: 'weeks', weeks: [3, 6, 9, 12] }],
    ['Week 7 and Week 12', { kind: 'weeks', weeks: [7, 12] }],
    ['Weeks 2, 4, 6, 8, 10 & 12', { kind: 'weeks', weeks: [2, 4, 6, 8, 10, 12] }],
    ['Throughout the teaching period', { kind: 'teaching' }],
    ['Throughout the semester', { kind: 'teaching' }],
    ['During the teaching period', { kind: 'teaching' }],
    ['Mid semester', { kind: 'mid' }],
    ['Mid-teaching period', { kind: 'mid' }],
    ['Early in the teaching period', { kind: 'early' }],
    ['Second half of the teaching period', { kind: 'late' }],
    ['End of the teaching period', { kind: 'end' }],
    ['During the examination period', { kind: 'exam' }],
    ['End of semester examination period', { kind: 'exam' }],
    ['During the assessment period', { kind: 'assessmentPeriod' }],
    ['2 Weeks after the end of teaching', { kind: 'afterTeaching', weeks: 2 }],
  ])('%s', (text, want) => {
    expect(normaliseTiming(text)).toEqual({ ...want, text })
  })

  it.each([
    'Week 14', // past the teaching weeks: we don't know which calendar week that is
    'Around week 10',
    'Week 4 or 5',
    'Provisionally Weeks 3, 6, and 9',
    'Day 10',
    'Weeks 3, 5, 7, 10, examination period',
    'From Week 9 to Week 4',
    '',
  ])('leaves "%s" unset', (text) => {
    expect(normaliseTiming(text)).toBeUndefined()
  })
})

describe('assessment table timing', () => {
  const page = [
    'You’re viewing the 2027 Handbook:',
    'Description\tTiming\tPercentage',
    'One 2-hour end-of-semester examination.',
    'Hurdle requirement: Yes.\tDuring the examination period\t50%',
    'A two-stage project.',
    '\tWeek 7 and Week 12\t20%',
    'One 1-hour mid-semester test.',
    '\tMid semester\t20%',
    'Weekly exercises.',
    '\tFrom Week 3 to Week 11\t10%',
  ].join('\n')

  it('reads each row’s timing cell, in order', () => {
    expect(assessmentTimingTexts(page)).toEqual(['During the examination period', 'Week 7 and Week 12', 'Mid semester', 'From Week 3 to Week 11'])
  })

  it('puts the normalised timing on the parsed tasks', () => {
    const tasks = parseHandbookPaste(page).assessment
    expect(tasks).not.toBe('unknown')
    if (tasks === 'unknown') return
    expect(tasks.map((t) => [t.weight, t.timing?.kind])).toEqual([
      [50, 'exam'],
      [20, 'weeks'],
      [20, 'mid'],
      [10, 'week'],
    ])
  })
})

describe('Handbook words we cannot read for sure', () => {
  it('are quoted as they are, sorted after dated tasks and never placed on a week', async () => {
    const { timingLabel, timingOrder, dueSegments, spanSegments } = await import('../src/utils/taskTiming')
    const { semesterShape } = await import('../src/utils/semester')
    const { KEY_DATES } = await import('../src/utils/keyDates')
    const other = { kind: 'other' as const, text: 'Week 4 or 5' }
    const t = (k: string, p?: Record<string, unknown>) => (k === 'timing.handbookSays' ? `Handbook: ${p?.text}` : k)
    expect(timingLabel(t, other)).toBe('Handbook: Week 4 or 5')
    expect(timingOrder(other)).toBeGreaterThan(timingOrder({ kind: 'afterTeaching', weeks: 3, text: 'x' }))
    const sem = semesterShape(KEY_DATES, 2027, 'semester-1')!
    expect(dueSegments(other, sem)).toEqual([])
    expect(spanSegments(other, sem)).toEqual([])
  })
})

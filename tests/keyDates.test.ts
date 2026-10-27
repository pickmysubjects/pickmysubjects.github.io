import { describe, expect, it } from 'vitest'
import { buildIcs, groupKeyDates, KEY_DATE_KINDS, KEY_DATE_TERMS, KEY_DATES, nextDay, REENROL_SOURCE } from '@/utils/keyDates'

const ISO = /^\d{4}-\d{2}-\d{2}$/

describe('key dates data', () => {
  it('every item is well formed: real dates, start before end, known kind/term, official link', () => {
    for (const d of KEY_DATES) {
      expect(d.start, d.id).toMatch(ISO)
      expect(d.end, d.id).toMatch(ISO)
      expect(Number.isNaN(Date.parse(d.start)), d.id).toBe(false)
      expect(d.start <= d.end, d.id).toBe(true)
      expect(KEY_DATE_KINDS).toContain(d.kind)
      expect(KEY_DATE_TERMS).toContain(d.term)
      expect(d.url).toMatch(/^https:\/\/students\.unimelb\.edu\.au\//)
    }
  })
  it('ids are unique', () => {
    expect(new Set(KEY_DATES.map((d) => d.id)).size).toBe(KEY_DATES.length)
  })
  it('has the standard census dates for 2026 and none guessed for 2027', () => {
    const census = KEY_DATES.filter((d) => d.kind === 'census')
    expect(census.map((d) => d.start)).toEqual(['2026-03-31', '2026-08-31'])
  })
  it('Employability Week links to its own page', () => {
    const e = KEY_DATES.filter((d) => d.kind === 'employability')
    expect(e.map((d) => d.start)).toEqual(['2026-03-16', '2026-08-10', '2027-03-15', '2027-08-09'])
    expect(e.every((d) => d.url.endsWith('/careers/employability-week'))).toBe(true)
  })
})

describe('2027 re-enrolment', () => {
  const re = KEY_DATES.filter((d) => d.kind === 'reenrol' || d.kind === 'reenrolLate')
  it('has the on-time and late periods from the re-enrol page, in the Summer Term 2027 group', () => {
    expect(re.map((d) => [d.kind, d.start, d.end])).toEqual([
      ['reenrol', '2026-11-16', '2026-12-14'],
      ['reenrolLate', '2026-12-15', '2027-01-13'],
    ])
    expect(re.every((d) => d.year === 2027 && d.term === 'summer')).toBe(true)
    expect(re.every((d) => d.url === REENROL_SOURCE)).toBe(true)
  })
  it('the late period starts the day after the on-time one ends', () => {
    expect(nextDay(re[0]!.end)).toBe(re[1]!.start)
  })
  it('sits in date order in the Summer Term 2027 group', () => {
    const g = groupKeyDates(KEY_DATES, '2026-10-26').upcoming.find((x) => x.year === 2027 && x.term === 'summer')!
    expect(g.items.map((i) => i.kind)).toEqual(['reenrol', 'teaching', 'reenrolLate', 'exams'])
  })
  it('goes into the calendar file as all-day events with the re-enrol link', () => {
    const ics = buildIcs(re, (d) => d.kind)
    expect(ics).toContain('UID:2027-summer-reenrol@pickmysubjects.github.io')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261116\r\nDTEND;VALUE=DATE:20261215')
    expect(ics).toContain('UID:2027-summer-reenrolLate@pickmysubjects.github.io')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261215\r\nDTEND;VALUE=DATE:20270114')
    expect(ics).toContain(`URL:${REENROL_SOURCE}`)
  })
})

describe('groupKeyDates', () => {
  it('puts terms with anything left first, marks finished items past, and keeps fully past terms of this year apart', () => {
    const { upcoming, past } = groupKeyDates(KEY_DATES, '2026-10-23')
    expect(upcoming[0]).toMatchObject({ year: 2026, term: 'semester-2' })
    const s2 = upcoming[0]!.items
    expect(s2.find((i) => i.kind === 'census')!.past).toBe(true)
    expect(s2.find((i) => i.kind === 'exams')!.past).toBe(false)
    // A range that is still going on is not past.
    expect(s2.find((i) => i.kind === 'teaching')!.past).toBe(false)
    expect(upcoming.map((g) => `${g.year} ${g.term}`)).toContain('2027 summer')
    expect(past.map((g) => `${g.year} ${g.term}`)).toEqual(['2026 winter', '2026 semester-1', '2026 summer'])
  })
  it('the last day of a range still counts as upcoming', () => {
    const { upcoming } = groupKeyDates(KEY_DATES, '2026-10-25')
    expect(upcoming[0]!.items.find((i) => i.kind === 'teaching')!.past).toBe(false)
  })
})

describe('buildIcs', () => {
  const ics = buildIcs(KEY_DATES.filter((d) => d.id === '2026-semester-2-exams' || d.id === '2026-semester-2-census'), (d) => `Label, ${d.kind}`)
  it('writes all-day events with an exclusive end date', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261102\r\nDTEND;VALUE=DATE:20261121')
    expect(ics).toContain('DTSTART;VALUE=DATE:20260831\r\nDTEND;VALUE=DATE:20260901')
  })
  it('gives each event a stable UID and escapes text', () => {
    expect(ics).toContain('UID:2026-semester-2-exams@pickmysubjects.github.io')
    expect(ics).toContain('SUMMARY:Label\\, exams')
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
  })
  it('rolls over month and year ends', () => {
    expect(nextDay('2026-12-31')).toBe('2027-01-01')
    expect(nextDay('2028-02-28')).toBe('2028-02-29')
  })
})

describe('key dates source files', () => {
  it('the app reads exactly what data/real/keyDates/*.yaml says', async () => {
    const { buildKeyDates } = await import('../scripts/keyDates')
    const built = buildKeyDates(process.cwd())
    expect(built.errors).toEqual([])
    expect(built.dates).toEqual(KEY_DATES)
  })
  it('rejects a row without a source, a reversed range or an impossible day', async () => {
    const { keyDatesFileSchema } = await import('@/utils/keyDatesSchema')
    const row = { kind: 'census', term: 'semester-1', start: '2026-03-31', source: 'https://students.unimelb.edu.au/x' }
    const file = (d: object) => ({ year: 2026, checked: '2026-10-23', dates: [d] })
    expect(keyDatesFileSchema.safeParse(file(row)).success).toBe(true)
    expect(keyDatesFileSchema.safeParse(file({ ...row, source: undefined })).success).toBe(false)
    expect(keyDatesFileSchema.safeParse(file({ ...row, end: '2026-03-01' })).success).toBe(false)
    expect(keyDatesFileSchema.safeParse(file({ ...row, start: '2026-02-30' })).success).toBe(false)
  })
})

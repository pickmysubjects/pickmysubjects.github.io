import { describe, expect, it } from 'vitest'
import { addDays, cleanRevision, cleanRevisionStore, dayLoad, defaultStart, examPeriod, revisionTerms, planRevision, revisionIcs, sessionTimes, subjectWeight, type RevisionInput, type RevisionPlan, type RevisionSubject } from '../src/engine/revisionPlan'

const sub = (code: string, exam: string, extra: Partial<RevisionSubject> = {}): RevisionSubject => ({ code, exam, difficulty: 'average', ...extra })
const hoursOf = (p: RevisionPlan, code: string) => p.totals.find((t) => t.code === code)?.hours ?? 0
const four: RevisionInput = {
  start: '2026-10-26',
  hoursPerDay: 6,
  restWeekdays: [0],
  subjects: [sub('COMP10001', '2026-11-04', { difficulty: 'harder', examWeight: 60 }), sub('MAST10006', '2026-11-06', { examWeight: 60 }), sub('BIOL10004', '2026-11-12', { difficulty: 'easier', examWeight: 50 }), sub('UNIB10002', '2026-11-13', { examWeight: 0 })],
}

/** The rules every plan keeps, whatever the input. */
function checkInvariants(input: RevisionInput, p: RevisionPlan) {
  const limit = input.hoursPerDay == null ? 7 : Math.floor(Math.min(input.hoursPerDay, 16) * 2) / 2
  for (const d of p.days) {
    const sum = d.sessions.reduce((t, s) => t + s.hours, 0)
    expect(sum).toBeLessThanOrEqual(limit)
    if (d.kind !== 'study') expect(d.sessions).toEqual([])
    for (const s of d.sessions) {
      const exam = input.subjects.find((x) => x.code === s.code)!.exam
      expect(d.date < exam, `${s.code} on ${d.date} is after its exam`).toBe(true)
      expect(s.hours * 2).toBe(Math.round(s.hours * 2))
    }
    expect(d.sessions.length).toBeLessThanOrEqual(3)
  }
  const sum = p.totals.reduce((t, x) => t + x.hours, 0)
  expect(sum).toBe(p.days.flatMap((d) => d.sessions).reduce((t, s) => t + s.hours, 0))
}

describe('planRevision', () => {
  it('plans every day from the start to the last exam, the days in order without gaps', () => {
    const p = planRevision(four)
    expect(p.days[0]!.date).toBe('2026-10-26')
    expect(p.days.at(-1)!.date).toBe('2026-11-13')
    p.days.forEach((d, i) => i && expect(d.date).toBe(addDays(p.days[i - 1]!.date, 1)))
    checkInvariants(four, p)
  })

  it('never goes over the hours given, and gives all of them the day before an exam', () => {
    const p = planRevision(four)
    for (const d of p.days.filter((d) => d.kind === 'study' && d.sessions.length)) expect(d.sessions.reduce((t, s) => t + s.hours, 0)).toBeLessThanOrEqual(6)
    expect(p.days.find((d) => d.date === '2026-11-03')!.sessions.reduce((t, s) => t + s.hours, 0)).toBe(6)
  })

  it('keeps exam days and rest days free', () => {
    const p = planRevision(four)
    expect(p.days.find((d) => d.date === '2026-11-04')!.kind).toBe('exam')
    expect(p.days.find((d) => d.date === '2026-11-01')!.kind).toBe('rest') // a Sunday
    expect(p.days.filter((d) => d.kind !== 'study').every((d) => !d.sessions.length)).toBe(true)
  })

  it('gives the last free day before each exam to that subject', () => {
    const p = planRevision(four)
    const only = (date: string) => p.days.find((d) => d.date === date)!.sessions
    expect(only('2026-11-03')).toEqual([{ code: 'COMP10001', hours: 6, focus: true }])
    expect(only('2026-11-05')).toEqual([{ code: 'MAST10006', hours: 6, focus: true }])
    expect(only('2026-11-11')).toEqual([{ code: 'BIOL10004', hours: 6, focus: true }])
    // The 12th is BIOL's exam; UNIB's day before that is the 10th.
    expect(only('2026-11-10')).toEqual([{ code: 'UNIB10002', hours: dayLoad(2, 6), focus: true }])
  })

  it('gives a harder subject with a bigger exam more time than an easier one on the same date', () => {
    const p = planRevision({ start: '2026-10-20', hoursPerDay: 4, subjects: [sub('AAAA10001', '2026-11-10', { difficulty: 'easier', examWeight: 30 }), sub('BBBB10001', '2026-11-10', { difficulty: 'harder', examWeight: 70 })] })
    expect(hoursOf(p, 'BBBB10001')).toBeGreaterThan(hoursOf(p, 'AAAA10001'))
    expect(hoursOf(p, 'AAAA10001')).toBeGreaterThan(0)
  })

  it('gives an earlier exam more of the shared days than a later one, all else equal', () => {
    const p = planRevision({ start: '2026-10-20', hoursPerDay: 4, subjects: [sub('AAAA10001', '2026-11-20'), sub('BBBB10001', '2026-11-02')] })
    const early = p.days.filter((d) => d.date < '2026-11-01').flatMap((d) => d.sessions)
    const h = (c: string) => early.filter((s) => s.code === c && !s.focus).reduce((t, s) => t + s.hours, 0)
    expect(h('BBBB10001')).toBeGreaterThan(h('AAAA10001'))
    checkInvariants({ start: '2026-10-20', hoursPerDay: 4, subjects: [sub('AAAA10001', '2026-11-20'), sub('BBBB10001', '2026-11-02')] }, p)
  })

  it('shares the day before two exams on the same day', () => {
    const p = planRevision({ start: '2026-11-01', hoursPerDay: 5, subjects: [sub('AAAA10001', '2026-11-05'), sub('BBBB10001', '2026-11-05', { difficulty: 'harder' })] })
    const eve = p.days.find((d) => d.date === '2026-11-04')!.sessions
    expect(eve.map((s) => s.code).sort()).toEqual(['AAAA10001', 'BBBB10001'])
    expect(eve.every((s) => s.focus)).toBe(true)
    expect(eve.reduce((t, s) => t + s.hours, 0)).toBe(5)
    expect(p.days.find((d) => d.date === '2026-11-05')!.exams).toEqual(['AAAA10001', 'BBBB10001'])
  })

  it('leaves out an exam on or before the start date, and one with no date yet', () => {
    const p = planRevision({ start: '2026-11-05', hoursPerDay: 4, subjects: [sub('AAAA10001', '2026-11-01'), sub('BBBB10001', '2026-11-05'), sub('CCCC10001', ''), sub('DDDD10001', '2026-11-09')] })
    expect(p.skipped).toEqual([
      { code: 'AAAA10001', why: 'pastExam' },
      { code: 'BBBB10001', why: 'pastExam' },
      { code: 'CCCC10001', why: 'noDate' },
    ])
    expect(p.totals).toEqual([{ code: 'DDDD10001', hours: [6, 7, 8].map((d) => dayLoad(9 - d, 4)).reduce((a, b) => a + b) + dayLoad(4, 4) }])
  })

  it('plans nothing with zero hours, but still shows the days', () => {
    const p = planRevision({ ...four, hoursPerDay: 0 })
    expect(p.empty).toBe(true)
    expect(p.days.length).toBe(19)
    expect(p.totals.every((t) => t.hours === 0)).toBe(true)
  })

  it('treats nonsense hours as zero and caps a day at 16', () => {
    expect(planRevision({ ...four, hoursPerDay: Number.NaN }).empty).toBe(true)
    expect(planRevision({ ...four, hoursPerDay: -3 }).empty).toBe(true)
    const p = planRevision({ ...four, hoursPerDay: 40 })
    expect(Math.max(...p.days.map((d) => d.sessions.reduce((t, s) => t + s.hours, 0)))).toBe(16)
  })

  it('rounds hours down to half hours', () => {
    const p = planRevision({ ...four, hoursPerDay: 2.9 })
    checkInvariants({ ...four, hoursPerDay: 2.5 }, p)
    expect(p.days.find((d) => d.date === '2026-11-03')!.sessions[0]!.hours).toBe(2.5)
  })

  it('plans one subject on every free day before its exam', () => {
    const p = planRevision({ start: '2026-11-01', hoursPerDay: 3, subjects: [sub('AAAA10001', '2026-11-06')] })
    expect(p.days.filter((d) => d.sessions.length).map((d) => d.date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'])
    expect(p.totals).toEqual([{ code: 'AAAA10001', hours: [5, 4, 3, 2, 1].map((d) => dayLoad(d, 3)).reduce((a, b) => a + b) }])
  })

  it('handles many subjects: at most three a day, and every subject gets time', () => {
    const subjects = Array.from({ length: 10 }, (_, i) => sub(`ABCD1000${i}`, addDays('2026-11-03', i * 2)))
    const input = { start: '2026-10-19', hoursPerDay: 8, restWeekdays: [6], subjects }
    const p = planRevision(input)
    checkInvariants(input, p)
    expect(p.totals.every((t) => t.hours > 0)).toBe(true)
  })

  it('a half-hour day still has one subject only', () => {
    const p = planRevision({ ...four, hoursPerDay: 0.5 })
    for (const d of p.days) expect(d.sessions.length).toBeLessThanOrEqual(1)
  })

  it('keeps rest days even when every day is one', () => {
    const p = planRevision({ ...four, restWeekdays: [0, 1, 2, 3, 4, 5, 6] })
    expect(p.empty).toBe(true)
    expect(p.days.filter((d) => d.kind === 'study')).toEqual([])
  })

  it('counts each day once across the daylight-saving changes (October and April)', () => {
    const oct = planRevision({ start: '2026-10-01', hoursPerDay: 2, subjects: [sub('AAAA10001', '2026-10-10')] })
    expect(oct.days.map((d) => d.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'])
    const apr = planRevision({ start: '2027-04-01', hoursPerDay: 2, subjects: [sub('AAAA10001', '2027-04-07')] })
    expect(apr.days.map((d) => d.date)).toEqual(['2027-04-01', '2027-04-02', '2027-04-03', '2027-04-04', '2027-04-05', '2027-04-06', '2027-04-07'])
    expect(apr.days.find((d) => d.date === '2027-04-04')!.kind).toBe('study')
  })

  it('is deterministic and keeps the first of a repeated subject', () => {
    expect(planRevision(four)).toEqual(planRevision(structuredClone(four)))
    const dup = planRevision({ ...four, subjects: [...four.subjects, sub('COMP10001', '2026-11-30')] })
    expect(dup.days.at(-1)!.date).toBe('2026-11-13')
    expect(dup.totals.length).toBe(4)
  })

  it('weights by difficulty and exam share', () => {
    expect(subjectWeight({ difficulty: 'average' })).toBe(1)
    expect(subjectWeight({ difficulty: 'average', examWeight: 50 })).toBe(1)
    expect(subjectWeight({ difficulty: 'harder', examWeight: 70 })).toBeCloseTo(1.56)
    expect(subjectWeight({ difficulty: 'easier', examWeight: 0 })).toBeCloseTo(0.4)
  })
})

describe('revisionIcs', () => {
  const text = { session: (c: string, f: boolean) => `${f ? 'Final review' : 'Revise'} ${c}`, exam: (c: string) => `Exam: ${c}`, reminder: 'Study, soon' }
  const subjects = [sub('AAAA10001', '2026-10-06', { time: '13:30' }), sub('BBBB10001', '2026-10-07')]
  const p = planRevision({ start: '2026-10-02', hoursPerDay: 3, subjects })
  const ics = revisionIcs(p, subjects, '09:00', text, new Date('2026-10-01T00:00:00Z'))

  it('is a calendar with the Melbourne time zone and local times that stay put across the October change', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('TZID:Australia/Melbourne')
    expect(ics).toContain('RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=1SU')
    // 3 and 5 October sit either side of the change; both sessions start at 09:00 local.
    expect(ics).toContain('DTSTART;TZID=Australia/Melbourne:20261003T090000')
    expect(ics).toContain('DTSTART;TZID=Australia/Melbourne:20261005T090000')
  })

  it('has one event per session and per exam, each with a reminder', () => {
    const sessions = p.days.flatMap((d) => d.sessions).length
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBe(sessions + 2)
    expect(ics.match(/BEGIN:VALARM/g)!.length).toBe(sessions + 2)
    expect(ics).toContain('SUMMARY:Exam: AAAA10001')
    expect(ics).toContain('DTSTART;TZID=Australia/Melbourne:20261006T133000')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261007')
    expect(ics).toContain('DESCRIPTION:Study\\, soon')
    expect(ics).toContain('DTSTAMP:20261001T000000Z')
  })

  it('puts sessions back to back and never past midnight', () => {
    const day = { date: '2026-10-02', kind: 'study' as const, exams: [], sessions: [{ code: 'A', hours: 2, focus: false }, { code: 'B', hours: 3, focus: false }] }
    expect(sessionTimes(day, '21:00').map((x) => [x.from, x.to])).toEqual([[1260, 1380], [1380, 1439]])
  })
})

describe('cleanRevision', () => {
  it('keeps what is valid and drops the rest', () => {
    const r = cleanRevision({ subjects: [{ code: 'COMP10001', exam: '2026-11-04', time: '25:00', difficulty: 'harder' }, { code: 'bad' }, null], start: '2026-02-30', hoursPerDay: 7.3, dayStart: '08:30', restWeekdays: [0, 0, 9, 6], edited: true })
    expect(r).toEqual({ subjects: [{ code: 'COMP10001', exam: '2026-11-04', difficulty: 'harder' }], start: '', hoursPerDay: 7, dayStart: '08:30', restWeekdays: [0, 6], edited: true })
    expect(cleanRevision('junk').subjects).toEqual([])
  })
})

describe('backup', () => {
  it('carries the revision planner', async () => {
    const { makeBackup, restoreBackup } = await import('../src/utils/backup')
    const store = new Map<string, string>()
    const ls = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
    ;(globalThis as { localStorage?: unknown }).localStorage = ls
    store.set('sc:revision', JSON.stringify({ subjects: [{ code: 'COMP10001', exam: '2026-11-04' }], start: '2026-10-26', hoursPerDay: 5, dayStart: '09:00', restWeekdays: [0], edited: true }))
    const file = makeBackup(new Date('2026-10-29T00:00:00Z'))
    store.clear()
    expect(restoreBackup(file)).toBe(true)
    expect(JSON.parse(store.get('sc:revision')!).terms.legacy.hoursPerDay).toBe(5)
    delete (globalThis as { localStorage?: unknown }).localStorage
  })
})

describe('exam periods', () => {
  // Real key dates, as the page uses them.
  const dates = async () => (await import('../src/utils/keyDates')).KEY_DATES

  it('takes each term window from the key dates: SWOT Vac to the last exam, or the end of an intensive term', async () => {
    const d = await dates()
    expect(examPeriod(d, 2026, 'semester-2')).toEqual({ from: '2026-10-26', examsStart: '2026-11-02', end: '2026-11-20', earliest: '2026-11-02' })
    expect(examPeriod(d, 2027, 'summer')).toEqual({ from: '2027-02-15', examsStart: '2027-02-15', end: '2027-02-22', earliest: '2026-11-23' })
    // Winter has no exam period of its own: the last two weeks of teaching.
    expect(examPeriod(d, 2027, 'winter')).toEqual({ from: '2027-07-12', examsStart: '2027-07-12', end: '2027-07-25', earliest: '2027-06-28' })
    expect(examPeriod(d, 2031, 'semester-1')).toBeNull()
  })

  it('starts today inside the window, else on its first day', async () => {
    const d = await dates()
    expect(defaultStart(examPeriod(d, 2026, 'semester-2'), '2026-10-29')).toBe('2026-10-29')
    expect(defaultStart(examPeriod(d, 2026, 'semester-2'), '2026-09-01')).toBe('2026-10-26')
    expect(defaultStart(examPeriod(d, 2027, 'semester-1'), '2026-10-29')).toBe('2027-05-31')
    expect(defaultStart(null, '2026-10-29')).toBe('2026-10-29')
  })

  it('lists the terms with exams still ahead, summer and winter included, in calendar order, merging plan and record', async () => {
    const d = await dates()
    const terms = revisionTerms(
      [
        { year: 2027, period: 'winter', subjects: ['CCCC30001'] },
        { year: 2026, period: 'semester-1', subjects: ['OLDD10001'] },
        { year: 2027, period: 'summer', subjects: ['BBBB20001'] },
        { year: 2026, period: 'semester-2', subjects: ['AAAA20001'] },
        { year: 2026, period: 'semester-2', subjects: ['RECD20001', 'AAAA20001'] }, // from the record
        { year: 2027, period: 'semester-1', subjects: [] },
      ],
      d,
      '2026-10-29',
    )
    expect(terms.map((t) => `${t.year}-${t.period}`)).toEqual(['2026-semester-2', '2027-summer', '2027-winter'])
    expect(terms[0]!.subjects).toEqual(['AAAA20001', 'RECD20001'])
  })

  it('keeps each term its own saved plan, and gives an old single plan to the first term opened', () => {
    const store = cleanRevisionStore({
      term: '2027-summer',
      terms: { '2026-semester-2': { subjects: [{ code: 'AAAA20001', exam: '2026-11-04' }], hoursPerDay: 5 }, '2027-summer': { subjects: [{ code: 'BBBB20001', exam: '2027-02-16', noExam: false }] }, 'nonsense': {} },
    })
    expect(Object.keys(store.terms)).toEqual(['2026-semester-2', '2027-summer'])
    expect(store.terms['2026-semester-2']!.subjects[0]!.exam).toBe('2026-11-04')
    expect(store.terms['2027-summer']!.subjects[0]!.exam).toBe('2027-02-16')
    expect(store.terms['2027-summer']!.hoursPerDay).toBeNull()
    expect(store.term).toBe('2027-summer')
    const old = cleanRevisionStore({ subjects: [{ code: 'AAAA20001', exam: '2026-11-04' }], start: '2026-10-26', hoursPerDay: 6, dayStart: '09:00', restWeekdays: [], edited: false })
    expect(old.terms.legacy!.hoursPerDay).toBe(6)
    expect(cleanRevisionStore(null)).toEqual({ terms: {}, term: '' })
  })
})

describe('several exams in one period', () => {
  const five: RevisionInput = {
    start: '2026-10-29',
    hoursPerDay: null,
    restWeekdays: [0],
    subjects: [
      sub('AAAA20001', '2026-11-04', { examWeight: 60 }),
      sub('BBBB20001', '2026-11-04', { difficulty: 'harder', examWeight: 50 }), // same day
      sub('CCCC20001', '2026-11-05'), // the next day
      sub('DDDD20001', '2026-11-10', { difficulty: 'easier', examWeight: 40 }),
      sub('EEEE20001', '2026-11-18', { examWeight: 70 }),
    ],
  }

  it('plans all five within the rules: at most three a day, nothing after an exam, every one gets time', () => {
    const p = planRevision(five)
    checkInvariants(five, p)
    expect(p.totals.map((x) => x.code)).toEqual(five.subjects.map((s) => s.code))
    expect(p.totals.every((x) => x.hours > 0)).toBe(true)
    expect(p.days.find((d) => d.date === '2026-11-04')!.exams).toEqual(['AAAA20001', 'BBBB20001'])
  })

  it('gives exams a day apart their own last free days, earlier exams choosing first', () => {
    const p = planRevision(five)
    const focus = (date: string) => p.days.find((d) => d.date === date)!.sessions.filter((s) => s.focus).map((s) => s.code)
    expect(focus('2026-11-03')).toEqual(['AAAA20001', 'BBBB20001'])
    expect(focus('2026-11-02')).toEqual(['CCCC20001'])
    expect(focus('2026-11-09')).toEqual(['DDDD20001'])
  })

  it('leaves out a subject with no final exam, without flagging it, and flags one with no date yet', () => {
    const p = planRevision({ ...five, subjects: [...five.subjects, sub('FFFF20001', '', { noExam: true }), sub('GGGG20001', '')] })
    expect(p.skipped).toEqual([{ code: 'FFFF20001', why: 'noExam' }, { code: 'GGGG20001', why: 'noDate' }])
    expect(p.days.flatMap((d) => d.sessions).some((s) => s.code === 'FFFF20001' || s.code === 'GGGG20001')).toBe(false)
  })

  it('plans a summer term: a short window and one exam at the end of the intensive', () => {
    const input = { start: '2027-02-15', hoursPerDay: null, subjects: [sub('BBBB20001', '2027-02-19'), sub('CCCC20001', '', { noExam: true })] }
    const p = planRevision(input)
    checkInvariants(input, p)
    expect(p.days.map((d) => d.date)).toEqual(['2027-02-15', '2027-02-16', '2027-02-17', '2027-02-18', '2027-02-19'])
    expect(p.totals).toEqual([{ code: 'BBBB20001', hours: [4, 3, 2, 1].map((d) => dayLoad(d)).reduce((a, b) => a + b) }])
  })
})

describe('daily load', () => {
  it('without hours: rises toward each exam, light far out, at most 7', () => {
    const loads = Array.from({ length: 20 }, (_, i) => dayLoad(20 - i))
    loads.forEach((h, i) => i && expect(h).toBeGreaterThanOrEqual(loads[i - 1]!))
    expect(loads[0]).toBe(2.5)
    expect(dayLoad(1)).toBe(7)
    expect(Math.max(...loads)).toBeLessThanOrEqual(7)
    const p = planRevision({ start: '2026-10-20', hoursPerDay: null, subjects: [sub('AAAA10001', '2026-11-10')] })
    const day = p.days.filter((d) => d.sessions.length).map((d) => d.sessions.reduce((t, s) => t + s.hours, 0))
    day.forEach((h, i) => i && expect(h).toBeGreaterThanOrEqual(day[i - 1]!))
  })

  it('with hours: never above them, the day before an exam gets all of them, far days a lighter share', () => {
    expect(dayLoad(1, 5)).toBe(5)
    expect(dayLoad(30, 5)).toBe(3)
    for (let d = 1; d < 30; d++) expect(dayLoad(d, 5)).toBeLessThanOrEqual(5)
    expect(dayLoad(3, 0)).toBe(0)
  })

  it('exports sessions as all-day events when there is no start time', () => {
    const subjects = [sub('AAAA10001', '2026-10-06')]
    const p = planRevision({ start: '2026-10-03', hoursPerDay: 3, subjects })
    const ics = revisionIcs(p, subjects, '', { session: (c, f, h) => `Revise ${c}${h ? ` ${h}h` : ''}`, exam: (c) => `Exam: ${c}`, reminder: 'Soon' }, new Date('2026-10-01T00:00:00Z'))
    expect(ics).not.toContain('DTSTART;TZID')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261003')
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBe(p.days.flatMap((d) => d.sessions).length + 1)
    expect(ics).toContain('SUMMARY:Revise AAAA10001 3h')
  })
})

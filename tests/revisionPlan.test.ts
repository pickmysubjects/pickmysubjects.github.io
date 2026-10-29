import { describe, expect, it } from 'vitest'
import { addDays, cleanRevision, planRevision, revisionIcs, sessionTimes, subjectWeight, type RevisionInput, type RevisionPlan, type RevisionSubject } from '../src/engine/revisionPlan'

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
  const limit = Math.floor(Math.min(input.hoursPerDay, 16) * 2) / 2
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

  it('fills each study day up to the hours given', () => {
    const p = planRevision(four)
    for (const d of p.days.filter((d) => d.kind === 'study' && d.sessions.length)) expect(d.sessions.reduce((t, s) => t + s.hours, 0)).toBe(6)
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
    expect(only('2026-11-10')).toEqual([{ code: 'UNIB10002', hours: 6, focus: true }])
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
    expect(p.totals).toEqual([{ code: 'DDDD10001', hours: 16 }])
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
    expect(p.totals).toEqual([{ code: 'AAAA10001', hours: 15 }])
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
    expect(JSON.parse(store.get('sc:revision')!).hoursPerDay).toBe(5)
    delete (globalThis as { localStorage?: unknown }).localStorage
  })
})

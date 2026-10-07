import { describe, expect, it } from 'vitest'
import { aggregate, COLUMNS, rowsToObjects } from '../scripts/ratings/aggregate'

const header = Object.values(COLUMNS)
function row(over: Partial<Record<keyof typeof COLUMNS, string>> = {}): string[] {
  const base: Record<keyof typeof COLUMNS, string> = {
    timestamp: '2026/10/07 10:00:00',
    code: 'COMP30027',
    year: '2025',
    semester: 'Semester 1',
    difficulty: '4',
    workload: '4',
    generosity: '3',
    hours: '10',
    grade: 'H1',
    skills: 'maths, programming',
    recommend: 'Yes',
    examDifficulty: '',
    usefulness: '',
    interest: '',
    teaching: '',
  }
  return (Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]).map((k) => over[k] ?? base[k])
}

describe('aggregate ratings', () => {
  const now = new Date('2026-10-07')

  it('averages scores, takes the median hours and the recommend rate', () => {
    const values = [
      header,
      row(),
      row({ timestamp: 't2', difficulty: '2', workload: '3', generosity: '5', hours: '6', recommend: 'No', skills: 'maths' }),
      row({ timestamp: 't3', difficulty: '3', hours: '20', grade: 'Prefer not to say', skills: 'writing' }),
    ]
    const { subjects } = aggregate(rowsToObjects(values), now)
    expect(subjects.COMP30027).toEqual({
      reviews: 3,
      difficulty: 3,
      workload: 3.7,
      grading: 3.7,
      hoursMedian: 10,
      recommendRate: 0.7,
      skills: ['maths'], // programming was ticked by 1 of 3, below the 50% bar
      examDifficulty: null,
      usefulness: null,
      interest: null,
      teaching: null,
    })
  })

  it('publishes an optional question only once enough people answered it', () => {
    const two = [row({ timestamp: 'a', usefulness: '5' }), row({ timestamp: 'b', usefulness: '4' }), row({ timestamp: 'c', hours: '3' })]
    expect(aggregate(rowsToObjects([header, ...two]), now).subjects.COMP30027?.usefulness).toBeNull()
    const three = [...two, row({ timestamp: 'd', usefulness: '3', teaching: '9' })]
    const out = aggregate(rowsToObjects([header, ...three]), now).subjects.COMP30027
    expect(out?.usefulness).toBe(4)
    expect(out?.teaching).toBeNull() // 9 is out of range, so nobody really answered
  })

  it('one extreme rating among several honest ones barely moves the scores', () => {
    const honest = Array.from({ length: 8 }, (_, i) => row({ timestamp: `t${i}`, hours: String(8 + i), difficulty: '3', generosity: '4' }))
    const angry = row({ timestamp: 'tx', hours: '30', difficulty: '5', generosity: '1', recommend: 'No' })
    const { subjects } = aggregate(rowsToObjects([header, ...honest, angry]), now)
    expect(subjects.COMP30027?.reviews).toBe(9)
    expect(subjects.COMP30027?.difficulty).toBe(3) // a plain mean would give 3.2
    expect(subjects.COMP30027?.grading).toBe(4) // a plain mean would give 3.7
  })

  it('rejects malformed rows and counts identical resubmissions once', () => {
    const values = [
      header,
      row(),
      row(), // exact duplicate (same timestamp too)
      row({ timestamp: 'later' }), // identical answers resubmitted later
      row({ code: 'not a code' }),
      row({ timestamp: 'empty', difficulty: '', workload: '', generosity: '', hours: '', skills: '', recommend: '' }), // answers nothing
      row({ year: '2099' }),
    ]
    const result = aggregate(rowsToObjects(values), now)
    expect(result.accepted).toBe(1)
    expect(result.rejected).toBe(5)
  })

  it('takes partial answers: a blank year or question is fine, an out-of-range answer is ignored', () => {
    const partial = [
      row({ timestamp: 'a', year: '', semester: '', difficulty: '', generosity: '', workload: '2' }),
      row({ timestamp: 'b', difficulty: '9', workload: '3' }), // 9 isn't on the scale
      row({ timestamp: 'c', difficulty: '', workload: '4' }),
    ]
    const out = aggregate(rowsToObjects([header, ...partial]), now).subjects.COMP30027
    expect(out?.reviews).toBe(3)
    expect(out?.workload).toBe(3)
    expect(out?.difficulty).toBeNull() // nobody gave a valid difficulty
  })

  it('publishes nothing about a subject until 3 people rated it, and never grade bands', () => {
    const two = [row({ timestamp: 'a' }), row({ timestamp: 'b', hours: '4' })]
    expect(aggregate(rowsToObjects([header, ...two]), now).subjects.COMP30027).toBeUndefined()
    const out = aggregate(rowsToObjects([header, ...two, row({ timestamp: 'c', hours: '5' })]), now).subjects.COMP30027
    expect(out?.reviews).toBe(3)
    expect(JSON.stringify(out)).not.toMatch(/H1|grade/i)
  })

  it('ignores codes that are not in the dataset and caps a burst on one day', () => {
    const known = new Set(['COMP30027'])
    const fake = [1, 2, 3].map((i) => row({ code: 'ZZZZ10001', timestamp: `f${i}` }))
    expect(aggregate(rowsToObjects([header, ...fake]), now, known).subjects.ZZZZ10001).toBeUndefined()
    const burst = Array.from({ length: 30 }, (_, i) => row({ timestamp: `2026/10/07 10:${String(i).padStart(2, '0')}:00`, hours: String(i + 1) }))
    expect(aggregate(rowsToObjects([header, ...burst]), now, known).subjects.COMP30027?.reviews).toBe(10)
  })

  it('never outputs free text or anything beyond aggregates', () => {
    const values = [[...header, 'What I wish I knew', 'Contact'], [...row(), 'secret text', 'me@example.com']]
    const json = JSON.stringify(aggregate(rowsToObjects(values), now))
    expect(json).not.toContain('secret text')
    expect(json).not.toContain('@')
  })
})

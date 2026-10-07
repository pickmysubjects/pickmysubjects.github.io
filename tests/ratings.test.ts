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
      grades: { H1: 2 },
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
      row({ difficulty: '9' }),
      row({ year: '2099' }),
    ]
    const result = aggregate(rowsToObjects(values), now)
    expect(result.subjects.COMP30027?.reviews).toBe(1)
    expect(result.rejected).toBe(5)
  })

  it('never outputs free text or anything beyond aggregates', () => {
    const values = [[...header, 'What I wish I knew', 'Contact'], [...row(), 'secret text', 'me@example.com']]
    const json = JSON.stringify(aggregate(rowsToObjects(values), now))
    expect(json).not.toContain('secret text')
    expect(json).not.toContain('@')
  })
})

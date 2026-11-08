import { describe, expect, it } from 'vitest'
import { pickText } from '../src/utils/majorPick'

const t = (key: string, p: Record<string, string | number> = {}) => `${key} ${JSON.stringify(p)}`
const subjects = { A: { points: 12.5 }, B: { points: 12.5 }, C: { points: 25 }, M: { points: 6.25 } } as never

describe('how a choose-from-a-list group is said', () => {
  it('counts subjects when every one on the list is 12.5 points', () => {
    expect(pickText(t, 'majors.sumPick', { points: 25, from: ['A', 'B'] }, subjects)).toBe('majors.sumPick {"n":2,"of":2}')
  })
  it('says points when the list mixes sizes, since no subject count is fixed', () => {
    expect(pickText(t, 'majors.sumPick', { points: 25, from: ['A', 'C'] }, subjects)).toBe('majors.sumPickPts {"pts":25,"of":2}')
    expect(pickText(t, 'majors.tagPick', { points: 75, from: ['M', 'A'] }, subjects, { g: 'B' })).toBe('majors.tagPickPts {"g":"B","pts":75,"of":2}')
  })
})

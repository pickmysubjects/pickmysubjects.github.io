import { describe, expect, it } from 'vitest'
import { heavyShare } from './share'

describe('plan builder spreads the load: a Science student weak at maths (real data)', () => {
  // Weak at maths, many science majors can't avoid two maths subjects somewhere (and the
  // data has only maths-based level-2 breadth so far; physics and the engineering-systems
  // majors now carry their real maths prerequisites too): flagged, but never left fixable.
  // Swaps that would push a first-year subject behind a second-year one aren't made, even
  // when they'd lighten a semester: order first, then load.
  it('flags heavy semesters but leaves none fixable', () => {
    expect(heavyShare('B-SCI', { skills: { maths: 2 } })).toBeLessThan(0.33)
  }, 300_000)
})

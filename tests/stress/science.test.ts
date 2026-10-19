import { describe, expect, it } from 'vitest'
import { heavyShare } from './share'

describe('plan builder spreads the load: Bachelor of Science (real data)', () => {
  // Review summaries now flag real heavy subjects too, so a few more semesters carry a note.
  // Agricultural Science (added 2026-10-13) brings one more that no swap can fix: two of its
  // options carry six assessment tasks each and only run in Semester 1.
  // Points-of-field prerequisites ("12.5 points of level 1 or 2 Geography…", 2026-10-14) are now
  // checked and planned for, so geoscience plans carry the subjects they really need: one more.
  // The first Arts subjects (2026-10-16) bring ARTS20002, an open level-2 breadth subject many
  // science plans now take; it sits in a couple of semesters that were already busy.
  it('keeps heavy semesters rare across every major', () => {
    expect(heavyShare('B-SCI')).toBeLessThan(0.095)
  }, 300_000)
})

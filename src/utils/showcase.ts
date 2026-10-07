import type { Subject } from '@/engine'

// Familiar subjects to show off while the real dataset has few ratings.
const SHOWCASE = ['COMP30027', 'COMP10001', 'MAST10006', 'COMP20008', 'MAST30034', 'COMP20003']

/** Example subjects: most-rated first, then familiar ones, then catalogue order. */
export function exampleSubjects(subjects: Subject[], n: number): Subject[] {
  const rated = subjects.filter((s) => (s.signals?.reviews ?? 0) > 0).sort((a, b) => (b.signals?.reviews ?? 0) - (a.signals?.reviews ?? 0))
  const byCode = new Map(subjects.map((s) => [s.code, s]))
  const familiar = SHOWCASE.map((c) => byCode.get(c)).filter((s): s is Subject => s !== undefined)
  return [...new Set([...rated, ...familiar, ...subjects])].slice(0, n)
}

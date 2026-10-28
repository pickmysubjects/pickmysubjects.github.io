/** What a menu link into a missing part of a page says instead: the line, where to go, the link's name. */
export interface MissedHint {
  key: string
  to: string
  go: string
}

const HINTS: Record<string, MissedHint> = {
  rules: { key: 'menu.miss.plan', to: 'plan/', go: 'menu.myPlan' },
  heavy: { key: 'menu.miss.plan', to: 'plan/', go: 'menu.myPlan' },
  calendar: { key: 'menu.miss.plan', to: 'plan/', go: 'menu.myPlan' },
  'share-title': { key: 'menu.miss.grades', to: 'record/#sec-results', go: 'record.title' },
  'compare-title': { key: 'menu.miss.shortlist', to: 'subjects/', go: 'menu.allSubjects' },
}

/**
 * The hint for a missing anchor, from what the student has: with a plan, a missing heavy-semester
 * alert means nothing is heavy and a missing calendar means no published dates; a missing
 * comparison asks for what's short (no saved subjects, or just one). With two or more saved the
 * shortlist opens the comparison itself, so there's nothing to say. Exported for tests.
 */
export function missedHint(id: string | null, has: { plan: boolean; saved: number }): MissedHint | null {
  if (!id) return null
  if (id === 'heavy' && has.plan) return { key: 'menu.miss.noHeavy', to: 'plan/', go: 'menu.myPlan' }
  if (id === 'calendar' && has.plan) return { key: 'menu.miss.noDates', to: 'guide/key-dates/', go: 'guide.datesTitle' }
  if (id === 'compare-title' && has.saved >= 2) return null
  if (id === 'compare-title' && has.saved === 1) return { key: 'menu.miss.compareOne', to: 'subjects/', go: 'menu.allSubjects' }
  return HINTS[id] ?? null
}

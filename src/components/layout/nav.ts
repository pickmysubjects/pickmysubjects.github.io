import { Briefcase, Calculator, GraduationCap, Heart, House, Library, ListFilter, Route, User } from 'lucide-vue-next'
import type { View } from '@/composables/useView'

/** Shared by the header (desktop) and the bottom tab bar (phones). */
/** `also`: other pages the item stands for (majors sit with subjects, one tap apart). */
export const NAV_ITEMS: { view: View; key: string; icon: typeof House; also?: View[] }[] = [
  { view: 'home', key: 'nav.home', icon: House },
  // Looking a subject up needs no setup: open to everyone, and where search visitors land.
  { view: 'subjects', key: 'nav.browse', icon: ListFilter, also: ['majors', 'careers', 'tools'] },
  // Everything personal in one place, as two steps: my record, then the plan.
  { view: 'record', key: 'nav.record', icon: User, also: ['plan', 'shortlist'] },
]

/** The pages inside "Me", in order. */
export const MY_STEPS: { view: View; key: string; icon: typeof House }[] = [
  { view: 'record', key: 'record.title', icon: User },
  { view: 'plan', key: 'nav.plan', icon: Route },
  // Subjects saved to look at again (and compare): a tap away from the plan they may go into.
  { view: 'shortlist', key: 'shortlist.title', icon: Heart },
]

/** The ways in under "Browse": not a sequence, so shown without step numbers. */
export const BROWSE_STEPS: { view: View; key: string; icon: typeof House }[] = [
  { view: 'subjects', key: 'browse.switchSubjects', icon: Library },
  { view: 'majors', key: 'browse.switchMajors', icon: GraduationCap },
  { view: 'careers', key: 'browse.switchCareers', icon: Briefcase },
  // Calculators and ready-made lists, each a tap from the others.
  { view: 'tools', key: 'tools.nav', icon: Calculator },
]

/** The sub-pages shown next to a top-level item while you're inside it, and whether they're numbered steps. */
export function subNavFor(view: View): { parent: View; steps: typeof MY_STEPS; numbered: boolean } | null {
  if (MY_STEPS.some((x) => x.view === view)) return { parent: 'record', steps: MY_STEPS, numbered: true }
  if (BROWSE_STEPS.some((x) => x.view === view)) return { parent: 'subjects', steps: BROWSE_STEPS, numbered: false }
  return null
}

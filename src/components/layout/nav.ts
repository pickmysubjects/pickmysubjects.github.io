import { House, ListFilter, Route, Sparkles, User } from 'lucide-vue-next'
import type { View } from '@/composables/useView'

/** Shared by the header (desktop) and the bottom tab bar (phones). */
export const NAV_ITEMS: { view: View; key: string; icon: typeof House }[] = [
  // In the order a new student uses them: about me, then the plan, then suggestions.
  { view: 'home', key: 'nav.home', icon: House },
  // Looking a subject up needs no setup, so it sits before the three steps.
  { view: 'subjects', key: 'nav.browse', icon: ListFilter },
  { view: 'record', key: 'nav.record', icon: User },
  { view: 'plan', key: 'nav.plan', icon: Route },
  { view: 'recommend', key: 'nav.recommend', icon: Sparkles },
]

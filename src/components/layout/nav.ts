import { House, ListFilter, Route, Sparkles, User } from 'lucide-vue-next'
import type { View } from '@/composables/useView'

/** Shared by the header (desktop) and the bottom tab bar (phones). */
/** `also`: other pages the item stands for (majors sit with subjects, one tap apart). */
export const NAV_ITEMS: { view: View; key: string; icon: typeof House; also?: View[] }[] = [
  { view: 'home', key: 'nav.home', icon: House },
  // Looking a subject up needs no setup: open to everyone, and where search visitors land.
  { view: 'subjects', key: 'nav.browse', icon: ListFilter, also: ['majors'] },
  // Everything personal in one place, as three steps: my record, then the plan, then suggestions.
  { view: 'record', key: 'nav.record', icon: User, also: ['plan', 'recommend'] },
]

/** The steps inside "Me", in order. */
export const MY_STEPS: { view: View; key: string; icon: typeof House }[] = [
  { view: 'record', key: 'record.title', icon: User },
  { view: 'plan', key: 'nav.plan', icon: Route },
  { view: 'recommend', key: 'nav.recommend', icon: Sparkles },
]

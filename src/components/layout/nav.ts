import { House, Route, Sparkles, User } from 'lucide-vue-next'
import type { View } from '@/composables/useView'

/** Shared by the header (desktop) and the bottom tab bar (phones). */
export const NAV_ITEMS: { view: View; key: string; icon: typeof House }[] = [
  { view: 'home', key: 'nav.home', icon: House },
  { view: 'plan', key: 'nav.plan', icon: Route },
  { view: 'recommend', key: 'nav.recommend', icon: Sparkles },
  { view: 'record', key: 'nav.record', icon: User },
]

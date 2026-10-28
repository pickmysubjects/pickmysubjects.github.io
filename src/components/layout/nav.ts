import {
  BookOpen, Briefcase, Calculator, CalendarDays, CalendarPlus, ClipboardList, Columns2, Compass, DatabaseZap, FileX, Flame, Gauge, GraduationCap,
  Heart, HeartPulse, History, House, Info, Laptop, Layers, Library, LifeBuoy, ListChecks, ListFilter, MessageSquare, NotebookPen, Plane, Route,
  Save, Scale, Share2, Shapes, ShieldCheck, Snowflake, Sparkles, Sprout, TriangleAlert, User, Wrench,
} from 'lucide-vue-next'
import type { View } from '@/composables/useView'

type Icon = typeof House

/** One feature in a menu: its name, a one-line description, and the exact place it lives. */
export interface MenuItem {
  key: string
  desc: string
  /** Path after the language part, with any ?query or #anchor the feature needs. */
  to: string
  icon: Icon
}

export type Area = 'browse' | 'plan' | 'tools' | 'guide' | 'me' | 'about'

export interface MenuArea {
  area: Area
  key: string
  icon: Icon
  /** The area's own landing page: where its name in the header goes. */
  to: string
  items: MenuItem[]
  /**
   * Places the site search finds under this area but the menu doesn't list: Find subjects'
   * ready-made lists, which live as cards on its page, and the parts of the plan page.
   */
  searchOnly?: MenuItem[]
}

/**
 * Every feature, grouped the same way in the desktop menus and the phone sheet, so a student
 * finds a thing in one place whichever screen they're on.
 */
export const MENUS: MenuArea[] = [
  {
    area: 'browse',
    key: 'nav.browse',
    icon: ListFilter,
    to: 'subjects/',
    items: [
      { key: 'browse.switchSubjects', desc: 'menu.d.allSubjects', to: 'subjects/', icon: Library },
      { key: 'browse.switchMajors', desc: 'menu.d.majors', to: 'majors/', icon: GraduationCap },
      { key: 'browse.switchCareers', desc: 'menu.d.careers', to: 'careers/', icon: Briefcase },
    ],
    searchOnly: [
      { key: 'tools.easy', desc: 'menu.d.easy', to: 'subjects/easy/', icon: Scale },
      { key: 'tools.hard', desc: 'menu.d.hard', to: 'subjects/hard/', icon: Flame },
      { key: 'tools.noExam', desc: 'menu.d.noExam', to: 'subjects/no-exam/', icon: FileX },
      { key: 'tools.summerWinter', desc: 'menu.d.summerWinter', to: 'subjects/summer-winter/', icon: Snowflake },
      { key: 'tools.breadth', desc: 'menu.d.breadth', to: 'subjects/breadth/', icon: Shapes },
      { key: 'tools.firstSem', desc: 'menu.d.firstSem', to: 'subjects/first-semester/', icon: Sprout },
      { key: 'browse.preset.mine', desc: 'browse.presetDesc.mine', to: 'subjects/?mine=1', icon: Sparkles },
    ],
  },
  {
    area: 'plan',
    key: 'nav.plan',
    icon: Route,
    to: 'plan/',
    items: [
      { key: 'menu.myPlan', desc: 'menu.d.myPlan', to: 'plan/', icon: Route },
      { key: 'menu.compareAB', desc: 'menu.d.compareAB', to: 'plan/compare/', icon: Columns2 },
    ],
    // Parts of the plan page: found by the site search, landing on their place on the page.
    searchOnly: [
      { key: 'menu.rules', desc: 'menu.d.rules', to: 'plan/#rules', icon: ListChecks },
      { key: 'menu.heavy', desc: 'menu.d.heavy', to: 'plan/#heavy', icon: TriangleAlert },
      { key: 'menu.calendar', desc: 'menu.d.calendar', to: 'plan/#calendar', icon: CalendarPlus },
      { key: 'menu.sharePlan', desc: 'menu.d.sharePlan', to: 'plan/#share', icon: Share2 },
    ],
  },
  {
    area: 'tools',
    key: 'tools.nav',
    icon: Wrench,
    to: 'tools/',
    // Only tools that exist nowhere else on the site.
    items: [
      { key: 'calc.title', desc: 'menu.d.final', to: 'tools/final/', icon: Calculator },
      { key: 'tools.wam', desc: 'menu.d.wam', to: 'tools/wam/', icon: Gauge },
    ],
    // Found by the site search: the tools page itself, and comparing saved subjects on the shortlist.
    searchOnly: [
      { key: 'menu.allTools', desc: 'menu.d.allTools', to: 'tools/', icon: Layers },
      { key: 'tools.compare', desc: 'menu.d.compare', to: 'shortlist/#compare-title', icon: Columns2 },
    ],
  },
  {
    area: 'guide',
    key: 'guide.nav',
    icon: BookOpen,
    to: 'guide/',
    items: [
      { key: 'menu.guideHome', desc: 'menu.d.guideHome', to: 'guide/', icon: Compass },
      { key: 'guide.cat.basics.nav', desc: 'menu.d.basics', to: 'guide/basics/', icon: BookOpen },
      { key: 'guide.cat.systems.nav', desc: 'menu.d.systems', to: 'guide/systems/', icon: Laptop },
      { key: 'guide.cat.enrolling.nav', desc: 'menu.d.enrolling', to: 'guide/enrolling/', icon: ClipboardList },
      { key: 'guide.cat.semester.nav', desc: 'menu.d.semester', to: 'guide/semester/', icon: NotebookPen },
      { key: 'guide.cat.life.nav', desc: 'menu.d.life', to: 'guide/life/', icon: HeartPulse },
      { key: 'guide.cat.international.nav', desc: 'menu.d.international', to: 'guide/international/', icon: Plane },
      { key: 'guide.cat.help.nav', desc: 'menu.d.help', to: 'guide/help/', icon: LifeBuoy },
      { key: 'guide.datesTitle', desc: 'menu.d.keyDates', to: 'guide/key-dates/', icon: CalendarDays },
    ],
  },
  {
    area: 'me',
    key: 'nav.record',
    icon: User,
    to: 'record/',
    items: [
      { key: 'record.title', desc: 'menu.d.record', to: 'record/', icon: User },
      { key: 'shortlist.title', desc: 'menu.d.shortlist', to: 'shortlist/', icon: Heart },
    ],
    // Sections of My record, not pages of their own: found by the site search, landing on their place.
    searchOnly: [
      { key: 'menu.backup', desc: 'menu.d.backup', to: 'record/#sec-backup', icon: Save },
      { key: 'menu.gradeShare', desc: 'menu.d.gradeShare', to: 'record/#share-title', icon: Share2 },
    ],
  },
  {
    area: 'about',
    key: 'nav.about',
    icon: Info,
    to: 'about/',
    items: [
      { key: 'menu.aboutSite', desc: 'menu.d.aboutSite', to: 'about/', icon: Info },
      { key: 'menu.feedback', desc: 'menu.d.feedback', to: 'feedback/', icon: MessageSquare },
      { key: 'menu.contribute', desc: 'menu.d.contribute', to: 'contribute/', icon: DatabaseZap },
      { key: 'menu.changes', desc: 'menu.d.changes', to: 'changes/', icon: History },
      { key: 'menu.privacy', desc: 'menu.d.privacy', to: 'privacy/', icon: ShieldCheck },
    ],
  },
]

/** The area a page belongs to, for the active state in the header and the tab bar. */
export function areaOf(view: View): Area | null {
  if (view === 'subjects' || view === 'subject' || view === 'majors' || view === 'careers') return 'browse'
  if (view === 'plan') return 'plan'
  if (view === 'tools') return 'tools'
  if (view === 'guide') return 'guide'
  if (view === 'record' || view === 'shortlist') return 'me'
  if (view === 'about' || view === 'feedback' || view === 'contribute' || view === 'changes' || view === 'privacy') return 'about'
  return null
}

/** Whether a menu item is the page being shown: same path, and not a jump into part of a page. */
export function isHere(item: MenuItem, view: View, param: string): boolean {
  if (/[?#]/.test(item.to)) return false
  return item.to.replace(/\/$/, '') === [view, param].filter(Boolean).join('/')
}

/** The phone tab bar: five places; Tools opens a sheet with the tools, and "More" there has every feature. */
export const TABS: { key: string; icon: Icon; to: string | null; area: Area | null }[] = [
  { key: 'nav.home', icon: House, to: '', area: null },
  { key: 'nav.browse', icon: ListFilter, to: 'subjects/', area: 'browse' },
  { key: 'nav.plan', icon: Route, to: 'plan/', area: 'plan' },
  { key: 'tools.nav', icon: Wrench, to: null, area: 'tools' },
  { key: 'nav.record', icon: User, to: 'record/', area: 'me' },
]

/** The name of the page being shown, for the phone top bar; null on home (the logo says it). */
export function pageTitleKey(view: View, param: string): string | null {
  if (view === 'home') return null
  for (const m of MENUS) for (const item of m.items) if (isHere(item, view, param)) return item.key
  const area = areaOf(view)
  return area ? (MENUS.find((m) => m.area === area)?.key ?? null) : null
}

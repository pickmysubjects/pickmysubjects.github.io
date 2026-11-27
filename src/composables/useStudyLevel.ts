import { computed, watchEffect } from 'vue'
import type { ComponentReq, Course, Dataset, Subject } from '@/engine'
import { degreeCourses } from '@/engine/courseRules'
import { usePersisted } from './usePersisted'
import { MASTER_PLANNING } from '@/release'

/**
 * Bachelor's or master's: which side of the site a student is on. Kept apart so an undergraduate
 * never sees master's subjects mixed into their lists and search (and the other way round). Saved
 * on this device; bachelor's by default. Master's pages use the purple accent (data-level on <html>).
 */
export type StudyLevel = 'bachelor' | 'master'

const level = usePersisted<StudyLevel>('sc:level', 'bachelor', (raw) => (raw === 'master' ? 'master' : 'bachelor'))

if (typeof document !== 'undefined') {
  watchEffect(() => {
    if (level.value === 'master') document.documentElement.dataset.level = 'master'
    else delete document.documentElement.dataset.level
  })
}

/**
 * Whether a subject belongs on this side. Bachelor's: undergraduate subjects, plus a graduate one
 * only when the student's degree counts it (as "sort for me" already decides). Master's: graduate
 * subjects, plus the lower-level ones a master's specialisation lists (MC-DATASC's COMP20008).
 */
export function onSide(s: Subject, side: StudyLevel, course?: string, masterUses?: ReadonlySet<string>): boolean {
  const graduate = s.level > 3
  // Master's: also another course's subjects the student's own master's takes (MC-SOFTENG Group A).
  if (side === 'master') return graduate || !!masterUses?.has(s.code) || (!!course && isMasterCourse(course) && !!s.categories[course])
  return !graduate || (!!course && !!s.categories[course])
}

export function useStudyLevel() {
  // Planning is open on the bachelor's side, and on the master's once 1.2.0 ships.
  return { level, isMaster: computed(() => level.value === 'master'), planningOpen: computed(() => level.value !== 'master' || MASTER_PLANNING) }
}

/** A coursework master's course (MC-IT-200, MC-DATASC): Handbook codes start with MC-. */
export function isMasterCourse(code: string | undefined): boolean {
  return !!code && code.startsWith('MC-')
}

/** Every subject a master's course's specialisations name, at any level. */
export function masterSubjects(data: Dataset): Set<string> {
  const out = new Set<string>()
  const add = (reqs: ComponentReq[] | 'unknown') => {
    if (reqs === 'unknown') return
    for (const r of reqs) for (const c of 'all' in r ? r.all : r.choose.from) out.add(c)
  }
  for (const c of data.components) {
    if (!isMasterCourse(c.course)) continue
    add(c.requirements)
    for (const r of c.routes ?? []) add(r.requirements)
    for (const l of c.limits) for (const code of l.from) out.add(code)
  }
  for (const c of data.courses) {
    if (!isMasterCourse(c.code)) continue
    for (const r of c.rules) {
      if (r.kind === 'compulsory') r.subjects.forEach((x) => out.add(x))
      if (r.kind === 'requirement') r.paths.forEach(add)
    }
  }
  return out
}

/**
 * The degrees a student can pick on this side: listed bachelor's courses, or the master's ones
 * (kept unlisted until the master's planner ships, so they only show on the master's side).
 */
export function pickableCourses(data: Dataset, side: StudyLevel): Course[] {
  return degreeCourses(data).filter((c) => (side === 'master' ? isMasterCourse(c.code) : c.listed && !isMasterCourse(c.code)))
}

// Menu and page names that read differently on the master's side (a master's has specialisations
// within courses, not majors).
const MASTER_LABELS: Record<string, string> = {
  'browse.switchMajors': 'majors.navMaster',
  'guide.cat.new-students.title': 'guide.catMaster.newStudentsTitle',
  'guide.cat.basics.title': 'guide.catMaster.basicsTitle',
  'menu.d.new-students': 'guide.catMaster.newStudentsDesc',
  'menu.d.basics': 'guide.catMaster.basicsDesc',
  'plans.tryAsNew': 'plans.tryAsNewMaster',
  'plan.tagOption': 'plan.tagOptionMaster',
  'plan.tagLegend': 'plan.tagLegendMaster',
}

/** The i18n key to show for a menu or page name on this side. */
export function sideKey(key: string, side: StudyLevel): string {
  return side === 'master' ? (MASTER_LABELS[key] ?? key) : key
}

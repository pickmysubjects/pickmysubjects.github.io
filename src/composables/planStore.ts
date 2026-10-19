import type { Goal, Note, Period, PlanTerm, Profile, Skill } from '@/engine'
import { usePersisted } from './usePersisted'
import { cleanPlans } from '@/utils/sanitize'

/** The saved plans, on their own so the dataset can follow the planned course without a cycle. */
export interface PlanSetup {
  course: string
  courseYear: number
  startYear: number
  startPeriod: Period
  major: string
  specialisation: string
  /** On a student visa (optional; changes the load warnings). */
  international?: boolean
  /** No major yet, but a field in mind (a major group id): keeps its majors open. */
  field?: string
  /** The student answered the setup questions (until then it's only the default). */
  confirmed?: boolean
}

export interface PlanState {
  setup: PlanSetup
  terms: PlanTerm[]
  notes: Note[]
  unplaced: { code: string; reason: string; reasonKey: string }[]
}

/** One of a student's plans (Plan A, Plan B…). The record is shared; this is only the plan. */
export interface SavedPlan extends PlanState {
  id: string
  /** The letter it was made with: "Plan B" until it's given a name. */
  label: string
  name?: string
  /** Plans for other degrees this plan switched away from, by course code (switching back finds them). */
  kept?: Record<string, PlanState>
  /** What this plan is aiming for: strengths, interests and goal (the record itself is shared). */
  prefs?: PlanPrefs
}

export interface PlanPrefs {
  skills: Partial<Record<Skill, number>>
  interests: string[]
  goal: Goal
}

/**
 * A plan's strengths, interests and goal. A plan saved before each plan had its own has none:
 * it takes what the profile had, so nothing set earlier is lost.
 */
export function prefsOf(plan: { prefs?: PlanPrefs } | undefined, profile: Pick<Profile, 'skills' | 'interests' | 'goal'>): PlanPrefs {
  return plan?.prefs ?? { skills: { ...profile.skills }, interests: [...profile.interests], goal: profile.goal }
}

/** A dataset's plans and which one is open. */
export interface PlanBook {
  active: string
  plans: SavedPlan[]
}

// Every dataset's plans, by dataset name.
export const books = usePersisted<Record<string, PlanBook>>('sc:plans', {}, cleanPlans)

export function activePlan(book: PlanBook | undefined): SavedPlan | undefined {
  return book?.plans.find((p) => p.id === book.active) ?? book?.plans[0]
}

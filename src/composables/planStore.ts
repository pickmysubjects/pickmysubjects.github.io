import type { Note, Period, PlanTerm } from '@/engine'
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

// One saved plan per dataset.
export const plans = usePersisted<Record<string, PlanState>>('sc:plans', {}, cleanPlans)

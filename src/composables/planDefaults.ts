import { defaultCourse, standardTerms, type Dataset } from '@/engine'
import type { PlanSetup, PlanState } from './planStore'

function defaultSetup(data: Dataset): PlanSetup {
  const course = data.courses.find((c) => c.code === defaultCourse(data))
  // Only a starting suggestion (the wizard asks): semester 1 of the Handbook year we have.
  const year = course?.year ?? new Date().getFullYear()
  return {
    course: course?.code ?? '',
    courseYear: year,
    startYear: year,
    startPeriod: 'semester-1',
    major: '', // "Not sure yet" until the student picks one
    major2: '',
    specialisation: '',
    minors: [],
  }
}

/** The plan to show before anything is saved: the default setup, empty semesters from its start. */
export function defaultState(data: Dataset): PlanState {
  const setup = defaultSetup(data)
  return { setup, terms: standardTerms(setup.startYear, setup.startPeriod, 6), notes: [], unplaced: [] }
}

/**
 * From ATAR to the first day, for Year 12 students starting in 2027: VTAC's results and offer
 * dates (vtac.edu.au/dates, "Key Dates 2026-27", last updated there 21 September 2026), checked
 * here on 2026-11-04. Orientation and the first day of semester come from the University's key
 * dates (data/real/keyDates), not from here. Times are Melbourne time.
 *
 * Next year: replace these with VTAC's dates for the new round when they publish them (about
 * September), and move ADMISSION_YEAR on.
 */
export const ADMISSION_YEAR = 2027
export const VTAC_DATES_SOURCE = 'https://vtac.edu.au/dates'
export const VTAC_CHECKED = '2026-11-04'

/**
 * The University's ATAR entry score guide: last year's lowest selection ranks and, for 2027 entry,
 * guaranteed ATARs only for Access Melbourne applicants (we don't copy the numbers). The old
 * atar-guarantees page redirects here (checked 2026-11-19).
 */
export const ATAR_GUARANTEES_URL = 'https://study.unimelb.edu.au/study-with-us/undergraduate-courses/change-of-preference/atar-entry-score-guide'
/** The University's page for VTAC applicants: offers, accepting and enrolling. */
export const UNIMELB_VTAC_URL = 'https://study.unimelb.edu.au/study-with-us/undergraduate-courses/change-of-preference/key-information-VTAC-applicants'

export type AdmissionStepId = 'results' | 'change' | 'december' | 'january1' | 'january2' | 'february'

export interface AdmissionStep {
  id: AdmissionStepId
  /** YYYY-MM-DD; `end` for a span of rounds. */
  date: string
  end?: string
  /** HH:MM, Melbourne time. */
  time?: string
}

export const ADMISSION_STEPS: readonly AdmissionStep[] = [
  { id: 'results', date: '2026-12-10', time: '07:00' },
  // For current VCE students, before the December round.
  { id: 'change', date: '2026-12-12', time: '12:00' },
  { id: 'december', date: '2026-12-23', time: '10:00' },
  { id: 'january1', date: '2027-01-12', time: '14:00' },
  { id: 'january2', date: '2027-01-27', time: '14:00' },
  { id: 'february', date: '2027-02-03', end: '2027-02-16' },
]

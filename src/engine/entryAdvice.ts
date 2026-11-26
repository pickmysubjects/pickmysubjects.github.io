import type { Dataset } from './schema'

/**
 * What a student brings to a coursework master's, asked once in the setup: a University of
 * Melbourne bachelor's (read from the bachelor's side of the site) or a few answers about one
 * from elsewhere. Used only to say which entry program or stream the Handbook's rules point to;
 * the University decides admission and credit, and the student can always pick another.
 */
export type StudyArea = 'computing' | 'statistics' | 'both' | 'engineering' | 'other'

export interface Background {
  where: 'unimelb' | 'other'
  /** Elsewhere: the bachelor's main area. */
  area?: StudyArea
  /** Elsewhere: a WAM of 65 or more (the usual entry minimum). */
  wam65?: boolean
  /** Elsewhere: a four-year bachelor's. */
  fourYear?: boolean
  /** Elsewhere: two years or more of documented relevant work. */
  work?: boolean
}

/** A UniMelb bachelor's as the bachelor's side of the site has it. */
export interface UniMelbRecord {
  passed: string[]
  wam?: number
  /** Titles of the planned majors ("Computing and Software Systems"). */
  majors: string[]
}

export interface EntryAdvice {
  /** The course (entry program) the rules point to. */
  course: string
  /** i18n key under `entryAdvice.` for why. */
  reason: string
  /** MC-DATASC: the background stream (i18n key under `entryAdvice.stream.`). */
  stream?: 'statistics' | 'computing' | 'datascience' | 'mixed' | 'foundation'
}

// The Foundation subjects each course names (2027 Handbook).
const CS_FOUNDATION = ['COMP90041', 'COMP90038', 'COMP20008', 'INFO90002']
const STATS_FOUNDATION = ['MAST90105', 'MAST90104']

// "A major in computer science, information technology, software engineering or related".
const COMPUTING_MAJOR = /comput|software|information|data science/i

/**
 * Points of these subjects a record already covers: passed, or passed something the Handbook
 * won't let be taken with it (COMP20007 rules out COMP90038: the same ground).
 */
export function coveredPoints(data: Dataset, passed: readonly string[], codes: readonly string[]): number {
  const have = new Set(passed)
  return codes.reduce((sum, code) => {
    const s = data.subjects[code]
    const covered = have.has(code) || (Array.isArray(s?.nonAllowed) && s.nonAllowed.some((c) => have.has(c)))
    return covered ? sum + (s?.points ?? 12.5) : sum
  }, 0)
}

function total(data: Dataset, codes: readonly string[]): number {
  return codes.reduce((sum, c) => sum + (data.subjects[c]?.points ?? 12.5), 0)
}

/** The MC-IT entry program a background points to (MC-IT-200, -150 or -100). */
function itProgram(b: Background, rec?: UniMelbRecord): EntryAdvice {
  if (b.where === 'unimelb') {
    const computing = !!rec && rec.majors.some((m) => COMPUTING_MAJOR.test(m))
    const wam = rec?.wam !== undefined && rec.wam >= 65
    // A UniMelb bachelor's is three years: the 100-point program needs four.
    return computing && wam ? { course: 'MC-IT-150', reason: 'itComputingMajor' } : { course: 'MC-IT-200', reason: computing ? 'itWamUnder' : 'itOtherArea' }
  }
  const computing = b.area === 'computing' || b.area === 'both'
  if (!computing) return { course: 'MC-IT-200', reason: 'itOtherArea' }
  if (!b.wam65) return { course: 'MC-IT-200', reason: 'itWamUnder' }
  if (b.fourYear && b.work) return { course: 'MC-IT-100', reason: 'itFourYearWork' }
  return { course: 'MC-IT-150', reason: 'itComputingMajor' }
}

/** The MC-DATASC background stream (Handbook "Course structure"). */
function dataStream(data: Dataset, b: Background, rec?: UniMelbRecord): EntryAdvice {
  let stats: number
  let cs: number
  if (b.where === 'unimelb') {
    stats = coveredPoints(data, rec?.passed ?? [], STATS_FOUNDATION)
    cs = coveredPoints(data, rec?.passed ?? [], CS_FOUNDATION)
  } else {
    stats = b.area === 'statistics' || b.area === 'both' ? total(data, STATS_FOUNDATION) : 0
    cs = b.area === 'computing' || b.area === 'both' ? total(data, CS_FOUNDATION) : 0
  }
  const allStats = stats >= total(data, STATS_FOUNDATION)
  const allCs = cs >= total(data, CS_FOUNDATION)
  const stream: EntryAdvice['stream'] = allStats && allCs ? 'datascience' : allStats ? 'statistics' : allCs ? 'computing' : stats >= 25 || cs >= 25 ? 'mixed' : 'foundation'
  return { course: 'MC-DATASC', reason: `ds-${stream}`, stream }
}

/**
 * For each master's course family the site plans, what the background points to. A family not
 * known here (rules not written yet) gets nothing.
 */
export function entryAdvice(data: Dataset, b: Background, rec?: UniMelbRecord): EntryAdvice[] {
  const has = (code: string) => data.courses.some((c) => c.code === code)
  const out: EntryAdvice[] = []
  if (has('MC-IT-200')) out.push(itProgram(b, rec))
  if (has('MC-DATASC')) out.push(dataStream(data, b, rec))
  return out
}

/** Specialisations a MC-DATASC stream may complete (Handbook "Course structure"). */
export function streamSpecialisations(stream: NonNullable<EntryAdvice['stream']>): string[] {
  if (stream === 'foundation') return ['mc-datasc-foundational']
  if (stream === 'mixed') return ['mc-datasc-foundational', 'mc-datasc-statistical', 'mc-datasc-computational']
  return ['mc-datasc-foundational', 'mc-datasc-statistical', 'mc-datasc-computational', 'mc-datasc-computational-and-statistical']
}

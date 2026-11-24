/**
 * When an assessment task happens, read off the Handbook's "Timing" cell. Only phrasings we
 * recognise for sure get a kind; anything else stays unset (and the import drops it), so the
 * site never shows a time the Handbook didn't give.
 */
export type TimingKind = 'week' | 'weeks' | 'teaching' | 'early' | 'mid' | 'late' | 'end' | 'exam' | 'assessmentPeriod' | 'afterTeaching'

export type Timing =
  /** One teaching week, or a run of them ("From Week 4 to Week 12"). */
  | { kind: 'week'; from: number; to?: number; text: string }
  /** Several separate weeks ("Weeks 3, 6, 9 and 12"). */
  | { kind: 'weeks'; weeks: number[]; text: string }
  /** Throughout the teaching period / semester. */
  | { kind: 'teaching'; text: string }
  | { kind: 'early'; text: string }
  | { kind: 'mid'; text: string }
  | { kind: 'late'; text: string }
  /** End of the teaching period (last week of classes). */
  | { kind: 'end'; text: string }
  /** The examination period. */
  | { kind: 'exam'; text: string }
  /** The assessment period (the exam period, as some faculties call it). */
  | { kind: 'assessmentPeriod'; text: string }
  /** N weeks after teaching ends. */
  | { kind: 'afterTeaching'; weeks: number; text: string }

const MAX_WEEK = 12 // teaching weeks; "Week 14" and the like count past the break and are left unset
const okWeek = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_WEEK

const PHRASES: [RegExp, Exclude<TimingKind, 'week' | 'weeks' | 'afterTeaching'>][] = [
  [/^(throughout|during) the (teaching period|semester)$|^during semester$|^throughout semester$|^weekly(,? (during|throughout) the (teaching period|semester))?$|^weekly during semester$/, 'teaching'],
  [/^early in the teaching period$|^early semester$|^first half of (the )?teaching period$/, 'early'],
  [/^mid[- ]?(semester|teaching period)$/, 'mid'],
  [/^second half of (the )?teaching period$|^late in the teaching period$/, 'late'],
  [/^end of (the )?(teaching period|semester)$|^end of term$|^due on the last day of (the )?teaching period$/, 'end'],
  [/^(during the )?(end of semester |end of year |mid-year )?examination period$|^during the exam period$/, 'exam'],
  [/^(during|end of|at the end of) the assessment period$/, 'assessmentPeriod'],
]

/** Weeks in a list like "3, 6, 9 and 12" or "4,6,8,10" or "2, 4, 6, 8, 10 & 12"; null if anything else is there. */
function weekList(s: string): number[] | null {
  const parts = s.split(/\s*(?:,\s*(?:and\s+)?|\s+and\s+|\s*&\s*)\s*/)
  const weeks = parts.map((p) => p.replace(/^weeks? /, '')).map((p) => (/^\d+$/.test(p) ? Number(p) : NaN))
  if (weeks.length < 2 || !weeks.every(okWeek)) return null
  for (let i = 1; i < weeks.length; i++) if (weeks[i]! <= weeks[i - 1]!) return null
  return weeks
}

export function normaliseTiming(raw: string): Timing | undefined {
  const text = raw.replace(/\s+/g, ' ').trim()
  const s = text.toLowerCase().replace(/\.$/, '')
  if (!s) return undefined

  for (const [re, kind] of PHRASES) if (re.test(s)) return { kind, text }

  let m = /^week (\d+)$/.exec(s)
  if (m && okWeek(Number(m[1]))) return { kind: 'week', from: Number(m[1]), text }
  m = /^(?:from )?weeks? (\d+)(?: to |\s*[-–]\s*)(?:week )?(\d+)$/.exec(s)
  if (m) {
    const from = Number(m[1])
    const to = Number(m[2])
    if (okWeek(from) && okWeek(to) && to > from) return { kind: 'week', from, to, text }
    return undefined
  }
  m = /^weeks?:? (.+)$/.exec(s)
  if (m) {
    const weeks = weekList(m[1]!)
    if (weeks) return { kind: 'weeks', weeks, text }
  }
  m = /^(\d+) weeks? after the end of teaching$/.exec(s)
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 6) return { kind: 'afterTeaching', weeks: Number(m[1]), text }
  return undefined
}

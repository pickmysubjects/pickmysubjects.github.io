import type { Dataset, ReqExpr, ReqField, Skill, Subject } from './schema'

/**
 * What a subject leans on, for judging a semester's load and keeping a student's weak
 * spots apart. Hand-tagged skills win; for the rest they're worked out from what the data
 * does say: the area, the title, the assessment, and the subjects it requires.
 *
 * Checked against the hand-tagged subjects (scripts would tag them blind and compare):
 * precision / recall about 96/86 for maths, 83/86 programming, 93/93 statistics,
 * 83/83 writing, 100/75 lab — against 98/78, 81/77, 100/13 and nothing for writing and lab
 * when going by the area code alone. The rules were tuned on those same subjects, so
 * expect a little less on others.
 */

const MATHS_AREAS = new Set(['MAST', 'PHYC', 'ACTL', 'ELEN', 'MCEN', 'CVEN', 'CHEN', 'BMEN', 'ENGR'])
const PROGRAMMING_AREAS = new Set(['COMP', 'SWEN', 'INFO'])
const LAB_AREAS = new Set(['CHEM', 'BCMB', 'MIIM', 'PATH', 'BIOL', 'GENE', 'ZOOL', 'BOTA', 'ANAT', 'PHRM', 'BTCH', 'PHYS', 'NEUR', 'FOOD', 'ANSC', 'VETS'])

const TITLE: Partial<Record<Skill, RegExp>> = {
  maths:
    /calculus|algebra|mathemat|differential|real analysis|complex analysis|vector|geometry|number theory|topolog|optimi[sz]ation|mechanics|quantum|electromagnet|microeconomics|finance|financial decision|econometric/i,
  statistics:
    /statistic|probabilit|stochastic|inference|regression|econometric|data analysis|biostat|actuarial|research methods|quantitative|machine learning|data processing/i,
  programming: /programming|computing|software|algorithm|data structure|machine learning|computational|database|web |coding|data science/i,
  writing: /writing|essay|communication|law|history|philosophy|marketing|macroeconomic|accounting reports|society|ethics|culture/i,
}
const STATS_TITLE = /statistic|probabilit|stochastic|inference/i
/** Skills that carry over from a required subject (you can't do the follow-on without them). */
const INHERITED: Skill[] = ['maths', 'statistics', 'programming']

/** Subjects every way of meeting the requirement includes (an "or" only counts what all branches share). */
function required(field: ReqField): string[] {
  if (field === 'none' || field === 'unknown') return []
  const walk = (e: ReqExpr): string[] =>
    'subject' in e
      ? [e.subject]
      : 'all' in e
        ? e.all.flatMap(walk)
        : 'any' in e && e.any.length
          ? e.any.map(walk).reduce((a, b) => a.filter((x) => b.includes(x)))
          : []
  return walk(field)
}

function inferred(s: Subject, data: Dataset | undefined): Skill[] {
  const area = s.area ?? s.code.slice(0, 4)
  const out = new Set<Skill>()
  if (MATHS_AREAS.has(area) && !(area === 'MAST' && STATS_TITLE.test(s.title))) out.add('maths')
  if (area === 'MAST' && STATS_TITLE.test(s.title)) out.add('maths').add('statistics')
  if (PROGRAMMING_AREAS.has(area)) out.add('programming')
  for (const [skill, rx] of Object.entries(TITLE) as [Skill, RegExp][]) if (rx.test(s.title)) out.add(skill)
  const tasks = s.assessment ?? []
  // Reports and presentations worth a fifth of the mark: written work is a real part of it.
  if (tasks.filter((t) => t.kind === 'report' || t.kind === 'presentation').reduce((a, t) => a + t.weight, 0) >= 20) out.add('writing')
  if (LAB_AREAS.has(area) && (tasks.some((t) => t.kind === 'report') || (s.weeklyContactHours ?? 0) >= 5)) out.add('lab')
  for (const code of data ? required(s.prerequisites) : []) {
    const before = data?.subjects[code]
    // One step back only, from hand tags or the area: a long chain of guesses drifts.
    const theirs = before ? (before.skills.length ? before.skills : areaOnly(before)) : []
    for (const k of theirs) if (INHERITED.includes(k)) out.add(k)
  }
  return [...out]
}

function areaOnly(s: Subject): Skill[] {
  const area = s.area ?? s.code.slice(0, 4)
  return [...(MATHS_AREAS.has(area) ? (['maths'] as Skill[]) : []), ...(PROGRAMMING_AREAS.has(area) ? (['programming'] as Skill[]) : [])]
}

const CACHE = new WeakMap<Subject, Skill[]>()

export function skillsOf(s: Subject, data?: Dataset): Skill[] {
  if (s.skills.length) return s.skills
  const hit = data ? CACHE.get(s) : undefined
  if (hit) return hit
  const out = inferred(s, data)
  if (data) CACHE.set(s, out)
  return out
}

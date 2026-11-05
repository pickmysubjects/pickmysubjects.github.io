/**
 * Simulated students for every bachelor's degree: each major with a pairwise covering set of
 * personalities (every pair of skill levels, goal, work hours, career goal, start semester,
 * part-time load, year of study 1-4, record with a fail or a summer/winter subject, summer and
 * winter terms in the plan), every interest topic across each degree, plus minors,
 * specialisations, double majors and diplomas. Each plan is checked as the planner page checks
 * it (course rules, term problems, unplaced, duplicates, re-planned passes, very heavy semesters
 * a swap would fix) and each "for you" list for suggestions without a reason, ineligible ones,
 * scores the reasons don't explain and weak skills without a warning.
 *
 *   npm run simulate -- <report.tsv> [course] [shard/of]
 *
 * A release check (tens of minutes); run `npm run data` first. Prints a summary; every problem
 * is a line in the report.
 */
import { writeFileSync } from 'node:fs'
const R = '../'
const { checkCourse, diplomaClash, findDiploma, planComponentIds } = await import(R + 'src/engine/courseRules')
const { cannotCombine, majorClash, maxMajors, minorClash } = await import(R + 'src/engine/index')
const { generatePlan } = await import(R + 'src/engine/generate')
const { checkTerms } = await import(R + 'src/engine/planCheck')
const { relieveTerm } = await import(R + 'src/engine/relieve')
const { planStress, requiredWithPrerequisites } = await import(R + 'src/engine/termStress')
const { planRoles } = await import(R + 'src/engine/roles')
const { termsWithCarried } = await import(R + 'src/engine/yearLong')
const { recommend } = await import(R + 'src/engine/recommend')
const { topicsOf } = await import(R + 'src/engine/topics')
const { skillsOf } = await import(R + 'src/engine/skills')
const { TOPICS } = await import(R + 'src/engine/schema')
const { realData } = await import(R + 'tests/realData')
const data = realData()
const YEAR = 2026
let seed = 12345
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)] as T
const SK = ['maths', 'programming', 'statistics', 'writing', 'lab', 'exams', 'teamwork', 'presentation'] as const
const GOALS = ['wam', 'balanced', 'challenge'] as const
const JOBS: string[] = Object.keys((data as any).careers.jobs)
const open = (c: any) => c.closedFrom === undefined || YEAR < c.closedFrom
const of = (course: string, kind: string) => data.components.filter((c: any) => c.course === course && c.kind === kind && open(c)).map((c: any) => c.id)
const blankP = () => ({ results: [] as any[], skills: {}, interests: [] as string[], goal: 'balanced' as const })

type Row = { label: string; kind: string; detail: string }
const rows: Row[] = []
const add = (label: string, kind: string, detail: string) => rows.push({ label, kind, detail })
let plans = 0, recLists = 0
const stats = { interestShareBlank: 0, interestSharePers: 0, n: 0, weakStackBlank: 0, weakStackPers: 0 }

function checkPlan(label: string, input: any) {
  plans++
  let res
  try { res = generatePlan(input) } catch (e) { add(label, 'threw', (e as Error).message); return null }
  const { plan, unplaced } = res
  const fails = checkCourse(plan, data).statuses.filter((s: any) => s.status === 'fail').map((s: any) => s.ruleId)
  if (fails.length) add(label, 'rules', fails.join(','))
  const errs = [...new Set(checkTerms(plan, data, input.load).filter((x: any) => x.severity === 'error').map((x: any) => `${x.kind} ${x.subject ?? ''}`.trim()))]
  if (errs.length) add(label, 'terms', errs.join(','))
  if (unplaced.length) add(label, 'unplaced', unplaced.map((u: any) => u.code).join(','))
  const codes = plan.terms.flatMap((t: any) => t.subjects)
  const dup = codes.filter((c: string, i: number) => codes.indexOf(c) !== i)
  if (dup.length) add(label, 'dup', dup.join(','))
  const passed = new Set(input.profile.results.filter((r: any) => (r.mark ?? 0) >= 50).map((r: any) => r.code))
  const again = codes.filter((c: string) => passed.has(c))
  if (again.length) add(label, 'replans-passed', again.join(','))
  const roles = planRoles(data, plan.course, plan.courseYear, planComponentIds(plan).filter(Boolean))
  const fixed = requiredWithPrerequisites(new Set([...roles.required, ...roles.options]), codes, data.subjects, plan.course)
  const st = planStress(termsWithCarried(plan.terms, data), data, input.profile, fixed, plan.course).terms
  st.forEach((s: any, i: number) => {
    if (s.level !== 'veryHeavy' || input.profile.goal === 'challenge') return
    const rel = relieveTerm(plan, data, i, input.profile)
    if (rel && rel.kind !== 'shortTerm') add(label, 'veryHeavy-fixable-by-swap', `${plan.terms[i].year}${plan.terms[i].period} ${rel.kind}`)
  })
  return { plan, fixed, st }
}

function checkRecs(label: string, p: any, course: string, major: string | undefined) {
  recLists++
  let recs
  try { recs = recommend(data, p, { course, maxLevel: 1, programme: major ? { courseYear: YEAR, components: [major] } : undefined }).slice(0, 12) } catch (e) { add(label, 'rec-threw', (e as Error).message); return }
  for (const r of recs) {
    if (r.eligibility === 'fail') add(label, 'rec-ineligible', r.code)
    if (!r.reasons.length && !r.warnings.length) add(label, 'rec-no-reason', r.code)
    const f = (k: string) => r.factors?.find((x: any) => (x.kind ?? x.key) === k)?.effect ?? 0
    if (f('interest') >= 5 && !r.reasons.some((n: any) => /interest|liked|career|pathway|unlock/i.test(n.key))) add(label, 'interest-score-no-reason', `${r.code} +${Math.round(f('interest'))}`)
    if (f('skillFit') >= 5 && !r.reasons.some((n: any) => /strength|goodAt|Good/i.test(n.key))) add(label, 'skill-score-no-reason', `${r.code} +${Math.round(f('skillFit'))}`)
    const s = data.subjects[r.code]
    // A subject leaning on a skill rated 1, recommended with no interest match and goal not challenge.
    const struggle = skillsOf(s, data).filter((k: string) => p.skills[k] === 1)
    if (struggle.length && p.goal !== 'challenge' && !r.warnings.length) add(label, 'struggle-no-warning', `${r.code} ${struggle.join(',')}`)
  }
}


// ---- Covering design: every pair of factor values appears in at least one persona (greedy all-pairs).
const FACTORS: { name: string; values: any[] }[] = [
  ...SK.map((k) => ({ name: k, values: [undefined, 1, 2, 3, 4, 5] })),
  { name: 'goal', values: [...GOALS] },
  { name: 'work', values: [undefined, 5, 15, 25, 35] },
  { name: 'career', values: ['none', 'any'] },
  { name: 'start', values: ['semester-1', 'semester-2'] },
  { name: 'load', values: [undefined, 37.5] },
  { name: 'stage', values: ['y1', 'y2', 'y3', 'y4'] },
  { name: 'record', values: ['good', 'fail', 'short'] },
  { name: 'shortTerms', values: [false, true] },
]
function pairwise(): any[][] {
  const uncovered = new Set<string>()
  FACTORS.forEach((a, i) => FACTORS.forEach((b, j) => { if (j > i) a.values.forEach((_, x) => b.values.forEach((_, y) => uncovered.add(`${i}:${x}|${j}:${y}`))) }))
  const rows: number[][] = []
  while (uncovered.size) {
    let best: number[] = [], bestGain = -1
    for (let c = 0; c < 60; c++) {
      // Seed from one uncovered pair, fill the rest greedily.
      const [p] = uncovered; const [[i, x], [j, y]] = p.split('|').map((q) => q.split(':').map(Number))
      const row = FACTORS.map((f) => Math.floor(rnd() * f.values.length)); row[i] = x; row[j] = y
      for (let k = 0; k < FACTORS.length; k++) {
        if (k === i || k === j) continue
        let bv = row[k], bg = -1
        for (let v = 0; v < FACTORS[k].values.length; v++) {
          let g = 0
          for (let m = 0; m < FACTORS.length; m++) if (m !== k) { const [a, b] = k < m ? [`${k}:${v}`, `${m}:${row[m]}`] : [`${m}:${row[m]}`, `${k}:${v}`]; if (uncovered.has(`${a}|${b}`)) g++ }
          if (g > bg || (g === bg && rnd() < 0.3)) { bg = g; bv = v }
        }
        row[k] = bv
      }
      let gain = 0
      for (let a = 0; a < FACTORS.length; a++) for (let b = a + 1; b < FACTORS.length; b++) if (uncovered.has(`${a}:${row[a]}|${b}:${row[b]}`)) gain++
      if (gain > bestGain) { bestGain = gain; best = row }
    }
    for (let a = 0; a < FACTORS.length; a++) for (let b = a + 1; b < FACTORS.length; b++) uncovered.delete(`${a}:${best[a]}|${b}:${best[b]}`)
    rows.push(best)
  }
  return rows.map((r) => r.map((v, k) => FACTORS[k].values[v]))
}
const DESIGN = pairwise()
console.error(`pairwise design: ${DESIGN.length} personas per programme`)
const TOPIC_LIST = TOPICS as readonly string[]
let topicCursor = 0
function personaFrom(row: any[], n: number, courseJobs: string[]) {
  const skills: Record<string, number> = {}
  SK.forEach((k, i) => { if (row[i] !== undefined) skills[k] = row[i] })
  const [goal, work, career, start, load, stage, record, shortTerms] = row.slice(SK.length)
  // Interests: walk the topic list so each programme's personas cover every topic; 0–3 per persona.
  const count = n % 4
  const interests = Array.from({ length: count }, () => TOPIC_LIST[topicCursor++ % TOPIC_LIST.length])
  return { profile: { results: [] as any[], skills, interests, goal, workHours: work, career: career === 'any' ? pick(courseJobs.length ? courseJobs : JOBS) : undefined }, start, load, stage, record, shortTerms, tag: `p${n}` }
}
const labelOf = (p: any, start: string, load: any, record: string) => `[${p.goal};${Object.entries(p.skills).map(([k, v]) => k.slice(0, 3) + v).join('')};${p.interests.join('+')}${p.career ? ';' + p.career : ''}${p.workHours ? ';w' + p.workHours : ''}${start === 'semester-2' ? ';S2' : ''}${load ? ';pt' : ''};${record}]`

function runProgramme(L0: string, base: any, personas: number, withRecs: boolean) {
  if (++done % 20 === 0) console.error(`progress: ${done} programmes, ${plans} plans, ${rows.length} problems`)
  const blank = checkPlan(`${L0} blank`, { ...base, profile: blankP() })
  const personaRows = personas >= DESIGN.length ? DESIGN : Array.from({ length: personas }, (_, i) => DESIGN[(i * 7) % DESIGN.length])
  personaRows.forEach((row, n) => {
    const { profile: p, start, load, stage, record, shortTerms } = personaFrom(row, n, [])
    const L = `${L0} p${n}${labelOf(p, start, load, stage + '/' + record + (shortTerms ? '/sw' : ''))}`
    let input: any = { ...base, profile: p, startPeriod: start, ...(load ? { load } : {}), ...(shortTerms ? { useShortTerms: true, fillShortTerms: true } : {}) }
    // Year 2/3/4: the blank plan's first 2/4/6 semesters on the record (year 4 = a longer degree or
    // a part-timer). 'fail': one first-semester subject failed. 'short': one subject was taken in
    // the summer term before its semester instead.
    const done = { y1: 0, y2: 2, y3: 4, y4: 6 }[stage as 'y1'] ?? 0
    if (done && blank) {
      const terms = blank.plan.terms.filter((t: any) => t.period === 'semester-1' || t.period === 'semester-2').slice(0, done)
      if (terms.length === done) {
        const res = terms.flatMap((t: any, ti: number) => t.subjects.map((code: string, ci: number) => {
          const short = record === 'short' && ti === 1 && ci === 0
          return { code, mark: record === 'fail' && ti === 0 && ci === 0 ? 42 : 55 + Math.floor(rnd() * 40), year: short ? t.year + (t.period === 'semester-1' ? 0 : 0) : t.year, period: short ? (t.period === 'semester-1' ? 'summer' : 'winter') : t.period }
        }))
        const last = terms[terms.length - 1]
        input = { ...input, profile: { ...p, results: res }, startYear: last.period === 'semester-2' ? last.year + 1 : last.year, startPeriod: last.period === 'semester-2' ? 'semester-1' : 'semester-2' }
      }
    }
    const got = checkPlan(L, input)
    if (withRecs) checkRecs(L, input.profile, base.course, base.major)
    if (got && blank && stage === 'y1' && !load && start === 'semester-1' && p.interests.length) {
      const free = (pl: any, fx: Set<string>) => pl.terms.flatMap((t: any) => t.subjects).filter((c: string) => !fx.has(c))
      const share = (cs: string[]) => cs.length ? cs.filter((c) => topicsOf(data.subjects[c]).topics.some((t: string) => p.interests.includes(t))).length / cs.length : 0
      stats.interestShareBlank += share(free(blank.plan, blank.fixed)); stats.interestSharePers += share(free(got.plan, got.fixed)); stats.n++
    }
  })
}

const only = process.argv[3]
const shard = process.argv[4] ? process.argv[4].split('/').map(Number) : [0, 1]
const courses = [...new Set(data.courses.map((c: any) => c.code))].filter((c) => c.startsWith('B-') && (!only || c === only))
const specOk = (spec: string, major: string) => { const c: any = data.components.find((x: any) => x.id === spec); return !!c && (c.requiresMajor.length === 0 || c.requiresMajor.includes(major)) && !cannotCombine(data, major, spec) }
let job = 0
let done = 0
const mine = () => job++ % shard[1] === shard[0]
for (const course of courses) {
  const majors = of(course, 'major')
  const base = (extra: any) => ({ data, course, minors: [], courseYear: YEAR, startYear: YEAR, startPeriod: 'semester-1', ...extra })
  for (const major of majors.length ? majors : [undefined]) if (mine()) runProgramme(`${course} ${major ?? '-'}`, base({ major }), DESIGN.length, true)
  const first = majors[0]
  // Only what the plan wizard lets a student choose (PlanWizard.vue's filters).
  for (const minor of of(course, 'minor')) if (!minorClash(data, [first], minor) && mine()) runProgramme(`${course} ${first} +minor ${minor}`, base({ major: first, minors: [minor] }), 8, false)
  for (const spec of of(course, 'specialisation')) for (const major of majors) if (specOk(spec, major) && mine()) runProgramme(`${course} ${major} +spec ${spec}`, base({ major, specialisation: spec }), 4, false)
  // Double majors (B-ARTS/B-COM/B-SCI allow two): each major paired with the next, a few personas.
  if (maxMajors(data, course, YEAR) >= 2) majors.forEach((m, i) => { const m2 = majors[(i + 1) % majors.length]; if (m2 !== m && !majorClash(data, m, m2) && mine()) runProgramme(`${course} ${m} +major2 ${m2}`, base({ major: m, major2: m2 }), 4, false) })
  for (const d of (data as any).diplomas ?? []) for (const stream of d.streams?.length ? d.streams : [undefined]) if (!diplomaClash(data, findDiploma(data, d.code), { course, major: first, diplomaStream: stream }) && mine()) runProgramme(`${course} ${first} +${d.code} ${stream ?? ''}`, base({ major: first, diploma: d.code, diplomaStream: stream }), 3, false)
}
const byKind: Record<string, number> = {}
for (const r of rows) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1
writeFileSync(process.argv[2], rows.map((r) => `${r.kind}\t${r.label}\t${r.detail}`).join('\n'))
console.log(JSON.stringify({ plans, recLists, problems: rows.length, byKind, interestShare: { blank: +(stats.interestShareBlank / stats.n).toFixed(3), personal: +(stats.interestSharePers / stats.n).toFixed(3), n: stats.n } }, null, 1))

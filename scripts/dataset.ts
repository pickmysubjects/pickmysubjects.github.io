import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'
import { admissionCourses, namedComponents, referencedSubjects } from '../src/engine/expr'
import { MIN_GRADE_SHARES, type GradeOffset } from '../src/engine/grades'
import type { ReqExpr, ReqField } from '../src/engine/schema'
import { aboutFileSchema, componentFileSchema, courseFileSchema, diplomaFileSchema, DISCUSSION_SOURCES, discussionFileSchema, SKILLS, subjectFileSchema, subjectTitlesFileSchema, type Dataset, type DiscussionSummary, type Skill, type Subject } from '../src/engine/schema'

export const ROOT = join(import.meta.dirname, '..')

export interface BuildResult {
  dataset: Dataset
  errors: string[]
  /** Subjects referenced by requirements but not curated yet. */
  missing: string[]
}

function yamlFiles(dir: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  return entries.sort().flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return yamlFiles(full)
    return /\.ya?ml$/.test(name) ? [full] : []
  })
}

function load<S extends z.ZodType>(file: string, schema: S, errors: string[]): z.output<S> | null {
  const result = schema.safeParse(parse(readFileSync(file, 'utf8')))
  if (result.success) return result.data
  errors.push(`${relative(ROOT, file)}:\n${z.prettifyError(result.error)}`)
  return null
}

/** Load and validate one dataset directory (data/real or data/demo). */
export interface DiscussionFile {
  path: string
  dir: string // folder under discussions/: '' or 'reddit'
  d: DiscussionSummary
}

/**
 * Puts each discussion summary on its subject, one per source, in DISCUSSION_SOURCES order
 * (StudentVIP first). StudentVIP summaries sit in discussions/, Reddit ones in discussions/reddit/.
 */
export function attachDiscussions(subjects: Dataset['subjects'], files: DiscussionFile[], errors: string[]): void {
  for (const { path, dir, d } of files) {
    const want = d.source === 'Reddit' ? 'reddit' : ''
    if (dir !== want) errors.push(`${path}: ${d.source} summaries go in discussions/${want && `${want}/`}`)
    const s = subjects[d.code]
    if (!s) errors.push(`${path}: ${d.code} is not a subject`)
    else if (s.discussions?.some((x) => x.source === d.source)) errors.push(`${path}: ${d.code} already has a ${d.source} summary`)
    else (s.discussions ??= []).push(d)
  }
  for (const s of Object.values(subjects)) {
    s.discussions?.sort((a, b) => DISCUSSION_SOURCES.indexOf(a.source) - DISCUSSION_SOURCES.indexOf(b.source))
  }
}

export function buildDataset(name: Dataset['name']): BuildResult {
  const base = join(ROOT, 'data', name)
  const errors: string[] = []
  const subjects: Dataset['subjects'] = {}

  for (const file of yamlFiles(join(base, 'subjects'))) {
    const s = load(file, subjectFileSchema, errors)
    if (!s) continue
    if (!file.endsWith(`${s.code}.yaml`)) errors.push(`${relative(ROOT, file)}: file name must be ${s.code}.yaml`)
    if (subjects[s.code]) errors.push(`${s.code} is defined twice`)
    subjects[s.code] = s
  }
  const courses = yamlFiles(join(base, 'courses'))
    .map((f) => load(f, courseFileSchema, errors))
    .filter((c) => c !== null)
  const components = yamlFiles(join(base, 'components'))
    .map((f) => load(f, componentFileSchema, errors))
    .filter((c) => c !== null)
  const diplomas = yamlFiles(join(base, 'diplomas'))
    .map((f) => load(f, diplomaFileSchema, errors))
    .filter((d) => d !== null)

  // A subject with no category of its own for a course gets one: the course's own areas are
  // `home`; any other subject is `other` (breadth) when the Handbook lists the course among those
  // that may take it as breadth, or doesn't say. Closed and graduate subjects get none.
  // What the files themselves say, before anything is derived: a subject no course takes on its
  // own (another degree's first-year subject) isn't assumed to be breadth when its page is silent.
  const placed = new Set(Object.values(subjects).filter((s) => Object.keys(s.categories).length > 0).map((s) => s.code))
  for (const c of courses) {
    if (!c.areaCategories) continue
    const { home, areas, other } = c.areaCategories
    for (const s of Object.values(subjects)) {
      if (s.categories[c.code] !== undefined || c.closed.includes(s.code) || s.level > 3) continue
      if (home && areas.includes(s.area)) s.categories[c.code] = home as Subject['categories'][string]
      else if (s.breadthFor ? s.breadthFor.includes(c.title) : placed.has(s.code)) s.categories[c.code] = other as Subject['categories'][string]
    }
    // A subject one of the course's majors makes compulsory counts as the course's own there
    // (MAST20034 is a commerce subject within Business Analytics).
    if (home) {
      for (const comp of components) {
        if (comp.course !== c.code || comp.requirements === 'unknown') continue
        for (const r of (comp.routes ?? [{ requirements: comp.requirements }]).flatMap((x) => x.requirements)) for (const code of 'all' in r ? r.all : []) {
          const s = subjects[code]
          if (s && s.categories[c.code] === undefined && !c.closed.includes(code)) s.categories[c.code] = home as Subject['categories'][string]
        }
      }
    }
  }

  // A course based on another counts every subject the way that course does, unless its own
  // file says otherwise or it closes the subject (B-SCIEXTD takes B-SCI's science and breadth).
  for (const c of courses) {
    if (!c.basedOn) continue
    if (!courses.some((x) => x.code === c.basedOn)) errors.push(`${c.code}: based_on names an unknown course ${c.basedOn}`)
    for (const s of Object.values(subjects)) {
      const cat = s.categories[c.basedOn]
      if (cat !== undefined && s.categories[c.code] === undefined && !c.closed.includes(s.code)) s.categories[c.code] = cat
    }
  }

  // ...and its students are admitted wherever that course's are: a subject open to "admission
  // into B-SCI" is open to B-SCIEXTD too (its students complete the B-SCI requirements).
  const based = courses.filter((c) => c.basedOn)
  if (based.length) {
    const widen = (e: ReqExpr): ReqExpr => {
      if ('all' in e) return { all: e.all.map(widen) }
      if ('any' in e) return { any: e.any.map(widen) }
      const named = 'admission' in e ? [e.admission] : 'manual' in e ? admissionCourses(e.manual) : []
      const extra = based.filter((c) => named.includes(c.basedOn!) && !named.includes(c.code)).map((c): ReqExpr => ({ admission: c.code }))
      // "… major in the B-SCI": the same major, held in the course based on it.
      if ('manual' in e) {
        const text = e.manual
        for (const c of based.filter((x) => namedComponents(text).some((n) => n.course === x.basedOn))) {
          extra.push({ all: [{ admission: c.code }, { manual: text.replace(new RegExp(String.raw`( in the )${c.basedOn}\b`, 'g'), `$1${c.code}`) }] })
        }
      }
      return extra.length ? { any: [e, ...extra] } : e
    }
    const field = (f: ReqField): ReqField => (f === 'none' || f === 'unknown' ? f : widen(f))
    for (const s of Object.values(subjects)) {
      s.prerequisites = field(s.prerequisites)
      s.corequisites = field(s.corequisites)
    }
  }

  mergeRatings(join(base, 'ratings.json'), subjects)
  // Grading next to students' own level, from shared grade bands (absent until enough have shared).
  const offsets = join(base, 'grade-offsets.json')
  if (existsSync(offsets)) {
    for (const [code, g] of Object.entries(JSON.parse(readFileSync(offsets, 'utf8')) as Record<string, GradeOffset>)) {
      const s = subjects[code]
      if (s && Number.isFinite(g.offset) && g.n >= MIN_GRADE_SHARES) s.gradeOffset = g
    }
  }

  // Summaries of public discussion, one file per subject.
  const discussions: DiscussionFile[] = []
  for (const file of yamlFiles(join(base, 'discussions'))) {
    const d = load(file, discussionFileSchema, errors)
    if (!d) continue
    if (!file.endsWith(`${d.code}.yaml`)) errors.push(`${relative(ROOT, file)}: file name must be ${d.code}.yaml`)
    discussions.push({ path: relative(ROOT, file), dir: relative(join(base, 'discussions'), dirname(file)), d })
  }
  attachDiscussions(subjects, discussions, errors)

  // What each subject is about, in short.
  for (const file of yamlFiles(join(base, 'about'))) {
    const a = load(file, aboutFileSchema, errors)
    if (!a) continue
    if (!file.endsWith(`${a.code}.yaml`)) errors.push(`${relative(ROOT, file)}: file name must be ${a.code}.yaml`)
    const s = subjects[a.code]
    if (!s) errors.push(`${relative(ROOT, file)}: ${a.code} is not a subject`)
    else s.about = a
  }

  // Titles in Chinese, one file for every subject.
  const titlesFile = join(base, 'subject-titles.yaml')
  if (existsSync(titlesFile)) {
    const titles = load(titlesFile, subjectTitlesFileSchema, errors) ?? {}
    for (const [code, t] of Object.entries(titles)) {
      const s = subjects[code]
      if (!s) errors.push(`${relative(ROOT, titlesFile)}: ${code} is not a subject`)
      else s.titles = t
    }
  }

  const missing = new Set<string>()
  for (const s of Object.values(subjects)) {
    for (const ref of [...referencedSubjects(s.prerequisites), ...referencedSubjects(s.corequisites)]) {
      if (!subjects[ref]) missing.add(ref)
    }
  }
  for (const c of components) if (components.filter((x) => x.id === c.id).length > 1) errors.push(`${c.id}: component id used twice`)
  for (const c of components) {
    if (c.requirements === 'unknown') continue
    for (const reqs of c.routes ? c.routes.map((x) => x.requirements) : [c.requirements])
      for (const r of reqs) for (const code of 'all' in r ? r.all : r.choose.from) if (!subjects[code]) missing.add(code)
    for (const m of c.requiresMajor) if (!components.some((x) => x.id === m)) errors.push(`${c.id}: unknown major ${m}`)
  }

  for (const d of diplomas) {
    for (const id of [...d.streams, ...d.notWith]) if (!components.some((x) => x.id === id)) errors.push(`${d.code}: unknown component ${id}`)
    for (const code of d.pool.subjects) if (!subjects[code]) missing.add(code)
    for (const r of d.rules) {
      if (r.kind === 'compulsory') r.subjects.forEach((code) => subjects[code] || missing.add(code))
      if (r.kind === 'requirement') for (const path of r.paths) for (const q of path) for (const code of 'all' in q ? q.all : q.choose.from) if (!subjects[code]) missing.add(code)
    }
  }
  for (const c of courses) for (const r of c.rules) if (r.kind === 'compulsory') r.subjects.forEach((code) => subjects[code] || missing.add(code))
  for (const c of courses) for (const r of c.rules) if (r.kind === 'requirement') for (const path of r.paths) for (const q of path) for (const code of 'all' in q ? q.all : q.choose.from) if (!subjects[code]) missing.add(code)

  const dataset: Dataset = { name, generatedAt: new Date().toISOString(), subjects, courses, components, ...(diplomas.length ? { diplomas } : {}) }
  return { dataset, errors, missing: [...missing].sort() }
}

/** Minimum reviews before crowd skill tags are trusted (signals are shrunk by the engine instead). */
const MIN_REVIEWS_FOR_SKILLS = 3

/**
 * Fold aggregated crowd ratings (written daily by scripts/ratings/fetch.ts) into the
 * subjects. Curated values win: a subject's own `signals`/`skills` are never overwritten.
 */
function mergeRatings(file: string, subjects: Dataset['subjects']): void {
  if (!existsSync(file)) return
  const ratings = JSON.parse(readFileSync(file, 'utf8')) as Record<
    string,
    {
      reviews: number
      difficulty: number | null
      workload: number | null
      grading: number | null
      skills: string[]
      examDifficulty?: number | null
      usefulness?: number | null
      interest?: number | null
      teaching?: number | null
      hoursMedian?: number | null
      recommendRate?: number | null
      overall?: number | null
      overallCount?: number
    }
  >
  for (const [code, r] of Object.entries(ratings)) {
    const s = subjects[code]
    if (!s) continue
    const extra = (x: number | null | undefined) => x ?? undefined
    s.signals ??= {
      difficulty: extra(r.difficulty),
      workload: extra(r.workload),
      grading: extra(r.grading),
      reviews: r.reviews,
      examDifficulty: extra(r.examDifficulty),
      usefulness: extra(r.usefulness),
      interest: extra(r.interest),
      teaching: extra(r.teaching),
      hours: extra(r.hoursMedian),
      recommend: extra(r.recommendRate),
      overall: extra(r.overall),
      overallCount: r.overall == null ? undefined : r.overallCount,
    }
    if (s.skills.length === 0 && r.reviews >= MIN_REVIEWS_FOR_SKILLS) {
      s.skills = r.skills.filter((k): k is Skill => (SKILLS as readonly string[]).includes(k))
    }
  }
}

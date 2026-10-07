import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'
import { referencedSubjects } from '../src/engine/expr'
import { componentFileSchema, courseFileSchema, SKILLS, subjectFileSchema, type Dataset, type Skill } from '../src/engine/schema'

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

  mergeRatings(join(base, 'ratings.json'), subjects)

  const missing = new Set<string>()
  for (const s of Object.values(subjects)) {
    for (const ref of [...referencedSubjects(s.prerequisites), ...referencedSubjects(s.corequisites)]) {
      if (!subjects[ref]) missing.add(ref)
    }
  }
  for (const c of components) {
    if (c.requirements === 'unknown') continue
    for (const r of c.requirements) for (const code of 'all' in r ? r.all : r.choose.from) if (!subjects[code]) missing.add(code)
    for (const m of c.requiresMajor) if (!components.some((x) => x.id === m)) errors.push(`${c.id}: unknown major ${m}`)
  }

  return {
    dataset: { name, generatedAt: new Date().toISOString(), subjects, courses, components },
    errors,
    missing: [...missing].sort(),
  }
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
      difficulty: number
      workload: number
      grading: number
      skills: string[]
      examDifficulty?: number | null
      usefulness?: number | null
      interest?: number | null
      teaching?: number | null
    }
  >
  for (const [code, r] of Object.entries(ratings)) {
    const s = subjects[code]
    if (!s) continue
    const extra = (x: number | null | undefined) => x ?? undefined
    s.signals ??= {
      difficulty: r.difficulty,
      workload: r.workload,
      grading: r.grading,
      reviews: r.reviews,
      examDifficulty: extra(r.examDifficulty),
      usefulness: extra(r.usefulness),
      interest: extra(r.interest),
      teaching: extra(r.teaching),
    }
    if (s.skills.length === 0 && r.reviews >= MIN_REVIEWS_FOR_SKILLS) {
      s.skills = r.skills.filter((k): k is Skill => (SKILLS as readonly string[]).includes(k))
    }
  }
}

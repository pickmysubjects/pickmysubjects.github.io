import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'
import { referencedSubjects } from '../src/engine/expr'
import { componentFileSchema, courseFileSchema, subjectFileSchema, type Dataset } from '../src/engine/schema'

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

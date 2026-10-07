import { buildDataset } from '../scripts/dataset'
import { subjectFileSchema, type Dataset, type Subject } from '../src/engine/schema'

export function demo(): Dataset {
  const { dataset, errors } = buildDataset('demo')
  if (errors.length) throw new Error(errors.join('\n'))
  return dataset
}

/** Build a subject from YAML-shaped input, applying the real schema (and its defaults). */
export function subject(raw: Record<string, unknown>): Subject {
  return subjectFileSchema.parse({ level: 1, points: 12.5, source_year: 2026, title: 'Test', ...raw })
}

export function dataset(subjects: Subject[], extra: Partial<Dataset> = {}): Dataset {
  return {
    name: 'demo',
    generatedAt: '',
    subjects: Object.fromEntries(subjects.map((s) => [s.code, s])),
    courses: [],
    components: [],
    ...extra,
  }
}

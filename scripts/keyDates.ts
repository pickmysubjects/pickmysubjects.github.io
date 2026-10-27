/** Reads and validates data/real/keyDates/*.yaml into the list the app uses (one source for every page). */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'
import { keyDatesFileSchema } from '../src/utils/keyDatesSchema'
import type { KeyDate } from '../src/utils/keyDates'

export function buildKeyDates(root: string): { dates: KeyDate[]; checked: string; errors: string[] } {
  const dir = join(root, 'data', 'real', 'keyDates')
  const errors: string[] = []
  const dates: KeyDate[] = []
  let checked = ''
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.yaml')).sort()) {
    const result = keyDatesFileSchema.safeParse(parse(readFileSync(join(dir, name), 'utf8')))
    if (!result.success) {
      errors.push(`data/real/keyDates/${name}:\n${z.prettifyError(result.error)}`)
      continue
    }
    const f = result.data
    if (name !== `${f.year}.yaml`) errors.push(`data/real/keyDates/${name}: file name must be ${f.year}.yaml`)
    if (f.checked > checked) checked = f.checked
    for (const d of f.dates) dates.push({ id: `${f.year}-${d.term}-${d.kind}`, kind: d.kind, year: f.year, term: d.term, start: d.start, end: d.end ?? d.start, url: d.source })
  }
  for (const d of dates) if (dates.filter((x) => x.id === d.id).length > 1) errors.push(`key dates: ${d.id} listed twice`)
  return { dates, checked, errors: [...new Set(errors)] }
}

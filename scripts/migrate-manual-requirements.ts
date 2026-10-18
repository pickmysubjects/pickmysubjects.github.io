/**
 * One-off: rewrite the free-text (`manual:`) requirements in data/real/subjects that
 * structuredFromText can now read as rules, and drop the bare "Equivalent" options. Whatever it
 * can't read confidently stays as it was. New imports get the same through the paste parser.
 *
 *   npx tsx scripts/migrate-manual-requirements.ts                         (dry run)
 *   npx tsx scripts/migrate-manual-requirements.ts --write
 *   npx tsx scripts/migrate-manual-requirements.ts --write --skip codes.txt (leave these codes alone)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { parse, stringify } from 'yaml'
import { restructure } from '../src/engine/handbookPaste'
import type { ReqExpr, ReqField } from '../src/engine/schema'
import { compactReq } from '../src/engine/serialize'
import { ROOT } from './dataset'

const { values } = parseArgs({ options: { write: { type: 'boolean', default: false }, skip: { type: 'string' } } })
const skip = new Set(values.skip ? readFileSync(values.skip, 'utf8').split(/\s+/).filter(Boolean) : [])
const DIR = join(ROOT, 'data/real/subjects')

/** The YAML's shorthand ("COMP10001" for { subject: … }) as full expressions. */
function expand(raw: unknown): ReqField {
  if (raw === 'none' || raw === 'unknown') return raw
  if (typeof raw === 'string') return { subject: raw }
  const e = raw as Record<string, unknown>
  if (Array.isArray(e.all)) return { all: e.all.map(expand) as ReqExpr[] }
  if (Array.isArray(e.any)) return { any: e.any.map(expand) as ReqExpr[] }
  return e as ReqExpr
}

function manualLeaves(field: ReqField): string[] {
  if (field === 'none' || field === 'unknown') return []
  if ('manual' in field) return [field.manual]
  if ('all' in field) return field.all.flatMap(manualLeaves)
  if ('any' in field) return field.any.flatMap(manualLeaves)
  return []
}

/** The cluster a converted text falls in, by the kinds of rule it became. */
function cluster(text: string): string {
  const t = text.trim().replace(/^equivalent\.?\s+(?=[A-Z])/, '')
  const out = restructure({ manual: t })
  if (out === 'none' || out === 'unknown') return 'equivalent (dropped)'
  const json = JSON.stringify(out)
  if (json === JSON.stringify({ manual: t })) return /^(?:an? )?(?:approved )?equivalent\.?$/i.test(t) ? 'equivalent (dropped)' : 'left'
  for (const kind of ['average', 'wam', 'concurrent', 'placement', 'school', 'permission', 'points', 'admission']) {
    if (json.includes(`"${kind}"`)) return kind === 'wam' ? 'average' : kind
  }
  return 'other'
}

/** Roughly what a text left as free text is about, for the report. */
function leftKind(text: string): string {
  if (/\bonly available to|\bmajor\b|\bspeciali[sz]ation\b|\bentry point\b|\bBachelor of\b|\b(?:B|MC|GD|GC)-[A-Z]{2,}/i.test(text)) return 'course / major / entry point'
  if (/\bVCE\b/.test(text)) return 'school'
  if (/credit points|\bpoints\b|\blevel[- ]?\d/i.test(text)) return 'points'
  if (/placement|application|permission|approval|quota/i.test(text)) return 'placement / permission'
  return 'other'
}

const converted = new Map<string, number>()
const left = new Map<string, number>()
let files = 0
for (const name of readdirSync(DIR).filter((f) => f.endsWith('.yaml')).sort()) {
  if (skip.has(name.replace(/\.yaml$/, ''))) continue
  const path = join(DIR, name)
  const text = readFileSync(path, 'utf8')
  if (!text.includes('manual:')) continue
  const doc = parse(text) as Record<string, unknown>
  let changed = false
  for (const key of ['prerequisites', 'corequisites']) {
    const before = expand(doc[key])
    const leaves = manualLeaves(before)
    if (!leaves.length) continue
    const after = restructure(before)
    const remaining = new Set(manualLeaves(after))
    for (const leaf of leaves) {
      if (remaining.has(leaf)) left.set(leftKind(leaf), (left.get(leftKind(leaf)) ?? 0) + 1)
      else converted.set(cluster(leaf), (converted.get(cluster(leaf)) ?? 0) + 1)
    }
    const compact = compactReq(after)
    if (JSON.stringify(compact) !== JSON.stringify(doc[key])) {
      doc[key] = compact
      changed = true
    }
  }
  if (!changed) continue
  files++
  if (values.write) writeFileSync(path, stringify(doc, { lineWidth: 0 }))
}

const total = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0)
console.log(`${values.write ? 'Rewrote' : 'Would rewrite'} ${files} files.`)
console.log(`Converted ${total(converted)} free-text conditions:`)
for (const [k, n] of [...converted].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${n}`)
console.log(`Left as free text: ${total(left)}`)
for (const [k, n] of [...left].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${n}`)

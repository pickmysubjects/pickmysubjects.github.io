import { describe, expect, it } from 'vitest'
import { checkCourse } from '../src/engine/courseRules'
import { generatePlan } from '../src/engine/generate'
import { checkTerms } from '../src/engine/planCheck'
import { recommend, type Profile } from '../src/engine/recommend'
import { LOCALES, interpolate } from '../src/i18n'
import { en } from '../src/i18n/messages/en'
import { PAIN_POINTS } from '../src/painPoints'
import { demo } from './helpers'

function lookup(messages: unknown, key: string): string | undefined {
  let node: unknown = messages
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string).sort()
}

function leafKeys(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix]
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => leafKeys(v, prefix ? `${prefix}.${k}` : k))
}

/** Every message key the engine can emit while planning and recommending on demo data. */
function engineKeys(): string[] {
  const data = demo()
  const profile: Profile = {
    results: [{ code: 'EXCS10001', mark: 45 }, { code: 'EXMA10002', mark: 85 }],
    skills: { maths: 1, programming: 5 },
    interests: ['ai'],
    goal: 'balanced',
  }
  const { plan, notes } = generatePlan({ data, profile, course: 'EX-SCI', courseYear: 2026, major: 'ex-data-science', startYear: 2027, startPeriod: 'semester-1' })
  // Force some problems so issue keys show up too.
  plan.terms[0]?.subjects.push('EXCS30001', 'ZZZZ10001', 'EXCS90001')
  const issues = [...checkTerms(plan, data), ...checkCourse(plan, data).issues]
  const recs = recommend(data, profile, { course: 'EX-SCI' })
  return [
    ...issues.filter((i) => !i.kind.startsWith('rule-')).map((i) => `issue.${i.kind}`),
    ...checkCourse(plan, data).statuses.map((s) => `ruleDetail.${s.detailKey}`),
    ...notes.map((n) => `genNote.${n.key}`),
    ...recs.flatMap((r) => [...r.reasons, ...r.warnings]).map((n) => `reason.${n.key}`),
  ]
}

describe('i18n', () => {
  const keys = [...new Set(engineKeys())]

  it('the engine produced a meaningful sample of keys', () => {
    expect(keys.length).toBeGreaterThan(15)
  })

  for (const locale of LOCALES) {
    it(`${locale.code}: has every key and keeps every placeholder`, () => {
      for (const key of [...keys, ...leafKeys(en)]) {
        const text = lookup(locale.messages, key)
        expect(text, `${locale.code} is missing ${key}`).toBeTypeOf('string')
        const source = lookup(en, key)
        if (source) expect(placeholders(text as string), `${locale.code} ${key}`).toEqual(placeholders(source))
      }
    })
  }

  it('every pain point has a question and an answer', () => {
    for (const p of PAIN_POINTS) {
      expect(lookup(en, `pain.${p.id}.q`)).toBeTypeOf('string')
      expect(lookup(en, `pain.${p.id}.a`)).toBeTypeOf('string')
    }
  })

  it('interpolates and leaves unknown placeholders visible', () => {
    expect(interpolate('{a} and {b}', { a: 1 })).toBe('1 and {b}')
  })
})

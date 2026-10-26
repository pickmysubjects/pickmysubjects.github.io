import type { Subject } from '../engine/schema'
import { FACT_KEYS, type FactKey, type StudentFacts } from '../engine/studentFacts'
import type { Translate } from '../i18n/interpolate'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * The short labels of a subject's student-reported facts, in a fixed order: "Closed-book exam",
 * "Lectures recorded", …, then the languages by how many named them. Only what met the bar is in
 * the data, so everything here is shown. `skip` leaves out items the Handbook already answers.
 */
export function factLabels(t: Translate, facts: StudentFacts | undefined, skip: ReadonlySet<FactKey | 'languages'> = new Set()): string[] {
  if (!facts) return []
  const labels: string[] = []
  for (const k of FACT_KEYS) {
    const f = facts[k]
    if (f && !skip.has(k)) labels.push(t(`studentFacts.${k}.${f.value}`))
  }
  return skip.has('languages') ? labels : [...labels, ...Object.keys(facts.languages ?? {})]
}

export type FactsSource = Partial<Pick<Subject, 'studentFacts' | 'prescribedTexts' | 'examBook' | 'languages'>>

/**
 * One facts row from two sources. The Handbook's facts always show; a student fact shows only
 * for an item the Handbook doesn't answer (exam format, languages), so there the Handbook wins.
 * Prescribed texts are a different question from the students' "paid for a textbook or online
 * homework access", so both show.
 */
export function factsRow(t: Translate, s: FactsSource): { handbook: string[]; students: string[]; n: number } {
  const handbook: string[] = []
  const skip = new Set<FactKey | 'languages'>()
  if (s.examBook) {
    handbook.push(t(`studentFacts.exam.${s.examBook}`))
    skip.add('exam')
  }
  if (s.prescribedTexts !== undefined) {
    handbook.push(t(`studentFacts.texts.${s.prescribedTexts ? 'yes' : 'no'}`))
  }
  if (s.languages?.length) {
    handbook.push(...s.languages)
    skip.add('languages')
  }
  const students = factLabels(t, s.studentFacts, skip)
  return { handbook, students, n: students.length ? (s.studentFacts?.n ?? 0) : 0 }
}

/** The same row as static HTML for the prerendered subject page, or '' when there's nothing. */
export function studentFactsHtml(t: Translate, s: FactsSource): string {
  const { handbook, students, n } = factsRow(t, s)
  if (!handbook.length && !students.length) return ''
  const parts: string[] = []
  if (handbook.length) parts.push(`<strong>${esc(t('studentFacts.handbook'))}:</strong> ${esc(handbook.join(' · '))}`)
  if (students.length) parts.push(`<strong>${esc(t('studentFacts.title'))}:</strong> ${esc(students.join(' · '))} <small>${esc(t('studentFacts.count', { n }))}</small>`)
  return `<p class="student-facts">${parts.join(' ')}</p><p><small>${esc(t('studentFacts.info'))}</small></p>`
}

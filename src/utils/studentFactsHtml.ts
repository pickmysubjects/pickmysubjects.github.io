import { FACT_KEYS, type StudentFacts } from '../engine/studentFacts'
import type { Translate } from '../i18n/interpolate'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * The short labels of a subject's student-reported facts, in a fixed order: "Closed-book exam",
 * "Lectures recorded", …, then the languages by how many named them. Only what met the bar is in
 * the data, so everything here is shown.
 */
export function factLabels(t: Translate, facts: StudentFacts | undefined): string[] {
  if (!facts) return []
  const labels: string[] = []
  for (const k of FACT_KEYS) {
    const f = facts[k]
    if (f) labels.push(t(`studentFacts.${k}.${f.value}`))
  }
  return [...labels, ...Object.keys(facts.languages ?? {})]
}

/** The same row as static HTML for the prerendered subject page, or '' when there's nothing. */
export function studentFactsHtml(t: Translate, facts: StudentFacts | undefined): string {
  const labels = factLabels(t, facts)
  if (!facts || !labels.length) return ''
  return `<p class="student-facts"><strong>${esc(t('studentFacts.title'))}:</strong> ${esc(labels.join(' · '))} <small>${esc(t('studentFacts.count', { n: facts.n }))}</small></p><p><small>${esc(t('studentFacts.info'))}</small></p>`
}

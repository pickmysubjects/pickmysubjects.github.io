import type { FitBasis } from '@/engine'
import type { Translate } from './interpolate'

/**
 * What a fit rests on, in the reader's language ("Based on 2 marks, 1 interest — add more marks
 * for a surer fit"): only what the profile has, then the one thing still missing, if any.
 */
export function basisText(t: Translate, b: FitBasis): string {
  const part = (n: number, many: string, one: string) => (n === 0 ? [] : [n === 1 ? t(`fit.basis.${one}`) : t(`fit.basis.${many}`, { n })])
  const parts = [...part(b.marks, 'marks', 'markOne'), ...part(b.interests, 'interests', 'interestOne'), ...part(b.skills, 'skills', 'skillOne')]
  const lead = parts.length ? t('fit.basis.lead', { parts: parts.join(t('fit.basis.sep')) }) : t('fit.basis.none')
  return lead + (b.missing ? t(`fit.basis.more.${b.missing}`) : '')
}

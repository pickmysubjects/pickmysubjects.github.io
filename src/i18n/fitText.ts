import type { FitBasis, FitFactor, RankReason } from '@/engine'
import { localList, type Translate } from './interpolate'

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

const names = (t: Translate, prefix: string, list: unknown) => localList(t, list, (x) => t(`${prefix}.${x}`))

/** One reason a suggestion scores low, in the student's terms (see whyNotFit). */
export function whyText(t: Translate, f: FitFactor): string {
  const p = f.params
  switch (f.key) {
    case 'skillFit':
      return p.weak ? t('fit.why.skillFit', { skills: names(t, 'skill', p.weak) }) : t('fit.why.skillFitNone', { skills: names(t, 'skill', p.uses) })
    case 'interest':
      return p.topics ? t('fit.why.interest', { topics: names(t, 'topic', p.topics), mine: names(t, 'topic', p.mine) }) : t('fit.why.interestUnknown')
    case 'predicted':
      return p.wam !== undefined ? t('fit.why.predictedWam', { wam: p.wam }) : p.codes ? t('fit.why.predicted', { ...p, codes: localList(t, p.codes) }) : t('fit.why.predictedWam', { wam: p.mark ?? '' })
    case 'ease': {
      const exam = Number(p.exam ?? -1)
      if (exam >= 50 && (p.goal === 'wam' || p.goal === 'easy')) return t('fit.why.easeExamWam', { exam })
      if (p.rated !== undefined) return t('fit.why.easeRated', p)
      return exam >= 0 ? t('fit.why.easeExam', { exam, hurdles: p.hurdles ?? 0 }) : t('fit.why.ease')
    }
    case 'opens':
      return Number(p.n) > 0 ? t('fit.why.opens', p) : t('fit.why.opensNone')
    case 'offTopicStruggle':
      return t('fit.why.offTopicStruggle', { skills: names(t, 'skill', p.skills) })
    case 'neutral':
      return t('fit.why.neutral', { skills: names(t, 'skill', p.skills) })
    default:
      return t(`fit.why.${f.key}`, typeof p.codes === 'string' ? { ...p, codes: localList(t, p.codes) } : p)
  }
}

/** A list reason in this language ("1 other hurdle task", not "1 other hurdle tasks"). */
export function rankReasonText(t: Translate, r: RankReason): string {
  const p = r.params && typeof r.params.codes === 'string' ? { ...r.params, codes: localList(t, r.params.codes) } : r.params
  return t(r.key === 'hurdles' && r.params?.n === 1 ? 'rank.reason.hurdlesOne' : `rank.reason.${r.key}`, p)
}

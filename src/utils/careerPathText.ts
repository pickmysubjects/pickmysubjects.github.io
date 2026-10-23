import { careerName, type CareerLang } from '../engine/careers'
import type { Merit, TieredSubject, TierReason } from '../engine/careerPaths'
import type { Translate } from '../i18n/interpolate'

/** One reason in words: "Required for CPA Australia…", "Covers Accounting; employers ask for Budgeting". */
export function reasonText(t: Translate, r: TierReason): string {
  const sep = t('listSep')
  switch (r.kind) {
    case 'acc':
      return r.role === 'required'
        ? t('careerPath.reason.accRequired', { body: r.body })
        : r.role === 'oneOf'
          ? t('careerPath.reason.accOneOf', { body: r.body, others: (r.others ?? []).join(` ${t('careers.or')} `) })
          : r.role === 'breadth'
            ? t('careerPath.reason.accBreadth', { body: r.body })
            : t('careerPath.reason.accRecommended', { body: r.body })
    case 'helpful':
      return t('careerPath.reason.helpful')
    case 'field': {
      const topics = r.topics.map((x) => t(`topic.${x}`)).join(sep)
      return r.from.length ? t('careerPath.reason.fieldFrom', { topics, skills: few(r.from) }) : t('careerPath.reason.field', { topics })
    }
    case 'touches':
      return t('careerPath.reason.touches', { topics: r.topics.map((x) => t(`topic.${x}`)).join(sep) })
    case 'near':
      return t('careerPath.reason.near', { topics: r.topics.map((x) => t(`topic.${x}`)).join(sep) })
    case 'skill':
      return t('careerPath.reason.skill', { skills: r.skills.map((x) => t(`skill.${x}`)).join(sep), from: few(r.from) })
  }
}

/** Up to three of the employer skills behind a reason (the rest are on the page's header). */
const few = (list: string[]) => list.slice(0, 3).join(', ') + (list.length > 3 ? ' …' : '')

export function meritText(t: Translate, m: Merit): string {
  return t(`careerPath.merit.${m}`)
}

/**
 * The line under a subject: its reasons; for a subject not much related, what it has going for it
 * instead (never "useless").
 */
export function subjectNote(t: Translate, row: TieredSubject): string {
  if (row.tier !== 'little') return row.reasons.map((r) => reasonText(t, r)).join(' · ')
  return row.merits.length ? row.merits.map((m) => meritText(t, m)).join(' · ') : t('careerPath.meritNone')
}

/** A career's name for titles: ours in the reader's language, else the English one. */
export function careerShortName(names: Record<CareerLang, string>, locale: string): string {
  return careerName(names, locale) || names.en
}

/** "an" before a vowel sound: a vowel letter (not a "you" u: user, unit), or an acronym read as a vowel (an ICT…). */
function article(word: string): 'a' | 'an' {
  if (/^[A-Z]{2,}\b/.test(word)) return /^[AEFHILMNORSX]/.test(word) ? 'an' : 'a'
  const w = word.toLowerCase()
  if (/^u[^aeiou][aeiou]/.test(w) || /^(eu|one\b|uni)/.test(w)) return 'a'
  return /^[aeiou]/.test(w) || /^hour/.test(w) ? 'an' : 'a'
}

/**
 * A career's name to use inside a sentence. English: with "a"/"an", in lower case, without a
 * bracketed note ("Accountant (General)" → "an accountant"), acronyms kept (an ICT business
 * analyst). Other languages have no article to add: our own name, as in titles.
 */
export function careerPhrase(names: Record<CareerLang, string>, locale: string): string {
  if (careerName(names, locale)) return careerName(names, locale)
  const name = names.en.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  const lower = name
    .split(' ')
    .map((w) => (/^[A-Z][a-z]/.test(w) ? w.toLowerCase() : w))
    .join(' ')
  return `${article(name)} ${lower}`
}

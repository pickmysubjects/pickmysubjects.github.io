import type { DiscussionSection, DiscussionSummary } from './schema'
import { DISCUSSION_SECTIONS } from './schema'

/**
 * What a review summary's sentences talk about, so the subject page can show topic chips
 * (exam, group work, teaching …) and light up the sentences behind one, the way review sites
 * show "mentioned in reviews" topics. Read off each sentence's English text; every language's
 * sentence at the same place says the same thing, so the match carries over.
 */
export const REVIEW_ASPECTS = ['exam', 'assessment', 'group', 'teaching', 'marking', 'workload', 'background', 'resources'] as const
export type ReviewAspect = (typeof REVIEW_ASPECTS)[number]

const MATCH: Record<ReviewAspect, RegExp> = {
  exam: /\b(exams?|finals?|msts?|mid-?sem(ester)?s?|tests?)\b/i,
  assessment: /\b(assignments?|essays?|reports?|projects?|quiz(zes)?|presentations?|labs?)\b/i,
  group: /\bgroups?\b/i,
  teaching: /\b(lectur\w*|tutor\w*|teach\w*|coordinat\w*|staff|explain\w*)\b/i,
  marking: /\b(mark(s|ing|ed|er)?|grad(e|es|ing|ed)|harsh\w*|generous\w*|scal(ed|ing)|h1s?|wam)\b/i,
  workload: /\b(workload|heavy|time-consuming|readings?|a lot of work|content-heavy|busy|hours)\b/i,
  background: /\b(prereq\w*|background|assum\w*|prior|foundation\w*)\b/i,
  resources: /\b(past (papers?|exams?)|solutions?|recordings?|recorded|slides|textbooks?|notes|practice questions?)\b/i,
}

/** A sentence's place in a summary: its section (or 'points' when there are no sections) and index. */
export interface SentenceRef {
  part: DiscussionSection | 'points'
  index: number
}

/** The aspects one sentence mentions (its English text, emphasis marks removed). */
export function aspectsOf(english: string): ReviewAspect[] {
  const text = plainEmphasis(english)
  return REVIEW_ASPECTS.filter((a) => MATCH[a].test(text))
}

/** Each aspect the summary mentions, with the sentences that do, most-mentioned first (ties keep the list order). */
export function summaryAspects(d: Pick<DiscussionSummary, 'points' | 'sections'>): { aspect: ReviewAspect; refs: SentenceRef[] }[] {
  const refs = new Map<ReviewAspect, SentenceRef[]>()
  const add = (english: string | undefined, ref: SentenceRef) => {
    for (const a of aspectsOf(english ?? '')) refs.set(a, [...(refs.get(a) ?? []), ref])
  }
  if (d.sections) {
    for (const part of DISCUSSION_SECTIONS) d.sections[part]?.forEach((p, index) => add(p.en, { part, index }))
  } else {
    d.points.forEach((p, index) => add(p.en, { part: 'points', index }))
  }
  return REVIEW_ASPECTS.filter((a) => refs.has(a))
    .map((aspect) => ({ aspect, refs: refs.get(aspect)! }))
    .sort((x, y) => y.refs.length - x.refs.length)
}

/**
 * Emphasis in summary text: the one key phrase of a sentence written as **phrase**. Split into
 * parts for the page (strong or not); unmatched marks are left as they are.
 */
export function emphasisParts(text: string): { text: string; strong: boolean }[] {
  const out: { text: string; strong: boolean }[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), strong: false })
    out.push({ text: m[1]!, strong: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), strong: false })
  return out
}

/** The same text without emphasis marks, for places that show plain text (descriptions, cards). */
export function plainEmphasis(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1')
}

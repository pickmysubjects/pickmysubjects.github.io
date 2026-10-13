import { periodsFor, type Subject } from '@/engine'
import { describeReq } from './format'
import type { Translate } from './index'
import { pickLocalized } from './localized'

export interface FaqItem {
  q: string
  a: string
}

export interface FaqContext {
  year: number
  /** The student's course, so requirements read as they apply to them. */
  course: string
  /** Codes of the subjects that list this one as a prerequisite. */
  unlocks: string[]
  /** List join (", " or "、"). */
  listSep: string
  /** Join between sentences (" " or "" for CJK). */
  sentenceSep: string
  /** Page language, to pick our review summary's translation. */
  locale: string
}

/** How many follow-on subjects to name in an answer. */
const NAMED_UNLOCKS = 4

/**
 * The questions students ask about a subject ("Is it hard?", "Is there an exam?"),
 * answered only from facts we hold. A question we can't answer is left out, never guessed.
 * Shared by the subject page and the prerendered page, so both say the same thing.
 */
export function subjectFaq(t: Translate, s: Subject, ctx: FaqContext): FaqItem[] {
  const code = s.code
  const items: FaqItem[] = []
  const join = (parts: string[]) => parts.filter(Boolean).join(ctx.sentenceSep)

  if (s.offerings !== 'unknown') {
    const periods = periodsFor(s, ctx.year)
    items.push({
      q: t('faq.whenQ', { code }),
      a: periods.length
        ? t('seo.runs', { year: ctx.year, periods: periods.map((p) => t(`period.${p}`)).join(ctx.listSep) })
        : t('seo.notRunning', { year: ctx.year }),
    })
  }

  if (s.prerequisites !== 'unknown') {
    const coreq =
      s.corequisites !== 'none' && s.corequisites !== 'unknown' ? t('faq.coreq', { coreq: describeReq(t, s.corequisites, ctx.course) }) : ''
    items.push({
      q: t('faq.prereqQ', { code }),
      a: join([
        s.prerequisites === 'none' ? t('seo.noPrereq') : t('seo.needs', { needs: describeReq(t, s.prerequisites, ctx.course) }),
        coreq,
      ]),
    })
  }

  if (s.assessment) {
    const exams = s.assessment.filter((task) => task.kind === 'exam')
    const share = Math.round(exams.reduce((sum, task) => sum + task.weight, 0))
    const byKind = new Map<string, number>()
    for (const task of s.assessment) byKind.set(task.kind, (byKind.get(task.kind) ?? 0) + task.weight)
    const parts = [...byKind].map(([k, w]) => `${t(`assess.kind.${k}`)} ${Math.round(w)}%`).join(ctx.listSep)
    items.push({
      q: t('faq.examQ', { code }),
      a: join([
        share > 0 ? t('faq.examYes', { n: share }) : t('faq.examNo'),
        exams.some((task) => task.hurdle) ? t('faq.examHurdle') : '',
        t('seo.assessment', { parts }),
      ]),
    })
  }

  const sig = s.signals && s.signals.reviews >= 3 ? s.signals : undefined
  const rated = sig && sig.difficulty !== undefined && sig.workload !== undefined
  if (rated || s.discussion) {
    const d = s.discussion
    items.push({
      q: t('faq.hardQ', { code }),
      a: join([
        rated ? t('faq.hardRated', { d: sig.difficulty ?? 0, w: sig.workload ?? 0, n: sig.reviews }) : '',
        d?.points[0] ? t('faq.hardDiscuss', { n: d.reviews, source: d.source, point: pickLocalized(d.points[0], ctx.locale) }) : '',
      ]),
    })
  }

  if (s.weeklyContactHours) {
    items.push({ q: t('faq.hoursQ', { code }), a: t('assess.hours', { n: s.weeklyContactHours }) })
  }

  if (s.breadthFor) {
    items.push({
      q: t('faq.breadthQ', { code }),
      a: s.breadthFor.length ? t('faq.breadthYes', { courses: s.breadthFor.join(ctx.listSep) }) : t('faq.breadthNo'),
    })
  }

  if (ctx.unlocks.length) {
    items.push({
      q: t('faq.leadsQ', { code }),
      a: t('faq.leadsA', { n: ctx.unlocks.length, codes: ctx.unlocks.slice(0, NAMED_UNLOCKS).join(ctx.listSep) }),
    })
  }

  return items
}

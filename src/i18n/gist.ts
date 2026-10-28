import type { ReqExpr, ReqField, Subject } from '@/engine'
import type { Translate } from './interpolate'

// Exam share at or above this reads as exam-heavy; at or below COURSEWORK as mostly coursework.
const EXAM_HEAVY = 60
const COURSEWORK = 40

/**
 * The few facts students ask first, written the way they say them: how much the final exam is
 * worth, how many hours of class a week, whether there's group work. Only from recorded data;
 * nothing is said about what isn't recorded. Used on the subject page and in its static HTML.
 */
export function subjectGist(t: Translate, s: Subject, opts: { exam?: boolean } = {}): string[] {
  const out: string[] = []
  const tasks = s.assessment ?? []
  const exam = finalExamShare(s)
  // The subject page's hero shows the exam share as its own fact; it asks for the rest only.
  if (exam !== null && opts.exam !== false) {
    out.push(
      exam === 0
        ? t('gist.noExam')
        : exam >= EXAM_HEAVY
          ? t('gist.examHeavy', { n: exam })
          : exam <= COURSEWORK
            ? t('gist.examLight', { n: exam })
            : t('gist.exam', { n: exam }),
    )
  }
  if (s.weeklyContactHours) out.push(t('gist.classHours', { n: s.weeklyContactHours }))
  else if (s.signals?.hours && s.signals.reviews >= 3) out.push(t('gist.reportedHours', { n: s.signals.hours }))
  // The share matters more than the fact: 10% in a group is very different from 60%.
  const group = Math.round(tasks.filter((x) => x.group).reduce((a, x) => a + x.weight, 0))
  if (group > 0) out.push(t('assess.group', { n: group }))
  else if (tasks.some((x) => x.group)) out.push(t('gist.group'))
  if (s.passFail) out.push(t('gist.passFail'))
  return out
}

/** The final exam's share of the mark (0 when there is none), or null when the assessment isn't recorded. */
export function finalExamShare(s: Subject): number | null {
  const tasks = s.assessment ?? []
  return tasks.length ? tasks.filter((x) => x.kind === 'exam').reduce((sum, x) => sum + x.weight, 0) : null
}

/**
 * Prerequisites in a word or two, for the subject page's facts: none, the subject, "A + B", or
 * how many to choose from; anything more involved is "see below", where the full rule is.
 */
export function prereqGist(t: Translate, needs: ReqField): string {
  if (needs === 'none') return t('subject.factNone')
  if (needs === 'unknown') return t('subject.factUnknown')
  if ('subject' in needs) return needs.subject
  const plain = (xs: ReqExpr[]) => xs.every((x) => 'subject' in x)
  if ('all' in needs && plain(needs.all)) {
    return needs.all.length <= 2 ? needs.all.map((x) => ('subject' in x ? x.subject : '')).join(' + ') : t('subject.prereqAllOf', { n: needs.all.length })
  }
  if ('any' in needs) return t(plain(needs.any) ? 'subject.prereqOneOf' : 'subject.prereqRoutes', { n: needs.any.length })
  return t('subject.factSeeBelow')
}

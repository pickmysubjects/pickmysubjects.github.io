import type { Subject } from '@/engine'
import type { Translate } from './interpolate'

// Exam share at or above this reads as exam-heavy; at or below COURSEWORK as mostly coursework.
const EXAM_HEAVY = 60
const COURSEWORK = 40

/**
 * The few facts students ask first, written the way they say them: how much the final exam is
 * worth, how many hours of class a week, whether there's group work. Only from recorded data;
 * nothing is said about what isn't recorded. Used on the subject page and in its static HTML.
 */
export function subjectGist(t: Translate, s: Subject): string[] {
  const out: string[] = []
  const tasks = s.assessment ?? []
  if (tasks.length) {
    const exam = tasks.filter((x) => x.kind === 'exam').reduce((sum, x) => sum + x.weight, 0)
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

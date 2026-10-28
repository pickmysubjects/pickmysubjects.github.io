import { allSame, betterOn, type MarkedRow, type TermRef } from '@/engine'
import type { ComparedPlan } from '@/composables/usePlanCompare'
import type { Translate } from '@/i18n'
import { ruleText, termLabel } from '@/i18n/format'

/**
 * The compare page's fact rows, grouped, worked out once from each plan's facts: what each cell
 * says, whether every plan says the same, and which plans are better on the few rows where
 * "better" is objective. Text only; the page lays it out.
 */
export type GroupId = 'progress' | 'load' | 'outcomes' | 'profile'

export interface Cell {
  text: string
  /** A second, smaller line (the failed rules, the likely range). */
  sub?: string[]
  /** A tag after the text ("heavy"). */
  tag?: string
  /** A link to fix it in the planner. */
  fix?: string
  /**
   * A list in place of the text (careers): each item, and how it stands next to the other plans:
   * 'only' this plan has it, 'notAll' some other plans have it but not every one; none, all do.
   */
  items?: { text: string; mark?: 'only' | 'notAll' }[]
}

export interface Row {
  id: string
  label: string
  cells: Cell[]
  same: boolean
  /** Plans better on this row (objective rows only; empty when all are equal). */
  better: number[]
  /** A small ⓘ beside the label. */
  info?: string
}

export interface Group {
  id: GroupId
  title: string
  rows: Row[]
}

export interface RowContext {
  t: Translate
  /** The planner at a plan (and a semester), for "Fix in the plan". */
  editLink: (plan: ComparedPlan, term?: TermRef | null) => string
  /** A career goal's name in the reader's language. */
  careerName: (id: string) => string
}

const num = (n: number) => String(Math.round(n * 10) / 10)

function row(id: string, label: string, cells: Cell[], plans: ComparedPlan[], marked?: MarkedRow, info?: string): Row {
  return {
    id,
    label,
    cells,
    // A list (careers) is compared as a set: the same jobs in another order are the same.
    same: allSame(cells, (c) => `${c.text}|${(c.sub ?? []).join('|')}|${c.tag ?? ''}|${(c.items ?? []).map((i) => i.text).sort().join('|')}`),
    better: marked ? betterOn(marked, plans.map((p) => p.facts)) : [],
    ...(info ? { info } : {}),
  }
}

export function compareGroups(plans: ComparedPlan[], ctx: RowContext): Group[] {
  const { t } = ctx
  const none = t('cmp.none')
  const f = (p: ComparedPlan) => p.facts

  const progress: Row[] = [
    row('points', t('cmp.rowPoints'), plans.map((p) => ({ text: `${num(f(p).points)} / ${num(f(p).required)}` })), plans),
    row('short', t('cmp.rowShort'), plans.map((p) => ({ text: f(p).short ? num(f(p).short) : none })), plans, 'short'),
    row(
      'rules',
      t('cmp.rowRules'),
      plans.map((p) => {
        const { total, failed } = f(p).rules
        const met = p.statuses.filter((s) => s.status === 'ok').length
        const failing = p.statuses.filter((s) => s.status === 'fail').map((s) => ruleText(t, p.rules.find((r) => r.id === s.ruleId), s.description))
        return { text: failed === 0 && met === total ? t('cmp.rulesAll', { n: total }) : t('cmp.rulesSome', { met, total }), ...(failing.length ? { sub: failing } : {}) }
      }),
      plans,
      'rules',
    ),
    row('finish', t('cmp.rowFinish'), plans.map((p) => ({ text: f(p).finish ? termLabel(t, f(p).finish!) : none })), plans),
    row(
      'problems',
      t('cmp.rowProblems'),
      plans.map((p) => (f(p).problems ? { text: String(f(p).problems), fix: ctx.editLink(p, f(p).problemTerm) } : { text: none })),
      plans,
      'problems',
    ),
  ]

  const load: Row[] = [
    row('heavy', t('cmp.rowHeavy'), plans.map((p) => ({ text: f(p).heavy ? String(f(p).heavy) : none })), plans, 'heavy'),
    row(
      'heaviest',
      t('cmp.rowHeaviest'),
      plans.map((p) => {
        const h = f(p).heaviest
        if (!h) return { text: none }
        return {
          text: `${t('plans.points', { n: num(h.points) })} · ${termLabel(t, h)}`,
          ...(h.level !== 'ok' ? { tag: t(h.level === 'veryHeavy' ? 'cmp.veryHeavyTag' : 'cmp.heavyTag') } : {}),
        }
      }),
      plans,
    ),
    row('exams', t('cmp.rowExams'), plans.map((p) => ({ text: f(p).exams.known ? t('cmp.examsOf', { n: f(p).exams.withExam, known: f(p).exams.known }) : none })), plans),
    row('hurdles', t('cmp.rowHurdles'), plans.map((p) => ({ text: f(p).hurdles ? t('cmp.subjects', { n: f(p).hurdles }) : none })), plans),
  ]

  const outcomes: Row[] = []
  // Predicted WAM only once there are marks on the record (every plan shares them).
  if (plans.every((p) => f(p).wam)) {
    outcomes.push(
      row(
        'wam',
        t('cmp.rowWam'),
        plans.map((p) => {
          const w = f(p).wam!
          return { text: t('cmp.wamAbout', { mark: Math.round(w.mark) }), sub: [t('cmp.wamRange', { low: Math.round(w.low), high: Math.round(w.high) })] }
        }),
        plans,
        undefined,
        t('cmp.wamInfo'),
      ),
    )
  }
  // Jobs every plan leads to are quiet; the ones only this plan leads to, and the ones some
  // other plans share but not all, are marked differently.
  const markOf = (p: ComparedPlan, job: string): 'only' | 'notAll' | undefined => {
    const elsewhere = plans.filter((q) => q !== p && q.careers.includes(job)).length
    if (elsewhere === 0) return 'only'
    return elsewhere < plans.length - 1 ? 'notAll' : undefined
  }
  outcomes.push(
    row(
      'careers',
      t('cmp.rowCareers'),
      plans.map((p) => (p.careers.length ? { text: '', items: p.careers.map((job) => { const mark = markOf(p, job); return { text: job, ...(mark ? { mark } : {}) } }) } : { text: none })),
      plans,
    ),
  )

  const profile: Row[] = [
    row('degree', t('cmp.rowDegree'), plans.map((p) => ({ text: p.courseTitle, ...(p.diploma ? { sub: [t('plans.diplomaLine', { title: p.diploma })] } : {}) })), plans),
    row(
      'majors',
      t('cmp.rowMajors'),
      plans.map((p) => ({ text: p.major || t('plans.noMajor'), ...(p.minor ? { sub: [t(p.minorInformal ? 'plans.informalLine' : 'plans.minorLine', { title: p.minor })] } : {}) })),
      plans,
    ),
    row('goal', t('cmp.rowGoal'), plans.map((p) => ({ text: t(`suggest.goals.${p.entry.prefs.goal}`) })), plans),
    row('interests', t('cmp.rowInterests'), plans.map((p) => ({ text: p.entry.prefs.interests.length ? p.entry.prefs.interests.map((x) => t(`topic.${x}`)).join(t('listSep')) : t('plans.noInterests') })), plans),
    row('career', t('cmp.rowCareer'), plans.map((p) => ({ text: p.entry.prefs.career ? ctx.careerName(p.entry.prefs.career) : none })), plans),
  ]

  return [
    { id: 'progress', title: t('cmp.groupProgress'), rows: progress },
    { id: 'load', title: t('cmp.groupLoad'), rows: load },
    { id: 'outcomes', title: t('cmp.groupOutcomes'), rows: outcomes },
    { id: 'profile', title: t('cmp.groupProfile'), rows: profile },
  ]
}

/** The group a row is in, for opening it before jumping to the row. */
export function groupOf(groups: Group[], rowId: string): GroupId | undefined {
  return groups.find((g) => g.rows.some((r) => r.id === rowId))?.id
}

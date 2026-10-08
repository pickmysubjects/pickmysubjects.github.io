import type { CourseRule, Issue, Note, Period, PlanTerm, ReqExpr, ReqField, RuleStatus, Subject } from '@/engine'
import type { Params, Translate } from './index'

/** Localised helpers for engine output. The engine stays language-neutral (keys + params). */

export function periodLabel(t: Translate, period: Period): string {
  return t(`period.${period}`)
}

export function termLabel(t: Translate, term: Pick<PlanTerm, 'year' | 'period'>): string {
  return `${term.year} ${t(`periodShort.${term.period}`)}`
}

export function categoryLabel(t: Translate, category: string | undefined): string {
  return category ? t(`category.${category}`) : ''
}

function what(t: Translate, level?: number, category?: string): string {
  const cat = categoryLabel(t, category)
  if (level !== undefined && category) return t('rule.whatLevelCategory', { level, category: cat })
  if (category) return t('rule.whatCategory', { category: cat })
  if (level !== undefined) return t('rule.whatLevel', { level })
  return t('rule.whatAny')
}

export function ruleText(t: Translate, rule: CourseRule | undefined, fallback = ''): string {
  if (!rule) return fallback
  switch (rule.kind) {
    case 'compulsory':
      return t(rule.firstSemester ? 'rule.compulsoryFirst' : 'rule.compulsory', { codes: rule.subjects.join(', ') })
    case 'points':
      if (rule.min !== undefined && rule.level === undefined && rule.category === undefined) {
        return t('rule.pointsTotal', { n: rule.min })
      }
      return rule.min !== undefined
        ? t('rule.pointsMin', { n: rule.min, what: what(t, rule.level, rule.category) })
        : t('rule.pointsMax', { n: rule.max ?? 0, what: what(t, rule.level, rule.category) })
    case 'major':
      return t('rule.major', { count: rule.count })
    case 'specialisation':
      return t('rule.specialisation', { max: rule.max })
    case 'level1-areas':
      return t('rule.level1Areas', { min: rule.minAreas, max: rule.maxPointsPerArea })
    case 'progression':
      return t('rule.progression', { min: rule.minPoints, level: rule.level, before: rule.beforeLevel })
  }
}

export function ruleDetail(t: Translate, s: RuleStatus): string {
  const p = s.params
  if (s.detailKey === 'pointsMin' || s.detailKey === 'pointsMax') {
    const main = t(`ruleDetail.${s.detailKey}`, p)
    return Number(p.uncategorised) > 0 ? `${main}; ${t('ruleDetail.uncategorised', { n: p.uncategorised ?? 0 })}` : main
  }
  if (s.detailKey === 'areas' && p.over) return t('ruleDetail.areasOver', p)
  return t(`ruleDetail.${s.detailKey}`, p)
}

/** Replace period ids in params with localised labels and add a {term} label. */
function localiseParams(t: Translate, params: Params): Params {
  const out: Params = { ...params }
  if (typeof params.period === 'string') {
    out.term = termLabel(t, { year: Number(params.year), period: params.period as Period })
    out.period = periodLabel(t, params.period as Period)
  }
  return out
}

export function issueText(
  t: Translate,
  issue: Issue,
  rules: CourseRule[],
  statuses: RuleStatus[],
  subjects: Record<string, Subject> = {},
): string {
  // The engine's reason is English; say what the subject needs in the reader's language instead.
  const s = issue.kind === 'prereq-unknown' && issue.subject ? subjects[issue.subject] : undefined
  if (s) return t('issue.prereq-unknown', { code: s.code, needs: describeReq(t, s.prerequisites) })
  if (issue.kind.startsWith('rule-')) {
    const rule = rules.find((r) => r.id === issue.ruleId)
    const status = statuses.find((s) => s.ruleId === issue.ruleId)
    return `${ruleText(t, rule, issue.message)} — ${status ? ruleDetail(t, status) : ''}`
  }
  if (issue.kind === 'discontinued') {
    return t(issue.params.instead ? 'issue.discontinuedInstead' : 'issue.discontinued', issue.params)
  }
  const key = issue.kind === 'not-offered' && issue.params.assumed ? 'not-offered-assumed' : issue.kind
  return t(`issue.${key}`, localiseParams(t, issue.params))
}

export function noteText(t: Translate, note: Note | string, rules: CourseRule[] = []): string {
  if (typeof note === 'string') return note // plans saved before localisation
  const params = localiseParams(t, note.params)
  if (typeof note.params.rule === 'string') {
    params.rule = ruleText(t, rules.find((r) => r.id === note.params.rule), String(note.params.rule))
  }
  return t(`genNote.${note.key}`, params)
}

export function reasonText(t: Translate, note: Note): string {
  const params: Params = { ...note.params }
  if (typeof params.skills === 'string') {
    params.skills = params.skills
      .split(', ')
      .map((s) => t(`skill.${s}`))
      .join(', ')
  }
  if (typeof params.topics === 'string') {
    params.topics = params.topics
      .split(', ')
      .map((x) => t(`topic.${x}`))
      .join(', ')
  }
  return t(`reason.${note.key}`, params)
}

export function describeReq(t: Translate, field: ReqField): string {
  if (field === 'none') return t('expr.none')
  if (field === 'unknown') return t('expr.unknown')
  return describeExpr(t, field)
}

function describeExpr(t: Translate, e: ReqExpr): string {
  if ('subject' in e) return e.subject
  if ('all' in e || 'any' in e) {
    const parts = 'all' in e ? e.all : e.any
    const sep = ` ${t('all' in e ? 'expr.and' : 'expr.or')} `
    return parts
      .map((p) => (('all' in p || 'any' in p) && parts.length > 1 ? `(${describeExpr(t, p)})` : describeExpr(t, p)))
      .join(sep)
  }
  if ('points' in e) {
    const { min, level, area, from } = e.points
    // e.g. "25 points of MAST" or "25 points of level 2 COMP": keep the subject area.
    const what = [level !== undefined ? t('expr.level', { level }) : '', area ?? ''].filter(Boolean).join(' ')
    const base = what ? t('expr.pointsOf', { n: min, what }) : t('expr.points', { n: min })
    return from ? `${base} ${t('expr.from', { codes: from.join(', ') })}` : base
  }
  if ('admission' in e) return t('expr.admission', { course: e.admission })
  return `“${e.manual}”`
}

import { simplifyFor, type CourseRule, type StressReason, type Issue, type Note, type Period, type PlanTerm, type ReqExpr, type ReqField, type RuleStatus, type Subject } from '@/engine'
import { localList, type Params, type Translate } from './interpolate'

/** Localised helpers for engine output. The engine stays language-neutral (keys + params). */

export function periodLabel(t: Translate, period: Period): string {
  return t(`period.${period}`)
}

export function termLabel(t: Translate, term: Pick<PlanTerm, 'year' | 'period'>): string {
  return `${term.year} ${t(`periodShort.${term.period}`)}`
}

/** A term in full ("Semester 2 2026", "2026 第二学期", "2026년 2학기"): word order follows the locale. */
export function termFullLabel(t: Translate, term: Pick<PlanTerm, 'year' | 'period'>): string {
  return t('termFull', { year: term.year, period: periodLabel(t, term.period) })
}

/** A category name standing on its own (a chip or tag): starts with a capital. */
export function categoryTag(t: Translate, category: string | undefined): string {
  const s = categoryLabel(t, category)
  return s.charAt(0).toLocaleUpperCase() + s.slice(1)
}

export function categoryLabel(t: Translate, category: string | undefined): string {
  return category ? t(`category.${category}`) : ''
}

/** Chinese text runs straight into a Latin word ("的Level 1") when a phrase is built from parts: add the space. */
export function cjkSpace(text: string): string {
  return text.replace(/([\u3400-\u9fff])([A-Za-z0-9])/g, '$1 $2')
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
  // A concurrent diploma's rule ("D-LANG:stream"): named with the diploma's title, which starts its description.
  const diploma = /^D-[A-Z]+:(.+)$/.exec(rule.id)
  if (diploma) {
    const id = diploma[1]!
    const title = rule.description.split(': ')[0]!
    const inner = id === 'stream' ? t('rule.diplomaStream') : id === 'eligible' ? t('rule.diplomaEligible') : ruleText(t, { ...rule, id }, fallback)
    return t('rule.diploma', { title, rule: inner })
  }
  switch (rule.kind) {
    case 'compulsory':
      return t(rule.firstSemester ? 'rule.compulsoryFirst' : 'rule.compulsory', { codes: rule.subjects.join(t('listSep')) })
    case 'points':
      if (rule.min !== undefined && rule.level === undefined && rule.category === undefined) {
        return t('rule.pointsTotal', { n: rule.min })
      }
      return cjkSpace(
        rule.min !== undefined
          ? t('rule.pointsMin', { n: rule.min, what: what(t, rule.level, rule.category) })
          : t('rule.pointsMax', { n: rule.max ?? 0, what: what(t, rule.level, rule.category) }),
      )
    case 'major':
      return (rule.max ?? rule.count) > rule.count ? t('rule.majorUpTo', { count: rule.count, max: rule.max }) : t('rule.major', { count: rule.count })
    case 'area-cap':
      return t('rule.areaCap', { max: rule.max })
    case 'specialisation':
      return t('rule.specialisation', { max: rule.max })
    case 'minor':
      return t(rule.informal ? 'rule.informalSpec' : 'rule.minor', { max: rule.max })
    case 'level1-areas':
      return t('rule.level1Areas', { min: rule.minAreas, max: rule.maxPointsPerArea })
    case 'progression':
      return t('rule.progression', { min: rule.minPoints, level: rule.level, before: rule.beforeLevel })
    case 'requirement': {
      const paths = rule.paths.map((path) =>
        path
          .map((r) => ('all' in r ? t('rule.requirementAll', { codes: r.all.join(t('listSep')) }) : t('rule.requirementChoose', { n: r.choose.points, codes: r.choose.from.join(t('listSep')) })))
          .join(' + '),
      )
      return paths.length === 1 ? paths[0]! : t('rule.requirementPaths', { paths: paths.join(t('rule.requirementOr')) })
    }
  }
}

export function ruleDetail(t: Translate, s: RuleStatus): string {
  const p = s.params
  if (s.detailKey === 'pointsMin' || s.detailKey === 'pointsMax') {
    const main = t(`ruleDetail.${s.detailKey}`, p)
    return Number(p.uncategorised) > 0 ? `${main}; ${t('ruleDetail.uncategorised', { n: p.uncategorised ?? 0 })}` : main
  }
  if (s.detailKey === 'areas' && p.over) return t('ruleDetail.areasOver', p)
  // What's missing, from the engine's language-neutral parts.
  if ((s.detailKey === 'requirementMissing' || s.detailKey === 'componentMissing') && p.parts) {
    const missing = String(p.parts)
      .split('|')
      .map((part) => {
        const [kind, ...rest] = part.split(':')
        if (kind === 'all') return t('ruleDetail.missingSubjects', { codes: rest[0]!.split(',').join(t('listSep')) })
        const [have, need, codes] = rest
        return t('ruleDetail.choosePoints', { have: have!, need: need!, codes: codes!.split(',').join(t('listSep')) })
      })
      .join('; ')
    return t(`ruleDetail.${s.detailKey}`, { ...localiseParams(t, p), missing })
  }
  return t(`ruleDetail.${s.detailKey}`, localiseParams(t, p))
}

const LIST_PARAMS = ['codes', 'needs', 'instead', 'missing', 'majors', 'over'] as const

/** Replace period ids in params with localised labels and add a {term} label. */
function localiseParams(t: Translate, params: Params): Params {
  const out: Params = { ...params }
  // Lists the engine joins with ", " read with the reader's own separator.
  for (const k of LIST_PARAMS) if (typeof params[k] === 'string') out[k] = localList(t, params[k])
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
  course = '',
): string {
  // The engine's reason is English; say what the subject needs in the reader's language instead.
  const s = issue.kind === 'prereq-unknown' && issue.subject ? subjects[issue.subject] : undefined
  if (s && issue.params?.advisory) return t('issue.prereq-advisory', { code: s.code, needs: describeReq(t, s.prerequisites, course) })
  if (s && issue.params?.missing) return t('issue.prereq-unknown-missing', { code: s.code, missing: String(issue.params.missing), needs: describeReq(t, s.prerequisites, course) })
  if (s) return t('issue.prereq-unknown', { code: s.code, needs: describeReq(t, s.prerequisites, course) })
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
  const params: Params = localiseParams(t, note.params)
  if (typeof params.skills === 'string') params.skills = localList(t, params.skills, (s) => t(`skill.${s}`))
  if (typeof params.topics === 'string') params.topics = localList(t, params.topics, (x) => t(`topic.${x}`))
  // A career goal's name comes in every language with the note; this locale reads its own.
  if (typeof params.career_en === 'string') params.career = params[`career_${t('careerLang')}`] ?? params.career_en
  return t(`reason.${note.key}`, params)
}

/** With a course, shows the requirement as that course's students meet it (see simplifyFor). */
export function describeReq(t: Translate, field: ReqField, course = ''): string {
  field = simplifyFor(field, course)
  if (field === 'none') return t('expr.none')
  if (field === 'unknown') return t('expr.unknown')
  return describeExpr(t, field)
}

/**
 * A requirement as a short list a student can read: "any one of these" or "all of these", with
 * conditions only the Handbook's own words can state (a VCE score) kept apart.
 */
export function requirementList(t: Translate, field: ReqField, course = ''): { kind: 'any' | 'all'; items: string[]; manual: string[] } | null {
  field = simplifyFor(field, course)
  if (field === 'none' || field === 'unknown') return null
  const top = 'any' in field ? field.any : 'all' in field ? field.all : [field]
  const kind = 'all' in field ? 'all' : 'any'
  const manual = top.filter((e): e is { manual: string } => 'manual' in e).map((e) => e.manual)
  const items = top.filter((e) => !('manual' in e)).map((e) => describeExpr(t, e))
  return { kind, items, manual }
}

function describeExpr(t: Translate, e: ReqExpr): string {
  if ('subject' in e) return e.concurrent ? t('expr.concurrent', { what: e.subject }) : e.subject
  if ('all' in e || 'any' in e) {
    const parts = 'all' in e ? e.all : e.any
    const sep = ` ${t('all' in e ? 'expr.and' : 'expr.or')} `
    return parts
      .map((p) => (('all' in p || 'any' in p) && parts.length > 1 ? `(${describeExpr(t, p)})` : describeExpr(t, p)))
      .join(sep)
  }
  if ('points' in e) {
    const { min, level, area, levels, areas, from } = e.points
    // e.g. "25 points of MAST" or "12.5 points of level 1/2 GEOG/CHEM": keep the subject areas.
    const lv = levels ?? (level !== undefined ? [level] : [])
    const what = [lv.length ? t('expr.level', { level: lv.join('/') }) : '', (areas ?? (area ? [area] : [])).join('/')].filter(Boolean).join(' ')
    const base = what ? t('expr.pointsOf', { n: min, what }) : t('expr.points', { n: min })
    const text = from ? `${base} ${t('expr.from', { codes: from.join(t('listSep')) })}` : base
    return e.points.concurrent ? t('expr.concurrent', { what: text }) : text
  }
  if ('admission' in e) return t('expr.admission', { course: e.admission })
  if ('average' in e) {
    const { min, levels, areas, from } = e.average
    const what = [levels?.length ? t('expr.level', { level: levels.join('/') }) : '', (areas ?? []).join('/'), (from ?? []).join(t('listSep'))].filter(Boolean).join(' ')
    return what ? t('expr.average', { min, what }) : t('expr.averageAll', { min })
  }
  if ('wam' in e) return t('expr.wam', { min: e.wam.min })
  if ('placement' in e) {
    if (e.placement === 'programming') return t('expr.placementProgramming')
    if (e.placement === 'language') return t('expr.placementLanguage')
    return t('expr.placement', { language: e.placement })
  }
  if ('permission' in e) return t(e.permission === 'coordinator' ? 'expr.permissionCoordinator' : 'expr.permissionApplication')
  if ('school' in e) {
    const { subject, minScore } = e.school
    return minScore ? t('expr.schoolScore', { subject, score: minScore }) : t('expr.school', { subject })
  }
  return `“${e.manual}”`
}

/** One reason a semester looks heavy, with the skill named in the reader's language. */
/**
 * A heavy semester's reason in a few words, for the chip on the plan board: the kind of load and
 * how many subjects, never the subject codes (those are in the full sentence behind it).
 */
export function stressShort(t: Translate, reason: StressReason): string {
  const key = reason.key === 'stackWeak' || reason.key === 'stackStruggle' || reason.key === 'stackMarks' ? 'stack' : reason.key
  const p = reason.params
  return t(`stress.short.${key}`, { n: p.n ?? 0, hours: p.hours ?? 0, work: p.work ?? 0, skill: typeof p.skill === 'string' ? t(`skill.${p.skill}`) : '' })
}

export function stressText(t: Translate, reason: StressReason): string {
  const params: Params = localiseParams(t, reason.params)
  if (typeof params.skill === 'string') params.skill = t(`skill.${params.skill}`)
  return t(`stress.${reason.key}`, params)
}

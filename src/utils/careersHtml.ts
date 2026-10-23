import { careerName, careerText, componentCareers, type CareerLang } from '../engine/careers'
import type { Dataset } from '../engine/schema'
import { careerPhrase, careerShortName, subjectNote } from './careerPathText'
import { careerTargets, easierIn, majorForCareer, majorsForCareer, subjectCareers, TIERS, type CareerTarget, type SubjectRequiredFor, type Tiered } from '../engine/careerPaths'
import type { Translate } from '../i18n/interpolate'

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** "会计师 (Accountant)": our name, with the English kept beside it for search. */
export function careerLabel(names: Record<CareerLang, string>, locale: string): string {
  const own = careerName(names, locale)
  return own ? `${own} (${names.en})` : names.en
}

/** The job names a component's Handbook page gives, in the reader's language ([] when none). */
export function careerJobLabels(data: Dataset, componentId: string, locale: string): string[] {
  const e = componentCareers(data.careers, componentId)
  return (e?.careers ?? []).flatMap((c) => {
    const j = data.careers?.jobs[c.job]
    return j ? [careerLabel(j.names, locale)] : []
  })
}

/**
 * The major page's "where it can lead" section as plain HTML, for the prerendered page (what
 * search engines read); the app shows the same through MajorCareers.vue. '' when we have no
 * entry for the component.
 */
export function careersHtml(
  data: Dataset,
  componentId: string,
  course: string,
  t: Translate,
  locale: string,
  subjectHref: (code: string) => string,
  componentHref: (id: string) => string,
  careerHref?: (id: string) => string,
): string {
  const c = data.careers
  const e = componentCareers(c, componentId)
  if (!c || !e) return ''
  const title = data.components.find((x) => x.id === componentId)?.title ?? ''
  const courseTitle = data.courses.find((x) => x.code === course)?.title ?? course
  const study = c.courses[course]?.summary
  const studyLine = study ? t('careers.courseStudy', { course: courseTitle, summary: careerText(study, locale) }) : ''
  const subj = (code: string) => (data.subjects[code] ? `<a href="${subjectHref(code)}">${esc(code)}</a>` : esc(code))
  const parts = [`<h2>${esc(t('careers.title'))}</h2>`]

  if (e.careerText) {
    parts.push(`<p>${esc(t('careers.lede', { title }))}</p>`)
    const jobs = e.careers.flatMap((x) => {
      const j = c.jobs[x.job]
      if (!j) return []
      const occ = j.occupation ? c.occupations[j.occupation] : undefined
      const q = x.qualifier === 'direct' ? '' : ` (${esc(t(`careers.qualifier.${x.qualifier}`))}${x.via ? `: ${esc(careerText(x.via, locale))}` : ''})`
      const link = occ ? ` · <a href="${esc(occ.url)}" rel="noopener">${esc(t('careers.official'))}: ${esc(occ.name)}</a>` : ''
      const reverse = careerHref ? ` · <a href="${careerHref(j.id)}">${esc(t('careerPath.fromMajor', { job: careerPhrase(j.names, locale) }))}</a>` : ''
      return [`<li>${esc(careerLabel(j.names, locale))}${q}${link}${reverse}</li>`]
    })
    if (jobs.length) parts.push(`<ul>${jobs.join('')}</ul>`)
  } else {
    parts.push(`<p>${esc([t('careers.none'), studyLine].filter(Boolean).join(' '))}</p>`)
  }

  const related = e.relatedFields.flatMap((id) => c.occupations[id] ?? [])
  if (related.length) {
    parts.push(`<h3>${esc(t('careers.relatedTitle'))}</h3><p>${esc(t('careers.relatedHint'))}</p>`)
    parts.push(`<ul>${related.map((o) => `<li><a href="${esc(o.url)}" rel="noopener">${esc(careerLabel(o.names, locale))}</a></li>`).join('')}</ul>`)
  }
  if (e.careerText && e.industries.length) parts.push(`<h3>${esc(t('careers.industries'))}</h3><p>${esc(e.industries.map((x) => careerText(x, locale)).join(', '))}</p>`)
  if (e.careerText && (e.furtherStudy.length || studyLine)) {
    const items = e.furtherStudy.length ? e.furtherStudy.map((x) => careerText(x, locale)) : [studyLine]
    parts.push(`<h3>${esc(t('careers.furtherStudy'))}</h3><ul>${items.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`)
  }

  const a = e.accreditation
  if (a) {
    parts.push(`<h3>${esc(t('careers.accTitle'))}: ${esc(a.body)}</h3><p>${esc(careerText(a.summary, locale))}</p>`)
    const line = (key: string, items: string[]) => (items.length ? `<p>${esc(t(key))}: ${items.join(', ')}</p>` : '')
    parts.push(line('careers.accRequired', a.required.map((r) => (Array.isArray(r) ? r.map(subj).join(` ${esc(t('careers.or'))} `) : subj(r)))))
    parts.push(line('careers.accBreadth', a.requiredBreadth.map(subj)))
    parts.push(line('careers.accRecommended', a.recommended.map(subj)))
    parts.push(line('careers.accWithOne', a.withOneOf.map((id) => `<a href="${componentHref(id)}">${esc(data.components.find((x) => x.id === id)?.title ?? id)}</a>`)))
  }
  if (e.helpfulSubjects) {
    parts.push(`<h3>${esc(t('careers.helpful'))}</h3><p>${esc(careerText(e.helpfulSubjects.note, locale))}</p><p>${e.helpfulSubjects.codes.map(subj).join(', ')}</p>`)
  }
  parts.push(`<p><a href="${esc(e.source)}" rel="noopener">${esc(t('careers.source'))}</a> · ${esc(t('careers.checked', { date: e.checked }))}</p>`)
  return parts.filter(Boolean).join('\n')
}

/** The careers list ("I want to be…") as plain HTML for the prerendered page. */
export function careerListHtml(data: Dataset, t: Translate, locale: string, careerHref: (id: string) => string): string {
  const all = careerTargets(data).map((c) => ({ c, n: majorsForCareer(data, c.id).length })).filter((x) => x.n > 0 || x.c.graduate)
  const meta = (c: CareerTarget, n: number) => (c.graduate ? t('careerPath.graduateMeta', { course: c.graduate.title }) : t('careerPath.majorCount', { n }))
  const list = (items: typeof all) => `<ul>${items.map(({ c, n }) => `<li><a href="${careerHref(c.id)}">${esc(careerLabel(c.names, locale))}</a> (${esc(meta(c, n))})</li>`).join('')}</ul>`
  const jobs = all.filter((x) => x.c.kind === 'job')
  const fields = all.filter((x) => x.c.kind === 'field')
  return [
    `<h1>${esc(t('careerPath.title'))}</h1>`,
    `<p>${esc(t('careerPath.lede'))}</p>`,
    jobs.length ? `<h2>${esc(t('careerPath.jobsTitle'))}</h2>${list(jobs)}` : '',
    fields.length ? `<h2>${esc(t('careerPath.fieldsTitle'))}</h2><p>${esc(t('careerPath.fieldsHint'))}</p>${list(fields)}` : '',
  ].join('\n')
}

/**
 * One career's page as plain HTML: the majors that lead there, and for each, its subjects in
 * tiers (the long "not much related" tail as a count). The app shows one major at a time.
 */
export function careerPageHtml(
  data: Dataset,
  target: CareerTarget,
  t: Translate,
  locale: string,
  subjectHref: (code: string) => string,
  componentHref: (id: string) => string,
  listHref: string,
): string {
  const majors = majorsForCareer(data, target.id)
  const courseTitle = (code: string) => data.courses.find((c) => c.code === code)?.title ?? code
  const subj = (code: string) => `<a href="${subjectHref(code)}">${esc(code)} ${esc(data.subjects[code]?.title ?? '')}</a>`
  const tiers = (x: Tiered) =>
    TIERS.filter((tier) => x[tier].length)
      .map((tier) =>
        tier === 'little'
          ? `<p>${esc(t(`careerPath.tier.${tier}`))}: ${x[tier].length}. ${esc(t(`careerPath.tierHint.${tier}`))}</p>`
          : `<h4>${esc(t(`careerPath.tier.${tier}`))}</h4><ul>${x[tier].map((r) => `<li>${subj(r.code)}: ${esc(subjectNote(t, r))}</li>`).join('')}</ul>`,
      )
      .join('')
  const parts = [
    `<p><a href="${listHref}">${esc(t('careerPath.back'))}</a></p>`,
    `<h1>${esc(t('careerPath.heading', { job: careerLabel(target.names, locale) }))}</h1>`,
    majors.length || !target.graduate ? `<p>${esc(t('careerPath.summary', { n: majors.length }))}</p>` : '',
  ]
  const o = target.occupation
  if (o?.skills.length) parts.push(`<p>${esc(t('careers.skills', { list: o.skills.join(', ') }))}</p>`)
  if (o) parts.push(`<p><a href="${esc(o.url)}" rel="noopener">${esc(t('careers.official'))}: ${esc(o.name)}</a></p>`)
  const g = target.graduate
  if (g) {
    parts.push(`<h2>${esc(t('careerPath.graduateTitle', { course: `${g.title} (${g.course})` }))}</h2><p>${esc(t('careerPath.graduateAny'))}</p>`)
    parts.push(`<p>${esc(t('careerPath.graduateEntry'))}: ${esc(careerText(g.entry, locale))}</p>`)
    if (g.prerequisites) parts.push(`<p>${esc(t('careerPath.graduatePrereq'))}: ${esc(careerText(g.prerequisites, locale))}</p>`)
    if (g.prerequisites && !g.required.length) parts.push(`<p>${esc(t('careerPath.graduateNoCodes'))}</p>`)
    parts.push(`<p><a href="${esc(g.source)}" rel="noopener">${esc(t('careerPath.graduateSource'))}</a> · ${esc(t('careers.checked', { date: g.checked }))}</p>`)
  }
  if (majors.length) parts.push(`<h2>${esc(t('careerPath.majorsTitle'))}</h2>`)
  majors.forEach((m, i) => {
    const r = majorForCareer(data, target.id, m.component, easierIn(data, m.course))
    if (!r) return
    const how = `${t(`careerPath.how.${m.how}`)}${m.via && !m.route ? `: ${careerText(m.via, locale)}` : ''}`
    parts.push(`<h3><a href="${componentHref(m.component)}">${esc(m.title)}</a> (${esc(courseTitle(m.course))})</h3><p>${esc(how)}${m.accreditation ? ` · ${esc(t('careers.accTitle'))}: ${esc(m.accreditation.body)}` : ''}</p>`)
    parts.push(tiers(r.subjects))
    // Breadth ideas for the first (default) major only: the same course's list repeats otherwise.
    if (i === 0 && r.breadth && TIERS.some((x) => r.breadth![x].length)) parts.push(`<h4>${esc(t('careerPath.breadthTitle'))}</h4><p>${esc(t('careerPath.breadthHint'))}</p>${tiers(r.breadth)}`)
    if (i === 0 && r.needs.generic.length) parts.push(`<p>${esc(t('careerPath.generic', { list: r.needs.generic.join(', ') }))}</p>`)
  })
  parts.push(`<p>${esc(t('careerPath.note'))}</p>`)
  return parts.filter(Boolean).join('\n')
}

/** The search title and description for a career's page. */
export function careerSeo(data: Dataset, target: CareerTarget, t: Translate, locale: string): { title: string; description: string } {
  const majors = majorsForCareer(data, target.id)
  const job = careerPhrase(target.names, locale)
  const names = [...new Set(majors.map((m) => m.title))].slice(0, 4).join(t('listSep'))
  return {
    title: `${t('careerPath.seoTitle', { job })} | PickMySubjects`,
    description: [t('careerPath.seoDesc', { job }), names ? `${t('careerPath.majorsTitle')}: ${names}.` : ''].filter(Boolean).join(' '),
  }
}

/** Careers a subject page names before "more" (the rest open on a tap). */
export const SUBJECT_CAREERS_SHOWN = 3

/** "Required for CPA Australia accreditation (Accountant) in Accounting", in the reader's language. */
export function subjectRequiredText(t: Translate, r: SubjectRequiredFor, locale: string): string {
  return t('careerPath.subjectRequired', { body: r.body, job: careerShortName(r.career.names, locale), major: r.major })
}

/**
 * A subject page's careers line as plain HTML, for the prerendered page (SubjectCareers.vue shows
 * the same in the app): the accreditation routes that need it, else the careers it helps toward.
 * '' when it isn't tied to any career: the page says nothing rather than "not related".
 */
export function subjectCareersHtml(data: Dataset, code: string, t: Translate, locale: string, careerHref: (id: string, major?: string) => string): string {
  const c = subjectCareers(data, code)
  if (c.required.length) {
    const items = c.required.map((r) => `<li><a href="${careerHref(r.career.id, r.component)}">${esc(subjectRequiredText(t, r, locale))}</a></li>`)
    return `<h2>${esc(t('careerPath.subjectTitle'))}</h2><ul>${items.join('')}</ul>`
  }
  if (!c.helps.length) return ''
  const links = c.helps.map((x) => `<a href="${careerHref(x.id)}">${esc(careerShortName(x.names, locale))}</a>`)
  return `<h2>${esc(t('careerPath.subjectTitle'))}</h2><p>${esc(t('careerPath.subjectHelps'))}: ${links.join(esc(t('listSep')))}</p>`
}

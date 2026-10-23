import { careerName, componentCareers, type CareerLang } from '../engine/careers'
import type { Dataset } from '../engine/schema'
import { pickLocalized } from '../i18n/localized'
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
): string {
  const c = data.careers
  const e = componentCareers(c, componentId)
  if (!c || !e) return ''
  const title = data.components.find((x) => x.id === componentId)?.title ?? ''
  const courseTitle = data.courses.find((x) => x.code === course)?.title ?? course
  const study = c.courses[course]?.summary
  const studyLine = study ? t('careers.courseStudy', { course: courseTitle, summary: pickLocalized(study, locale) }) : ''
  const subj = (code: string) => (data.subjects[code] ? `<a href="${subjectHref(code)}">${esc(code)}</a>` : esc(code))
  const parts = [`<h2>${esc(t('careers.title'))}</h2>`]

  if (e.careerText) {
    parts.push(`<p>${esc(t('careers.lede', { title }))}</p>`)
    const jobs = e.careers.flatMap((x) => {
      const j = c.jobs[x.job]
      if (!j) return []
      const occ = j.occupation ? c.occupations[j.occupation] : undefined
      const q = x.qualifier === 'direct' ? '' : ` (${esc(t(`careers.qualifier.${x.qualifier}`))}${x.via ? `: ${esc(x.via)}` : ''})`
      const link = occ ? ` · <a href="${esc(occ.url)}" rel="noopener">${esc(t('careers.official'))}: ${esc(occ.name)}</a>` : ''
      return [`<li>${esc(careerLabel(j.names, locale))}${q}${link}</li>`]
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
  if (e.careerText && e.industries.length) parts.push(`<h3>${esc(t('careers.industries'))}</h3><p>${esc(e.industries.join(', '))}</p>`)
  if (e.careerText && (e.furtherStudy.length || studyLine)) {
    const items = e.furtherStudy.length ? e.furtherStudy : [studyLine]
    parts.push(`<h3>${esc(t('careers.furtherStudy'))}</h3><ul>${items.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`)
  }

  const a = e.accreditation
  if (a) {
    parts.push(`<h3>${esc(t('careers.accTitle'))}: ${esc(a.body)}</h3><p>${esc(pickLocalized(a.summary, locale))}</p>`)
    const line = (key: string, items: string[]) => (items.length ? `<p>${esc(t(key))}: ${items.join(', ')}</p>` : '')
    parts.push(line('careers.accRequired', a.required.map((r) => (Array.isArray(r) ? r.map(subj).join(` ${esc(t('careers.or'))} `) : subj(r)))))
    parts.push(line('careers.accBreadth', a.requiredBreadth.map(subj)))
    parts.push(line('careers.accRecommended', a.recommended.map(subj)))
    parts.push(line('careers.accWithOne', a.withOneOf.map((id) => `<a href="${componentHref(id)}">${esc(data.components.find((x) => x.id === id)?.title ?? id)}</a>`)))
  }
  if (e.helpfulSubjects) {
    parts.push(`<h3>${esc(t('careers.helpful'))}</h3><p>${esc(pickLocalized(e.helpfulSubjects.note, locale))}</p><p>${e.helpfulSubjects.codes.map(subj).join(', ')}</p>`)
  }
  parts.push(`<p><a href="${esc(e.source)}" rel="noopener">${esc(t('careers.source'))}</a> · ${esc(t('careers.checked', { date: e.checked }))}</p>`)
  return parts.filter(Boolean).join('\n')
}

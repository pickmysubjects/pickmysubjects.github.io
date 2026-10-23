/**
 * Where a major can lead: the jobs, industries, further study and accreditation routes its
 * Handbook page names, with jobs linked to official occupation pages (yourcareer.gov.au).
 *
 * Kept as four lists (data/real/careers/*.yaml) so later features can reuse them: occupations
 * and jobs for "I want to be ___", per-component entries for the major page, and accreditation
 * subjects for a subject's career relevance.
 */
import { z } from 'zod'
import { localized, SUBJECT_CODE, type Localized } from './schema'

/** Every language the site has; job and occupation names are written in all of them. */
export const CAREER_LANGS = ['en', 'zh', 'zh-TW', 'ja', 'ko', 'vi', 'ms', 'id', 'hi'] as const
export type CareerLang = (typeof CAREER_LANGS)[number]
const names = z.object(Object.fromEntries(CAREER_LANGS.map((l) => [l, z.string().min(1).max(80)]))).strict() as unknown as z.ZodType<Record<CareerLang, string>>

const code = z.string().regex(SUBJECT_CODE, 'expected a code like COMP10001')
const handbook = z.url({ protocol: /^https$/, hostname: /^handbook\.unimelb\.edu\.au$/ })
const yourCareer = z.url({ protocol: /^https$/, hostname: /^www\.yourcareer\.gov\.au$/ })
const date = z.iso.date()
const id = z.string().regex(/^[a-z0-9-]+$/)

export const occupationsFileSchema = z.array(
  z
    .object({
      id, // the yourcareer page's slug
      name: z.string().min(1), // official name
      anzsco: z.string().regex(/^\d{6}$/),
      url: yourCareer,
      // "Skills employers are looking for", in the page's order (empty when the page shows none).
      skills: z.array(z.string().min(1)).max(10),
      // Linked to a major by subject area only: the Handbook names the field, not this job.
      field: z.boolean().default(false),
      checked: date,
      names,
    })
    .strict(),
)
export type Occupation = z.output<typeof occupationsFileSchema>[number]

export const jobsFileSchema = z.array(
  z
    .object({
      id,
      title: z.string().min(1), // the Handbook's words
      occupation: id.nullable(), // official occupation, when one matches clearly
      names,
    })
    .strict(),
)
export type Job = z.output<typeof jobsFileSchema>[number]

export const CAREER_QUALIFIERS = ['direct', 'via-further-study', 'needs-qualification'] as const
export type CareerQualifier = (typeof CAREER_QUALIFIERS)[number]

/** A required subject, or one of several ("PSYC10003 or PSYC10006"). */
const requiredItem = z.union([code, z.array(code).min(2)])

const majorCareers = z
  .object({
    handbook_id: id,
    course: z.string().min(1),
    title: z.string().min(1),
    // Our component ids for this Handbook component (a major we split into streams has several).
    components: z.array(id),
    source: handbook,
    checked: date,
    career_text: z.boolean(),
    careers: z.array(z.object({ job: id, qualifier: z.enum(CAREER_QUALIFIERS).default('direct'), via: z.string().min(1).optional() }).strict()).default([]),
    industries: z.array(z.string().min(1)).default([]),
    further_study: z.array(z.string().min(1)).default([]),
    // Ours, not the Handbook's: official occupations (field: true) matched by subject area.
    related_fields: z.array(id).default([]),
    accreditation: z
      .object({
        body: z.string().min(1),
        summary: localized(260, 140),
        required: z.array(requiredItem).default([]),
        required_breadth: z.array(code).default([]),
        recommended: z.array(code).default([]),
        // Components to complete as well, one of them (ACS: the major plus a specialisation).
        with_one_of: z.array(id).default([]),
        source: handbook,
      })
      .strict()
      .optional(),
    // Subjects the page recommends for what comes next, outside any accreditation.
    helpful_subjects: z.object({ codes: z.array(code).min(1), note: localized(260, 140) }).strict().optional(),
  })
  .strict()
  .refine((m) => m.career_text || (m.careers.length === 0 && m.industries.length === 0 && m.further_study.length === 0), {
    message: 'an entry without career text lists no careers, industries or further study',
  })

export const majorCareersFileSchema = z.array(majorCareers)

export const courseFurtherStudyFileSchema = z.array(
  z.object({ course: z.string().min(1), source: handbook, checked: date, summary: localized(400, 400).nullable() }).strict(),
)

export interface Accreditation {
  body: string
  summary: Localized
  /** Each item a code, or several codes of which one is needed. */
  required: (string | string[])[]
  requiredBreadth: string[]
  recommended: string[]
  withOneOf: string[]
  source: string
}

export interface ComponentCareers {
  handbookId: string
  source: string
  checked: string
  /** False: the Handbook page lists no careers. */
  careerText: boolean
  careers: { job: string; qualifier: CareerQualifier; via?: string }[]
  industries: string[]
  furtherStudy: string[]
  relatedFields: string[]
  accreditation?: Accreditation
  helpfulSubjects?: { codes: string[]; note: Localized }
}

export interface CourseFurtherStudy {
  source: string
  checked: string
  summary: Localized | null
}

export interface Careers {
  occupations: Record<string, Occupation>
  jobs: Record<string, Job>
  /** By Handbook component id (b-com-major-1). */
  majors: Record<string, ComponentCareers>
  /** Our component id → its Handbook component id. */
  components: Record<string, string>
  /** By course code. */
  courses: Record<string, CourseFurtherStudy>
}

/** Every subject code an accreditation route names, required ones first. */
export function accreditationCodes(a: Accreditation): string[] {
  return [...a.required.flat(), ...a.requiredBreadth, ...a.recommended]
}

/**
 * Checks the careers files against each other and the dataset, and puts them together by our
 * ids. Broken references are errors; a Handbook component we haven't entered yet is a warning.
 */
export function assembleCareers(
  files: {
    occupations: z.output<typeof occupationsFileSchema>
    jobs: z.output<typeof jobsFileSchema>
    majors: z.output<typeof majorCareersFileSchema>
    courses: z.output<typeof courseFurtherStudyFileSchema>
  },
  known: { subjects: Set<string>; components: Map<string, string /* course */>; courses: Set<string> },
): { careers: Careers; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const careers: Careers = { occupations: {}, jobs: {}, majors: {}, components: {}, courses: {} }

  for (const o of files.occupations) {
    if (careers.occupations[o.id]) errors.push(`careers/occupations: ${o.id} twice`)
    if (!o.url.includes(`/${o.anzsco}/${o.id}`)) errors.push(`careers/occupations: ${o.id} url doesn't match its anzsco and id`)
    careers.occupations[o.id] = o
  }
  for (const j of files.jobs) {
    if (careers.jobs[j.id]) errors.push(`careers/jobs: ${j.id} twice`)
    if (j.occupation && !careers.occupations[j.occupation]) errors.push(`careers/jobs: ${j.id} names unknown occupation ${j.occupation}`)
    if (j.occupation && careers.occupations[j.occupation]?.field) errors.push(`careers/jobs: ${j.id} links a field-level occupation`)
    careers.jobs[j.id] = j
  }

  const seen = new Set<string>()
  for (const m of files.majors) {
    const where = `careers/majors: ${m.handbook_id}`
    if (seen.has(m.handbook_id)) errors.push(`${where} twice`)
    seen.add(m.handbook_id)
    if (!known.courses.has(m.course)) warnings.push(`${where}: course ${m.course} not entered yet`)
    if (m.components.length === 0) warnings.push(`${where} (${m.course} ${m.title}): no matching component entered yet`)
    for (const c of m.careers) if (!careers.jobs[c.job]) errors.push(`${where}: unknown job ${c.job}`)
    for (const f of m.related_fields) {
      if (!careers.occupations[f]) errors.push(`${where}: unknown occupation ${f}`)
      else if (!careers.occupations[f].field) errors.push(`${where}: related field ${f} isn't marked field: true`)
    }
    const a = m.accreditation
    const codes = [...(a ? [...a.required.flat(), ...a.required_breadth, ...a.recommended] : []), ...(m.helpful_subjects?.codes ?? [])]
    for (const c of codes) if (!known.subjects.has(c)) errors.push(`${where}: subject ${c} isn't in the data`)
    for (const c of a?.with_one_of ?? []) if (!known.components.has(c)) errors.push(`${where}: unknown component ${c}`)
    const entry: ComponentCareers = {
      handbookId: m.handbook_id,
      source: m.source,
      checked: m.checked,
      careerText: m.career_text,
      careers: m.careers.map((c) => ({ job: c.job, qualifier: c.qualifier, ...(c.via ? { via: c.via } : {}) })),
      industries: m.industries,
      furtherStudy: m.further_study,
      relatedFields: m.related_fields,
      ...(a
        ? { accreditation: { body: a.body, summary: a.summary, required: a.required, requiredBreadth: a.required_breadth, recommended: a.recommended, withOneOf: a.with_one_of, source: a.source } }
        : {}),
      ...(m.helpful_subjects ? { helpfulSubjects: m.helpful_subjects } : {}),
    }
    for (const id of m.components) {
      const course = known.components.get(id)
      if (course === undefined) errors.push(`${where}: unknown component ${id}`)
      else if (course !== m.course) errors.push(`${where}: component ${id} is in ${course}, not ${m.course}`)
      else if (careers.components[id]) errors.push(`${where}: component ${id} already has career info`)
      else careers.components[id] = m.handbook_id
    }
    careers.majors[m.handbook_id] = entry
  }

  for (const c of files.courses) {
    if (!known.courses.has(c.course)) warnings.push(`careers/courses: course ${c.course} not entered yet`)
    if (careers.courses[c.course]) errors.push(`careers/courses: ${c.course} twice`)
    careers.courses[c.course] = { source: c.source, checked: c.checked, summary: c.summary }
  }
  return { careers, errors, warnings }
}

/** A component's career info, if its Handbook page has been read. */
export function componentCareers(careers: Careers | undefined, componentId: string): ComponentCareers | undefined {
  const h = careers?.components[componentId]
  return h ? careers!.majors[h] : undefined
}

/** A job or occupation name in the reader's language; '' for English (the title is shown as is). */
export function careerName(n: Record<CareerLang, string>, locale: string): string {
  const key = (locale === 'zh-CN' ? 'zh' : locale) as CareerLang
  return key === 'en' || !n[key] ? '' : n[key]
}

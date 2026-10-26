import type { Subject } from './schema'

// Handbook phrasing for a cap on places: "Quotas apply", "a quota of 20", "Places are limited",
// "quota-limited". Whole words only, so "quotation" doesn't count; "enrolment is limited to BSc
// students" is a who-can-enrol rule, not a cap, and doesn't match.
const QUOTA = /\bquotas?\b|\bquota-limited\b|\bplaces (?:are|will be) limited\b|\blimited (?:number of )?places\b/i

/** Every piece of free text a subject's record carries (notes, about, requisite notes). */
function texts(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) for (const v of value) texts(v, out)
  else if (value && typeof value === 'object') for (const v of Object.values(value)) texts(v, out)
  return out
}

/** Whether the Handbook says places in this subject are limited (a quota). */
export function isQuotaSubject(subject: Pick<Subject, 'notes' | 'about' | 'prerequisites' | 'corequisites' | 'recommended'>): boolean {
  return texts([subject.notes, subject.about, subject.prerequisites, subject.corequisites, subject.recommended]).some((t) => QUOTA.test(t))
}

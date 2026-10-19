import type { Dataset, DiscussionSummary, Subject, SubjectAbout } from './schema'

/** The long text of one subject, loaded only when its page is opened. */
export interface SubjectDetail {
  about?: SubjectAbout
  discussions?: DiscussionSummary[]
  breadthFor?: string[]
}

/** The part of a subject code that groups detail files: COMP30027 → COMP. */
export function detailArea(code: string): string {
  return code.slice(0, 4)
}

/**
 * The dataset split for the browser: `core` has everything lists, plans and recommendations
 * use; `details` (by area) has the long text only the subject page shows. Core keeps the bits
 * of that text the engine reads — the English summary (topic inference) and the discussion's
 * workload / difficulty verdicts (semester check) — with the rest left empty, so core subjects
 * are only complete once merged with their detail (see `withDetail`).
 */
export function splitDataset(data: Dataset): { core: Dataset; details: Record<string, Record<string, SubjectDetail>> } {
  const subjects: Record<string, Subject> = {}
  const details: Record<string, Record<string, SubjectDetail>> = {}
  for (const [code, s] of Object.entries(data.subjects)) {
    const { about, discussions, breadthFor, ...rest } = s
    const lean: Subject = { ...rest } as Subject
    if (about) lean.about = { ...about, learn: { en: about.learn.en, zh: '' }, outcomes: [] }
    if (discussions) lean.discussions = discussions.map((d) => ({ ...d, points: [] }))
    subjects[code] = lean
    if (about || discussions || breadthFor) {
      const d: SubjectDetail = {}
      if (about) d.about = about
      if (discussions) d.discussions = discussions
      if (breadthFor) d.breadthFor = breadthFor
      ;(details[detailArea(code)] ??= {})[code] = d
    }
  }
  return { core: { ...data, subjects }, details }
}

/** A core subject with its long text put back. */
export function withDetail(s: Subject, d: SubjectDetail | undefined): Subject {
  return d ? { ...s, ...d } : s
}

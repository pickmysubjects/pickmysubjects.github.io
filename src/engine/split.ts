import type { StudentComment } from './comments'
import type { StudentFacts } from './studentFacts'
import type { Dataset, DiscussionSummary, Subject, SubjectAbout } from './schema'

/** The long text of one subject, loaded only when its page is opened. */
export interface SubjectDetail {
  about?: SubjectAbout
  discussions?: DiscussionSummary[]
  breadthFor?: string[]
  comments?: StudentComment[]
  studentFacts?: StudentFacts
  /** Handbook facts shown only in the subject page's facts row. */
  prescribedTexts?: boolean
  examBook?: 'open' | 'closed'
  languages?: Subject['languages']
  /** Subjects often taken with it (see buildTakenWith), worked out at build. */
  takenWith?: string[]
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
export function splitDataset(data: Dataset, takenWith: Record<string, string[]> = {}): { core: Dataset; details: Record<string, Record<string, SubjectDetail>> } {
  const subjects: Record<string, Subject> = {}
  const details: Record<string, Record<string, SubjectDetail>> = {}
  for (const [code, s] of Object.entries(data.subjects)) {
    const { about, discussions, breadthFor, comments, studentFacts, prescribedTexts, examBook, languages, ...rest } = s
    const lean: Subject = { ...rest } as Subject
    if (about) lean.about = { ...about, learn: { en: about.learn.en, zh: '' }, outcomes: [] }
    if (discussions) lean.discussions = discussions.map((d) => ({ ...d, points: [] }))
    subjects[code] = lean
    const tw = takenWith[code]
    const hb = prescribedTexts !== undefined || examBook !== undefined || languages !== undefined
    if (about || discussions || breadthFor || comments || studentFacts || hb || tw) {
      const d: SubjectDetail = {}
      if (tw) d.takenWith = tw
      if (about) d.about = about
      if (discussions) d.discussions = discussions
      if (breadthFor) d.breadthFor = breadthFor
      if (comments) d.comments = comments
      if (studentFacts) d.studentFacts = studentFacts
      if (prescribedTexts !== undefined) d.prescribedTexts = prescribedTexts
      if (examBook) d.examBook = examBook
      if (languages) d.languages = languages
      ;(details[detailArea(code)] ??= {})[code] = d
    }
  }
  return { core: { ...data, subjects }, details }
}

/** A core subject with its long text put back. */
export function withDetail(s: Subject, d: SubjectDetail | undefined): Subject {
  if (!d) return s
  const { takenWith: _, ...text } = d
  return { ...s, ...text }
}

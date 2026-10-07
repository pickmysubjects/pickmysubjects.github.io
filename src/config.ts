/**
 * Where feedback and ratings go. Leave a value empty to hide that option in the app.
 * - githubRepo: issues open here (needs a GitHub account; the repo must be public
 *   or the person must be a collaborator).
 * - feedbackEmail: optional public mailbox. Never put a personal address here.
 * - Google Forms: `formId` is the id in https://docs.google.com/forms/d/e/<formId>/viewform,
 *   and each entry is the `entry.<number>` name taken from the form's pre-filled link.
 *   Responses go to a private Google Sheet; only aggregates are ever published.
 */
export const FEEDBACK = {
  githubRepo: 'pualgao230113-sys/subject-compass',
  feedbackEmail: '',
  feedbackFormUrl: '',
}

export interface GoogleFormConfig<K extends string> {
  formId: string
  entries: Record<K, string>
}

export type RatingField =
  | 'code'
  | 'year'
  | 'semester'
  | 'difficulty'
  | 'workload'
  | 'generosity'
  | 'hours'
  | 'grade'
  | 'skills'
  | 'recommend'
  | 'wish'
  | 'language'

export const RATINGS_FORM: GoogleFormConfig<RatingField> = {
  formId: '',
  entries: {
    code: '',
    year: '',
    semester: '',
    difficulty: '',
    workload: '',
    generosity: '',
    hours: '',
    grade: '',
    skills: '',
    recommend: '',
    wish: '',
    language: '',
  },
}

export type FeedbackField = 'topic' | 'rating' | 'subject' | 'message' | 'contact' | 'language'

export const FEEDBACK_FORM: GoogleFormConfig<FeedbackField> = {
  formId: '',
  entries: { topic: '', rating: '', subject: '', message: '', contact: '', language: '' },
}

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
  githubRepo: 'subject-compass/subject-compass',
  feedbackEmail: '',
  feedbackFormUrl: '',
}

export interface GoogleFormConfig<K extends string> {
  formId: string
  entries: Record<K, string>
  /** Questions that may be left unset (''): the app hides them until the form has them. */
  optional?: readonly K[]
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
  | 'examDifficulty'
  | 'usefulness'
  | 'interest'
  | 'teaching'

export const RATINGS_FORM: GoogleFormConfig<RatingField> = {
  formId: '1FAIpQLSfJcmsShsJlO8jOqAun_X4NksYJ2O0D8Vi0AVJJ5dwzoNzcRw',
  entries: {
    code: 'entry.43289954',
    year: 'entry.1873105734',
    semester: 'entry.587889816',
    difficulty: 'entry.59375641',
    workload: 'entry.595665220',
    generosity: 'entry.239562994',
    hours: 'entry.1276453434',
    grade: 'entry.79836435',
    skills: 'entry.1916343425',
    recommend: 'entry.1515958851',
    wish: 'entry.988102728',
    language: 'entry.1579411750',
    // Added later with addRatingQuestions() in scripts/google/create-forms.gs.
    examDifficulty: '',
    usefulness: '',
    interest: '',
    teaching: '',
  },
  optional: ['examDifficulty', 'usefulness', 'interest', 'teaching'],
}

export type FeedbackField = 'topic' | 'rating' | 'subject' | 'message' | 'contact' | 'language'

export const FEEDBACK_FORM: GoogleFormConfig<FeedbackField> = {
  formId: '1FAIpQLSfp5-NbSAXlU7qZC5_31ydAvvfj071oCw3H5opQ0cF4oKnGpA',
  entries: {
    topic: 'entry.1907363823',
    rating: 'entry.1549398132',
    subject: 'entry.1503185547',
    message: 'entry.746225061',
    contact: 'entry.1242842527',
    language: 'entry.136711737',
  },
}

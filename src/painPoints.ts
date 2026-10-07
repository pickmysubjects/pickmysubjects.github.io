/**
 * The problems Subject Compass exists to solve, from the founder's own experience
 * choosing subjects at UniMelb. Every feature and every piece of feedback should map
 * back to one of these. Keep `status` honest — it is shown to users.
 */
export type PainStatus = 'works' | 'partly' | 'planned'

export interface PainPoint {
  id: string
  question: string
  /** What Subject Compass does about it today (or will do). */
  answer: string
  status: PainStatus
  /** Where in the app to see it, if anywhere. */
  view?: 'plan' | 'recommend' | 'record' | 'contribute'
}

export const PAIN_POINTS: PainPoint[] = [
  {
    id: 'when-offered',
    question: 'Which semester does each subject run in? Which ones are Semester 1 only?',
    answer:
      'Cards show “S1 only” / “S2 only”, and the plan flags a subject placed in a semester it doesn’t run. Future years are marked as assumptions until confirmed.',
    status: 'works',
    view: 'plan',
  },
  {
    id: 'what-when',
    question: 'Across my whole degree (e.g. 2027–2029), what should I take each semester?',
    answer: '“Build a plan for me” lays out every semester so all course rules are met, then you adjust it.',
    status: 'works',
    view: 'plan',
  },
  {
    id: 'prerequisites',
    question: 'What do I need before I can take a subject?',
    answer: 'Prerequisites are checked semester by semester, and magenta lines show which subject unlocks which.',
    status: 'works',
    view: 'plan',
  },
  {
    id: 'blocks',
    question: 'If I take this subject, which others can I no longer take?',
    answer: 'Non-allowed pairs are flagged in your plan and excluded from suggestions.',
    status: 'works',
    view: 'plan',
  },
  {
    id: 'easy-wam',
    question: 'Which subjects are easier marks and help my WAM?',
    answer:
      '“Protect my WAM” favours approachable, generously marked subjects. It needs students’ own ratings, which we are starting to collect.',
    status: 'partly',
    view: 'recommend',
  },
  {
    id: 'known-hard',
    question: 'Which subjects are widely known to be very hard?',
    answer: 'Suggestions warn about subjects students rate hard or heavy. Real ratings are still being collected.',
    status: 'partly',
    view: 'recommend',
  },
  {
    id: 'skills',
    question: 'What skills does a subject need, and do I have them?',
    answer:
      'Rate your own skills and suggestions warn when a subject leans on a weaker one. Skill tags for real subjects are still being added.',
    status: 'partly',
    view: 'record',
  },
  {
    id: 'fit-me',
    question: 'Which subjects suit me — my results, WAM, strengths and goals?',
    answer: 'Suggestions rank subjects from your record, skills and interests, and explain every score.',
    status: 'works',
    view: 'recommend',
  },
  {
    id: 'rules-change',
    question: 'Rules change every year and differ by degree, major, bachelor/master/PhD.',
    answer:
      'Rules are stored per Handbook year. Only the Bachelor of Science (2026) is in so far; more courses need contributors.',
    status: 'partly',
    view: 'contribute',
  },
  {
    id: 'future',
    question: 'Which subjects lead where I want to go after uni?',
    answer: 'Not yet. Career pathways (which majors and subjects lead to which jobs or further study) are planned.',
    status: 'planned',
  },
]

export const STATUS_LABELS: Record<PainStatus, string> = {
  works: 'Works now',
  partly: 'Partly',
  planned: 'Not yet',
}

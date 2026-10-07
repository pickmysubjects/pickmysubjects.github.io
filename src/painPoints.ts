/**
 * The problems Subject Compass exists to solve, from the founder's own experience
 * choosing subjects at UniMelb. Every feature and every piece of feedback should map
 * back to one of these. Keep `status` honest — it is shown to users. The wording of
 * each question and answer lives in the i18n catalogs under `pain.<id>`.
 */
export type PainStatus = 'works' | 'partly' | 'planned'

export interface PainPoint {
  id: string
  status: PainStatus
  /** Where in the app to see it, if anywhere. */
  view?: 'plan' | 'recommend' | 'record' | 'contribute'
}

export const PAIN_POINTS: PainPoint[] = [
  { id: 'when-offered', status: 'works', view: 'plan' },
  { id: 'what-when', status: 'works', view: 'plan' },
  { id: 'prerequisites', status: 'works', view: 'plan' },
  { id: 'blocks', status: 'works', view: 'plan' },
  { id: 'easy-wam', status: 'partly', view: 'recommend' },
  { id: 'known-hard', status: 'partly', view: 'recommend' },
  { id: 'skills', status: 'partly', view: 'record' },
  { id: 'fit-me', status: 'works', view: 'recommend' },
  { id: 'rules-change', status: 'partly', view: 'contribute' },
  { id: 'future', status: 'planned' },
]

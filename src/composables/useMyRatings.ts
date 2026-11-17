import { usePersisted } from './usePersisted'
import { cleanMyRatings, type MyRating } from '@/utils/sanitize'
import { RATINGS_FORM } from '@/config'
import { hasQuestion } from '@/utils/googleForm'

/**
 * What this browser sent when rating each subject, so the student can change it later. Each
 * subject gets its own random edit id (never reused across subjects, so ratings can't be linked
 * to each other); sending again with that id replaces the earlier answer when the ratings are
 * counted (scripts/ratings/aggregate.ts latestEdits). Stays in this browser only.
 */
const saved = usePersisted<Record<string, MyRating>>('sc:myRatings', {}, cleanMyRatings)

function newId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12)
}

export function useMyRatings() {
  return {
    /** Whether a sent rating can be changed: the form has the edit id question. */
    editable: hasQuestion(RATINGS_FORM, 'editId'),
    get: (code: string): MyRating | undefined => saved.value[code],
    /** The edit id for this subject's rating, made the first time it's asked for. */
    idFor: (code: string): string => saved.value[code]?.id ?? newId(),
    save: (code: string, id: string, answers: Record<string, string | string[]>) => {
      saved.value = { ...saved.value, [code]: { id, answers } }
    },
  }
}

/** Where the one-tap rating had got to when the student asked for the full form. */
export interface QuickStart {
  difficulty: number
  /** Already sent on its own (the full form then replaces it, or leaves the difficulty out). */
  sent: boolean
  /** A tip typed in the one-tap card but not sent yet. */
  wish: string
}

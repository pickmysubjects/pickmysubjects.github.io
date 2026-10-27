import { cleanCalc, type CalcEntry } from '@/engine/finalCalc'
import { usePersisted } from './usePersisted'

export type { CalcEntry, CalcRow } from '@/engine/finalCalc'

/** What a student typed into the final calculator, per subject: this browser only (and its backup file). */
const saved = usePersisted<Record<string, CalcEntry>>('sc:finalCalc', {}, cleanCalc)

export function useFinalCalc() {
  return saved
}

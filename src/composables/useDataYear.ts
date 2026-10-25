import { factsYear, latestDataYear, publishedYear, type Subject } from '@/engine'
import { handbookUrl } from '@/utils/links'
import { useDataset } from './useDataset'

/**
 * The data's years, for components: which Handbook year a subject's facts come from (and whether
 * that's behind the year being looked at), and the Handbook link for that year.
 */
export function useDataYear() {
  const { all } = useDataset()
  const latest = latestDataYear(all.subjects)
  const published = publishedYear(all.subjects)
  const facts = (s: Subject, wanted: number) => factsYear(s, wanted, published)
  /** The Handbook page for the year the facts come from; the newest data year for a subject we don't have. */
  const handbookFor = (code: string, wanted: number = latest) => {
    const s = all.subjects[code]
    return handbookUrl(code, s ? factsYear(s, wanted, published).year : Math.min(wanted, latest))
  }
  return { latest, published, facts, handbookFor }
}

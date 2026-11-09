import { shallowRef, watch, type Ref } from 'vue'
import links from '@/content/clubInfo/links.json'

/**
 * What each UMSU club does, in our own words from its UMSU page: one line on what it is, what it
 * runs, and what draws students (only what the page states). One file per language, loaded when
 * a clubs page opens; the links (website, Instagram, Facebook) are the same in every language.
 */
export interface ClubInfoText {
  summary: string
  activities: string[]
  draws: string[]
}
export interface ClubLinks {
  website?: string
  instagram?: string
  facebook?: string
}

export const CLUB_LINKS = links as Record<string, ClubLinks>

const files = import.meta.glob<Record<string, ClubInfoText>>('@/content/clubInfo/[a-z][a-z]*.json', { import: 'default' })
const loaded = new Map<string, Record<string, ClubInfoText>>()

function load(locale: string): Promise<Record<string, ClubInfoText>> {
  const hit = loaded.get(locale)
  if (hit) return Promise.resolve(hit)
  const path = Object.keys(files).find((p) => p.endsWith(`/${locale}.json`)) ?? Object.keys(files).find((p) => p.endsWith('/en.json'))
  if (!path) return Promise.resolve({})
  return files[path]!().then((info) => (loaded.set(locale, info), info))
}

/** The clubs' text in the reader's language (English where a translation is missing); {} until loaded. */
export function useClubInfo(locale: Ref<string>) {
  const info = shallowRef<Record<string, ClubInfoText>>(loaded.get(locale.value) ?? {})
  watch(
    locale,
    async (l) => {
      const [mine, en] = await Promise.all([load(l), load('en')])
      // A quicker switch to another language since: that one's text wins, not this late one.
      if (l !== locale.value) return
      info.value = { ...en, ...mine }
    },
    { immediate: true },
  )
  return info
}

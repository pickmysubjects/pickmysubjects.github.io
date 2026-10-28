import { computed, shallowReactive, watch } from 'vue'
import { useI18n } from '@/i18n'
import type { Subject } from '@/engine'

/*
 * Each subject's one-line summary ("what you'll learn") in the reader's language, for the rows on
 * Find subjects. The core data has the English line; each other language's lines are one small
 * file (src/generated/learn/<locale>.json), fetched the first time a list needs them. Until it
 * arrives, or offline, the English line shows.
 */
const urls = import.meta.glob<string>('@/generated/learn/*.json', { query: '?url', import: 'default', eager: true })
const loaded = shallowReactive(new Map<string, Record<string, string>>())
const pending = new Map<string, Promise<void>>()

function load(locale: string): void {
  if (locale === 'en' || loaded.has(locale) || pending.has(locale)) return
  const url = Object.entries(urls).find(([path]) => path.endsWith(`/${locale}.json`))?.[1]
  if (!url) return
  const p = fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((lines: Record<string, string>) => void loaded.set(locale, lines))
    .catch(() => void pending.delete(locale)) // offline: try again next time
  pending.set(locale, p)
}

export function useLearnLines() {
  const { locale } = useI18n()
  watch(locale, load, { immediate: true })
  const lines = computed(() => loaded.get(locale.value))
  return (s: Subject): string => lines.value?.[s.code] || s.about?.learn.en || ''
}

/** The site version and build date, injected at build time (vite.config.ts `define`). */
export const APP_VERSION: string = __APP_VERSION__
export const APP_UPDATED: string = __APP_UPDATED__

/** The first year the site was published; the © line becomes "2026–<year>" once the year rolls over. */
const FIRST_YEAR = 2026

export function copyright(updated: string = APP_UPDATED): string {
  const year = new Date(updated).getUTCFullYear()
  return `© ${year > FIRST_YEAR ? `${FIRST_YEAR}–${year}` : FIRST_YEAR} PickMySubjects`
}

/** "27 October" (en-AU for English: the site is for Melbourne students) / "10月27日" in the student's language, on Melbourne's calendar. */
export function releaseDate(locale: string, updated: string = APP_UPDATED): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-AU' : locale, { month: 'long', day: 'numeric', timeZone: 'Australia/Melbourne' }).format(new Date(updated))
}

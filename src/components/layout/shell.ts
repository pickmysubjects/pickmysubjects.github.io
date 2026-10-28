/**
 * Pages laid out like the 墨大入门 guide: a 1440px container with 40px gutters (12px on phones),
 * the header and footer widening with them so their edges line up (App.vue, .shell-guide).
 */
const WIDE_READING = new Set(['guide', 'about', 'feedback', 'contribute', 'changes', 'privacy'])

export function wideReading(view: string): boolean {
  return WIDE_READING.has(view)
}

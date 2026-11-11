import { MIN_COMMENTS, type StudentComment } from '../engine/comments'
import { termLabel } from '../i18n/format'
import type { Translate } from '../i18n/interpolate'

/** Tips shown before "Show all", on the subject page and in its static HTML. */
export const TIPS_SHOWN = 3

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * The static HTML of a subject's approved "What I wish I knew" tips, or '' when it has fewer than
 * MIN_COMMENTS. Each shows its text and term only.
 */
export function tipsHtml(t: Translate, comments: StudentComment[] | undefined): string {
  const tips = comments && comments.length >= MIN_COMMENTS ? comments : []
  if (!tips.length) return ''
  const li = (cs: StudentComment[]) =>
    cs
      .map((c) => {
        // The term it was taken in; none when the student left the year blank.
        const term = c.year === undefined ? '' : c.period ? termLabel(t, { year: c.year, period: c.period }) : String(c.year)
        return `<li lang="${c.lang}">${esc(c.text)}${term ? ` <small>(${esc(term)})</small>` : ''}</li>`
      })
      .join('')
  const more = tips.length > TIPS_SHOWN ? `<details><summary>${esc(t('subject.tipsAll', { n: tips.length }))}</summary><ul>${li(tips.slice(TIPS_SHOWN))}</ul></details>` : ''
  return `<h3 id="tips">${esc(t('subject.tipsTitle'))}</h3><p>${esc(t('subject.tipsNote'))}</p><ul>${li(tips.slice(0, TIPS_SHOWN))}</ul>${more}`
}

import type { AttendClass } from '../engine/handbookFacts'
import type { Translate } from '../i18n/interpolate'

/**
 * "Attend 80% of tutorials / seminars": the classes the Handbook names, or plain "classes" when
 * it names none. Never says lectures unless the Handbook does.
 */
export function attendanceText(t: Translate, n: number, appliesTo: readonly AttendClass[] | undefined): string {
  const what = appliesTo?.length ? appliesTo.map((c) => t(`assess.attendWhat.${c}`)).join(t('assess.attendSep')) : t('assess.attendWhat.classes')
  return t('assess.attendance', { n, what })
}

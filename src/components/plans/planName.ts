import type { Translate } from '@/i18n'

/** "Plan B", or the name the student gave it. */
export function planName(t: Translate, p: { label: string; name?: string }): string {
  return p.name || t('plans.named', { letter: p.label })
}

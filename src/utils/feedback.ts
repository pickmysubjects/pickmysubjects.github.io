import { FEEDBACK } from '@/config'
import { en } from '@/i18n/messages/en'
import { PAIN_POINTS } from '@/painPoints'

export const OTHER_TOPICS = ['data', 'bug', 'idea', 'translation'] as const

export interface FeedbackDraft {
  topic: string
  /** 1–5: how well Subject Compass handles this for you. */
  rating: number | null
  message: string
  subject: string
  contact: string
}

/** English topic label, so maintainers can triage issues whatever language the sender used. */
export function topicLabel(id: string): string {
  if (PAIN_POINTS.some((p) => p.id === id)) return en.pain[id as keyof typeof en.pain].q
  return en.feedback.other[id as keyof typeof en.feedback.other] ?? id
}

export function feedbackText(d: FeedbackDraft, locale: string): { title: string; body: string } {
  const title = `[${d.topic}] ${d.subject ? `${d.subject}: ` : ''}${d.message.split('\n')[0]?.slice(0, 70) ?? ''}`
  const lines = [
    `**Topic:** ${topicLabel(d.topic)}`,
    d.rating !== null ? `**How well it helps today:** ${d.rating}/5` : '',
    d.subject ? `**Subject:** ${d.subject}` : '',
    `**Language:** ${locale}`,
    '',
    d.message,
    '',
    d.contact ? `**Contact:** ${d.contact}` : '',
    `_Sent from Subject Compass (${location.href.split('#')[0]})_`,
  ]
  return { title, body: lines.filter((l, i, all) => l !== '' || all[i - 1] !== '').join('\n') }
}

export function githubIssueUrl(d: FeedbackDraft, locale: string): string | null {
  if (!FEEDBACK.githubRepo) return null
  const { title, body } = feedbackText(d, locale)
  const params = new URLSearchParams({ title, body, labels: `feedback,${d.topic}` })
  return `https://github.com/${FEEDBACK.githubRepo}/issues/new?${params}`
}

export function mailtoUrl(d: FeedbackDraft, locale: string): string | null {
  if (!FEEDBACK.feedbackEmail) return null
  const { title, body } = feedbackText(d, locale)
  return `mailto:${FEEDBACK.feedbackEmail}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
}

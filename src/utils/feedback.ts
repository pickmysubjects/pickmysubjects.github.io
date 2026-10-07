import { FEEDBACK } from '@/config'
import { PAIN_POINTS } from '@/painPoints'

export const OTHER_TOPICS = [
  { id: 'data', label: 'Some subject data is wrong or missing' },
  { id: 'bug', label: 'Something is broken' },
  { id: 'idea', label: 'A new idea' },
] as const

export interface FeedbackDraft {
  topic: string
  /** 1–5: how well Subject Compass handles this for you. */
  rating: number | null
  message: string
  subject: string
  contact: string
}

export function topicLabel(id: string): string {
  return PAIN_POINTS.find((p) => p.id === id)?.question ?? OTHER_TOPICS.find((t) => t.id === id)?.label ?? id
}

export function feedbackText(d: FeedbackDraft): { title: string; body: string } {
  const topic = topicLabel(d.topic)
  const title = `[${d.topic}] ${d.subject ? `${d.subject}: ` : ''}${d.message.split('\n')[0]?.slice(0, 70) ?? ''}`
  const lines = [
    `**Topic:** ${topic}`,
    d.rating !== null ? `**How well it helps today:** ${d.rating}/5` : '',
    d.subject ? `**Subject:** ${d.subject}` : '',
    '',
    d.message,
    '',
    d.contact ? `**Contact:** ${d.contact}` : '',
    `_Sent from Subject Compass (${location.href.split('#')[0]})_`,
  ]
  return { title, body: lines.filter((l, i, all) => l !== '' || all[i - 1] !== '').join('\n') }
}

export function githubIssueUrl(d: FeedbackDraft): string | null {
  if (!FEEDBACK.githubRepo) return null
  const { title, body } = feedbackText(d)
  const params = new URLSearchParams({ title, body, labels: `feedback,${d.topic}` })
  return `https://github.com/${FEEDBACK.githubRepo}/issues/new?${params}`
}

export function mailtoUrl(d: FeedbackDraft): string | null {
  if (!FEEDBACK.feedbackEmail) return null
  const { title, body } = feedbackText(d)
  return `mailto:${FEEDBACK.feedbackEmail}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
}

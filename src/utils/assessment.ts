import { ASSESSMENT_KINDS, type AssessmentKind, type AssessmentTask } from '@/engine'

const round = (x: number): number => Math.round(x * 10) / 10


export interface AssessmentSummary {
  /** Weight per kind of task, biggest first. */
  parts: { kind: AssessmentKind; weight: number }[]
  /** Share of the final exam; 0 when there is none. */
  exam: number
  /** Share done in groups. */
  group: number
  examHurdle: boolean
  otherHurdle: boolean
}

/** The facts students check first, worked out once for every place that shows them. */
export function summariseAssessment(tasks: AssessmentTask[] | 'unknown' | undefined): AssessmentSummary | null {
  if (tasks === undefined || tasks === 'unknown' || tasks.length === 0) return null
  const sum = (pick: (t: AssessmentTask) => boolean) =>
    round(tasks.filter(pick).reduce((total, t) => total + t.weight, 0))
  const parts = ASSESSMENT_KINDS.map((kind) => ({ kind, weight: sum((t) => t.kind === kind) }))
    .filter((p) => p.weight > 0)
    .sort((a, b) => b.weight - a.weight)
  const examHurdle = tasks.some((t) => t.kind === 'exam' && t.hurdle)
  return {
    parts,
    exam: sum((t) => t.kind === 'exam'),
    group: sum((t) => t.group === true),
    examHurdle,
    otherHurdle: !examHurdle && tasks.some((t) => t.hurdle),
  }
}

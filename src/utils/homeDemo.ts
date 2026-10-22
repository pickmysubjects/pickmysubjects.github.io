import type { Period, Subject } from '@/engine'

/** The home page's two worked examples (see scripts/homeDemo.ts), written at build time. */
export interface HomeDemo {
  stats: { subjects: number; degrees: number }
  subject: Subject
  plan: {
    course: string
    courseTitle: string
    major: string
    majorTitle: string
    terms: { year: number; period: Period; subjects: string[] }[]
    met: number
    total: number
  }
}

import type { Topic } from '@/engine'

/** Interests grouped by area, so a long wall of chips reads as a few short lists. */
export const TOPIC_GROUPS: { id: string; topics: Topic[] }[] = [
  {
    id: 'computing',
    topics: ['programming', 'algorithms', 'software-engineering', 'ai', 'machine-learning', 'data-science', 'databases', 'security', 'systems', 'graphics', 'theory'],
  },
  { id: 'maths', topics: ['mathematics', 'calculus', 'linear-algebra', 'pure-maths', 'probability', 'statistics', 'optimisation', 'modelling'] },
  { id: 'business', topics: ['economics', 'finance', 'accounting', 'marketing', 'law', 'business'] },
  { id: 'science', topics: ['biology', 'chemistry', 'physics', 'earth-science', 'environment', 'psychology'] },
  { id: 'arts', topics: ['languages', 'design', 'ethics', 'philosophy', 'history', 'science-communication'] },
]

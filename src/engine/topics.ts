import type { Subject, Topic } from './schema'

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

/**
 * A broad topic implied by a subject's area code, for subjects nobody has tagged yet
 * (most of them). Coarse on purpose: it says "this is a biology subject", not which part.
 */
const AREA_TOPICS: Record<string, Topic[]> = {
  ACCT: ['accounting'], ACTL: ['finance', 'statistics'], AGRI: ['environment'], ANAT: ['biology'], ANSC: ['biology'],
  ATOC: ['earth-science'], BCMB: ['biology', 'chemistry'], BIOL: ['biology'], BIOM: ['biology'], BMEN: ['biology'],
  BOTA: ['biology'], BTCH: ['biology'], CHEM: ['chemistry'], CHEN: ['chemistry'], COMP: ['programming'],
  ECOL: ['environment', 'biology'], ECON: ['economics'], ENEN: ['environment'], ENST: ['environment'], ENVS: ['environment'],
  ERTH: ['earth-science'], EVSC: ['environment'], FNCE: ['finance'], FOOD: ['chemistry'], FRST: ['environment'],
  GENE: ['biology'], GEOG: ['environment'], GEOL: ['earth-science'], GEOM: ['earth-science'], HORT: ['biology'],
  LAWS: ['law'], MAST: ['mathematics'], MGMT: ['business'], MIIM: ['biology'], MKTG: ['marketing'],
  NEUR: ['biology', 'psychology'], NUTR: ['biology'], PATH: ['biology'], PHRM: ['chemistry'], PHYC: ['physics'],
  PHYS: ['biology'], PSYC: ['psychology'], SWEN: ['software-engineering', 'programming'], VETS: ['biology'], ZOOL: ['biology'],
}

/** The subject's own tags, or else the broad ones its area implies (marked as inferred). */
export function topicsOf(s: Subject): { topics: string[]; inferred: boolean } {
  if (s.topics.length) return { topics: s.topics, inferred: false }
  return { topics: AREA_TOPICS[s.area ?? s.code.slice(0, 4)] ?? [], inferred: true }
}

const GROUP_OF = new Map(TOPIC_GROUPS.flatMap((g) => g.topics.map((t) => [t as string, g.id])))

/** Topics in the same group count as related (machine learning and AI, finance and accounting). */
export function relatedTopics(a: string, b: string): boolean {
  return a !== b && GROUP_OF.get(a) !== undefined && GROUP_OF.get(a) === GROUP_OF.get(b)
}

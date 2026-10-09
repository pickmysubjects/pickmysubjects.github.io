import type { Subject, Topic } from './schema'

/** Interests grouped by area, so a long wall of chips reads as a few short lists. */
export const TOPIC_GROUPS: { id: string; topics: Topic[] }[] = [
  {
    id: 'computing',
    topics: ['programming', 'algorithms', 'software-engineering', 'ai', 'machine-learning', 'data-science', 'databases', 'security', 'systems', 'graphics', 'theory'],
  },
  { id: 'maths', topics: ['mathematics', 'calculus', 'linear-algebra', 'pure-maths', 'probability', 'statistics', 'optimisation', 'modelling'] },
  { id: 'business', topics: ['economics', 'finance', 'accounting', 'marketing', 'law', 'business'] },
  { id: 'science', topics: ['biology', 'ecology', 'chemistry', 'physics', 'earth-science', 'geography', 'environment', 'psychology'] },
  { id: 'applied', topics: ['engineering', 'health', 'agriculture'] },
  { id: 'arts', topics: ['languages', 'design', 'ethics', 'philosophy', 'history', 'science-communication'] },
]

/**
 * A broad topic implied by a subject's area code, for subjects nobody has tagged yet
 * (most of them). Coarse on purpose: it says "this is a biology subject", not which part.
 */
const AREA_TOPICS: Record<string, Topic[]> = {
  ACCT: ['accounting'], ACTL: ['finance', 'statistics'], AGRI: ['agriculture'], ANAT: ['health', 'biology'], ANSC: ['agriculture', 'biology'],
  ATOC: ['earth-science'], BCMB: ['biology', 'chemistry'], BIOL: ['biology'], BIOM: ['health', 'biology'], BMEN: ['engineering', 'health'],
  BOTA: ['ecology', 'biology'], BTCH: ['biology'], CEDB: ['engineering'], CHEM: ['chemistry'], CHEN: ['engineering', 'chemistry'],
  COMP: ['programming'], CVEN: ['engineering'], ECOL: ['ecology', 'environment'], ECON: ['economics'], ELEN: ['engineering'],
  ENEN: ['engineering', 'environment'], ENGR: ['engineering'], ENST: ['environment'], ENVS: ['environment'], ERTH: ['earth-science'],
  EVSC: ['environment'], FNCE: ['finance'], FOOD: ['agriculture', 'chemistry'], FRST: ['ecology', 'environment'], GENE: ['biology'],
  GEOG: ['geography'], GEOL: ['earth-science'], GEOM: ['geography', 'engineering'], HORT: ['agriculture'], LAWS: ['law'],
  MAST: ['mathematics'], MCEN: ['engineering'], MGMT: ['business'], MIIM: ['health', 'biology'], MKTG: ['marketing'],
  NEUR: ['health', 'psychology'], NUTR: ['health'], OPTO: ['health'], PATH: ['health', 'biology'], PHRM: ['health', 'chemistry'],
  PHYC: ['physics'], PHYS: ['health', 'biology'], PSYC: ['psychology'], SWEN: ['software-engineering', 'programming'],
  VETS: ['agriculture', 'biology'], ZOOL: ['ecology', 'biology'],
}


const GROUP_OF = new Map(TOPIC_GROUPS.flatMap((g) => g.topics.map((t) => [t as string, g.id])))

/** Topics in the same group count as related (machine learning and AI, finance and accounting). */
export function relatedTopics(a: string, b: string): boolean {
  return a !== b && GROUP_OF.get(a) !== undefined && GROUP_OF.get(a) === GROUP_OF.get(b)
}

/**
 * Topics read off a subject's title and our one-line summary, for subjects nobody has tagged.
 * Checked blind against the hand-tagged subjects: about 74% precision, 69% recall (and the
 * hand tags themselves are not exhaustive). The summary only adds topics from the subject's
 * own field, and a few words that mean different things in different fields are fenced in.
 */
const LEX: Record<string, RegExp> = {
  programming: /\bprogram|coding|\bcode\b|python|\bjava\b|software|computing/i,
  algorithms: /algorithm|data structure|complexity|graph theory/i,
  'software-engineering': /software (?:engineering|development|design|modelling)|object.oriented|it project|software projects?/i,
  ai: /artificial intelligence|\bai\b|intelligent|agents?\b|search and planning/i,
  'machine-learning': /machine learning|learning from data|predictive model/i,
  'data-science': /data science|data processing|data analy|big data|wrangl/i,
  databases: /database|\bsql\b|data management/i,
  security: /security|privacy|cryptograph/i,
  systems: /operating system|computer systems|network|distributed/i,
  graphics: /graphics|games?\b|visuali[sz]|interaction|media computation|images?\b/i,
  theory: /theor(?:y|etical) computer|models of computation|computability|automata|logic\b/i,
  calculus: /calculus|differential equation|integra(?:l|tion)|vector calculus/i,
  'linear-algebra': /linear algebra|matri(?:x|ces)|vector spaces?/i,
  'pure-maths': /real analysis|complex analysis|algebra\b(?! and)|group theory|number theory|topology|metric|hilbert|proofs?\b|abstract/i,
  probability: /probabilit|stochastic|random|markov/i,
  statistics: /statistic|regression|inference|bayes|data analysis|linear (?:statistical )?models/i,
  optimisation: /optimi[sz]|operations research|decision making|linear programming/i,
  modelling: /model(?:l)?ing|simulation|numerical/i,
  economics: /economic|microeconomic|macroeconomic|markets?\b/i,
  finance: /financ|investment|actuarial/i,
  accounting: /accounting/i,
  marketing: /marketing/i,
  law: /\blaw\b|legal/i,
  business: /business|management|commerce/i,
  biology: /biolog|cells?\b|genetic|genom|organism|ecolog|physiolog|anatom|microb|immun|zoolog|plant|animal|neuro|patholog|disease/i,
  chemistry: /chemi|molecul|reaction|organic|biochem/i,
  physics: /physic|quantum|mechanics|electromagnet|thermodynamic|relativity/i,
  'earth-science': /earth|geolog|climate|weather|atmospher|ocean|geograph|rock|landscape/i,
  environment: /environment|sustainab|conservation|ecosystem|forest|agricultur|water|land use/i,
  psychology: /psycholog|behaviou?r|cognit|perception|mind\b|brain/i,
  languages: /japanese|chinese|french|german|spanish|language/i,
  design: /\bdesign\b(?! of algorithms)|interaction design|user experience|prototyp/i,
  ethics: /ethic|responsib|society/i,
  philosophy: /philosoph/i,
  history: /histor/i,
  'science-communication': /communicat|science and society|public/i,
}

const AREA_GROUP: Record<string, string> = {
  COMP: 'computing', SWEN: 'computing', INFO: 'computing', MAST: 'maths', ACTL: 'maths',
  ECON: 'business', FNCE: 'business', ACCT: 'business', MKTG: 'business', BLAW: 'business', MGMT: 'business',
}
const COMMERCE = new Set(['ECON', 'FNCE', 'ACCT', 'MKTG', 'BLAW', 'MGMT', 'ACTL'])
const COMPUTING = new Set(['COMP', 'SWEN', 'INFO'])

function inferTopics(s: Subject): string[] {
  const area = s.area ?? s.code.slice(0, 4)
  const own = AREA_GROUP[area] ?? 'science'
  const summary = s.about?.learn.en ?? ''
  const out = new Set<string>()
  for (const [t, rx] of Object.entries(LEX)) {
    // The title can say anything; the summary only adds topics from the subject's own field.
    if (rx.test(s.title) || (summary && GROUP_OF.get(t) === own && rx.test(summary))) out.add(t)
  }
  const text = `${s.title} ${summary}`
  if (s.level < 2) out.delete('pure-maths')
  if (!COMMERCE.has(area)) out.delete('business')
  if (area === 'ACCT' || !/financ(?!ial accounting)|actuarial|investment/i.test(text)) out.delete('finance')
  if (/programming language/i.test(text)) out.delete('languages')
  if (!COMPUTING.has(area)) out.delete('systems')
  return [...out]
}

const INFERRED = new WeakMap<Subject, string[]>()

/**
 * The subject's own tags; or else what its title and summary say (`specific`) plus the broad
 * topics its area implies, marked as inferred.
 */
export function topicsOf(s: Subject): { topics: string[]; inferred: boolean; specific: string[] } {
  if (s.topics.length) return { topics: s.topics, inferred: false, specific: s.topics }
  let specific = INFERRED.get(s)
  if (!specific) INFERRED.set(s, (specific = inferTopics(s)))
  return { topics: [...new Set([...specific, ...(AREA_TOPICS[s.area ?? s.code.slice(0, 4)] ?? [])])], inferred: true, specific }
}

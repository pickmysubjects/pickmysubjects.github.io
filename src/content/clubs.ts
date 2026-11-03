import type { Topic } from '@/engine/schema'

/**
 * UMSU clubs tied to what students study or want to work in: faculty and course societies,
 * careers and industry groups, and the arts and performance ones. Names and links as the UMSU
 * clubs listing shows them; the topics are ours, matched to the interests students pick.
 *
 * Source: https://umsu.unimelb.edu.au/buddy-up/clubs/clubs-listing/ (246 clubs), checked
 * 2026-11-04. Clubs come and go each year: check the listing again every November.
 *
 * Left out on purpose: cultural, faith, political-party, food and games clubs (nothing in a
 * student's subjects says which suits them), and clubs for one gender or identity (we don't know
 * the student's, and shouldn't guess).
 */
export interface Club {
  name: string
  /** The club's page on the UMSU site. */
  url: string
  topics: Topic[]
  /** Degrees whose own student society it is. */
  courses?: string[]
}

const JOIN = 'https://umsu.unimelb.edu.au/buddy-up/clubs/clubs-listing/join/'

export const CLUBS_LISTING = 'https://umsu.unimelb.edu.au/buddy-up/clubs/clubs-listing/'
export const CLUBS_CHECKED = '2026-11-04'

export const CLUBS: readonly Club[] = [
  // Degree societies.
  { name: 'Arts Students Society', url: `${JOIN}6141/`, topics: [], courses: ['B-ARTS'] },
  { name: 'Biomedicine Student Society', url: `${JOIN}6253/`, topics: ['health', 'biology'], courses: ['B-BMED'] },
  { name: 'Commerce Students Society', url: `${JOIN}6501/`, topics: ['business'], courses: ['B-COM'] },
  { name: 'Design Student Society (DES)', url: `${JOIN}6589/`, topics: ['design', 'architecture'], courses: ['B-DES'] },
  { name: 'Music Students Society', url: `${JOIN}7237/`, topics: ['music'], courses: ['B-MUS'] },
  { name: 'Science Students Society', url: `${JOIN}7469/`, topics: [], courses: ['B-SCI'] },
  { name: 'Agricultural and Food Sciences Society', url: `${JOIN}6061/`, topics: ['agriculture'], courses: ['B-AGR'] },

  // Computing and data.
  { name: 'Computing and Information Systems Students Association', url: `${JOIN}cissa/`, topics: ['programming', 'software-engineering', 'databases'] },
  { name: 'Data Science Students Society (DS Cubed)', url: `${JOIN}dscubed/`, topics: ['data-science', 'machine-learning', 'statistics'] },
  { name: 'Competitive Programming Club', url: `${JOIN}6517/`, topics: ['algorithms', 'programming'] },
  { name: 'HackMelbourne', url: `${JOIN}hackmelbourne/`, topics: ['programming', 'software-engineering'] },
  { name: 'Google Developer Groups on Campus', url: `${JOIN}gdsc/`, topics: ['programming', 'software-engineering'] },
  { name: 'AWS Cloud Club', url: `${JOIN}10595/`, topics: ['systems', 'software-engineering'] },
  { name: 'Information Security Club (MISC)', url: `${JOIN}6949/`, topics: ['security'] },
  { name: 'Artificial Intelligence Prototyping Studio', url: `${JOIN}aips/`, topics: ['ai', 'machine-learning'] },
  { name: 'Responsible Artificial Intelligence Development', url: `${JOIN}raid/`, topics: ['ai', 'ethics'] },
  { name: 'Game Makers’ Club', url: `${JOIN}the_game_makers_club/`, topics: ['programming', 'graphics', 'design'] },
  { name: 'Business Analytics Students Society', url: `${JOIN}bass/`, topics: ['data-science', 'business', 'statistics'] },
  { name: 'Technology Consulting Club (MTech)', url: `${JOIN}mtech/`, topics: ['business', 'software-engineering'] },

  // Maths and the sciences.
  { name: 'Mathematics & Statistics Society', url: `${JOIN}mums/`, topics: ['mathematics', 'pure-maths', 'statistics'] },
  { name: 'Actuarial Students’ Society', url: `${JOIN}6037/`, topics: ['actuarial', 'probability'] },
  { name: 'Physics Students Society', url: `${JOIN}pss/`, topics: ['physics'] },
  { name: 'Quantum Club', url: `${JOIN}9537/`, topics: ['physics'] },
  { name: 'Society for Astronomy at Melbourne University (SAMU)', url: `${JOIN}samu/`, topics: ['physics'] },
  { name: 'Chemistry and Biology Society', url: `${JOIN}cabs/`, topics: ['chemistry', 'biology'] },
  { name: 'Synthetic Biology Society', url: `${JOIN}10032/`, topics: ['biology'] },
  { name: 'Earth Sciences Students Society', url: `${JOIN}6605/`, topics: ['earth-science'] },
  { name: 'Soil and Plant Society', url: `${JOIN}saps/`, topics: ['agriculture', 'ecology'] },
  { name: 'Wildlife Conservation Society', url: `${JOIN}7733/`, topics: ['ecology', 'environment'] },
  { name: 'Networking for Ecological and Marine Opportunities (NEMO)', url: `${JOIN}10143/`, topics: ['ecology', 'environment'] },
  { name: 'Psychology Association', url: `${JOIN}mupa/`, topics: ['psychology'] },
  { name: 'Future Doctors Society', url: `${JOIN}9460/`, topics: ['health', 'biology'] },
  { name: 'Global Health Society', url: `${JOIN}6853/`, topics: ['health'] },
  { name: 'OmniSci Magazine', url: `${JOIN}8103/`, topics: ['science-communication'] },

  // Engineering.
  { name: 'Engineering Students’ Club', url: `${JOIN}6669/`, topics: ['engineering'] },
  { name: 'Mechanical Engineering Student Society', url: `${JOIN}7181/`, topics: ['engineering'] },
  { name: 'Electrical Engineering Club', url: `${JOIN}mueec/`, topics: ['engineering', 'physics'] },
  { name: 'Chemical Engineering Students Society', url: `${JOIN}6357/`, topics: ['engineering', 'chemistry'] },
  { name: 'Civil and Structural Society', url: `${JOIN}6461/`, topics: ['engineering', 'construction'] },
  { name: 'Biomedical Engineering Society', url: `${JOIN}6245/`, topics: ['engineering', 'health'] },
  { name: 'Environmental Engineers Society', url: `${JOIN}6701/`, topics: ['engineering', 'environment'] },
  { name: 'Students in Renewable Energy', url: `${JOIN}9216/`, topics: ['environment', 'engineering'] },
  { name: 'Engineers Without Borders', url: `${JOIN}6685/`, topics: ['engineering', 'environment'] },
  { name: 'Robotics, Engineering & Competition Society', url: `${JOIN}7951/`, topics: ['engineering', 'programming'] },
  { name: 'Aerospace and Rocket Engineering Society (ARES)', url: `${JOIN}test/`, topics: ['engineering', 'physics'] },
  { name: 'Melbourne University Racing (MUR)', url: `${JOIN}mur/`, topics: ['engineering'] },
  { name: 'Drone Aviation and Racing Engineering Society', url: `${JOIN}daresunimelb/`, topics: ['engineering'] },
  { name: 'Geomatics Society', url: `${JOIN}mugs/`, topics: ['geography', 'engineering'] },

  // Business, finance and economics.
  { name: 'Accounting Students Association', url: `${JOIN}6029/`, topics: ['accounting'] },
  { name: 'Beta Alpha Psi – Unimelb Chapter', url: `${JOIN}9526/`, topics: ['accounting', 'finance'] },
  { name: 'Finance Student Association', url: `${JOIN}6773/`, topics: ['finance'] },
  { name: 'Financial Management Association of Australia', url: `${JOIN}fmaa/`, topics: ['finance'] },
  { name: 'University Network for Investing and Trading (UNIT)', url: `${JOIN}7693/`, topics: ['finance'] },
  { name: 'Australian Wall Street', url: `${JOIN}6197/`, topics: ['finance'] },
  { name: 'Quantitative Trading Society', url: `${JOIN}7967/`, topics: ['finance', 'probability', 'programming'] },
  { name: 'Real Estate Investment Student Association', url: `${JOIN}10176/`, topics: ['property', 'finance'] },
  { name: 'Economics Student Society of Australia', url: `${JOIN}6613/`, topics: ['economics'] },
  { name: 'Emerging Markets Network', url: `${JOIN}7894/`, topics: ['economics', 'finance'] },
  { name: 'Melbourne Microfinance Initiative', url: `${JOIN}7205/`, topics: ['finance', 'economics'] },
  { name: 'Marketing Intelligence', url: `${JOIN}7157/`, topics: ['marketing'] },
  { name: 'Students’ Association of Management and Marketing', url: `${JOIN}7581/`, topics: ['management', 'marketing', 'human-resources'] },
  { name: 'BusinessOne Consulting University of Melbourne', url: `${JOIN}8031/`, topics: ['business', 'management'] },
  { name: 'Global Consulting Group', url: `${JOIN}umsu-gcg/`, topics: ['business', 'management'] },
  { name: 'Enactus', url: `${JOIN}6653/`, topics: ['entrepreneurship'] },
  { name: 'StartUp Link Unimelb', url: `${JOIN}8055/`, topics: ['entrepreneurship'] },
  { name: 'Social Impact Investment Fund', url: `${JOIN}siif_melbourne/`, topics: ['finance', 'entrepreneurship'] },
  { name: 'Construction Students Association', url: `${JOIN}6541/`, topics: ['construction', 'property'] },
  { name: 'Urban Collective', url: `${JOIN}7357/`, topics: ['urban-planning', 'architecture'] },

  // Law, politics, society and the humanities.
  { name: 'Pre-Law Society', url: `${JOIN}8915/`, topics: ['law'] },
  { name: 'Debating Society', url: `${JOIN}muds/`, topics: ['politics', 'law'] },
  { name: 'Model United Nations Society', url: `${JOIN}9715/`, topics: ['politics'] },
  { name: 'Global Affairs Society', url: `${JOIN}9471/`, topics: ['politics'] },
  { name: 'Philosophy Society', url: `${JOIN}7317/`, topics: ['philosophy', 'ethics'] },
  { name: 'History Society', url: `${JOIN}6901/`, topics: ['history'] },
  { name: 'Classics and Archaeology Society', url: `${JOIN}6477/`, topics: ['history'] },
  { name: 'Anthropology Student Society', url: `${JOIN}ants/`, topics: ['society'] },
  { name: 'Linguistics Society', url: `${JOIN}7125/`, topics: ['languages'] },
  { name: 'Language Exchange', url: `${JOIN}7085/`, topics: ['languages'] },
  { name: 'Creative Literature and Writing Society', url: `${JOIN}6557/`, topics: ['literature'] },

  // Arts, media and performance.
  { name: 'Film Society', url: `${JOIN}filmsoc/`, topics: ['film-and-screen'] },
  { name: 'Filmmakers Collaborative', url: `${JOIN}6765/`, topics: ['film-and-screen', 'media'] },
  { name: 'Melbourne University Photography Club (MUPC)', url: `${JOIN}9726/`, topics: ['art', 'media', 'visual-communication'] },
  { name: 'Drawing and Painting Club', url: `${JOIN}6597/`, topics: ['art'] },
  { name: 'VCA Music Theatre Society', url: `${JOIN}9592/`, topics: ['performance', 'music'] },
  { name: 'Apollo Music Society', url: `${JOIN}apollo/`, topics: ['music'] },
  { name: 'Piano Society', url: `${JOIN}10486/`, topics: ['music'] },
  { name: 'Ring of Choir', url: `${JOIN}7437/`, topics: ['music', 'performance'] },
]

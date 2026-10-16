// Field of each major, by its id. Anything new lands in "other" until it's added here.
export const MAJOR_GROUPS: { id: string; match: RegExp }[] = [
  { id: 'computing', match: /^(computing|data-science|informatics|mathematics)/ },
  { id: 'biomed', match: /^(biochemistry|cell-and|genetics|human-|immunology|infection|microbiology|neuroscience|pathology|pharmacology|physiology|biotechnology)/ },
  { id: 'chemphys', match: /^(chemistry|physics|mathematical-physics)/ },
  { id: 'psych', match: /^(arts-)?psychology/ },
  { id: 'eco', match: /^(ecology|ecosystem|environmental-science|(arts-)?geography|geology|geoscience|climate|marine|plant|zoology)/ },
  { id: 'eng', match: /systems$/ },
  { id: 'agri', match: /^(agricultural|animal|food|veterinary)/ },
  // Bachelor of Arts.
  { id: 'languages', match: /^(arabic|chinese|classics|french|german|hebrew|indonesian|italian|japanese|korean|russian|spanish|linguistics)/ },
  { id: 'humanities', match: /^(ancient|art-history|creative-writing|english|history|philosophy|media|screen)/ },
  { id: 'social', match: /^(anthropology|asian|criminology|gender|indigenous|islamic|politics|sociology|arts-economics)/ },
]

export const majorGroupOf = (id: string): string => MAJOR_GROUPS.find((g) => g.match.test(id))?.id ?? 'other'

/** Majors grouped by field, in a fixed field order, each group sorted by title. */
export function groupMajors<T extends { id: string; title: string }>(majors: T[]): { id: string; majors: T[] }[] {
  return [...MAJOR_GROUPS.map((g) => g.id), 'other']
    .map((id) => ({ id, majors: majors.filter((m) => majorGroupOf(m.id) === id).sort((a, b) => a.title.localeCompare(b.title)) }))
    .filter((g) => g.majors.length > 0)
}

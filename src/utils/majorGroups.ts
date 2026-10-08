// Field of each major, by its id. Anything new lands in "other" until it's added here.
export const MAJOR_GROUPS: { id: string; match: RegExp }[] = [
  { id: 'computing', match: /^(computing|data-science|informatics|mathematics)/ },
  { id: 'biomed', match: /^(biochemistry|cell-and|genetics|human-|immunology|infection|microbiology|neuroscience|pathology|pharmacology|physiology|biotechnology)/ },
  { id: 'chemphys', match: /^(chemistry|physics)/ },
  { id: 'psych', match: /^psychology/ },
  { id: 'eco', match: /^(ecology|ecosystem|environmental-science|geography|geology|geoscience|climate|marine|plant|zoology)/ },
  { id: 'eng', match: /systems$/ },
  { id: 'agri', match: /^(animal|food|veterinary)/ },
]

export const majorGroupOf = (id: string): string => MAJOR_GROUPS.find((g) => g.match.test(id))?.id ?? 'other'

/** Majors grouped by field, in a fixed field order, each group sorted by title. */
export function groupMajors<T extends { id: string; title: string }>(majors: T[]): { id: string; majors: T[] }[] {
  return [...MAJOR_GROUPS.map((g) => g.id), 'other']
    .map((id) => ({ id, majors: majors.filter((m) => majorGroupOf(m.id) === id).sort((a, b) => a.title.localeCompare(b.title)) }))
    .filter((g) => g.majors.length > 0)
}

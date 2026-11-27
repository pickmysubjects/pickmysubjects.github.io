/**
 * Which course codes are coursework master's. Most use the Handbook's MC- codes (MC-IT, MC-CIVENG),
 * but a few still have old-style codes (761EM Master of Engineering Management), and old-style
 * codes are not always graduate ones (841AC is the Bachelor of Oral Health). So a course file says
 * `graduate: true`, and reading it (schema.ts) registers the code here.
 */
const registered = new Set<string>()

export function registerGraduateCourse(code: string): void {
  registered.add(code)
}

export function isGraduateCode(code: string | undefined): boolean {
  return !!code && (code.startsWith('MC-') || registered.has(code))
}

/** For data loaded already built (the site's JSON, the tests' cache): register its flagged courses. */
export function registerGraduateCourses(courses: readonly { code: string; graduate?: boolean }[]): void {
  for (const c of courses) if (c.graduate) registered.add(c.code)
}

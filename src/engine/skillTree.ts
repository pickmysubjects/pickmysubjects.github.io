import type { Dataset, Subject, SubjectResume } from './schema'
import { markingShare, skillsOf } from './skills'
import { topicsOf } from './topics'

/**
 * What a student can show from their subjects, in the three layers the Australian Skills
 * Classification uses for every job: technology tools, specialist skills (each subject's learning
 * outcomes) and core abilities (teamwork, writing, speaking, numbers…). Every line names the
 * subjects it comes from, so a student can back it up in a resume or an interview.
 */

/** Core abilities employers ask for, each shown only by what a subject's marking or content says. */
export const ABILITIES = ['teamwork', 'writing', 'speaking', 'numeracy', 'programming', 'research', 'lab', 'fieldwork'] as const
export type Ability = (typeof ABILITIES)[number]

/** How each ability reads on a resume (in English, as Australian resumes are). */
export const RESUME_LABELS: Record<Ability, string> = {
  teamwork: 'Teamwork (group assessments)',
  writing: 'Written communication',
  speaking: 'Presentations',
  numeracy: 'Quantitative analysis',
  programming: 'Programming',
  research: 'Independent project work',
  lab: 'Laboratory work',
  fieldwork: 'Fieldwork',
}

export interface ToolLine {
  name: string
  codes: string[]
  /** Named only in what students say, not in any of these subjects' Handbook text. */
  studentsOnly: boolean
}

export interface AbilityLine {
  ability: Ability
  codes: string[]
}

/** A specialist skill (named as job ads name it) and the subjects that teach it. */
export interface SpecialistLine {
  name: string
  codes: string[]
}

export interface SkillTree {
  tools: ToolLine[]
  specialist: SpecialistLine[]
  abilities: AbilityLine[]
  /** Subjects with learning outcomes to show, in the order given. */
  subjects: string[]
}

// A project worth this much of the mark is a piece of research or design of the student's own.
const PROJECT_SHARE = 25
// Reports (talks at half weight) worth a fifth of the mark: writing is a real part of it.
const WRITTEN_SHARE = 20

function share(s: Subject, kind: string): number {
  return (s.assessment ?? []).filter((t) => t.kind === kind).reduce((a, t) => a + t.weight, 0)
}

/** Which core abilities a subject gives evidence of. */
export function abilitiesOf(s: Subject, data: Dataset): Ability[] {
  const skills = skillsOf(s, data)
  const out: Ability[] = []
  if (markingShare(s, 'teamwork') > 0) out.push('teamwork')
  if (skills.includes('writing') || share(s, 'report') >= WRITTEN_SHARE) out.push('writing')
  if (share(s, 'presentation') > 0) out.push('speaking')
  if (skills.includes('maths') || skills.includes('statistics')) out.push('numeracy')
  if (skills.includes('programming')) out.push('programming')
  if (share(s, 'project') >= PROJECT_SHARE) out.push('research')
  if (skills.includes('lab')) out.push('lab')
  if (skills.includes('fieldwork')) out.push('fieldwork')
  return out
}

/** A subject's resume skills and lines: on the full dataset its own; in the browser, loaded with its detail. */
export type ResumeOf = (code: string) => SubjectResume | undefined

/** The tree for these subjects (done, or done and planned): tools, specialist skills and abilities by how many subjects back them. */
export function buildSkillTree(codes: readonly string[], data: Dataset, resumeOf: ResumeOf = (c) => data.subjects[c]?.resume): SkillTree {
  const subjects = [...new Set(codes)].filter((c) => data.subjects[c])
  const tools = new Map<string, { codes: string[]; handbook: boolean }>()
  const abilities = new Map<Ability, string[]>()
  // Specialist skills, merged across subjects whatever their capitals ("SQL", "sql"). `rank` is the
  // skill's best place in a subject's own list: each subject names its main skill first.
  const specialist = new Map<string, { name: string; codes: string[]; rank: number }>()
  for (const code of subjects) {
    for (const [i, name] of (resumeOf(code)?.skills ?? []).entries()) {
      const key = name.toLowerCase()
      const line = specialist.get(key) ?? { name, codes: [], rank: i }
      if (!line.codes.includes(code)) line.codes.push(code)
      line.rank = Math.min(line.rank, i)
      specialist.set(key, line)
    }
    const s = data.subjects[code]!
    for (const [list, handbook] of [
      [s.tools?.handbook ?? [], true],
      [s.tools?.students ?? [], false],
    ] as const) {
      for (const name of list) {
        const t = tools.get(name) ?? { codes: [], handbook: false }
        if (!t.codes.includes(code)) t.codes.push(code)
        t.handbook ||= handbook
        tools.set(name, t)
      }
    }
    for (const a of abilitiesOf(s, data)) abilities.set(a, [...(abilities.get(a) ?? []), code])
  }
  const toolNames = new Set([...tools.keys()].map((t) => t.toLowerCase()))
  return {
    tools: [...tools]
      .map(([name, t]) => ({ name, codes: t.codes, studentsOnly: !t.handbook }))
      .sort((a, b) => b.codes.length - a.codes.length || a.name.localeCompare(b.name)),
    // A tool already listed (Excel, SQL, "C" for "C programming") isn't said again as a specialist skill.
    // Most subjects first, then each subject's main skill before its others.
    specialist: [...specialist.values()]
      .filter((x) => !toolNames.has(x.name.toLowerCase().replace(/ (programming|programming language|language)$/, '')))
      .sort((a, b) => b.codes.length - a.codes.length || a.rank - b.rank || subjects.indexOf(a.codes[0]!) - subjects.indexOf(b.codes[0]!))
      .map(({ name, codes }) => ({ name, codes })),
    abilities: ABILITIES.filter((a) => abilities.has(a)).map((ability) => ({ ability, codes: abilities.get(ability)! })),
    subjects,
  }
}

/**
 * The tree as plain English for a resume: tools, abilities with their subjects, then each
 * subject's learning outcomes. Resumes in Australia are written in English.
 *
 * `focus`, when given, tailors it to one job: only those subjects (the ones that show a skill the
 * job asks for) go under Relevant coursework, and their specialist skills come first.
 */
export function resumeText(tree: SkillTree, data: Dataset, outcomesOf: (code: string) => string[], resumeOf: ResumeOf = (c) => data.subjects[c]?.resume, focus?: readonly string[]): string {
  const inFocus = focus?.length ? new Set(focus) : null
  const title = (c: string) => `${c} ${data.subjects[c]?.title ?? ''}`.trim()
  const lines: string[] = []
  if (tree.tools.length) lines.push(`Tools: ${tree.tools.map((t) => `${t.name} (${t.codes.join(', ')})`).join('; ')}`)
  const specialist = inFocus ? [...tree.specialist].sort((a, b) => Number(b.codes.some((c) => inFocus.has(c))) - Number(a.codes.some((c) => inFocus.has(c)))) : tree.specialist
  if (specialist.length) lines.push(`Specialist skills: ${specialist.map((t) => t.name).join(', ')}`)
  // Broad abilities aren't shown on the page (the strengths card covers them), but a resume's
  // "Employability skills" line is where they go.
  if (tree.abilities.length) lines.push(`Employability skills: ${tree.abilities.map((a) => `${RESUME_LABELS[a.ability]} (${a.codes.join(', ')})`).join('; ')}`)
  // Each subject: what the student did in it (its resume lines), else what it taught (its outcomes).
  const said = (c: string) => resumeOf(c)?.lines.length ? resumeOf(c)!.lines : outcomesOf(c)
  const coursework = tree.subjects.filter((c) => said(c).length && (!inFocus || inFocus.has(c)))
  if (coursework.length) {
    if (lines.length) lines.push('')
    lines.push('Relevant coursework')
    for (const c of coursework) lines.push(`- ${title(c)}: ${said(c).join('; ')}`)
  }
  return lines.join('\n')
}

/** One skill employers ask for in a job (yourcareer.gov.au), and what the student has to show for it. */
export interface EmployerSkill {
  skill: string
  /** Subjects that show it; empty when none do yet. */
  codes: string[]
  /** Shown by work, clubs or volunteering rather than a subject ("Building Relationships"). */
  outsideClass: boolean
}

// Employer skills that are one of our tools under another name.
const TOOL_ALIASES: Record<string, string> = {
  'microsoft excel': 'Excel',
  'adobe photoshop': 'Adobe Creative Suite',
  'adobe indesign': 'Adobe Creative Suite',
  'adobe illustrator': 'Adobe Creative Suite',
  'adobe creative suite': 'Adobe Creative Suite',
}
// Employer skills a subject's marking or content shows, as our abilities.
const ABILITY_ALIASES: Record<string, Ability[]> = {
  'communication skills': ['writing', 'speaking'],
  writing: ['writing'],
  'teamwork / collaboration': ['teamwork'],
  'team work/ collaboration': ['teamwork'],
  'team building': ['teamwork'],
  research: ['research', 'lab'],
  'data analysis': ['numeracy'],
  'software development': ['programming'],
  'computer literacy': ['programming'],
}
/** A broad skill read as one of our abilities (Communication Skills, Teamwork), not a subject's field. */
export function isBroadSkill(skill: string): boolean {
  return ABILITY_ALIASES[skill.toLowerCase()] !== undefined
}
// Skills built by doing, which no subject's marking tells apart from any other's.
const OUTSIDE_CLASS = new Set([
  'planning',
  'building relationships',
  'organisational skills',
  'time management',
  'problem solving',
  'stakeholder management',
  'mentoring',
  'customer service',
  'typing',
])

const MAJOR_NAMES = new WeakMap<Dataset, Map<string, string[]>>()
/**
 * The majors a subject is compulsory for, by name, when it's from the major's own area (most of
 * its compulsory subjects): a CVEN subject is part of "Civil Systems", an economics subject a
 * Marketing major requires is not part of "Marketing".
 */
export function majorNames(data: Dataset): Map<string, string[]> {
  let out = MAJOR_NAMES.get(data)
  if (out) return out
  out = new Map()
  for (const m of data.components) {
    if (m.kind !== 'major' || m.requirements === 'unknown') continue
    const must = m.requirements.flatMap((r) => ('all' in r && Array.isArray(r.all) ? (r.all as string[]) : []))
    const count = new Map<string, number>()
    for (const c of must) count.set(c.slice(0, 4), (count.get(c.slice(0, 4)) ?? 0) + 1)
    const area = [...count].sort((a, b) => b[1] - a[1])[0]?.[0]
    for (const c of must) if (c.slice(0, 4) === area) out.set(c, [...new Set([...(out.get(c) ?? []), m.title])])
  }
  MAJOR_NAMES.set(data, out)
  return out
}

const SMALL_WORDS = new Set(['and', 'or', 'of', 'the', 'with', 'for', 'in', 'to', 'a', 'an', 'skills'])
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * A test for text that has every word of a skill, as whole words: "SAS" isn't in "disaster", nor
 * "Java" in "Javanese", nor "Physiotherapy" in "physiology", and a plural counts ("Microscopy" in
 * "microscopies"). No other endings: "Marketing" isn't "markets". Null when there's no word to find.
 */
export function wordsMatcher(skill: string): ((text: string) => boolean) | null {
  const words = skill
    .toLowerCase()
    .split(/[\s/,()-]+/)
    .filter((w) => w && !SMALL_WORDS.has(w))
  if (!words.length) return null
  const tests = words.map((w) => {
    if (!/^[a-z]+$/.test(w)) return new RegExp(`(?<![a-z0-9])${escape(w)}(?![a-z0-9#+])`)
    return new RegExp(`(?<![a-z0-9])${w}(s|es)?(?![a-z])`)
  })
  return (text) => tests.every((t) => t.test(text))
}

/**
 * The job's skills against the student's tree: each with the subjects that show it (its tool,
 * its ability, or a subject named for it or about it), or marked as one built outside class.
 */
export function employerSkills(skills: readonly string[], tree: SkillTree, data: Dataset, outcomesOf: (code: string) => readonly string[] = () => []): EmployerSkill[] {
  const toolCodes = new Map(tree.tools.map((t) => [t.name, t.codes]))
  const abilityCodes = new Map(tree.abilities.map((a) => [a.ability, a.codes]))
  return skills.map((skill) => {
    const key = skill.toLowerCase()
    if (OUTSIDE_CLASS.has(key)) return { skill, codes: [], outsideClass: true }
    const tool = TOOL_ALIASES[key] ?? tree.tools.find((t) => t.name.toLowerCase() === key)?.name
    if (tool) return { skill, codes: toolCodes.get(tool) ?? [], outsideClass: false }
    // A specialist skill of the same name means subjects teach it by name: they're found below, with
    // the subjects whose field it is ("Chemistry" as SCIE10009's skill, and every Chemistry subject).
    // Without one, a broad skill ("Data Analysis") is read as our ability.
    const named = tree.specialist.some((x) => x.name.toLowerCase() === key)
    const abilities = ABILITY_ALIASES[key]
    if (abilities && !named) return { skill, codes: [...new Set(abilities.flatMap((a) => abilityCodes.get(a) ?? []))], outsideClass: false }
    // Otherwise a subject backs it when one thing about it has every word of it: its field (title and
    // topics: "Mechanical Systems Design" in engineering), one of its specialist skills, or one
    // learning outcome. One shared word isn't enough: a design studio doesn't show "Electrical
    // Design", nor "general" in one outcome and "practice" in another "General Practice".
    const has = wordsMatcher(key.includes(':') ? key.slice(key.lastIndexOf(':') + 1) : key)
    if (!has) return { skill, codes: [], outsideClass: false }
    const own = new Map<string, string[]>()
    for (const x of tree.specialist) for (const c of x.codes) own.set(c, [...(own.get(c) ?? []), x.name])
    const codes = tree.subjects.filter((c) => {
      const s = data.subjects[c]!
      const field = [s.title, ...topicsOf(s).topics.map((t) => t.replace(/-/g, ' ')), ...(majorNames(data).get(c) ?? [])].join(' | ')
      return [field, ...(own.get(c) ?? []), ...outcomesOf(c)].some((text) => has(text.toLowerCase()))
    })
    return { skill, codes, outsideClass: false }
  })
}

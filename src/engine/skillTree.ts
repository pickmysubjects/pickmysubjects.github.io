import type { Dataset, Subject } from './schema'
import { markingShare, skillsOf } from './skills'

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

export interface SkillTree {
  tools: ToolLine[]
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

/** The tree for these subjects (done, or done and planned): tools and abilities by how many subjects back them. */
export function buildSkillTree(codes: readonly string[], data: Dataset): SkillTree {
  const subjects = [...new Set(codes)].filter((c) => data.subjects[c])
  const tools = new Map<string, { codes: string[]; handbook: boolean }>()
  const abilities = new Map<Ability, string[]>()
  for (const code of subjects) {
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
  return {
    tools: [...tools]
      .map(([name, t]) => ({ name, codes: t.codes, studentsOnly: !t.handbook }))
      .sort((a, b) => b.codes.length - a.codes.length || a.name.localeCompare(b.name)),
    abilities: ABILITIES.filter((a) => abilities.has(a)).map((ability) => ({ ability, codes: abilities.get(ability)! })),
    subjects,
  }
}

/**
 * The tree as plain English for a resume: tools, abilities with their subjects, then each
 * subject's learning outcomes. Resumes in Australia are written in English.
 */
export function resumeText(tree: SkillTree, data: Dataset, outcomesOf: (code: string) => string[]): string {
  const title = (c: string) => `${c} ${data.subjects[c]?.title ?? ''}`.trim()
  const lines: string[] = []
  if (tree.tools.length) lines.push(`Tools: ${tree.tools.map((t) => `${t.name} (${t.codes.join(', ')})`).join('; ')}`)
  for (const a of tree.abilities) lines.push(`${RESUME_LABELS[a.ability]}: ${a.codes.join(', ')}`)
  const coursework = tree.subjects.filter((c) => outcomesOf(c).length)
  if (coursework.length) {
    if (lines.length) lines.push('')
    lines.push('Relevant coursework')
    for (const c of coursework) lines.push(`- ${title(c)}: ${outcomesOf(c).join('; ')}`)
  }
  return lines.join('\n')
}

import { describe, expect, it } from 'vitest'
import { abilitiesOf, buildSkillTree, employerSkills, resumeText, wordsMatcher } from '@/engine/skillTree'
import { studentTools, toolsIn } from '../scripts/extract-tools'
import { realData } from './realData'

const data = realData()

describe('reading tools out of text', () => {
  it('finds a tool by its own name, and short names only in context', () => {
    expect(toolsIn('Students write programs in Python and query data with SQL.')).toEqual(['Python', 'SQL'])
    // "R" and "C" alone are a letter and a grade, not languages.
    expect(toolsIn('Grade C or above; see Part R of the notes.')).toEqual([])
    expect(toolsIn('Data analysis using R and the C programming language.')).toEqual(['R', 'C'])
    expect(toolsIn('JavaScript for the web')).toEqual(['JavaScript'])
  })

  it("leaves out a tool students name only to compare", () => {
    expect(studentTools('Declarative programming in Haskell and Prolog, very different from everyday languages like Java or Python.')).toEqual(['Haskell', 'Prolog'])
  })
})

describe('the skill tree', () => {
  it('names the subjects behind every tool, and says when only students name it', () => {
    const tree = buildSkillTree(['COMP10001', 'INFO20003'], data)
    expect(tree.tools).toContainEqual({ name: 'Python', codes: ['COMP10001'], studentsOnly: true })
    expect(tree.tools).toContainEqual({ name: 'SQL', codes: ['INFO20003'], studentsOnly: false })
  })

  it('reads abilities from how a subject is marked and what it is about', () => {
    expect(abilitiesOf(data.subjects.COMP10001!, data)).toContain('programming')
    expect(abilitiesOf(data.subjects.MAST10006!, data)).toContain('numeracy')
    // Group work in the marking is teamwork.
    const grouped = Object.values(data.subjects).find((s) => s.assessment?.some((t) => t.group))!
    expect(abilitiesOf(grouped, data)).toContain('teamwork')
  })

  it('leaves out codes it has no data for, and says nothing for no subjects', () => {
    expect(buildSkillTree(['ZZZZ10001'], data).subjects).toEqual([])
    expect(buildSkillTree([], data)).toEqual({ tools: [], specialist: [], abilities: [], subjects: [] })
  })

  it('writes an English resume block with every line traced to its subjects', () => {
    const tree = buildSkillTree(['COMP10001', 'MAST10006'], data)
    // A subject with no resume lines of its own falls back to its learning outcomes.
    const text = resumeText(tree, data, (c) => (c === 'COMP10001' ? ['Read, write and debug small programs'] : []), () => undefined)
    expect(text).toContain('Tools: Python (COMP10001)')
    expect(text).toMatch(/^Employability skills: .*Programming \(COMP10001\)/m)
    expect(text).toContain('Relevant coursework\n- COMP10001 Foundations of Computing: Read, write and debug small programs')
    // A subject with no outcomes loaded isn't listed under coursework.
    expect(text).not.toContain('- MAST10006')
  })
})

describe("a job's skills against the student's subjects", () => {
  const accountant = ['Accounting', 'Communication Skills', 'Budgeting', 'Microsoft Excel', 'Financial Accounting', 'Building Relationships']

  it('names the subjects that show each skill: by tool, by ability or by field', () => {
    const tree = buildSkillTree(['ACCT10001', 'ACCT10002', 'ECON10005'], data)
    const rows = Object.fromEntries(employerSkills(accountant, tree, data).map((r) => [r.skill, r]))
    expect(rows['Microsoft Excel']!.codes).toEqual(['ECON10005'])
    expect(rows['Accounting']!.codes).toContain('ACCT10001')
    // Financial accounting is ACCT10002's own skill; ACCT10001 teaches management accounting.
    expect(rows['Financial Accounting']!.codes).toEqual(['ACCT10002'])
  })

  it('says which skills are built outside class, and which have nothing yet', () => {
    const rows = employerSkills(accountant, buildSkillTree(['COMP10001'], data), data)
    expect(rows.find((r) => r.skill === 'Building Relationships')).toEqual({ skill: 'Building Relationships', codes: [], outsideClass: true })
    expect(rows.find((r) => r.skill === 'Budgeting')).toEqual({ skill: 'Budgeting', codes: [], outsideClass: false })
  })
})

describe('reading a skill out of what a subject taught', () => {
  it('counts a learning outcome that names it', () => {
    const tree = buildSkillTree(['ACCT10001'], data, () => undefined)
    const rows = employerSkills(['Budgeting', 'Account Reconciliation'], tree, data, () => ['Use cost and revenue data for budgeting and planning'])
    expect(rows[0]!.codes).toEqual(['ACCT10001'])
    // Every word has to be there: "account" alone doesn't make "Account Reconciliation".
    expect(rows[1]!.codes).toEqual([])
  })
})

describe('specialist skills from each subject', () => {
  it('adds the skills a subject teaches, named as job ads name them, with the subjects behind each', () => {
    const tree = buildSkillTree(['ACCT10001', 'INFO20003'], data)
    const names = tree.specialist.map((x) => x.name)
    expect(names).toContain('Financial statement analysis')
    expect(names).toContain('Relational database design')
    expect(tree.specialist.find((x) => x.name === 'Relational database design')!.codes).toEqual(['INFO20003'])
    // SQL is already a tool (its Handbook names it), so it isn't listed twice.
    expect(names).not.toContain('SQL')
  })

  it('leaves out "<tool> programming" when the tool is listed, and puts each subject\'s main skill first', () => {
    const own: Record<string, { skills: string[]; lines: string[] }> = {
      COMP10002: { skills: ['Data structures', 'C programming'], lines: [] },
      ACCT10001: { skills: ['Financial statement analysis', 'Accounting standards', 'Budgeting'], lines: [] },
    }
    const tree = buildSkillTree(['COMP10002', 'ACCT10001'], data, (c) => own[c])
    const names = tree.specialist.map((x) => x.name)
    expect(tree.tools.map((t) => t.name)).toContain('C')
    expect(names).not.toContain('C programming')
    expect(names.slice(0, 2)).toEqual(['Data structures', 'Financial statement analysis'])
  })

  it('puts them in the resume text, with what the student did in each subject', () => {
    const tree = buildSkillTree(['ACCT10001'], data)
    const text = resumeText(tree, data, () => ['an outcome'])
    expect(text).toMatch(/^Specialist skills: .*Financial statement analysis/m)
    // A subject's own resume lines come before its outcomes.
    expect(text).toContain(`- ACCT10001 Accounting Reports and Analysis: ${data.subjects.ACCT10001!.resume!.lines[0]}`)
    expect(text).not.toContain('an outcome')
  })

  it('matches whole words only, and every word of the skill', () => {
    const has = (skill: string, text: string) => wordsMatcher(skill)!(text.toLowerCase())
    expect(has('SAS', 'Disaster risk management')).toBe(false)
    expect(has('Java', 'Javanese music')).toBe(false)
    expect(has('Zoology', 'Anthrozoology')).toBe(false)
    expect(has('Microsoft C#', 'Microsoft Excel')).toBe(false)
    expect(has('Budgeting', 'Use cost data for budgeting')).toBe(true)
    // Only plurals: "Marketing" isn't "markets".
    expect(has('Marketing', 'How markets set prices')).toBe(false)
    expect(has('Physiotherapy', 'Animal physiology')).toBe(false)
    expect(has('Process Improvement', 'Jazz and improvisation')).toBe(false)
  })

  it('needs every word of a skill in one place, not spread over a subject', () => {
    const tree = buildSkillTree(['ANTH30003'], data, () => undefined)
    // Title and topics together are the subject's field.
    expect(employerSkills(['Mechanical Engineering'], buildSkillTree(['MCEN30021'], data), data)[0]!.codes).toEqual(['MCEN30021'])
    // A major's name counts for its own area's compulsory subjects: CVEN subjects are civil engineering.
    expect(employerSkills(['Civil Engineering'], buildSkillTree(['CVEN30009'], data), data)[0]!.codes).toEqual(['CVEN30009'])
    const said = () => ['Explain religion in general terms', 'Reflect on religious practice']
    expect(employerSkills(['General Practice'], tree, data, said)[0]!.codes).toEqual([])
    expect(employerSkills(['General Practice'], tree, data, () => ['Observe general practice clinics'])[0]!.codes).toEqual(['ANTH30003'])
  })

  it('finds a field\u2019s subjects even when one subject also lists the field as its own skill', () => {
    const tree = buildSkillTree(['CHEM10003', 'SCIE10009'], data)
    expect(employerSkills(['Chemistry'], tree, data)[0]!.codes).toEqual(expect.arrayContaining(['CHEM10003', 'SCIE10009']))
  })

  it('tailors the resume text to a job: only its subjects under coursework, their skills first', () => {
    const tree = buildSkillTree(['ACCT10001', 'COMP10001'], data)
    const text = resumeText(tree, data, () => ['an outcome'], undefined, ['ACCT10001'])
    expect(text).toContain('ACCT10001 Accounting Reports and Analysis')
    expect(text).not.toMatch(/^- COMP10001/m)
    expect(text).toMatch(/^Specialist skills: Financial statement analysis/m)
  })

  it("matches a job's skill to a specialist skill of the same name", () => {
    const rows = employerSkills(['Financial statement analysis'], buildSkillTree(['ACCT10001'], data), data)
    expect(rows[0]!.codes).toEqual(['ACCT10001'])
  })
})

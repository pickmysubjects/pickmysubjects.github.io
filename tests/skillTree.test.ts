import { describe, expect, it } from 'vitest'
import { abilitiesOf, buildSkillTree, employerSkills, resumeText } from '@/engine/skillTree'
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
    expect(buildSkillTree([], data)).toEqual({ tools: [], abilities: [], subjects: [] })
  })

  it('writes an English resume block with every line traced to its subjects', () => {
    const tree = buildSkillTree(['COMP10001', 'MAST10006'], data)
    const text = resumeText(tree, data, (c) => (c === 'COMP10001' ? ['Read, write and debug small programs'] : []))
    expect(text).toContain('Tools: Python (COMP10001)')
    expect(text).toContain('Programming: COMP10001')
    expect(text).toContain('Relevant coursework\n- COMP10001 Foundations of Computing: Read, write and debug small programs')
    // A subject with no outcomes loaded isn't listed under coursework.
    expect(text).not.toContain('- MAST10006')
  })
})

describe("a job's skills against the student's subjects", () => {
  const accountant = ['Accounting', 'Communication Skills', 'Budgeting', 'Microsoft Excel', 'Financial Accounting', 'Building Relationships']

  it('names the subjects that show each skill: by tool, by ability or by field', () => {
    const tree = buildSkillTree(['ACCT10001', 'ECON10005'], data)
    const rows = Object.fromEntries(employerSkills(accountant, tree, data).map((r) => [r.skill, r]))
    expect(rows['Microsoft Excel']!.codes).toEqual(['ECON10005'])
    expect(rows['Accounting']!.codes).toContain('ACCT10001')
    expect(rows['Financial Accounting']!.codes).toContain('ACCT10001')
  })

  it('says which skills are built outside class, and which have nothing yet', () => {
    const rows = employerSkills(accountant, buildSkillTree(['COMP10001'], data), data)
    expect(rows.find((r) => r.skill === 'Building Relationships')).toEqual({ skill: 'Building Relationships', codes: [], outsideClass: true })
    expect(rows.find((r) => r.skill === 'Budgeting')).toEqual({ skill: 'Budgeting', codes: [], outsideClass: false })
  })
})

describe('reading a skill out of what a subject taught', () => {
  it('counts a learning outcome that names it ("budgets" for Budgeting)', () => {
    const tree = buildSkillTree(['ACCT10001'], data)
    const rows = employerSkills(['Budgeting', 'Account Reconciliation'], tree, data, () => ['Use cost and revenue data for budgets and planning'])
    expect(rows[0]!.codes).toEqual(['ACCT10001'])
    // Every word has to be there: "account" alone doesn't make "Account Reconciliation".
    expect(rows[1]!.codes).toEqual([])
  })
})

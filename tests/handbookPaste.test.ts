import { describe, expect, it } from 'vitest'
import { parseAvailability, parseContactHours, parseHandbookPaste } from '../src/engine/handbookPaste'
import { subjectYaml } from '../src/engine/serialize'
import { parse } from 'yaml'
import { subjectFileSchema } from '../src/engine/schema'

// Shaped like a copy of the Handbook's "Eligibility and requirements" tab: tables
// flatten to tab-separated rows, and teaching periods can spill onto extra lines.
const COMP30027_LIKE = `Prerequisites
All of
Code\tName\tTeaching period\tCredit Points
COMP10002\tFoundations of Algorithms\tSemester 1 (On Campus - Parkville)
Semester 2 (On Campus - Parkville)
12.5
COMP20008\tElements of Data Processing\tSemester 1 (On Campus - Parkville)
Semester 2 (On Campus - Parkville)
12.5
OR
Admission into the MC-SOFTENG Master of Software Engineering
Corequisites
None
Non-allowed subjects
Code\tName\tTeaching period\tCredit Points
COMP90049\tIntroduction to Machine Learning\tSemester 1 (On Campus - Parkville)
12.5
ACTL30008\tActuarial Analytics and Data I\tSemester 1 (On Campus - Parkville)
12.5
Recommended background knowledge
Basic probability, at the level of VCE Mathematical Methods 3/4.`

describe('parseHandbookPaste', () => {
  it('reads an all-of table OR an admission alternative', () => {
    const r = parseHandbookPaste(COMP30027_LIKE)
    expect(r.prerequisites).toEqual({
      any: [
        { all: [{ subject: 'COMP10002' }, { subject: 'COMP20008' }] },
        { admission: 'MC-SOFTENG', note: 'Admission into the MC-SOFTENG Master of Software Engineering' },
      ],
    })
    expect(r.corequisites).toBe('none')
    expect(r.nonAllowed).toEqual(['COMP90049', 'ACTL30008'])
    expect(r.warnings).toEqual([])
  })

  it('does not mistake codes in the background-knowledge section for requirements', () => {
    const r = parseHandbookPaste(`${COMP30027_LIKE}\nSomething about MAST10006 here`)
    expect(JSON.stringify(r.prerequisites)).not.toContain('MAST10006')
  })

  it('reads one-of tables', () => {
    const r = parseHandbookPaste('Prerequisites\nOne of\nMAST10006\tCalculus 2\nMAST10021\tCalculus 2: Advanced')
    expect(r.prerequisites).toEqual({ any: [{ subject: 'MAST10006' }, { subject: 'MAST10021' }] })
  })

  it('reads "a minimum of N credit points from/of" tables as points, not all of them', () => {
    for (const lead of ['A minimum of 25 credit points from', 'Completion of a minimum of 37.5 credit points of']) {
      const r = parseHandbookPaste(`Prerequisites\n${lead}\nAAAA20001\tX\nAAAA20002\tY\nAAAA20003\tZ`)
      expect(r.prerequisites).toEqual({ points: { min: Number(/[\d.]+/.exec(lead)![0]), from: ['AAAA20001', 'AAAA20002', 'AAAA20003'] } })
      expect(r.warnings.join(' ')).not.toMatch(/assumed "All of"/)
    }
  })

  it('reads "a minimum of one/two of" tables', () => {
    const one = parseHandbookPaste('Prerequisites\nA minimum of one of\nAAAA20001\tX\nAAAA20002\tY')
    expect(one.prerequisites).toEqual({ any: [{ subject: 'AAAA20001' }, { subject: 'AAAA20002' }] })
    const two = parseHandbookPaste('Prerequisites\nA minimum of two of\nAAAA20001\tX\nAAAA20002\tY\nAAAA20003\tZ')
    expect(two.prerequisites).toEqual({ points: { min: 25, from: ['AAAA20001', 'AAAA20002', 'AAAA20003'] } })
    const plain = parseHandbookPaste('Prerequisites\nTwo of\nAAAA20001\tX\nAAAA20002\tY\nAAAA20003\tZ')
    expect(plain.prerequisites).toEqual(two.prerequisites)
  })

  it('keeps only the Bachelor of Science requirement when a page lists one per degree', () => {
    const r = parseHandbookPaste('Prerequisites\nBachelor of Science students\nAAAA20001\tX\nBachelor of Biomedicine students\nAll of\nBBBB10001\tY\nBBBB20001\tZ\nCorequisites\nNone')
    expect(r.prerequisites).toEqual({ subject: 'AAAA20001' })
    expect(r.warnings.join(' ')).toMatch(/kept the Bachelor of Science one/)
  })

  it('prefers the current science students\' requirement over a "pre 2013" one', () => {
    const r = parseHandbookPaste('Prerequisites\nBachelor of Science students (pre 2013)\nAAAA20003\tOld\nBachelor of Science students (2013 on)\nAll of\nAAAA20001\tX\nAAAA20002\tY\nBachelor of Biomedicine students\nBBBB20001\tZ\nCorequisites\nNone')
    expect(r.prerequisites).toEqual({ all: [{ subject: 'AAAA20001' }, { subject: 'AAAA20002' }] })
  })

  it('reads "meet both the Physics and Mathematics prerequisites" as both parts, each with its own options', () => {
    const r = parseHandbookPaste(
      'Prerequisites\nStudents are required to meet both Physics and Mathematics prerequisites below\nPhysics:\nAAAA10009\tFoundations\nOR\nVCE Units 3 and 4 Physics or equivalent\nMathematics:\nAll of\nBBBB10014\tX\nBBBB10015\tY\nOR\nAdmission into the B-SCI Bachelor of Science\nCorequisites\nNone',
    )
    expect(r.prerequisites).toEqual({
      all: [
        { any: [{ subject: 'AAAA10009' }, { manual: 'VCE Units 3 and 4 Physics or equivalent' }] },
        { any: [{ all: [{ subject: 'BBBB10014' }, { subject: 'BBBB10015' }] }, { admission: 'B-SCI', note: 'Admission into the B-SCI Bachelor of Science' }] },
      ],
    })
  })

  it('reads "Option 1 / Option 2" as either option', () => {
    const r = parseHandbookPaste('Prerequisites\nStudents must meet one of the following prerequisite options listed below.\nOption 1\nAdmission into the MC-BIOMENG Master of Biomedical Engineering\nOption 2\nAAAA10007\tX\nOR\nAAAA10008\tY\nCorequisites\nNone')
    expect(r.prerequisites).toEqual({
      any: [{ admission: 'MC-BIOMENG', note: 'Admission into the MC-BIOMENG Master of Biomedical Engineering' }, { any: [{ subject: 'AAAA10007' }, { subject: 'AAAA10008' }] }],
    })
  })

  it('reads a weight that sits alone on its line (a row with no timing)', () => {
    const r = parseHandbookPaste(
      'Assessment\nDescription\tTiming\tPercentage\nOngoing assessment of practical work\nDuring the teaching period\t25%\nTen weekly assignments\n15%\nA test\nMid semester\t10%\nA written examination\n2 hours\nDuring the examination period\t50%',
    )
    expect(r.assessment).not.toBe('unknown')
    expect((r.assessment as { weight: number }[]).map((a) => a.weight)).toEqual([25, 15, 10, 50])
  })

  it('treats "can also be taken concurrently" subjects as corequisites', () => {
    const r = parseHandbookPaste('Prerequisites\nAAAA10010\tX\nConcurrent Prerequisites\nNote: the following subject/s can also be taken concurrently (at the same time)\nAAAA10008\tY\nCorequisites\nNone')
    expect(r.prerequisites).toEqual({ subject: 'AAAA10010' })
    expect(r.corequisites).toEqual({ subject: 'AAAA10008' })
  })

  it('never lists a subject as its own requirement or non-allowed subject', () => {
    const r = parseHandbookPaste('Principles of Things (AAAA30011)\nUndergraduate level 3Points: 12.5\nPrerequisites\nAll of\nAAAA20001\tX\nAAAA30011\tSelf\nNon-allowed subjects\nAAAA30011\tSelf\nAAAA30013\tOld')
    expect(r.prerequisites).toEqual({ subject: 'AAAA20001' })
    expect(r.nonAllowed).toEqual(['AAAA30013'])
  })

  it('reads "N credit points from" tables', () => {
    const r = parseHandbookPaste('Prerequisites\n25 credit points from\nAAAA20001\tX\nAAAA20002\tY\nAAAA20003\tZ')
    expect(r.prerequisites).toEqual({ points: { min: 25, from: ['AAAA20001', 'AAAA20002', 'AAAA20003'] } })
  })

  it('keeps unrecognised free text for manual checking, with a warning', () => {
    const r = parseHandbookPaste('Prerequisites\nPermission of the subject coordinator.')
    expect(r.prerequisites).toEqual({ manual: 'Permission of the subject coordinator.' })
    expect(r.warnings).toHaveLength(1)
  })

  it('warns when a multi-code table has no quantifier label', () => {
    const r = parseHandbookPaste('Prerequisites\nAAAA10001\tX\nAAAA10002\tY')
    expect(r.prerequisites).toEqual({ all: [{ subject: 'AAAA10001' }, { subject: 'AAAA10002' }] })
    expect(r.warnings[0]).toMatch(/assumed "All of"/)
  })

  it('combines AND-separated blocks', () => {
    const r = parseHandbookPaste('Prerequisites\nOne of\nAAAA10001\nAAAA10002\nAND\nAll of\nBBBB10001')
    expect(r.prerequisites).toEqual({
      all: [{ any: [{ subject: 'AAAA10001' }, { subject: 'AAAA10002' }] }, { subject: 'BBBB10001' }],
    })
  })

  it('reads availability lines', () => {
    expect(parseHandbookPaste('Availability\nSemester 1 - On Campus\nSemester 2 - Online').offerings).toEqual([
      'semester-1',
      'semester-2',
    ])
    expect(parseAvailability('Summer Term - On Campus')).toEqual(['summer'])
    expect(parseAvailability('nothing here')).toBe('unknown')
  })

  it('says so when nothing recognisable was pasted', () => {
    const r = parseHandbookPaste('hello world')
    expect(r.prerequisites).toBe('unknown')
    expect(r.warnings[0]).toMatch(/No Handbook section headings/)
  })
})

describe('subjectYaml', () => {
  it('round-trips through the real schema', () => {
    const parsed = parseHandbookPaste(`${COMP30027_LIKE}\nAvailability\nSemester 1 - On Campus`)
    const yaml = subjectYaml({ code: 'COMP30027', title: 'Machine Learning', level: 3, points: 12.5, year: 2026 }, parsed, new Date('2026-10-07'))
    const s = subjectFileSchema.parse(parse(yaml))
    expect(s.prerequisites).toEqual(parsed.prerequisites)
    expect(s.offerings).toEqual({ '2026': ['semester-1'] })
    expect(s.verifiedOn).toBe('2026-10-07')
    expect(yaml).toContain('- COMP10002') // compact shorthand, not { subject: … }
  })
})

describe('parseHandbookPaste – assessment and contact hours', () => {
  // Written for this test in the Handbook's layout; not Handbook text.
  const page = [
    'Assessment',
    'Description\tTiming\tPercentage',
    'Group project - build a small app with your team',
    '30 hours (of work required)',
    'Hurdle requirement: must pass the project\tWeek 6\t30%',
    'Weekly online quiz',
    'Throughout the semester\t10%',
    'Written exam',
    '2 hours',
    'During the examination period\t60%',
    'Summer Term',
    'Description\tTiming\tPercentage',
    'Exam',
    'End of term\t100%',
    'Dates & times',
    'Contact hours\t36 hours, comprising two 1-hour lectures and one 1-hour tutorial per week',
  ].join('\n')

  it('reads the first (semester) table: kinds, weights, group work and hurdles', () => {
    expect(parseHandbookPaste(page).assessment).toEqual([
      { kind: 'project', weight: 30, group: true, hurdle: true },
      { kind: 'quiz', weight: 10 },
      { kind: 'exam', weight: 60 },
    ])
  })

  it('takes the weight from the last cell, not a percentage inside the description', () => {
    const text = [
      'Description\tTiming\tPercentage',
      'Lab attendance',
      'Hurdle requirement: attend 80% of labs\tThroughout\tN/A',
      '3 Tests: Test 1 10% Test 2 20% Test 3 10%',
      'Throughout the semester\t40%',
      'Mid semester written exam',
      'Week 7\t10%',
      'Final exam',
      'Exam period\t50%',
    ].join('\n')
    expect(parseHandbookPaste(text).assessment).toEqual([
      { kind: 'test', weight: 40 },
      { kind: 'test', weight: 10 },
      { kind: 'exam', weight: 50 },
    ])
  })

  it("doesn't mistake a due date in the exam period for an exam", () => {
    const text = ['Description\tTiming\tPercentage', 'Research report, due in the first week of the examination period', 'Week 13\t100%'].join('\n')
    expect(parseHandbookPaste(text).assessment).toEqual([{ kind: 'report', weight: 100 }])
  })

  it('leaves the table out (with a warning) when weights do not add up to 100', () => {
    const r = parseHandbookPaste(['Description\tTiming\tPercentage', 'Exam', 'End\t70%'].join('\n'))
    expect(r.assessment).toBe('unknown')
    expect(r.warnings.join(' ')).toMatch(/70%/)
  })

  it('turns the contact hours line into hours a week', () => {
    expect(parseHandbookPaste(page).weeklyContactHours).toBe(3)
    expect(parseContactHours('Contact hours\t3 x one hour lectures per week, 1 x one hour practice class per week')).toBe(4)
    expect(parseContactHours('Contact hours\t36 one-hour lectures (three per week); 12 one-hour practice classes')).toBe(4)
    expect(parseContactHours('Contact hours\t48 hours: 24 x one-hour lectures, 12 x two-hour classes')).toBe(4)
    expect(parseContactHours('Contact hours\t3 one-hour lectures and 1 one-hour practice class per week')).toBe(4)
    expect(
      parseContactHours('Contact hours\t36 hours of lectures, 15 hours of practicals, 12 hours of workshops. Up to 12 hours of independent online activities'),
    ).toBe(5.5)
    expect(parseContactHours('no such line')).toBeUndefined()
  })
})

describe('parseHandbookPaste – page header', () => {
  it('reads code, title, level and points from a pasted print page', () => {
    const text = ['HandbookSubjectsMachine LearningPrint', 'Machine Learning (COMP30027)', 'Undergraduate level 3Points: 12.5On Campus (Parkville)'].join('\n')
    expect(parseHandbookPaste(text)).toMatchObject({ code: 'COMP30027', title: 'Machine Learning', level: 3, points: 12.5 })
  })
})

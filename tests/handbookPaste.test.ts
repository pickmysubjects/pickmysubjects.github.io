import { describe, expect, it } from 'vitest'
import { parseAvailability, parseBreadthFor, parseContactHours, parseHandbookPaste, restructure, structuredFromText } from '../src/engine/handbookPaste'
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
        { any: [{ subject: 'AAAA10009' }, { school: { subject: 'Physics' }, note: 'VCE Units 3 and 4 Physics or equivalent' }] },
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
    const r = parseHandbookPaste('Prerequisites\nAncient Near Eastern Language: Egyptian')
    expect(r.prerequisites).toEqual({ manual: 'Ancient Near Eastern Language: Egyptian' })
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

describe('contact hours given as session counts', () => {
  it('reads "24 x one-hour …, 12 x two-hour …" as a semester total', async () => {
    const { parseContactHours } = await import('../src/engine/handbookPaste')
    expect(parseContactHours('Contact hours\t24 x one-hour lectures (2 per week), 12 x two-hour practice classes (1 per week)')).toBe(4)
    expect(parseContactHours('Contact hours\t2 x one-hour lectures per week')).toBe(2)
  })
})

describe('requirements split by kind of student, and "a minimum of two … subjects"', () => {
  it('keeps the undergraduate requirement', async () => {
    const { parseHandbookPaste } = await import('../src/engine/handbookPaste')
    const text = 'Prerequisites\nUndergraduate Students\nOne of\nCode\tName\tTeaching period\tCredit Points\nBIOL10001\tBiology\t\n12.5\nBIOL10008\tBiology\t\n12.5\nPostgraduate students\nAdmission into the MC-URBHORT Master of Urban Horticulture\n\nCorequisites\nNone\n'
    expect(parseHandbookPaste(text).prerequisites).toEqual({ any: [{ subject: 'BIOL10001' }, { subject: 'BIOL10008' }] })
  })
  it('reads "A minimum of two level three … subjects" as two of the table', async () => {
    const { parseHandbookPaste } = await import('../src/engine/handbookPaste')
    const text = 'Prerequisites\nA minimum of two level three Geoscience subjects (can be concurrent prerequisites)\nCode\tName\tTeaching period\tCredit Points\nGEOL30007\tGeobiology\t\n12.5\nGEOL30004\tGeochemistry\t\n12.5\nGEOL30003\tSedimentary\t\n12.5\n\nCorequisites\nNone\n'
    expect(parseHandbookPaste(text).prerequisites).toMatchObject({ points: { min: 25 } })
  })
})

describe('a NOTE under a requirements table', () => {
  it('does not add the subjects it mentions', async () => {
    const { parseHandbookPaste } = await import('../src/engine/handbookPaste')
    const text = 'Prerequisites\nAll of\nCode\tName\tTeaching period\tCredit Points\nMAST20030\tDifferential Equations\t\n12.5\nNOTE: For students admitted into the master, BMEN30006 may be taken concurrently with BMEN20003 and MAST20029.\n\nCorequisites\nNone\n'
    expect(parseHandbookPaste(text).prerequisites).toEqual({ subject: 'MAST20030' })
  })
})

describe('"OR … can also be taken concurrently"', () => {
  it('is one more alternative, not a corequisite', async () => {
    const { parseHandbookPaste } = await import('../src/engine/handbookPaste')
    const text = 'Prerequisites\nOne of\nCode\tName\tTeaching period\tCredit Points\nCOMP10002\tFoundations\t\n12.5\nCOMP20007\tDesign\t\n12.5\nOR\n\nNote: the following subject/s can also be taken concurrently (at the same time)\n\nOne of\nCode\tName\tTeaching period\tCredit Points\nCOMP20005\tNumerical\t\n12.5\nENGR20005\tNumerical Methods\t\n12.5\n\nCorequisites\nNone\n'
    const r = parseHandbookPaste(text)
    expect(r.corequisites).toBe('none')
    const { evaluateField } = await import('../src/engine/expr')
    const met = (c: string) => evaluateField(r.prerequisites, { completed: new Set([c]), subjects: {}, admittedCourse: 'B-SCI' }).status
    expect(['COMP10002', 'COMP20007', 'COMP20005', 'ENGR20005'].map(met)).toEqual(['ok', 'ok', 'ok', 'ok'])
  })
})

describe('a concurrent note inside "Option 1"', () => {
  it('leaves "Option 2" as a prerequisite alternative', async () => {
    const { parseHandbookPaste } = await import('../src/engine/handbookPaste')
    const text = 'Prerequisites\nStudents must meet one of the following prerequisite options:\n\nOption 1\n\nENEN20002\tEarth Processes\t\nAND\n\nNote: the following subject/s can also be taken concurrently (at the same time)\n\nENGR30002\tFluid Mechanics\t\nOption 2\n\nAdmission into the MC-ENVENG Master of Environmental Engineering\n\nCorequisites\nNone\n'
    const r = parseHandbookPaste(text)
    expect(r.corequisites).toEqual({ subject: 'ENGR30002' })
    expect(JSON.stringify(r.prerequisites)).toContain('ENEN20002')
  })
})

describe('a requirement with a section for another degree only', () => {
  it('keeps the general requirement before it', async () => {
    const { parseHandbookPaste } = await import('../src/engine/handbookPaste')
    const text = 'Prerequisites\nAll of\nBIOL10008\tFoundational Biology\t\nBIOL10010\tLife\'s Complexity\t\nBachelor of Biomedicine Students:\nAll of\nBIOL10002\tBiomolecules and Cells\t\nAND\nNote: the following subject/s can also be taken concurrently (at the same time)\nBIOM20001\tMolecular and Cellular Biomedicine\t\n\nCorequisites\nNone\n'
    const r = parseHandbookPaste(text)
    expect(r.prerequisites).toEqual({ all: [{ subject: 'BIOL10008' }, { subject: 'BIOL10010' }] })
    expect(r.corequisites).toBe('none')
  })
})

describe('contact hours with no "per week"', () => {
  it('reads a short list of sessions as weekly', async () => {
    const { parseContactHours } = await import('../src/engine/handbookPaste')
    expect(parseContactHours('Contact hours\tA 2 hour lecture and a 1 hour tutorial')).toBe(3)
  })
})

describe('study periods named after a month', () => {
  it('reads them by when they actually run', async () => {
    const { parseAvailability } = await import('../src/engine/handbookPaste')
    const page = (m: string, from: string, to: string) => `${m} - On Campus\n${m}\nTeaching period\t${from} to ${to}\n`
    expect(parseAvailability('February - On Campus', page('February', '23 February 2026', '10 May 2026'))).toEqual(['semester-1'])
    expect(parseAvailability('February - On Campus', page('February', '4 February 2026', '25 February 2026'))).toEqual(['summer'])
    expect(parseAvailability('July - Off Campus', page('July', '12 July 2026', '22 July 2026'))).toEqual(['winter'])
    expect(parseAvailability('June - On Campus', page('June', '29 June 2026', '7 August 2026'))).toEqual(['winter'])
    expect(parseAvailability('November - On Campus', page('November', '24 November 2026', '9 December 2026'))).toEqual(['summer'])
  })
})

describe('an examination held mid-semester', () => {
  it('counts as a test, not the final exam', async () => {
    const { parseHandbookPaste } = await import('../src/engine/handbookPaste')
    const text = 'Assessment\nDescription\tTiming\tPercentage\nWritten examination 45 min\nMid semester\t25%\nWritten examination 2 hours\nDuring the examination period\t75%\n\nDates and times\n'
    const r = parseHandbookPaste(text)
    expect(r.assessment).toEqual([{ kind: 'test', weight: 25 }, { kind: 'exam', weight: 75 }])
  })

  describe('requirement layouts from commerce pages', () => {
    const row = (c: string) => `${c}\tSome Subject\tSemester 1 (On Campus - Parkville)\n12.5`
    const table = (...cs: string[]) => `Code\tName\tTeaching period\tCredit Points\n${cs.map(row).join('\n')}`
    const pre = (body: string) => parseHandbookPaste(`Prerequisites\n${body}\nCorequisites\nNone\n`)

    it('a concurrent table after "One of" adds to that choice, not a corequisite', () => {
      const r = pre(`One of\n\n${table('MAST10007', 'MAST10008')}\n\nNote: the following subject/s can also be taken concurrently (at the same time)\n\n${table('MAST10006')}`)
      expect(r.prerequisites).toEqual({ any: [{ subject: 'MAST10007' }, { subject: 'MAST10008' }, { subject: 'MAST10006' }] })
      expect(r.corequisites).toBe('none')
    })

    it('titled "Option 1 - …" headings are alternatives', () => {
      const r = pre(`Students must meet one of the following prerequisite options:\nOption 1 - Standard path\n${table('ECON20002')}\nOption 2 - Mathematics path\n${table('MAST20005')}`)
      expect(r.prerequisites).toEqual({ any: [{ subject: 'ECON20002' }, { subject: 'MAST20005' }] })
    })

    it('only the rule in force applies when older years are listed', () => {
      const r = pre(`For 2020, students must have completed both of:\n${table('MAST20005', 'ACTL20002')}\nFrom 2021, students must have completed both of:\n${table('ACTL20003', 'MAST20005')}`)
      expect(r.prerequisites).toEqual({ all: [{ subject: 'ACTL20003' }, { subject: 'MAST20005' }] })
    })

    it('options written in words are alternatives; "or" is a choice inside one', () => {
      const r = pre(`Students must meet one of the following prerequisite options:\n\nA total of 150 (out of 200) or more across MAST10006 or MAST10021 and MAST10007;\nA pass in both MAST10008 and MAST10009.\n${table('MAST10006', 'MAST10007', 'MAST10008', 'MAST10009', 'MAST10021')}`)
      expect(r.prerequisites).toEqual({
        any: [
          { all: [{ any: [{ subject: 'MAST10006' }, { subject: 'MAST10021' }] }, { subject: 'MAST10007' }] },
          { all: [{ subject: 'MAST10008' }, { subject: 'MAST10009' }] },
        ],
      })
      expect(r.warnings.join(' ')).toMatch(/combined mark/)
    })

    it('a points-of-study condition is a points rule, with permission only when it is extra', () => {
      expect(pre('Completion of 100 credit points of study').prerequisites).toEqual({ points: { min: 100 } })
      expect(pre('Completion of a minimum of 150 credit points of undergraduate study (at the time of application)').prerequisites).toEqual({ points: { min: 150 } })
      const r = pre('Students must obtain written permission to enrol in this subject. Students must have completed at least 100 points of prior study.')
      expect(r.prerequisites).toMatchObject({ all: [{ permission: 'coordinator' }, { points: { min: 100 } }] })
    })

    it('points of named fields become a points rule; a field we cannot map stays for a human', () => {
      expect(pre('A minimum of 25 credit points of Level 2 Earth Science, Chemistry or Biology Subjects').prerequisites).toEqual({
        points: { min: 25, levels: [2], areas: ['ERTH', 'GEOL', 'CHEM', 'BIOL'] },
      })
      expect(pre('A minimum of 25 credit points of university-level mathematics').prerequisites).toMatchObject({ manual: expect.any(String) })
    })

    it('the current rule keeps its own "one of", and a future rule waits', () => {
      const r = pre(`For 2020, students must have completed both of:\n${table('MAST20005', 'ACTL20002')}\nFrom 2021, students must have completed one of:\n${table('ACTL20003', 'MAST20004')}`)
      expect(r.prerequisites).toEqual({ any: [{ subject: 'ACTL20003' }, { subject: 'MAST20004' }] })
      const later = parseHandbookPaste(`You’re viewing the 2026 Handbook:\nPrerequisites\nFor 2026 commencing students\n${table('INFO20003')}\nFrom 2027 onwards\n${table('COMP20008')}\nCorequisites\nNone\n`)
      expect(JSON.stringify(later.prerequisites)).toContain('INFO20003')
      expect(JSON.stringify(later.prerequisites)).not.toContain('COMP20008')
    })

    it('a subject name between two codes keeps their "or"', () => {
      const r = pre(`Students must meet one of the following prerequisite options:\nA pass in MAST10007 Linear Algebra or MAST10022 Linear Algebra: Advanced;\nA pass in both MAST10008 and MAST10009.\n${table('MAST10007', 'MAST10022', 'MAST10008', 'MAST10009')}`)
      expect(r.prerequisites).toMatchObject({ any: [{ any: [{ subject: 'MAST10007' }, { subject: 'MAST10022' }] }, expect.anything()] })
    })

    it('breadth list: a full page without one is none; a part page says nothing; names may wrap', () => {
      expect(parseBreadthFor('Further information\nTexts\nAvailable through the Community Access Program')).toEqual([])
      expect(parseBreadthFor('Assessment\nDescription')).toBeUndefined()
      expect(parseBreadthFor('This subject is available as breadth in the following courses:\n\nBachelor of Arts\nBachelor of Fine Arts\n(Acting)\nBachelor of Science\n')).toEqual(['Bachelor of Arts', 'Bachelor of Fine Arts (Acting)', 'Bachelor of Science'])
      expect(parseBreadthFor('This subject is available as breadth in the following courses:\n\nAvailable through the Community Access Program')).toBeUndefined()
    })

    it('recommended background keeps only the codes it adds to the requirements', () => {
      const r = parseHandbookPaste(`Prerequisites\n${table('MAST10006')}\nCorequisites\nNone\nRecommended background knowledge\nBasic probability, e.g. MAST20004 or MAST10006.\nInherent requirements (core participation requirements)\nText\n`)
      expect(r.recommended).toEqual(['MAST20004'])
      expect(parseHandbookPaste('Recommended background knowledge\nPlease refer to Prerequisites and Corequisites.\n').recommended).toBeUndefined()
    })
  })
})

describe('pass/fail subjects', () => {
  it('notes a subject marked pass/fail and keeps it in the YAML', () => {
    const text = 'Assessment\nPass/Fail Grade\nThis subject is marked on a pass/fail basis and is not included in the weighted average mark (WAM) calculation.'
    const parsed = parseHandbookPaste(text)
    expect(parsed.passFail).toBe(true)
    expect(parse(subjectYaml({ code: 'AAAA10001', title: 'X', level: 1, points: 12.5, year: 2026 }, parsed)).pass_fail).toBe(true)
  })

  it('leaves an ordinary subject alone', () => {
    expect(parseHandbookPaste('Assessment\nExam 60%').passFail).toBeUndefined()
  })
})

describe('points of named fields', () => {
  it('reads levels and fields into a points rule, and keeps "or equivalent" as a by-hand way', async () => {
    const { parseDisciplinePoints } = await import('../src/engine/handbookPaste')
    expect(parseDisciplinePoints('12.5 credit points of Level 1 or Level 2 Geoscience, Geography, Chemistry or Biology subjects')).toEqual({
      points: { min: 12.5, levels: [1, 2], areas: ['ERTH', 'GEOL', 'GEOG', 'CHEM', 'BIOL'] },
    })
    expect(parseDisciplinePoints('A minimum of 100 credit points of Level 1 and/or Level 2 subjects')).toEqual({ points: { min: 100, levels: [1, 2] } })
    expect(parseDisciplinePoints('25 credit points of Level 2 Geography subjects (or equivalent as approved)')).toMatchObject({ any: [{ points: { areas: ['GEOG'] } }, { manual: expect.any(String) }] })
    expect(parseDisciplinePoints('A minimum of 12.5 credit points of a level-1 quantitative science subject')).toBeNull()
  })

  it('checks such a rule against what was passed, by level and code prefix', async () => {
    const { evaluateField } = await import('../src/engine/expr')
    const rule = { points: { min: 12.5, levels: [1, 2], areas: ['GEOG', 'CHEM'] } }
    const subjects = { CHEM10003: { code: 'CHEM10003', level: 1, area: 'CHEM', points: 12.5 }, COMP10001: { code: 'COMP10001', level: 1, area: 'COMP', points: 12.5 } } as never
    expect(evaluateField(rule, { completed: new Set(['CHEM10003']), subjects }).status).toBe('ok')
    expect(evaluateField(rule, { completed: new Set(['COMP10001']), subjects }).status).toBe('fail')
  })
})

describe('free text the Handbook writes in fixed ways', () => {
  it('reads graduate selection, "inclusive of", "prior to" and "points in"', async () => {
    const { structuredFromText } = await import('../src/engine/handbookPaste')
    expect(structuredFromText('Selection of the Environmental specialisation (formal) in the MC-ENG Master of Engineering')).toMatchObject({ admission: 'MC-ENG' })
    expect(structuredFromText('Selection of the Biomedical Engineering Systems major in the B-SCI')).toBeNull()
    expect(structuredFromText('Have completed at least 200 credit points prior to the commencement of this subject')).toEqual({ points: { min: 200 } })
    expect(structuredFromText('Completion of a minimum of 50 credit points of Level 2 study, inclusive of a minimum of 25 credit points of Level 2 Geography subjects')).toEqual({
      all: [{ points: { min: 50, levels: [2] } }, { points: { min: 25, levels: [2], areas: ['GEOG'] } }],
    })
    expect(structuredFromText('25 credit points in a Level 1 biology subjects')).toEqual({ points: { min: 25, levels: [1], areas: ['BIOL'] } })
    expect(structuredFromText('Breadth students need the approval of the subject coordinator')).toMatchObject({ permission: 'coordinator' })
  })
})

const row = (code: string, extra = '') => `${code}\tSome subject\t${extra}\nSemester 1 (On Campus - Parkville)\n\t12.5`
const head = 'Code\tName\tTeaching period\tCredit Points'

describe('requirement layouts from design pages', () => {
  it('a "One of" table straight after an "All of" table is its own choice, needed as well', () => {
    const r = parseHandbookPaste(`Prerequisites\nAll of\n${head}\n${row('AAAA10001')}\n${row('AAAA10002')}\nOne of\n${head}\n${row('BBBB20001')}\n${row('BBBB20002')}\nCorequisites\nNone`)
    expect(r.prerequisites).toEqual({
      all: [{ all: [{ subject: 'AAAA10001' }, { subject: 'AAAA10002' }] }, { any: [{ subject: 'BBBB20001' }, { subject: 'BBBB20002' }] }],
    })
    const and = parseHandbookPaste(`Prerequisites\nAll of\n${head}\n${row('AAAA10001')}\nAnd one of\n${head}\n${row('BBBB20001')}\n${row('BBBB20002')}\nCorequisites\nNone`)
    expect(and.prerequisites).toEqual({ all: [{ subject: 'AAAA10001' }, { any: [{ subject: 'BBBB20001' }, { subject: 'BBBB20002' }] }] })
  })

  it('a recommendation to study two subjects together adds no requirement', () => {
    const r = parseHandbookPaste(`Prerequisites\n${head}\n${row('AAAA20001')}\nIt is strongly recommended that CCCC30001 Case Studies be undertaken / studied concurrently with CCCC30002 Valuation.\nCorequisites\nNone`)
    expect(r.prerequisites).toEqual({ subject: 'AAAA20001' })
  })

  it('"For B-DES students:" headings become one branch per degree, each needing that degree', () => {
    const r = parseHandbookPaste(
      `Prerequisites\nFor B-DES students:\nAll of\n${head}\n${row('AAAA10001')}\n${row('AAAA10002')}\nFor B-COM Students:\nAdmission into the B-COM Bachelor of Commerce\nAND\n${head}\n${row('BBBB20001')}\nFor Bachelor of Environments students ( B-ENVS):\n${head}\n${row('CCCC20001')}\nCorequisites\nNone`,
    )
    expect(r.prerequisites).toMatchObject({
      any: [
        { all: [{ admission: 'B-DES' }, { subject: 'AAAA10001' }, { subject: 'AAAA10002' }] },
        { all: [{ admission: 'B-COM' }, { subject: 'BBBB20001' }] },
        { all: [{ admission: 'B-ENVS' }, { subject: 'CCCC20001' }] },
      ],
    })
  })

  it('a general part before the degree headings applies to every degree', () => {
    const r = parseHandbookPaste(`Prerequisites\n${head}\n${row('AAAA30001')}\nFor Bachelor of Commerce students:\n${head}\n${row('BBBB20001')}\nCorequisites\nNone`)
    expect(r.prerequisites).toMatchObject({ all: [{ subject: 'AAAA30001' }, { all: [{ admission: 'B-COM' }, { subject: 'BBBB20001' }] }] })
  })

  it('rows marked "No longer available" are left out of requirement tables', () => {
    const r = parseHandbookPaste(`Prerequisites\nOne of\n${head}\nAAAA20004\tOld subject\tNo longer available\t\n${row('AAAA30001')}\nCorequisites\nNone`)
    expect(r.prerequisites).toEqual({ subject: 'AAAA30001' })
    expect(r.warnings.join(' ')).toMatch(/No longer available/)
  })
})

describe('typed conditions from free text', () => {
  it('drops a bare "Equivalent" option and reads glued text after it', () => {
    expect(restructure({ any: [{ subject: 'AAAA10001' }, { manual: 'Equivalent' }] })).toEqual({ subject: 'AAAA10001' })
    expect(restructure({ any: [{ subject: 'AAAA10001' }, { manual: 'An approved equivalent' }, { manual: 'equivalent.' }] })).toEqual({ subject: 'AAAA10001' })
    // A requirement that is nothing but "Equivalent" stays as it is.
    expect(restructure({ manual: 'Equivalent' })).toEqual({ manual: 'Equivalent' })
    const r = parseHandbookPaste(`Prerequisites\n${head}\n${row('AAAA10001')}\nOR\nEquivalent\nCorequisites\nNone`)
    expect(r.prerequisites).toEqual({ subject: 'AAAA10001' })
  })

  it('reads points totals, by level and for a group of fields', () => {
    expect(structuredFromText('B-SCI Students: Completion of at least 175 credit points')).toMatchObject({ all: [{ admission: 'B-SCI' }, { points: { min: 175 } }] })
    expect(structuredFromText('Completion of 25 points at Level 1, and 37.5 points at Level 2.')).toEqual({
      all: [{ points: { min: 25, levels: [1] } }, { points: { min: 37.5, levels: [2] } }],
    })
    expect(structuredFromText('50 credit points in a Level 2 biological sciences subjects')).toMatchObject({ points: { min: 50, levels: [2], areas: expect.arrayContaining(['BIOL', 'ZOOL', 'BOTA']) } })
    expect(structuredFromText('a minimum of 12.5 credit points of Level 1 Mathematics subject (or equivalent)')).toEqual({ points: { min: 12.5, levels: [1], areas: ['MAST'] } })
  })

  it('reads averages and WAMs', () => {
    expect(structuredFromText('Excellent results in a discipline appropriate to the project (normally an average of at least 75% in relevant 2nd and 3rd year subjects)')).toMatchObject({
      average: { min: 75, levels: [2, 3] },
    })
    expect(structuredFromText('A minimum of 25 credit points of Italian Studies subjects with an average grade of H2B or above.')).toMatchObject({
      all: [{ points: { min: 25, areas: ['ITAL'] } }, { average: { min: 70, areas: ['ITAL'] } }],
    })
    expect(structuredFromText('All students should have at least a WAM of 70.')).toMatchObject({ wam: { min: 70 } })
  })

  it('reads "can be taken at the same time" as a concurrent rule', () => {
    expect(structuredFromText('Completion of 25 points at Level 1, and 37.5 points at Level 2.')).not.toHaveProperty('concurrent')
    expect(structuredFromText('A minimum of 25 credit points of Level 3 Chemistry subjects; these can be taken at the same time')).toEqual({
      points: { min: 25, levels: [3], areas: ['CHEM'], concurrent: true },
    })
  })

  it('reads placement and competency tests', () => {
    expect(structuredFromText('All students enrolling in French for the first time are required to complete the online language questionnaire/placement test at the link below.')).toMatchObject({ placement: 'French' })
    expect(structuredFromText('Passing the Language Placement Test of Korean 4')).toMatchObject({ placement: 'Korean' })
    expect(structuredFromText('Students will be required to sit a placement test conducted by the subject co-ordinator.')).toMatchObject({ placement: 'language' })
    expect(structuredFromText('At least 75% in the programming competency test')).toMatchObject({ placement: 'programming' })
  })

  it('reads permission and application-only entry, but not a condition on a major', () => {
    expect(structuredFromText('Permission of the subject coordinator')).toMatchObject({ permission: 'coordinator' })
    expect(structuredFromText('Permission from the Subject Coordinator via a selection process. This subject has a quota of 20 students.')).toMatchObject({ permission: 'application' })
    expect(structuredFromText('100 credit points of undergraduate study completed Students are required to apply for permission to enrol')).toMatchObject({
      all: [{ points: { min: 100 } }, { permission: 'application' }],
    })
    expect(structuredFromText('Completion of any two first-year arts subjects or permission of the convenor of the program.')).toBeNull()
    expect(structuredFromText('This is a Capstone subject and only available to students in the Sociology Major within the Bachelor of Arts')).toBeNull()
  })

  it('reads VCE results, with the study score when there is one', () => {
    expect(structuredFromText('Study score of 30 or more in VCE Specialist Mathematics 3/4 or equivalent')).toMatchObject({ school: { subject: 'Specialist Mathematics', minScore: 30 } })
    expect(structuredFromText('Excellent results in VCE Units 3 and 4 Physics (normally an unscaled score of at least 35) or equivalent')).toMatchObject({ school: { subject: 'Physics', minScore: 35 } })
    expect(structuredFromText('Completion of VCE German, or equivalent.')).toEqual({ school: { subject: 'German' }, note: 'Completion of VCE German, or equivalent.' })
    expect(structuredFromText('VCE Specialist Mathematics 3/4 study score of at least 38 (or equivalent), or permission from the Mathematics and Statistics Learning Centre')).toMatchObject({
      any: [{ school: { subject: 'Specialist Mathematics', minScore: 38 } }, { permission: 'coordinator' }],
    })
    expect(structuredFromText('VCE Algorithmics students may take the maths requirement concurrently')).toBeNull()
  })
})

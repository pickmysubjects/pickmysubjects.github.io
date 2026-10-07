import { describe, expect, it } from 'vitest'
import { parseAvailability, parseHandbookPaste } from '../src/engine/handbookPaste'
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

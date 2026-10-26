import { describe, expect, it } from 'vitest'
import { extractAttendance, extractExamBook, extractHandbookFacts, extractLanguages, extractPrescribedTexts } from '../src/engine/handbookFacts'
import { subjectFileSchema } from '../src/engine/schema'
import { interpolate, type Translate } from '../src/i18n/interpolate'
import { en } from '../src/i18n/messages/en'
import { zhCN } from '../src/i18n/messages/zh-CN'
import { attendanceText } from '../src/utils/attendance'
import { splitDataset, withDetail } from '../src/engine/split'
import { realData } from './realData'

describe('attendance from Handbook text', () => {
  it('reads the common wordings', () => {
    expect(extractAttendance('Attendance hurdle requirement: This subject has a minimum requirement of 80% attendance at tutorials, seminars, or workshops.')?.value).toBe(80)
    expect(extractAttendance('Hurdle requirement: Attendance at 75% of tutorials throughout the teaching period')?.value).toBe(75)
    expect(extractAttendance('Hurdle requirement: Students must attend a minimum of 70% of all scheduled classes.')?.value).toBe(70)
    expect(extractAttendance('Hurdle requirement: Less than 80% attendance will result in a fail.')?.value).toBe(80)
    // The fail line is the requirement, not the share that is "expected".
    expect(extractAttendance('Hurdle requirement: 100% attendance is expected. Less than 75% will result in a fail in this subject.')?.value).toBe(75)
    expect(extractAttendance('It is a hurdle that students attend a minimum of 10 (80% ) of laboratory practicals')?.value).toBe(80)
  })

  it('leaves out marks, penalties, exceptions and mixed shares', () => {
    expect(extractAttendance('Students are required to attend the excursion and score 50% and above in the assessment.')).toBeUndefined()
    expect(extractAttendance('Assessment submitted late will be penalised at 10% per day; attendance is expected.')).toBeUndefined()
    expect(extractAttendance('Under special consideration, the attendance requirement can be lowered to a minimum of 60% of classes.')).toBeUndefined()
    expect(extractAttendance('Hurdle requirement: 75% attendance at Lectures; 100% attendance at Seminars/Tutorials')).toBeUndefined()
    expect(extractAttendance('Students must submit 80% of the lab assignments and attend the field trip.')).toBeUndefined()
    expect(extractAttendance('Attendance at the field trip is compulsory.')).toBeUndefined()
  })
})

describe('what an attendance share applies to', () => {
  const of = (s: string) => extractAttendance(s)?.appliesTo
  it('names the classes the sentence names, and only those', () => {
    expect(of('Attendance hurdle requirement: This subject has a minimum requirement of 80% attendance at tutorials, seminars, or workshops.')).toEqual(['tutorials', 'workshops', 'seminars'])
    expect(of('Attendance of at least 80% of laboratory classes')).toEqual(['labs'])
    expect(of('Hurdle requirement: Students must attend at least 80% of lectures.')).toEqual(['lectures'])
    expect(of('Hurdle requirement: Attendance and participation in a minimum of 75% of the studios')).toEqual(['studios'])
  })

  it('says nothing specific when the text names no class type, or hedges', () => {
    expect(of('Hurdle requirement: Students must attend a minimum of 75% of all scheduled classes.')).toBeUndefined()
    expect(of('Attendance hurdle requirement: This subject has a minimum requirement of 80% attendance at lectorials')).toBeUndefined()
    expect(of('A minimum of 80% attendance at, or engagement with, all sessions identified as contact hours (may include lectures, tutorials, seminars and workshops).')).toBeUndefined()
    expect(of('Students must attend a minimum of both 75% of all scheduled lectures and 75% of all scheduled classes.')).toBeUndefined()
    expect(of('80% attendance at all tutorials [10/12 one-hour lectures]')).toEqual(['tutorials'])
  })

  it('reads as "Attend 80% of tutorials", or "classes" when none is named', () => {
    const tr = (msgs: object): Translate => (key, params) => {
      const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], msgs)
      return typeof v === 'string' ? interpolate(v, params) : key
    }
    expect(attendanceText(tr(en), 75, ['tutorials'])).toBe('Attend 75% of tutorials')
    expect(attendanceText(tr(en), 80, ['tutorials', 'seminars'])).toBe('Attend 80% of tutorials / seminars')
    expect(attendanceText(tr(en), 80, undefined)).toBe('Attend 80% of classes')
    expect(attendanceText(tr(en), 80, undefined)).not.toMatch(/lecture/i)
    expect(attendanceText(tr(zhCN), 75, ['tutorials'])).toBe('tutorial 至少出勤 75%')
  })
})

describe('prescribed texts from Handbook text', () => {
  const page = (body: string, next = 'Related Handbook entries') => `Further information\nTexts\nPrescribed texts\n\n${body}\n\n${next}\n\nThis subject contributes to the following:`

  it('reads a citation as yes and a plain "none" as no', () => {
    expect(extractPrescribedTexts(page('Oka, Mayumi et al. (2009) Tobira: Gateway to advanced Japanese.'))?.value).toBe(true)
    expect(extractPrescribedTexts(page('The Cosmic Perspective 6th Ed, Pearson Education Inc.', 'Recommended texts and other resources'))?.value).toBe(true)
    expect(extractPrescribedTexts(page('There are no specifically prescribed or recommended texts for this subject.'))?.value).toBe(false)
    expect(extractPrescribedTexts(page('None', 'Subject notes'))?.value).toBe(false)
    expect(extractPrescribedTexts('Readings are on the LMS. Prescribed Texts: There is no prescribed text. Readings based on journal articles.')?.value).toBe(false)
  })

  it('says nothing when the page only promises readings or advice later', () => {
    expect(extractPrescribedTexts(page('You will be advised of prescribed texts by your lecturer.'))).toBeUndefined()
    expect(extractPrescribedTexts(page("Readings will be provided online through the subject's LMS site (2026)."))).toBeUndefined()
    expect(extractPrescribedTexts(page('A subject reader will be available.'))).toBeUndefined()
    expect(extractPrescribedTexts('Learning outcomes: summarise key issues raised in prescribed texts.')).toBeUndefined()
  })
})

describe('open- or closed-book exam from Handbook text', () => {
  it('reads exams only', () => {
    expect(extractExamBook('One written closed book examination.\tEnd of semester\t60%')?.value).toBe('closed')
    expect(extractExamBook('Written 2 hour open-book exam (50%) in end semester exam period.')?.value).toBe('open')
  })

  it('ignores quizzes and tests, and pages that say both', () => {
    expect(extractExamBook('Two x 1-hour open-book Canvas quizzes (10% each)')).toBeUndefined()
    expect(extractExamBook('Written test, closed book')).toBeUndefined()
    expect(extractExamBook('Open book examination\nFinal exam (closed book)')).toBeUndefined()
  })
})

describe('programming languages from Handbook text', () => {
  it('finds languages named in a programming context', () => {
    expect(extractLanguages('The programming language used is Java.')?.value).toEqual(['Java'])
    expect(extractLanguages('Analyse those data using the R statistical environment.')?.value).toEqual(['R'])
    expect(extractLanguages('Students will regularly use computers with MATLAB installed. They write SQL queries against a relational database.')?.value).toEqual(['SQL', 'MATLAB'])
    expect(extractLanguages('Students write programs in C, and later in C++.')?.value).toEqual(['C', 'C++'])
  })

  it('ignores letters, grades, islands, background knowledge and other subjects', () => {
    expect(extractLanguages('A grade of C or above in the programming assignment.')).toBeUndefined()
    expect(extractLanguages('Food Microbiology by Martin R Adams, software edition.')).toBeUndefined()
    expect(extractLanguages('Histories of Java and Sumatra in the colonial period, with language study.')).toBeUndefined()
    expect(extractLanguages('Knowledge of Python is a benefit.')).toBeUndefined()
    expect(extractLanguages('Python and pandas are popular.')).toBeUndefined()
    expect(extractLanguages('COMP20005\tIntro. to Numerical Computation in C\tSemester 1')).toBeUndefined()
    expect(extractLanguages('Performance in C major, with a program of works for language students.')).toBeUndefined()
  })
})

describe('Handbook facts in the dataset', () => {
  it('combines the four facts with their evidence', () => {
    const f = extractHandbookFacts('Hurdle requirement: Attendance at 75% of workshops\nOne written closed book examination.\nThe programming language used is Python.\nPrescribed texts\n\nNone\n\nSubject notes')
    expect(f).toMatchObject({ minAttendance: 75, examBook: 'closed', languages: ['Python'], prescribedTexts: false })
    expect(Object.keys(f.evidence).sort()).toEqual(['examBook', 'languages', 'minAttendance', 'prescribedTexts'])
  })

  it('validates the new optional fields', () => {
    const base = { code: 'TEST10001', title: 'Test', level: 1, points: 12.5, offerings: 'unknown', prerequisites: 'none', corequisites: 'none', source_year: 2026 }
    const s = subjectFileSchema.parse({ ...base, min_attendance: 80, attendance_applies_to: ['tutorials'], prescribed_texts: true, exam_book: 'open', languages: ['Python', 'SQL'] })
    expect(s).toMatchObject({ attendanceAppliesTo: ['tutorials'], prescribedTexts: true, examBook: 'open', languages: ['Python', 'SQL'] })
    expect(subjectFileSchema.parse(base).examBook).toBeUndefined()
    expect(subjectFileSchema.safeParse({ ...base, exam_book: 'take-home' }).success).toBe(false)
    expect(subjectFileSchema.safeParse({ ...base, languages: ['Cobol'] }).success).toBe(false)
    expect(subjectFileSchema.safeParse({ ...base, languages: [] }).success).toBe(false)
    expect(subjectFileSchema.safeParse({ ...base, attendance_applies_to: ['parties'] }).success).toBe(false)
  })

  it('is in the real data and travels with the subject page detail', () => {
    const data = structuredClone(realData())
    const subjects = Object.values(data.subjects)
    expect(subjects.filter((s) => s.prescribedTexts !== undefined).length).toBeGreaterThan(1000)
    expect(subjects.some((s) => s.examBook)).toBe(true)
    expect(subjects.some((s) => s.languages?.length)).toBe(true)
    const code = subjects.find((s) => s.examBook)!.code
    const { core, details } = splitDataset(data)
    expect(core.subjects[code]!.examBook).toBeUndefined()
    expect(withDetail(core.subjects[code]!, details[code.slice(0, 4)]![code]).examBook).toBe(data.subjects[code]!.examBook)
  })
})

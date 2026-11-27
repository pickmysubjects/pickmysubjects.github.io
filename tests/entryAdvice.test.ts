import { describe, expect, it } from 'vitest'
import { realData } from './realData'
import { coveredPoints, entryAdvice, streamSpecialisations } from '../src/engine/entryAdvice'

// What a background points to, from the 2027 Handbook entry and course-structure pages.
describe('entry advice for coursework masters', () => {
  const data = realData()
  const it200 = (a: ReturnType<typeof entryAdvice>) => a.find((x) => x.course.startsWith('MC-IT'))
  const ds = (a: ReturnType<typeof entryAdvice>) => a.find((x) => x.course === 'MC-DATASC')

  it('counts a passed bachelor subject the Handbook pairs with a foundation subject', () => {
    // COMP20007 can't be taken with COMP90038; SWEN20003 with COMP90041; INFO20003 with INFO90002.
    expect(coveredPoints(data, ['COMP20007', 'SWEN20003', 'INFO20003'], ['COMP90041', 'COMP90038', 'COMP20008', 'INFO90002'])).toBe(37.5)
    expect(coveredPoints(data, ['MAST20005', 'MAST30025'], ['MAST90105', 'MAST90104'])).toBe(50)
  })

  it('a UniMelb computing major with WAM 65+ points to the 150-point MC-IT', () => {
    const a = entryAdvice(data, { where: 'unimelb' }, { passed: [], wam: 72, majors: ['Computing and Software Systems'] })
    expect(it200(a)?.course).toBe('MC-IT-150')
    expect(it200(entryAdvice(data, { where: 'unimelb' }, { passed: [], wam: 60, majors: ['Computing and Software Systems'] }))?.course).toBe('MC-IT-200')
    expect(it200(entryAdvice(data, { where: 'unimelb' }, { passed: [], wam: 80, majors: ['Psychology'] }))?.course).toBe('MC-IT-200')
  })

  it('elsewhere: four years and two years of work point to the 100-point MC-IT', () => {
    expect(it200(entryAdvice(data, { where: 'other', area: 'computing', wam65: true, fourYear: true, work: true }))?.course).toBe('MC-IT-100')
    expect(it200(entryAdvice(data, { where: 'other', area: 'computing', wam65: true }))?.course).toBe('MC-IT-150')
    expect(it200(entryAdvice(data, { where: 'other', area: 'other', wam65: true }))?.course).toBe('MC-IT-200')
  })

  it('MC-DATASC streams follow the foundation subjects a record covers', () => {
    const both = ['MAST20005', 'MAST30025', 'SWEN20003', 'COMP20007', 'COMP20008', 'INFO20003']
    expect(ds(entryAdvice(data, { where: 'unimelb' }, { passed: both, majors: [] }))?.stream).toBe('datascience')
    expect(ds(entryAdvice(data, { where: 'unimelb' }, { passed: ['MAST20005', 'MAST30025'], majors: [] }))?.stream).toBe('statistics')
    expect(ds(entryAdvice(data, { where: 'unimelb' }, { passed: ['MAST20005'], majors: [] }))?.stream).toBe('mixed')
    expect(ds(entryAdvice(data, { where: 'unimelb' }, { passed: ['SWEN20003'], majors: [] }))?.stream).toBe('foundation')
    expect(streamSpecialisations('foundation')).toEqual(['mc-datasc-foundational'])
  })

  it('MC-SOFTENG: a credit line for a UniMelb CSS major or a four-year computing degree, WAM 65+', () => {
    const se = (a: ReturnType<typeof entryAdvice>) => a.find((x) => x.course === 'MC-SOFTENG')
    expect(se(entryAdvice(data, { where: 'unimelb' }, { passed: [], wam: 70, majors: ['Computing and Software Systems'] }))).toMatchObject({ reason: 'seCredit', info: true })
    expect(se(entryAdvice(data, { where: 'unimelb' }, { passed: [], wam: 70, majors: ['Data Science'] }))).toBeUndefined()
    expect(se(entryAdvice(data, { where: 'other', area: 'computing', wam65: true, fourYear: true }))?.reason).toBe('seCredit')
    expect(se(entryAdvice(data, { where: 'other', area: 'computing', wam65: true }))).toBeUndefined()
  })

  it('MC-IS: a credit line for WAM 65+ and related work', () => {
    const is = (a: ReturnType<typeof entryAdvice>) => a.find((x) => x.course === 'MC-IS')
    expect(is(entryAdvice(data, { where: 'other', area: 'other', wam65: true, work: true }))?.reason).toBe('isCredit')
    expect(is(entryAdvice(data, { where: 'other', area: 'other', wam65: true }))).toBeUndefined()
  })
})

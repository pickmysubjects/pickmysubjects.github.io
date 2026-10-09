import { describe, expect, it } from 'vitest'
import { skillsOf } from '../src/engine/skills'
import { prerequisiteRoute } from '../src/engine/expr'
import type { Skill, Subject } from '../src/engine/schema'
import { buildDataset } from '../scripts/dataset'
import { dataset, subject } from './helpers'

describe('skillsOf', () => {
  it('keeps hand tags, and otherwise works them out from area, title, assessment and required subjects', () => {
    const data = dataset([
      subject({ code: 'MAST10006', skills: ['maths'] }),
      subject({ code: 'BIOL20001', title: 'Quantitative Ecology', prerequisites: 'MAST10006', assessment: [{ kind: 'report', weight: 60 }, { kind: 'exam', weight: 40 }] }),
      subject({ code: 'HIST10001', title: 'Plain Title', prerequisites: { any: ['MAST10006', 'HIST10002'] } }),
    ])
    expect(skillsOf(data.subjects['MAST10006'] as Subject, data)).toEqual(['maths'])
    expect(skillsOf(data.subjects['BIOL20001'] as Subject, data).sort()).toEqual(['lab', 'maths', 'statistics', 'writing'])
    // "MAST10006 or HIST10002" doesn't make it a maths subject.
    expect(skillsOf(data.subjects['HIST10001'] as Subject, data)).toEqual([])
  })

  it('agrees with the hand-tagged subjects when it has to guess them blind (real data)', () => {
    const { dataset: real } = buildDataset('real')
    const tagged = Object.values(real.subjects).filter((s) => s.skills.length)
    for (const skill of ['maths', 'programming', 'statistics', 'writing', 'lab'] as Skill[]) {
      let tp = 0
      let fp = 0
      let fn = 0
      for (const s of tagged) {
        const guess = skillsOf({ ...s, skills: [] }, real).includes(skill)
        const truth = s.skills.includes(skill)
        if (guess && truth) tp++
        else if (guess) fp++
        else if (truth) fn++
      }
      // Measured on 377 hand-tagged subjects (2026-10-10): maths 78/80, programming 84/55,
      // statistics 77/54, writing 76/41, lab 74/51 (precision/recall %). The new field and
      // engineering subjects tag writing sparingly (three skills at most), so its recall is
      // lower. Guessing is only for subjects not curated yet; precision matters most there.
      // Lab guesses come from the area and a report; field-based subjects in lab areas (farm and
      // vet practice) now carry "fieldwork" instead, so lab precision sits a little lower.
      expect(tp / (tp + fp), `${skill} precision`).toBeGreaterThanOrEqual(skill === 'lab' ? 0.7 : 0.75)
      expect(tp / (tp + fn), `${skill} recall`).toBeGreaterThanOrEqual(skill === 'writing' ? 0.4 : 0.5)
    }
  })
})

describe('prerequisiteRoute', () => {
  const data = dataset([
    subject({ code: 'MAST10006', prerequisites: 'none' }),
    subject({ code: 'MAST10007', prerequisites: 'none' }),
    subject({ code: 'MAST20004', level: 2, prerequisites: 'MAST10006' }),
    subject({ code: 'MAST20006', level: 2, prerequisites: 'MAST10007' }),
    subject({ code: 'MAST30020', level: 3, prerequisites: { any: ['MAST20004', 'MAST20006'] } }),
  ])

  it('goes all the way back, through the first choice', () => {
    expect(prerequisiteRoute('MAST30020', data.subjects, 'B-SCI')).toEqual(['MAST10006', 'MAST20004'])
  })

  it('takes the branch the student already has', () => {
    expect(prerequisiteRoute('MAST30020', data.subjects, 'B-SCI', new Set(['MAST20006']))).toEqual(['MAST20006'])
    expect(prerequisiteRoute('MAST30020', data.subjects, 'B-SCI', new Set(['MAST10007']))).toEqual(['MAST10006', 'MAST20004'])
  })
})

describe('prerequisiteRoute stops at what the student has', () => {
  it("doesn't follow a planned subject further back, and prefers subjects we know", () => {
    const data = dataset([
      subject({ code: 'MAST10006', prerequisites: 'none' }),
      subject({ code: 'MAST10009', prerequisites: { any: ['MAST10099', 'MAST10006'] } }),
      subject({ code: 'MAST30001', level: 3, prerequisites: 'MAST10009' }),
    ])
    expect(prerequisiteRoute('MAST30001', data.subjects, 'B-SCI')).toEqual(['MAST10006', 'MAST10009'])
    expect(prerequisiteRoute('MAST30001', data.subjects, 'B-SCI', new Set(['MAST10009']))).toEqual(['MAST10009'])
  })
})

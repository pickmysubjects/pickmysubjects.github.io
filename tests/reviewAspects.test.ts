import { describe, expect, it } from 'vitest'
import { aspectsOf, emphasisParts, plainEmphasis, summaryAspects } from '../src/engine/reviewAspects'
import { realData } from './realData'

describe('review aspects', () => {
  it('reads what a sentence talks about', () => {
    expect(aspectsOf('Two MSTs, a group poster and a final exam')).toEqual(expect.arrayContaining(['exam', 'group']))
    expect(aspectsOf('It assumes MAST20022 group theory')).toContain('background')
    expect(aspectsOf('No solutions for the tutorials beside one past paper')).toContain('resources')
    expect(aspectsOf('Interesting content about food')).toEqual([])
  })

  it('lists aspects most-mentioned first, pointing at the sentences', () => {
    const en = (s: string) => ({ en: s }) as never
    const r = summaryAspects({ points: [en('x')], sections: { work: [en('The final exam is hard'), en('Group work and an exam')], watch: [en('Lectures vary')] } } as never)
    expect(r[0]).toEqual({ aspect: 'exam', refs: [{ part: 'work', index: 0 }, { part: 'work', index: 1 }] })
    expect(r.map((x) => x.aspect)).toEqual(['exam', 'group', 'teaching'])
  })

  it('finds at least one aspect in most real summaries', () => {
    const ds = Object.values(realData().subjects).flatMap((s) => s.discussions ?? [])
    const withAspects = ds.filter((d) => summaryAspects(d).length > 0).length
    expect(withAspects / ds.length).toBeGreaterThan(0.9)
  })
})

describe('emphasis marks', () => {
  it('splits **key phrase** out as strong, and strips it for plain text', () => {
    expect(emphasisParts('The **final is hard**, start early')).toEqual([
      { text: 'The ', strong: false },
      { text: 'final is hard', strong: true },
      { text: ', start early', strong: false },
    ])
    expect(plainEmphasis('The **final is hard**')).toBe('The final is hard')
    expect(emphasisParts('No marks here')).toEqual([{ text: 'No marks here', strong: false }])
  })
})

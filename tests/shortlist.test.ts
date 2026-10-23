import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { nextTick, ref } from 'vue'
import { books } from '../src/composables/planStore'
import { provideDataset } from '../src/composables/useDataset'
import type { Dataset } from '../src/engine'
import { cleanShortlist, SHORTLIST_MAX } from '../src/utils/sanitize'
import { makeBackup, restoreBackup } from '../src/utils/backup'
import { compareFromQuery } from '../src/composables/useShortlist'

describe('shortlist storage', () => {
  it('is put back in shape: well-formed codes, upper case, each once, capped', () => {
    expect(cleanShortlist('nope')).toEqual([])
    expect(cleanShortlist(['comp10001', 'COMP10001', ' mast10006 ', 5, null, 'BAD', 'COMP1000X'])).toEqual(['COMP10001', 'MAST10006'])
    const many = Array.from({ length: 60 }, (_, i) => `COMP${String(10000 + i)}`)
    expect(cleanShortlist(many)).toHaveLength(SHORTLIST_MAX)
  })

  it('reads ?compare= the same way, at most three', () => {
    expect(compareFromQuery('comp10001,MAST10006,junk,COMP10001,INFO10003,BIOL10004')).toEqual(['COMP10001', 'MAST10006', 'INFO10003'])
    expect(compareFromQuery(null)).toEqual([])
  })

  describe('backup', () => {
    let store: Map<string, string>
    beforeEach(() => {
      store = new Map()
      vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) })
    })
    afterEach(() => vi.unstubAllGlobals())

    it('is exported and imported, cleaned on the way in', () => {
      store.set('sc:shortlist', JSON.stringify(['COMP10001', 'MAST10006']))
      const file = makeBackup()
      store.clear()
      expect(restoreBackup(file)).toBe(true)
      expect(JSON.parse(store.get('sc:shortlist') ?? '')).toEqual(['COMP10001', 'MAST10006'])
      const edited = JSON.stringify({ app: 'pickmysubjects', version: 1, savedAt: '', data: { 'sc:shortlist': ['comp10001', 42, 'x'] } })
      expect(restoreBackup(edited)).toBe(true)
      expect(JSON.parse(store.get('sc:shortlist') ?? '')).toEqual(['COMP10001'])
    })
  })
})

describe('compare table', () => {
  provideDataset(JSON.parse(readFileSync(new URL('../src/generated/real.json', import.meta.url), 'utf8')) as Dataset)

  it('toggles subjects on and off the shortlist', async () => {
    const { useShortlist } = await import('../src/composables/useShortlist')
    const s = useShortlist()
    for (const c of [...s.codes.value]) s.remove(c)
    s.toggle('COMP10001')
    s.add('COMP10001')
    s.add('MAST10006')
    expect(s.codes.value).toEqual(['COMP10001', 'MAST10006'])
    s.toggle('COMP10001')
    expect(s.codes.value).toEqual(['MAST10006'])
    s.remove('MAST10006')
  })

  it("shows the subject fit card's own difficulty and fit for the same subjects and profile", async () => {
    const { usePlan } = await import('../src/composables/usePlan')
    const { useProfile } = await import('../src/composables/useProfile')
    const { useSubjectFit } = await import('../src/composables/useSubjectFit')
    const { useSubjectCompare } = await import('../src/composables/useSubjectCompare')
    books.value = {}
    const plan = usePlan()
    const me = useProfile()
    plan.updateSetup({ ...plan.setup.value, course: 'B-SCI', major: '', startYear: 2027, startPeriod: 'semester-1' })
    // COMP30027 is a later-year subject: the card lifts the year cap for it, and so must compare.
    const codes = ['COMP10001', 'MAST10006', 'COMP30027']
    const compare = useSubjectCompare(ref(codes))
    const year = ref(plan.terms.value[0]?.year ?? new Date().getFullYear())

    const check = () => {
      expect(compare.columns.value.map((c) => c.subject.code)).toEqual(codes)
      for (const col of compare.columns.value) {
        const card = useSubjectFit(ref(col.subject.code), year)
        expect(col.difficulty).toEqual(card.difficulty.value)
        expect(col.fit).toEqual(card.fit.value)
      }
    }
    // No profile yet: no fit, same difficulty.
    check()
    expect(compare.columns.value.every((c) => c.fit === null)).toBe(true)

    me.setSkills({ programming: 5, maths: 2 })
    me.setInterests(['ai', 'programming'])
    me.setResults([{ code: 'MAST10006', mark: 75 }])
    await nextTick()
    check()
    expect(compare.columns.value.some((c) => c.fit?.kind === 'fit')).toBe(true)
    // The done subject reads as done, as on its page.
    expect(compare.columns.value[1]!.fit).toMatchObject({ kind: 'out', why: { key: 'done' } })
  })

  it('reads the facts each row shows from the subject', async () => {
    const { useSubjectCompare } = await import('../src/composables/useSubjectCompare')
    const { useDataset } = await import('../src/composables/useDataset')
    const { data } = useDataset()
    const [col] = useSubjectCompare(ref(['COMP10001', 'NOPE00000'])).columns.value
    const s = data.value.subjects.COMP10001!
    const exam = Math.round((s.assessment ?? []).filter((x) => x.kind === 'exam').reduce((a, x) => a + x.weight, 0))
    expect(col!.exam).toBe(s.assessment?.length ? exam : null)
    expect(col!.prereq).toBe(s.prerequisites === 'none' ? 'none' : expect.any(String))
    if (col!.assessment) expect(col!.assessment.reduce((a, x) => a + x.weight, 0)).toBeGreaterThanOrEqual(99)
  })
})

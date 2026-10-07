import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeBackup, restoreBackup } from '../src/utils/backup'

describe('backup', () => {
  let store: Map<string, string>
  beforeEach(() => {
    store = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('round-trips the record, plans and rated subjects', () => {
    store.set('sc:profiles', JSON.stringify({ real: { results: [{ code: 'COMP10001', mark: 80 }] } }))
    store.set('sc:plans', JSON.stringify({ real: { terms: [] } }))
    store.set('sc:rated', JSON.stringify(['COMP10001']))
    store.set('sc:locale', JSON.stringify('zh-CN')) // not part of a backup
    const file = makeBackup()
    store.clear()
    expect(restoreBackup(file)).toBe(true)
    expect(JSON.parse(store.get('sc:profiles') ?? '')).toEqual({ real: { results: [{ code: 'COMP10001', mark: 80 }] } })
    expect(JSON.parse(store.get('sc:rated') ?? '')).toEqual(['COMP10001'])
    expect(store.has('sc:locale')).toBe(false)
  })

  it('refuses files that are not a Subject Compass backup', () => {
    expect(restoreBackup('not json')).toBe(false)
    expect(restoreBackup(JSON.stringify({ app: 'something-else', version: 1, data: {} }))).toBe(false)
    expect(store.size).toBe(0)
  })
})

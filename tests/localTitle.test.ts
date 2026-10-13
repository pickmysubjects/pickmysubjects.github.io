import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { localTitle, withLocalTitle } from '../src/i18n/localized'

describe('Chinese subject titles', () => {
  const { dataset, errors } = buildDataset('real')

  it('loads a Simplified and Traditional title for every subject', () => {
    expect(errors).toEqual([])
    for (const s of Object.values(dataset.subjects)) {
      expect(s.titles?.zh, s.code).toBeTruthy()
      expect(s.titles?.['zh-TW'], s.code).toBeTruthy()
    }
  })

  it('shows them only on Chinese pages', () => {
    const s = { titles: { zh: '微积分 2', 'zh-TW': '微積分 2' } }
    expect(localTitle(s, 'zh-CN')).toBe('微积分 2')
    expect(localTitle(s, 'zh-TW')).toBe('微積分 2')
    expect(localTitle(s, 'en')).toBe('')
    expect(localTitle({ titles: { zh: '微积分 2' } }, 'zh-TW')).toBe('微积分 2')
    expect(withLocalTitle('Calculus 2', '微积分 2')).toBe('Calculus 2（微积分 2）')
    expect(withLocalTitle('Calculus 2', '')).toBe('Calculus 2')
  })
})

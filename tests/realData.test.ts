import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { realData } from './realData'

// The one place the test suite builds the real dataset from YAML; everything else reads
// src/generated/real.json through realData().
describe('real dataset', () => {
  const built = buildDataset('real')

  it('builds with no errors', () => {
    expect(built.errors).toEqual([])
  })

  it('realData() is the same as buildDataset("real")', () => {
    // JSON drops keys whose value is undefined (toEqual ignores those too) and turns objects the
    // build shares between two places into copies; nothing else may differ.
    const { generatedAt: _built, ...want } = built.dataset
    const { generatedAt: _read, ...got } = realData()
    expect(got).toEqual(want)
  })
})

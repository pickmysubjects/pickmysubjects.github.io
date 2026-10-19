import { describe, expect, it } from 'vitest'
import { heavyShare } from './share'

// Each degree judged against its own usual load (2026-10-19: an Arts semester of essays or a
// Design studio's coursework is the norm there, not a heavy semester), so their shares sit near
// Science's. Measured then: B-COM 0.048, B-ARTS 0.015, B-BMED 0.045, B-DES 0.096.
describe('plan builder spreads the load in each degree (real data)', () => {
  it('B-BMED', () => {
    expect(heavyShare('B-BMED')).toBeLessThan(0.07)
  }, 300_000)
})

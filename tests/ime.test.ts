import { afterEach, describe, expect, it, vi } from 'vitest'
import { isImeEnter, useImeGuard } from '../src/utils/ime'

const key = (over: Partial<KeyboardEvent> = {}) => ({ key: 'Enter', isComposing: false, keyCode: 13, ...over }) as KeyboardEvent

describe('Enter from an input method', () => {
  it('is not an Enter while composing (Chrome, Firefox) or as keyCode 229 (Safari)', () => {
    expect(isImeEnter(key({ isComposing: true }))).toBe(true)
    expect(isImeEnter(key({ keyCode: 229 }))).toBe(true)
    expect(isImeEnter(key())).toBe(false)
    expect(isImeEnter(key({ key: 'a', isComposing: true }))).toBe(false)
  })

  describe('a box tracking its own composition', () => {
    afterEach(() => vi.useRealTimers())

    it('counts an Enter just after compositionend as part of it, then lets Enter through', () => {
      vi.useFakeTimers()
      const ime = useImeGuard()
      ime.onCompositionstart()
      expect(ime.isImeEnter(key())).toBe(true)
      ime.onCompositionend()
      expect(ime.isImeEnter(key())).toBe(true)
      vi.runAllTimers()
      expect(ime.isImeEnter(key())).toBe(false)
    })

    it('stops a form submitting on an input method Enter only', () => {
      const ime = useImeGuard()
      const ev = (over: Partial<KeyboardEvent>) => {
        const e = { ...key(over), preventDefault: vi.fn() }
        ime.holdImeEnter(e as unknown as KeyboardEvent)
        return e.preventDefault
      }
      expect(ev({ keyCode: 229 })).toHaveBeenCalled()
      expect(ev({})).not.toHaveBeenCalled()
    })
  })
})

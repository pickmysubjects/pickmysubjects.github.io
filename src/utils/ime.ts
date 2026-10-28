/**
 * Enter pressed to confirm a word in an input method (Chinese, Japanese, Korean…) must not act
 * as Enter: it isn't a search or a submit. Browsers mark it differently: isComposing on the key
 * (Chrome, Firefox), only keyCode 229 (Safari, which ends the composition first), or neither
 * right after compositionend in some. So the box also tracks its own composition and counts the
 * moment just after it ends as still composing.
 */
type KeyLike = Pick<KeyboardEvent, 'key' | 'isComposing' | 'keyCode'>

/** True for an Enter that belongs to an input method, not the student. */
export function isImeEnter(e: KeyLike, composing = false): boolean {
  return e.key === 'Enter' && (composing || e.isComposing || e.keyCode === 229)
}

/**
 * For one text box: bind `onCompositionstart` / `onCompositionend` to it, then ask `isImeEnter(e)`
 * in its Enter handler, or use `holdImeEnter` as a keydown.enter handler on a box inside a form
 * (it stops the form submitting on an input method's Enter).
 */
export function useImeGuard() {
  let composing = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const onCompositionstart = () => {
    clearTimeout(timer)
    composing = true
  }
  // The Enter that ended it can arrive just after compositionend: wait a tick before letting go.
  const onCompositionend = () => {
    clearTimeout(timer)
    timer = setTimeout(() => (composing = false), 0)
  }
  const isEnter = (e: KeyLike) => isImeEnter(e, composing)
  const holdImeEnter = (e: KeyboardEvent) => {
    if (isEnter(e)) e.preventDefault()
  }
  return { onCompositionstart, onCompositionend, isImeEnter: isEnter, holdImeEnter }
}

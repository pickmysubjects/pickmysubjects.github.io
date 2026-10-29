import { nextTick, onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'

const GAP = 8
const EDGE = 12
/** At this width and below, overlays are a sheet at the bottom of the screen instead. */
export const SHEET_MAX = 640

export type OverlayAlign = 'center' | 'start'

/**
 * Where to put a fixed overlay of size w×h next to an anchor: below it when it fits, otherwise
 * above, and always kept inside the viewport. Returns {} on phones, where CSS makes it a sheet.
 */
export function overlayPosition(anchor: DOMRect, w: number, h: number, align: OverlayAlign = 'center'): Record<string, string> {
  if (window.innerWidth <= SHEET_MAX) return {}
  const want = align === 'center' ? anchor.left + anchor.width / 2 - w / 2 : anchor.left
  const left = Math.min(Math.max(EDGE, want), window.innerWidth - w - EDGE)
  const below = anchor.bottom + GAP + h <= window.innerHeight - EDGE || anchor.top - GAP - h < EDGE
  const top = below ? anchor.bottom + GAP : anchor.top - GAP - h
  return { left: `${left}px`, top: `${top}px` }
}

/**
 * Keeps a teleported, position:fixed overlay next to its anchor while `open` is true.
 * Outside pointerdown and Escape close it (Escape returns focus to the anchor).
 * Scroll and resize close it when `closeOnMove`, otherwise they re-place it (an overlay with an
 * input stays open when a phone keyboard resizes the viewport).
 */
export function useAnchoredOverlay(opts: {
  open: Ref<boolean>
  anchor: () => HTMLElement | null | undefined
  panel: () => HTMLElement | null | undefined
  close: () => void
  align?: OverlayAlign
  closeOnMove?: boolean
}) {
  const pos = shallowRef<Record<string, string>>({})

  function place(): void {
    const a = opts.anchor()?.getBoundingClientRect()
    const p = opts.panel()
    if (!a || !p) return
    pos.value = overlayPosition(a, p.offsetWidth, p.offsetHeight, opts.align)
  }
  function onOutside(e: Event): void {
    const target = e.target as Node
    if (opts.anchor()?.contains(target) || opts.panel()?.contains(target)) return
    opts.close()
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return
    opts.close()
    opts.anchor()?.focus()
  }
  const onMove = (): void => (opts.closeOnMove ? opts.close() : place())

  function listen(on: boolean): void {
    const fn = on ? window.addEventListener : window.removeEventListener
    fn('pointerdown', onOutside, true)
    fn('keydown', onKey)
    fn('scroll', onMove, true)
    fn('resize', onMove)
  }

  /** Measure invisibly first (opacity, so an input inside can still take focus), then place: call after the panel's content changes size. */
  async function reposition(): Promise<void> {
    pos.value = { opacity: '0' }
    await nextTick()
    place()
  }

  watch(opts.open, (isOpen) => {
    listen(isOpen)
    if (isOpen) void reposition()
  })
  onBeforeUnmount(() => listen(false))

  return { pos, reposition }
}

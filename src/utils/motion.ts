/**
 * Whether to skip motion: the visitor's Reduce Motion setting, except in the local preview, where
 * the preview pill can force motion on (`force-motion`) or off (`preview-rm`). The real build drops
 * the preview branch.
 */
export function reducedMotion(): boolean {
  if ((import.meta.env.VITE_FORCE_GLASS === '1' || import.meta.env.DEV) && typeof document !== 'undefined') {
    const c = document.documentElement.classList
    if (c.contains('force-motion')) return false
    if (c.contains('preview-rm')) return true
  }
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

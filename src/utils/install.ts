/**
 * Adding the site to a phone's home screen. Chrome, Edge and Samsung Internet on Android offer
 * their own install prompt (`beforeinstallprompt`), which the page keeps to show behind its own
 * button; iPhone and iPad never do, so there the page says where Safari's "Add to Home Screen" is.
 * An app's in-app browser (WeChat, Xiaohongshu…) can't add anything: open the page in a browser first.
 */
import { shallowRef } from 'vue'
import { runningInstalled, visitSource } from './analytics'

/** The prompt event Chrome fires (not in the DOM types yet). */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferred = shallowRef<InstallPromptEvent | null>(null)
const installed = shallowRef(false)
let listening = false

/** Catch the browser's install prompt as soon as the page starts: it can fire before the app mounts. */
export function captureInstallPrompt(): void {
  if (listening || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
  listening = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred.value = e as InstallPromptEvent
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    deferred.value = null
  })
}

/** iPhone and iPad, including an iPad that asks for desktop pages (it reports itself as a Mac). */
export function isIos(ua: string, touchPoints = 0): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)
}

export type InstallWay = 'done' | 'prompt' | 'ios' | 'in-app' | 'menu'

/**
 * How this visitor can add the site: it's already there ('done'), the browser's own prompt
 * ('prompt'), Safari's share sheet ('ios'), not from inside an app ('in-app'), or the
 * browser's menu ('menu': Firefox and others with no prompt).
 */
export function installWay(opts: { ua: string; touchPoints?: number; standalone: boolean; hasPrompt: boolean }): InstallWay {
  if (opts.standalone) return 'done'
  if (!['link', 'direct'].includes(visitSource(opts.ua, ''))) return 'in-app'
  if (opts.hasPrompt) return 'prompt'
  if (isIos(opts.ua, opts.touchPoints)) return 'ios'
  return 'menu'
}

/** The current way, kept up to date as the prompt arrives or the site gets installed. */
export function useInstall() {
  const way = (): InstallWay =>
    installWay({
      ua: typeof navigator === 'undefined' ? '' : navigator.userAgent,
      touchPoints: typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
      standalone: installed.value || runningInstalled(),
      hasPrompt: deferred.value !== null,
    })
  /** Show the browser's own prompt; true when the student said yes. */
  async function prompt(): Promise<boolean> {
    const e = deferred.value
    if (!e) return false
    deferred.value = null
    await e.prompt()
    const { outcome } = await e.userChoice
    if (outcome === 'accepted') installed.value = true
    return outcome === 'accepted'
  }
  return { way, prompt }
}

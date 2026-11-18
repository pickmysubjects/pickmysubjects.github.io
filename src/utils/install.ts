/**
 * Adding the site to a phone's home screen. Chrome, Edge and Samsung Internet on Android offer
 * their own install prompt (`beforeinstallprompt`), which the page keeps to show behind its own
 * button; iPhone and iPad never do, so there the page says where Safari's "Add to Home Screen" is.
 * An app's in-app browser (WeChat, Xiaohongshu…) can't add anything: open the page in a browser first.
 */
import { shallowRef, type Ref } from 'vue'
import { usePersisted } from '@/composables/usePersisted'
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

/** Safari 17 or later on a Mac (not an iPad asking for desktop pages): File › Add to Dock. */
export function isMacSafari(ua: string, touchPoints = 0): boolean {
  if (!/Macintosh/.test(ua) || touchPoints > 1 || !/Safari\//.test(ua) || /Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR/.test(ua)) return false
  return Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0) >= 17
}

/** A phone or tablet browser (Android, iOS) rather than a computer's. */
export function isMobile(ua: string, touchPoints = 0): boolean {
  return isIos(ua, touchPoints) || /Android|Mobi/.test(ua)
}

export type InstallWay = 'done' | 'prompt' | 'ios' | 'mac' | 'in-app' | 'menu' | 'none'

/**
 * How this visitor can add the site: it's already there ('done'), the browser's own prompt
 * ('prompt'), Safari's share sheet ('ios'), Safari's File menu on a Mac ('mac'), not from inside
 * an app ('in-app'), the browser's menu on a phone ('menu': Firefox and others with no prompt),
 * or not at all ('none': Firefox on a computer, or Chrome before it offers its prompt).
 */
export function installWay(opts: { ua: string; touchPoints?: number; standalone: boolean; hasPrompt: boolean }): InstallWay {
  if (opts.standalone) return 'done'
  if (!['link', 'direct'].includes(visitSource(opts.ua, ''))) return 'in-app'
  if (opts.hasPrompt) return 'prompt'
  if (isIos(opts.ua, opts.touchPoints)) return 'ios'
  if (isMacSafari(opts.ua, opts.touchPoints)) return 'mac'
  return isMobile(opts.ua, opts.touchPoints) ? 'menu' : 'none'
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

/**
 * When to offer it. Never on a first page load: only right after something useful (a plan made,
 * a tool's answer shown, a second look at this semester). It floats in once, and closing it (here
 * or the home card) hides every install nudge for good. The About page's steps always stay.
 */
const moment = shallowRef(false)
// The home page's news pop-up, shown or still to come: the install nudge waits until it's closed.
const newsPending = shallowRef(false)
export function setNewsPending(on: boolean): void {
  newsPending.value = on
}
export function newsWaiting() {
  return newsPending
}
let hiddenRef: Ref<boolean> | undefined
let shownRef: Ref<boolean> | undefined
// The home card's old flag was the string '1'; JSON reads it back as 1.
const flag = (raw: unknown) => raw === true || raw === 1
/** Closed for good (shared with the home card). */
export function installHidden() {
  return (hiddenRef ??= usePersisted('sc:install-hidden', false, flag))
}
/** The floating offer has been shown once already. */
export function installOffered() {
  return (shownRef ??= usePersisted('sc:install-shown', false, flag))
}
let timer: ReturnType<typeof setTimeout> | undefined
/** Something useful just happened: offer it a moment later, once the result is on screen. */
export function offerInstall(delay = 1500): void {
  if (typeof window === 'undefined' || moment.value) return
  clearTimeout(timer)
  timer = setTimeout(() => (moment.value = true), delay)
}
/** Whether a useful moment has come this visit. */
export function installMoment() {
  return moment
}
/** Count a visit that opens /this-semester/ (once per visit); the second such visit is a moment. */
let looked = false
export function semesterVisit(): void {
  if (looked) return
  looked = true
  const seen = usePersisted('sc:semester-looks', 0, (raw) => (typeof raw === 'number' ? raw : 0))
  seen.value += 1
  if (seen.value >= 2) offerInstall(4000)
}

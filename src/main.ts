import { createApp } from 'vue'
import App from './App.vue'
import { loadDataset } from './composables/useDataset'
import { parsePath, savedLocaleAddress } from './composables/useView'
import { VIEW_LOADERS } from './views/loaders'
import { currentLocale, loadLocale } from './i18n'
import { registerServiceWorker } from './utils/serviceWorker'
import { optOutToggle } from './utils/analytics'
// Fonts are bundled (not loaded from Google Fonts) so visitors' IPs aren't sent to a third party.
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
// Downloaded only when a page in that language uses them (unicode-range / :lang).
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import '@fontsource-variable/noto-sans-devanagari/wght.css'
import './assets/main.css'

// Local preview only (dev server and `npm run local`): the full glass and the animations show
// even when the Mac has Reduce Transparency / Reduce Motion on; the preview pill switches to the
// RT look or reduced motion (ThemePreview.vue). Production builds drop this branch.
if (import.meta.env.VITE_FORCE_GLASS === '1' || import.meta.env.DEV) {
  document.documentElement.classList.add('force-glass', 'force-motion')
}

// Local preview only: a floating light/dark and Reduce Transparency switch. Same gating as above
// (dev server or `npm run local`); the real build drops this branch and the component with it.
if (import.meta.env.VITE_FORCE_GLASS === '1' || import.meta.env.DEV) {
  void Promise.all([import('vue'), import('./components/ThemePreview.vue')]).then(([{ createApp }, m]) => {
    const host = document.createElement('div')
    document.body.append(host)
    createApp(m.default).mount(host)
  })
}

// A saved language other than English, on an English address: open that language's own page
// straight away instead of drawing the English one and switching it over.
// #toggle-goatcounter first, so neither the redirect nor the first page is counted.
optOutToggle()
const moveTo = savedLocaleAddress()
if (moveTo) location.replace(moveTo)
else start()

function start(): void {
  // The page's own HTML (prerendered) stays on screen while the subject data and the code of the
  // page being opened load; the other pages' code follows once the browser is idle.
  const opening = VIEW_LOADERS[parsePath(location.pathname.slice(import.meta.env.BASE_URL.length)).view]
  Promise.all([loadDataset(), opening(), loadLocale(currentLocale())]).then(
    () => {
      createApp(App).mount('#app')
      document.documentElement.classList.remove('booting')
      registerServiceWorker()
      const later = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 4000 }) : setTimeout(f, 2000))
      later(() => Object.values(VIEW_LOADERS).forEach((load) => void load().catch(() => {})))
    },
    (e: unknown) => {
      // Starting failed: show the plain text page rather than a spinner forever.
      document.documentElement.classList.remove('booting')
      console.error(e)
    },
  )
}

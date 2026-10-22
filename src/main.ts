import { createApp } from 'vue'
import App from './App.vue'
import { loadDataset } from './composables/useDataset'
import { parsePath, savedLocaleAddress } from './composables/useView'
import { VIEW_LOADERS } from './views/loaders'
import { currentLocale, loadLocale } from './i18n'
import { registerServiceWorker } from './utils/serviceWorker'
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

// A saved language other than English, on an English address: open that language's own page
// straight away instead of drawing the English one and switching it over.
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
      registerServiceWorker()
      const later = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 4000 }) : setTimeout(f, 2000))
      later(() => Object.values(VIEW_LOADERS).forEach((load) => void load().catch(() => {})))
    },
    (e: unknown) => console.error(e),
  )
}

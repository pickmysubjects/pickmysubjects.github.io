import { createApp } from 'vue'
import App from './App.vue'
// Fonts are bundled (not loaded from Google Fonts) so visitors' IPs aren't sent to a third party.
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import './assets/main.css'

createApp(App).mount('#app')

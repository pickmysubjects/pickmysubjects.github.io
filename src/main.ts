import { createApp } from 'vue'
import App from './App.vue'
// Fonts are bundled (not loaded from Google Fonts) so visitors' IPs aren't sent to a third party.
import '@fontsource/overpass/400.css'
import '@fontsource/overpass/600.css'
import '@fontsource/overpass/800.css'
import '@fontsource/overpass-mono/400.css'
import '@fontsource/overpass-mono/600.css'
import './assets/main.css'

createApp(App).mount('#app')

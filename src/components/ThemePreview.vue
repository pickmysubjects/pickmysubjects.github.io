<script setup lang="ts">
// Local preview only (dev server and `npm run local`): force light/dark and a Reduce Transparency
// look to review the design. main.ts never loads this in the real build.
import { ref, watchEffect } from 'vue'

type Theme = 'auto' | 'light' | 'dark'
const order: Theme[] = ['auto', 'light', 'dark']
const root = document.documentElement
const hadGlass = root.classList.contains('force-glass')

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked: the switch still works for this visit
  }
}

const saved = read('preview-theme')
const theme = ref<Theme>(order.includes(saved as Theme) ? (saved as Theme) : 'auto')
const rt = ref(read('preview-rt') === '1')

watchEffect(() => {
  if (theme.value === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme.value)
  write('preview-theme', theme.value)
})
watchEffect(() => {
  root.classList.toggle('preview-rt', rt.value)
  root.classList.toggle('force-glass', hadGlass && !rt.value)
  write('preview-rt', rt.value ? '1' : '0')
})

const next = () => (theme.value = order[(order.indexOf(theme.value) + 1) % order.length] ?? 'auto')
</script>

<template>
  <div class="preview-pill" role="group" aria-label="Design preview">
    <button type="button" :aria-label="`Theme: ${theme}`" :title="`Theme: ${theme}`" @click="next">
      <svg v-if="theme === 'light'" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      <svg v-else-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" /></svg>
      <span>{{ theme === 'auto' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark' }}</span>
    </button>
    <button type="button" :aria-pressed="rt" :title="rt ? 'Reduce Transparency look' : 'Glass look'" @click="rt = !rt">
      <span>{{ rt ? 'RT' : 'Glass' }}</span>
    </button>
  </div>
</template>

<style scoped>
.preview-pill {
  position: fixed;
  left: 12px;
  bottom: 12px;
  z-index: 40;
  display: flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-shine), var(--float-fill);
  -webkit-backdrop-filter: var(--float-blur);
  backdrop-filter: var(--float-blur);
  box-shadow: var(--float-rim), var(--float-shadow);
  font-size: 0.75rem;
  font-weight: 600;
}

.preview-pill button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--ink);
  cursor: pointer;
}

.preview-pill button:hover {
  background: var(--glass-fill-hover);
}

.preview-pill svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

/* Above the phone tab bar (12px inset + ~64px bar). */
@media (max-width: 720px) {
  .preview-pill {
    bottom: calc(88px + env(safe-area-inset-bottom));
  }

  /* Phone: icon and a short tag only, so it covers as little as possible. */
  .preview-pill button:first-child span {
    display: none;
  }
}

@media print {
  .preview-pill {
    display: none;
  }
}
</style>

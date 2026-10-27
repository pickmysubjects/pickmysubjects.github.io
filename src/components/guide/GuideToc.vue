<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { reducedMotion } from '@/utils/motion'

/**
 * "On this page": the page's topics, the one being read highlighted. Desktop: a sticky list in
 * the left column. Phones: a small fold at the top of the page. A tap scrolls smoothly and
 * keeps the #anchor in the address, so the link can be shared.
 */
interface TocItem {
  id: string
  title: string
  sub: boolean
}
const props = defineProps<{ items: TocItem[] }>()
const { t } = useI18n()
const active = shallowRef<string | null>(null)
const open = shallowRef(false)
const activeTitle = computed(() => props.items.find((i) => i.id === active.value)?.title ?? null)

// The topic being read: the last one whose top has passed a line a little below the header.
let frame = 0
function spy(): void {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    let current: string | null = null
    for (const i of props.items) {
      const el = document.getElementById(i.id)
      if (el && el.getBoundingClientRect().top <= 200) current = i.id
    }
    active.value = current
  })
}

function jump(id: string, event: MouseEvent): void {
  const el = document.getElementById(id)
  if (!el) return
  event.preventDefault()
  open.value = false
  history.replaceState(history.state, '', `#${encodeURIComponent(id)}`)
  el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

onMounted(() => {
  window.addEventListener('scroll', spy, { passive: true })
  spy()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', spy)
  cancelAnimationFrame(frame)
})
watch(() => props.items, spy)
</script>

<template>
  <nav class="toc" :aria-label="t('subject.onPage')">
    <!-- Desktop -->
    <div class="toc-side surface">
      <p class="toc-label">{{ t('subject.onPage') }}</p>
      <ol class="toc-list">
        <li v-for="i in items" :key="i.id" :class="{ sub: i.sub }">
          <a :href="`#${i.id}`" :aria-current="active === i.id ? 'location' : undefined" @click="jump(i.id, $event)">{{ i.title }}</a>
        </li>
      </ol>
    </div>
    <!-- Phones -->
    <details class="toc-drop surface" :open="open" @toggle="open = ($event.target as HTMLDetailsElement).open">
      <summary class="toc-summary">
        <span class="toc-label">{{ t('subject.onPage') }}</span>
        <span class="toc-now">{{ activeTitle ?? items[0]?.title }}</span>
        <ChevronDown :size="18" aria-hidden="true" class="toc-chev" />
      </summary>
      <ol class="toc-list">
        <li v-for="i in items" :key="i.id" :class="{ sub: i.sub }">
          <a :href="`#${i.id}`" :aria-current="active === i.id ? 'location' : undefined" @click="jump(i.id, $event)">{{ i.title }}</a>
        </li>
      </ol>
    </details>
  </nav>
</template>

<style scoped>
/* As tall as the article, so the list can stay in view while it scrolls. */
.toc {
  height: 100%;
}

.toc-label {
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.toc-list {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.toc-list a {
  position: relative;
  display: block;
  padding: 8px 12px 8px 16px;
  font-size: var(--fs-small);
  line-height: 1.4;
  color: var(--ink-soft);
  text-decoration: none;
  border-radius: 12px;
  transition: background 0.15s, color 0.15s;
}

.toc-list .sub a {
  padding-left: 28px;
  font-size: var(--fs-meta);
}

/* The bar on the left edge of each item: hidden until hover, pink when it's the topic being read. */
.toc-list a::before {
  content: '';
  position: absolute;
  top: 9px;
  bottom: 9px;
  left: 6px;
  width: 3px;
  border-radius: 2px;
  background: currentColor;
  opacity: 0;
  transform: scaleY(0.4);
  transition: opacity 0.15s, transform 0.2s var(--ease-spring);
}

.toc-list a:hover {
  color: var(--ink);
  background: var(--inset-fill);
}

.toc-list a:hover::before {
  opacity: 0.35;
  transform: none;
}

.toc-list a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.toc-list a[aria-current] {
  font-weight: var(--fw-semibold);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent-fill) 13%, var(--glass-fill));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 50%), inset 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
}

.toc-list a[aria-current]::before {
  background: var(--accent-fill);
  opacity: 1;
  transform: none;
}

/* A glass panel the height of its list, held under the header while the article scrolls. */
.toc-side {
  position: sticky;
  top: 88px;
  display: grid;
  gap: 8px;
  max-height: calc(100vh - 112px);
  padding: 16px 10px 12px;
  overflow-y: auto;
  border-radius: 22px;
  scrollbar-width: thin;
}

.toc-side .toc-label {
  padding: 0 12px 6px;
  border-bottom: 1px solid var(--divider);
  margin-bottom: 2px;
}

.toc-drop {
  display: none;
}

@media (max-width: 960px) {
  .toc-side {
    display: none;
  }

  .toc-drop {
    display: block;
    border-radius: 20px;
  }

  .toc-summary {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    padding: 8px 16px;
    list-style: none;
    cursor: pointer;
  }

  .toc-summary::-webkit-details-marker {
    display: none;
  }

  .toc-now {
    overflow: hidden;
    font-size: var(--fs-small);
    font-weight: var(--fw-semibold);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .toc-chev {
    color: var(--ink-faint);
    transition: transform 0.2s;
  }

  .toc-drop[open] .toc-chev {
    transform: rotate(180deg);
  }

  .toc-drop .toc-list {
    padding: 0 8px 10px;
    border-top: 1px solid var(--divider);
    padding-top: 8px;
  }
}
</style>

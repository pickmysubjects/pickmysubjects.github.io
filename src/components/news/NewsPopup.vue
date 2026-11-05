<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { NEWS } from '@/content/news'
import HelixSmile from '@/components/home/HelixSmile.vue'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'

/**
 * The latest news from the person who makes the site, popping up once at the top right (full width
 * on phones) a moment after a browsing page opens. Closing it or opening it remembers that note, so
 * it comes back only when there is a new one. Never on pages where the student is busy working
 * (planner, record, tools, forms) or on the news page itself; no overlay, the page stays usable.
 */
const props = defineProps<{ view: string }>()
const { t, locale } = useI18n()
const KEY = 'sc:news-seen'
const QUIET = new Set(['plan', 'record', 'tools', 'contribute', 'feedback', 'news', 'privacy'])
const latest = NEWS[0]
const stamp = latest ? `${latest.date}:${latest.title.en}` : ''

const seen = shallowRef(true)
const ready = shallowRef(false)
let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  try {
    seen.value = localStorage.getItem(KEY) === stamp
  } catch {
    seen.value = false
  }
  timer = setTimeout(() => (ready.value = true), 1200)
})
onBeforeUnmount(() => clearTimeout(timer))

const show = computed(() => !!latest && ready.value && !seen.value && !QUIET.has(props.view))
const lede = computed(() => latest?.body[locale.value]?.[0] ?? '')

function remember(): void {
  seen.value = true
  try {
    localStorage.setItem(KEY, stamp)
  } catch {
    // Storage blocked: closed for this visit only.
  }
}
</script>

<template>
  <Transition name="pop">
    <aside v-if="show && latest" class="news-pop" role="status" aria-labelledby="news-pop-title">
      <div class="pop-top">
        <HelixSmile :size="34" />
        <div class="pop-label">
          <span class="pop-badge">{{ t('news.badge') }}</span>
          <span class="pop-from">{{ t('news.title') }}</span>
        </div>
        <button class="pop-x" type="button" :aria-label="t('news.close')" @click="remember">×</button>
      </div>
      <h2 id="news-pop-title" class="pop-title">{{ latest.title[locale] }}</h2>
      <p class="pop-lede">{{ lede }}</p>
      <div class="pop-actions">
        <a class="pop-read" :href="link('news')" @click="remember">{{ t('news.more') }}</a>
        <button class="pop-close" type="button" @click="remember">{{ t('news.close') }}</button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.news-pop {
  position: fixed;
  top: 84px;
  right: 24px;
  z-index: 60;
  display: grid;
  gap: 10px;
  width: min(380px, calc(100vw - 32px));
  padding: 18px 18px 16px;
  color: var(--ink);
  background: var(--surface);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  border: 1.5px solid color-mix(in srgb, var(--accent) 45%, transparent);
  border-radius: 22px;
  box-shadow:
    0 18px 50px -12px color-mix(in srgb, var(--accent) 45%, transparent),
    0 4px 14px rgb(0 0 0 / 10%);
}

/* A strip of the accent along the top edge, so it reads as news at a glance. */
.news-pop::before {
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  content: '';
  background: linear-gradient(90deg, var(--accent), #8b5cf6);
  border-radius: 22px 22px 0 0;
}

.pop-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pop-label {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.pop-badge {
  justify-self: start;
  padding: 1px 9px;
  color: #fff;
  font-size: 0.75rem;
  font-weight: var(--fw-bold);
  background: var(--accent);
  border-radius: 999px;
}

.pop-from {
  color: var(--ink-soft);
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
}

.pop-x {
  width: 32px;
  height: 32px;
  color: var(--ink-soft);
  font-size: 1.4rem;
  line-height: 1;
  background: none;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.pop-x:hover {
  color: var(--ink);
}

.pop-title {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: var(--fw-bold);
  line-height: 1.4;
  text-wrap: balance;
}

.pop-lede {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--ink-soft);
  font-size: var(--fs-small);
  line-height: 1.6;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.pop-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.pop-read,
.pop-close {
  flex: 1;
  padding: 9px 14px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  text-align: center;
  text-decoration: none;
  border-radius: 999px;
  cursor: pointer;
}

.pop-read {
  color: #fff;
  background: var(--accent);
  border: 0;
}

.pop-read:hover {
  background: color-mix(in srgb, var(--accent) 85%, #000);
}

.pop-close {
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--line);
}

.pop-close:hover {
  color: var(--accent);
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateX(24px) scale(0.96);
}

/* Phones: across the top, under the header. */
@media (max-width: 640px) {
  .news-pop {
    top: 68px;
    right: 16px;
    left: 16px;
    width: auto;
  }

  .pop-enter-from,
  .pop-leave-to {
    transform: translateY(-16px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pop-enter-active,
  .pop-leave-active {
    transition: opacity 0.2s;
  }

  .pop-enter-from,
  .pop-leave-to {
    transform: none;
  }
}
</style>

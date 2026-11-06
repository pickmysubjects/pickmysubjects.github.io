<script setup lang="ts">
import { X } from 'lucide-vue-next'
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
    <aside v-if="show && latest" class="news-pop rim" role="status" aria-labelledby="news-pop-title">
      <div class="pop-top">
        <HelixSmile :size="34" />
        <div class="pop-label">
          <span class="pop-badge">{{ t('news.badge') }}</span>
          <span class="pop-from">{{ t('news.title') }}</span>
        </div>
        <button class="pop-x" type="button" :aria-label="t('news.close')" @click="remember"><X :size="16" aria-hidden="true" /></button>
      </div>
      <h2 id="news-pop-title" class="pop-title">{{ latest.title[locale] }}</h2>
      <p class="pop-lede">{{ lede }}</p>
      <div class="pop-actions">
        <a class="button button-accent pop-btn" :href="link('news')" @click="remember">{{ t('news.more') }}</a>
        <button class="button button-quiet pop-btn" type="button" @click="remember">{{ t('news.close') }}</button>
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
  /* The same floating glass as the header menus: mostly opaque so the text reads, the site's rim. */
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent-fill) 6%, var(--surface)), var(--surface) 70%);
  -webkit-backdrop-filter: var(--float-blur);
  backdrop-filter: var(--float-blur);
  border: 1px solid var(--card-edge);
  border-radius: 24px;
  box-shadow: var(--float-rim), 0 18px 48px -12px rgb(0 0 0 / 28%), 0 4px 12px -4px rgb(0 0 0 / 12%);
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
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.pop-x:hover {
  color: var(--ink);
}

.pop-x:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
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

.pop-btn {
  flex: 1;
  min-height: 40px;
  padding: 0 14px;
  font-size: var(--fs-small);
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

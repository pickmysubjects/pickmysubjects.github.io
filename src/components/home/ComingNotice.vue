<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { X } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { link } from '@/composables/useView'
import { en } from '@/i18n/messages/en'
import { IS_BETA } from '@/release'

/**
 * A glass strip at the top of the home page (and, slim, on top of every other page) for what's coming next (home.notice.*),
 * linking to the latest news on the home page (#news). Closing it
 * remembers the English text it hid, so a new notice comes back on its own.
 */
defineProps<{ slim?: boolean }>()
const { t } = useI18n()
const KEY = 'sc:notice-hidden'
// The English line identifies the notice whatever language the student reads it in.
// Quotes and backslashes dropped so public/boot.js can match it in a CSS selector.
const stamp = en.home.notice.title.replace(/["\\\n]/g, '')
const hidden = shallowRef(false)
onMounted(() => {
  try {
    hidden.value = localStorage.getItem(KEY) === stamp
  } catch {
    // Storage blocked: just show it.
  }
})
// On the home page the news is further down: scroll to it (the app handles links, not the browser).
function toNews(): void {
  document.getElementById('news')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function hide(): void {
  hidden.value = true
  try {
    localStorage.setItem(KEY, stamp)
  } catch {
    // Closed for this visit only.
  }
}
</script>

<template>
  <div v-if="IS_BETA && !hidden" class="notice-wrap" :class="{ slim }" :data-notice="stamp">
    <div class="notice" role="status">
      <span class="notice-dot" aria-hidden="true" />
      <span class="notice-text">
        <strong>{{ t('home.notice.title') }}</strong>
        <span class="notice-sub">{{ t('home.notice.sub') }}</span>
      </span>
      <a v-if="slim" class="notice-more" :href="link('') + '#news'">{{ t('home.notice.read') }}</a>
      <button v-else class="notice-more" type="button" @click="toNews">{{ t('home.notice.read') }}</button>
      <button class="notice-close" type="button" :aria-label="t('home.notice.close')" @click="hide">
        <X :size="16" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.notice-wrap {
  display: grid;
  gap: 8px;
}

.notice-more {
  flex: none;
  margin-left: auto;
  padding: 4px 10px;
  color: var(--accent);
  font: inherit;
  font-weight: 600;
  white-space: nowrap;
  text-decoration: none;
  background: none;
  border: 0;
  cursor: pointer;
}

.notice-more:hover {
  color: var(--ink);
}

.notice-more + .notice-close {
  margin-left: 0;
}


/* One line on other pages: the sub-line is cut first. */
.slim .notice {
  margin-bottom: 12px;
  padding-block: 4px;
}

.slim .notice-text {
  flex-wrap: nowrap;
  overflow: hidden;
  white-space: nowrap;
}

.slim .notice-text strong {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slim .notice-sub {
  flex: 0 1000 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slim .notice-sub::before {
  content: '· ';
}

/* A 44px tap target on touch without making the button look bigger. */
@media (pointer: coarse) {
  .notice-close {
    position: relative;
  }

  .notice-close::after {
    content: '';
    position: absolute;
    inset: -6px;
  }
}

.notice {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  padding: 8px 6px 8px 14px;
  color: var(--ink);
  font-size: var(--fs-small);
  line-height: 1.35;
  background: var(--glass-shine), var(--glass-fill);
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius-sm);
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.notice-dot {
  flex: none;
  width: 8px;
  height: 8px;
  background: var(--accent);
  border-radius: 50%;
}

.notice-text {
  display: flex;
  flex-wrap: wrap;
  column-gap: 8px;
  min-width: 0;
}

.notice-text strong {
  font-weight: 600;
}

.notice-sub {
  color: var(--ink-soft);
}

.notice-close {
  flex: none;
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  margin-left: auto;
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.notice-close:hover {
  color: var(--ink);
}

.notice-close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
</style>

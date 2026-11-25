<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue'
import { Share, X } from 'lucide-vue-next'
import Interp from '@/components/Interp.vue'
import { useI18n } from '@/i18n'
import { trackEvent } from '@/utils/analytics'
import { installFloating, installHidden, installMoment, installOffered, newsWaiting, useInstall } from '@/utils/install'

/**
 * The one install nudge, in three places:
 * - 'float': after a useful moment (a plan made, a tool's answer), once, as a small card in the
 *   bottom-right corner on a computer or just above the bottom tabs on a phone. Never a modal.
 * - 'card': on the home page, for a returning visitor on a phone.
 * - 'steps': the About page's "Get the app" section, always there: the steps for every browser
 *   (also in the prerendered page), with this browser's install button, or "already installed",
 *   above them once it loads.
 * It never shows while the home news pop-up is up or about to be.
 * It shows only where installing works (Chrome/Edge's prompt, Safari on iPhone or a Mac, a phone
 * browser's menu) and never once installed. Closing it hides the float and the card for good.
 */
const props = defineProps<{ variant: 'float' | 'card' | 'steps'; returning?: boolean }>()
const { t } = useI18n()
const { way, prompt } = useInstall()
const hidden = installHidden()
const offered = installOffered()
const moment = installMoment()
const news = newsWaiting()

// Worked out in the browser only: the prerendered page never has a platform.
const mounted = shallowRef(false)
const phone = shallowRef(false)
onMounted(() => {
  mounted.value = true
  phone.value = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
})

const current = computed(() => (mounted.value ? way() : 'none'))
const usable = computed(() => ['prompt', 'ios', 'mac', 'menu'].includes(current.value))
// The float stays up for the visit it first appeared in, until closed. Shared, so the home card
// never shows beside it.
const floating = installFloating()
const shown = computed(() => {
  if (props.variant === 'steps') return true
  // Never alongside the news pop-up: wait until it's closed.
  if (!mounted.value || hidden.value || !usable.value || news.value) return false
  if (props.variant === 'card') return !!props.returning && phone.value && !floating.value
  return floating.value
})
watch(
  () => props.variant === 'float' && moment.value && mounted.value && !hidden.value && !offered.value && usable.value && !news.value,
  (go) => {
    if (!go) return
    offered.value = true
    floating.value = true
    trackEvent('install-shown')
  },
  { immediate: true },
)
watch(
  () => props.variant === 'card' && shown.value,
  (on) => on && trackEvent('install-shown'),
)

const addLabel = computed(() => t.value(phone.value ? 'home.install.add' : 'home.install.addDesk'))
const title = computed(() => t.value(phone.value || current.value === 'ios' || current.value === 'menu' ? 'home.install.title' : 'home.install.titleDesk'))

function hide(): void {
  hidden.value = true
  floating.value = false
}

async function add(): Promise<void> {
  if (await prompt()) {
    trackEvent('install-accept')
    floating.value = false
  }
}
</script>

<template>
  <section v-if="variant === 'steps'" class="steps">
    <p v-if="current === 'done'" class="steps-done" role="status">{{ t('home.install.done') }}</p>
    <p v-else-if="current === 'prompt'" class="steps-now">
      <button class="button button-accent install-add" type="button" @click="add">{{ addLabel }}</button>
    </p>
    <ul class="plain">
      <li>{{ t('home.install.stepChrome') }}</li>
      <li>{{ t('home.install.stepMac') }}</li>
      <li>
        <Interp :text="t('home.install.stepIos')">
          <template #share><Share :size="16" class="share" :aria-label="t('home.install.share')" /></template>
        </Interp>
      </li>
      <li>{{ t('home.install.stepAndroid') }}</li>
      <li>{{ t('home.install.stepOther') }}</li>
    </ul>
  </section>

  <Transition v-else name="install-in">
    <section v-if="shown" class="install" :class="variant" role="region" :aria-label="title">
      <div class="install-text">
        <p class="install-title">{{ title }}</p>
        <p class="install-pitch">{{ t('home.install.pitch') }}</p>
        <p v-if="current === 'ios'" class="install-how">
          <Interp :text="t('home.install.ios')">
            <template #share><Share :size="16" class="share" :aria-label="t('home.install.share')" /></template>
          </Interp>
        </p>
        <p v-else-if="current !== 'prompt'" class="install-how">{{ t(`home.install.${current}`) }}</p>
      </div>
      <div class="install-actions">
        <button v-if="current === 'prompt'" class="button button-accent install-add" type="button" @click="add">{{ addLabel }}</button>
        <button class="button button-quiet install-close" type="button" @click="hide">{{ t('home.install.close') }}</button>
      </div>
      <button v-if="variant === 'float'" class="install-x" type="button" :aria-label="t('home.install.close')" @click="hide">
        <X :size="18" aria-hidden="true" />
      </button>
    </section>
  </Transition>
</template>

<style scoped>
.install {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  padding: 14px 16px;
  background: var(--glass-shine), var(--glass-fill);
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius-sm);
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

/* The float: a calm corner card, the same glass as the news pop-up. */
.install.float {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 55;
  width: min(380px, calc(100vw - 32px));
  padding: 18px 18px 16px;
  color: var(--ink);
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent-fill) 6%, var(--surface)), var(--surface) 70%);
  border: 1px solid var(--card-edge);
  border-radius: 24px;
  box-shadow: var(--float-rim), 0 18px 48px -12px rgb(0 0 0 / 28%), 0 4px 12px -4px rgb(0 0 0 / 12%);
  -webkit-backdrop-filter: var(--float-blur);
  backdrop-filter: var(--float-blur);
}

.install.float .install-text {
  padding-right: 32px;
}

.install-text {
  flex: 1 1 16em;
  min-width: 0;
}

.install-title {
  margin: 0;
  font-weight: 650;
}

.install-pitch,
.install-how {
  margin: 4px 0 0;
  color: var(--ink-soft);
  font-size: var(--fs-small);
  line-height: 1.45;
}

.install-how {
  color: var(--ink);
}

.share {
  vertical-align: -3px;
  margin: 0 2px;
}

.install-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.install-add,
.install-close {
  min-height: 44px;
  padding: 0 16px;
}

.install-x {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.install-x:hover {
  color: var(--ink);
}

.steps-now {
  margin: 0 0 12px;
}

.steps-done {
  margin: 0 0 12px;
  font-weight: 600;
}

.install-in-enter-active,
.install-in-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.install-in-enter-from,
.install-in-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (prefers-reduced-motion: reduce) {
  .install-in-enter-active,
  .install-in-leave-active {
    transition: none;
  }
}

/* On a phone: a sheet just above the floating bottom tabs. */
@media (max-width: 720px) {
  /* Under the top bar: the bottom of a phone screen holds the tabs and each page's own dock
     (the calculator's answer, the planner's add button), which the offer must not cover. */
  .install.float {
    right: 12px;
    left: 12px;
    top: calc(64px + env(safe-area-inset-top));
    bottom: auto;
    width: auto;
  }
}
</style>

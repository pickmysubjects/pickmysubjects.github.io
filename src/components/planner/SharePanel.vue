<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import InfoTip from '@/components/InfoTip.vue'
import { planName } from '@/components/plans/planName'
import { usePlan } from '@/composables/usePlan'
import { usePlans } from '@/composables/usePlans'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { trackEvent } from '@/utils/analytics'
import { useAnchoredOverlay } from '@/utils/anchoredOverlay'
import { encodePlan } from '@/utils/sharePlan'

/**
 * "Share" and its panel: the plan's link to copy, the phone's own share sheet where there is one,
 * and a line on what the link holds (the plan, never My record). An overlay, so nothing moves.
 */
const { t } = useI18n()
const plan = usePlan()
const plans = usePlans()

const open = shallowRef(false)
const state = shallowRef<'idle' | 'copied' | 'failed'>('idle')
const button = useTemplateRef<HTMLButtonElement>('button')
const panel = useTemplateRef<HTMLElement>('panel')
const field = useTemplateRef<HTMLInputElement>('field')
const copyButton = useTemplateRef<HTMLButtonElement>('copyButton')
const { pos } = useAnchoredOverlay({ open, anchor: () => button.value, panel: () => panel.value, close: () => (open.value = false), align: 'start' })

const name = computed(() => plans.active.value.name)
const url = computed(() =>
  open.value ? new URL(link(`plan?share=${encodePlan(plan.setup.value, plan.terms.value, name.value)}`), location.href).href : '',
)
const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

async function toggle(): Promise<void> {
  open.value = !open.value
  state.value = 'idle'
  if (!open.value) return
  trackEvent('plan-share')
  // Focus the copy button, not the link: selecting text on a phone pops up its own menu.
  await nextTick()
  copyButton.value?.focus({ preventScroll: true })
}

/** The clipboard, or the old select-and-copy where it's blocked; says so when neither works. */
async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(url.value)
    state.value = 'copied'
    return
  } catch {
    // Blocked or missing: try the selected text instead.
  }
  field.value?.focus({ preventScroll: true })
  field.value?.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  state.value = ok ? 'copied' : 'failed'
}

async function native(): Promise<void> {
  try {
    await navigator.share({ title: planName(t.value, plans.active.value), url: url.value })
  } catch {
    // Cancelled, or not allowed here: the link is still in the panel to copy.
  }
}

function close(): void {
  open.value = false
  button.value?.focus()
}
</script>

<template>
  <button ref="button" class="button button-quiet pact-btn" type="button" aria-haspopup="dialog" :aria-expanded="open" @click="toggle">
    {{ t('plan.share') }}
  </button>
  <Teleport v-if="open" to="body">
    <div ref="panel" class="share-panel" role="dialog" :aria-label="t('plan.shareSheet.title')" :style="pos">
      <p class="share-head">{{ t('plan.shareSheet.title') }}</p>
      <p class="share-note">
        {{ t('plan.shareSheet.includes') }}<InfoTip :text="t('plan.shareSheet.includesInfo')" />
      </p>
      <input ref="field" class="input share-link" type="text" readonly :value="url" :aria-label="t('plan.shareSheet.linkLabel')" @focus="field?.select()" />
      <p v-if="state === 'failed'" class="share-failed" role="alert">{{ t('plan.shareSheet.copyFailed') }}</p>
      <div class="share-acts">
        <button ref="copyButton" class="button button-accent share-btn" type="button" @click="copy">
          <!-- Only the shown label is in the button's name, so it never has none. -->
          <span class="swap-label"><span :class="{ 'swap-off': state === 'copied' }" :aria-hidden="state === 'copied'">{{ t('plan.shareSheet.copy') }}</span><span :class="{ 'swap-off': state !== 'copied' }" :aria-hidden="state !== 'copied'">{{ t('plan.shareSheet.copied') }}</span></span>
        </button>
        <button v-if="canNative" class="button button-quiet share-btn" type="button" @click="native">{{ t('plan.shareSheet.native') }}</button>
        <button class="button button-quiet share-btn" type="button" @click="close">{{ t('plan.shareSheet.close') }}</button>
      </div>
      <span class="visually-hidden" role="status">{{ state === 'copied' ? t('plan.shareSheet.copied') : '' }}</span>
    </div>
  </Teleport>
</template>

<style scoped>
/* Glass like the other plan overlays; a sheet at the bottom on phones. */
.share-panel {
  position: fixed;
  z-index: 1000;
  display: grid;
  gap: 10px;
  width: min(380px, calc(100vw - 24px));
  padding: 14px 16px;
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius);
  background: var(--glass-shine), color-mix(in srgb, var(--sheet-fill) 20%, var(--bg));
  -webkit-backdrop-filter: var(--glass-blur-strong);
  backdrop-filter: var(--glass-blur-strong);
  box-shadow: var(--glass-shadow), var(--shadow-2);
  color: var(--ink);
  font-size: 0.875rem;
}

.share-head {
  margin: 0;
  font-weight: 700;
}

.share-note {
  display: flex;
  align-items: center;
  gap: 2px;
  margin: 0;
  color: var(--ink-soft);
}

.share-link {
  width: 100%;
  min-width: 0;
  font-size: 0.8125rem;
}

.share-failed {
  margin: 0;
  color: var(--bad);
}

.share-acts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.share-btn {
  min-height: 38px;
  padding: 0 14px;
  font-size: 0.875rem;
}

/* Two labels in one cell, one shown: the button never resizes when it says "Copied". */
.swap-label {
  display: inline-grid;
  justify-items: center;
}

.swap-label > span {
  grid-area: 1 / 1;
}

.swap-label > .swap-off {
  visibility: hidden;
}

@media (max-width: 640px) {
  .share-panel {
    inset: auto 12px calc(12px + env(safe-area-inset-bottom)) 12px;
    width: auto;
  }

  /* 16px, so iOS doesn't zoom the page when the link is selected. */
  .share-link {
    font-size: 1rem;
  }

  .share-btn {
    flex: 1;
    min-height: 44px;
  }
}
</style>

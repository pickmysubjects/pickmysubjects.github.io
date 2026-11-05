<script setup lang="ts">
import { shallowRef } from 'vue'
import { RATINGS_FORM } from '@/config'
import { useI18n } from '@/i18n'
import { useProfile } from '@/composables/useProfile'
import { useRated } from '@/composables/useRated'
import { isFormReady, submitGoogleForm } from '@/utils/googleForm'

/**
 * "How hard was it?" in one tap: five buttons, and the tap is the rating (sent anonymously with
 * the subject code, as the full form sends it). Most students never open a form; this asks the
 * one question that matters most. Afterwards it offers the rest of the form, which then leaves
 * the difficulty out so the same person isn't counted twice.
 */
const props = defineProps<{ code: string }>()
const emit = defineEmits<{ more: [difficulty: number] }>()
const { t, locale } = useI18n()
const { setOwnRating } = useProfile()
const { markRated } = useRated()

const ready = isFormReady(RATINGS_FORM)
const status = shallowRef<'idle' | 'sending' | 'sent' | 'failed'>('idle')
const picked = shallowRef<number | null>(null)

async function rate(n: number): Promise<void> {
  if (status.value === 'sending') return
  picked.value = n
  status.value = 'sending'
  try {
    await submitGoogleForm(RATINGS_FORM, { code: props.code, difficulty: String(n), language: locale.value })
    setOwnRating(props.code, { difficulty: n })
    markRated(props.code)
    status.value = 'sent'
  } catch {
    status.value = 'failed'
  }
}
</script>

<template>
  <div v-if="ready" class="quick" role="group" :aria-label="t('rating.quickTitle', { code })">
    <template v-if="status !== 'sent'">
      <p class="quick-q">{{ t('rating.quickTitle', { code }) }}</p>
      <div class="quick-scale">
        <span class="quick-end">{{ t('rating.diffLow') }}</span>
        <button
          v-for="n in 5"
          :key="n"
          class="quick-btn"
          :class="{ 'quick-on': picked === n }"
          type="button"
          :disabled="status === 'sending'"
          :aria-label="`${n} / 5`"
          @click="rate(n)"
        >
          {{ n }}
        </button>
        <span class="quick-end">{{ t('rating.diffHigh') }}</span>
      </div>
      <p v-if="status === 'failed'" class="quick-note quick-bad" role="alert">{{ t('rating.failed') }}</p>
      <p v-else class="quick-note">{{ t('rating.quickNote') }}</p>
    </template>
    <p v-else class="quick-done" role="status">
      <span>{{ t('rating.quickThanks') }}</span>
      <button class="quick-more" type="button" @click="emit('more', picked!)">{{ t('rating.quickMore') }}</button>
    </p>
  </div>
</template>

<style scoped>
.quick {
  display: grid;
  gap: 8px;
}

.quick-q {
  margin: 0;
  font-weight: var(--fw-semibold);
}

.quick-scale {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.quick-end {
  color: var(--ink-soft);
  font-size: var(--fs-small);
}

.quick-btn {
  min-width: 44px;
  min-height: 44px;
  color: var(--ink);
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
}

.quick-btn:hover {
  color: var(--accent);
}

.quick-on {
  color: #fff;
  background: var(--accent);
  border-color: var(--accent);
}

/* Phones: the scale and both ends stay on one line. */
@media (max-width: 420px) {
  .quick-scale {
    gap: 4px;
  }

  .quick-btn {
    min-width: 40px;
    min-height: 40px;
  }
}

.quick-note {
  margin: 0;
  color: var(--ink-soft);
  font-size: var(--fs-small);
}

.quick-bad {
  color: var(--bad);
}

.quick-done {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin: 0;
  color: var(--good);
}

.quick-more {
  padding: 0;
  color: var(--accent);
  font: inherit;
  font-weight: var(--fw-semibold);
  background: none;
  border: 0;
  cursor: pointer;
}

.quick-more:hover {
  color: var(--ink);
}
</style>

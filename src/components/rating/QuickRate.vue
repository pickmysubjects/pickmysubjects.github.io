<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { RATINGS_FORM } from '@/config'
import { MAX_COMMENT_LENGTH } from '@/engine/comments'
import { useI18n } from '@/i18n'
import { useProfile } from '@/composables/useProfile'
import { useRated } from '@/composables/useRated'
import { useMyRatings, type QuickStart } from '@/composables/useMyRatings'
import { isFormReady, submitGoogleForm } from '@/utils/googleForm'
import { trackEvent } from '@/utils/analytics'

/**
 * "How hard was it?" in one tap, then, in the same card, one optional tip and a way into the full
 * form. The tap isn't sent at once: for a few seconds it can be undone or changed, and it goes
 * when that time is up, when the student moves on to the tip or the full form, or as they leave
 * the page. Afterwards it can still be changed when the form has an edit id (useMyRatings).
 * Everything is anonymous; nothing is required beyond the tap.
 */
const props = defineProps<{ code: string; count?: number; first?: boolean }>()
const emit = defineEmits<{ more: [start: QuickStart] }>()
const { t, locale } = useI18n()
const { setOwnRating } = useProfile()
const { markRated } = useRated()
const mine = useMyRatings()

const ready = isFormReady(RATINGS_FORM)
/** Seconds a tap waits before it's sent, so a slip can be undone. */
const UNDO_SECONDS = 6
const picked = shallowRef<number | null>(null)
const sentDifficulty = shallowRef<number | null>(null)
const status = shallowRef<'idle' | 'sending' | 'failed'>('idle')
const left = shallowRef(0)
let timer: ReturnType<typeof setInterval> | undefined
const wish = shallowRef('')
const tipSent = shallowRef(false)
const id = mine.idFor(props.code)

const pending = computed(() => picked.value !== null && picked.value !== sentDifficulty.value)
// After it's sent, another tap changes it only if the form can take an edit.
const locked = computed(() => sentDifficulty.value !== null && !mine.editable)

function stopTimer(): void {
  if (timer) clearInterval(timer)
  timer = undefined
}

function pick(n: number): void {
  if (locked.value || status.value === 'sending') return
  picked.value = n
  if (n === sentDifficulty.value) return stopTimer()
  left.value = UNDO_SECONDS
  stopTimer()
  timer = setInterval(() => {
    left.value -= 1
    if (left.value <= 0) void send()
  }, 1000)
}

function undo(): void {
  stopTimer()
  picked.value = sentDifficulty.value
}

const answers = (n: number, tip: string): Record<string, string> => ({
  code: props.code,
  difficulty: String(n),
  ...(tip ? { wish: tip } : {}),
  language: locale.value,
  ...(mine.editable ? { editId: id } : {}),
})

async function post(values: Record<string, string | string[]>): Promise<void> {
  status.value = 'sending'
  try {
    await submitGoogleForm(RATINGS_FORM, values)
    status.value = 'idle'
  } catch (e) {
    status.value = 'failed'
    throw e
  }
}

/** Sends the picked difficulty (on its own, or with the tip). */
async function send(tip = ''): Promise<void> {
  stopTimer()
  const n = picked.value
  if (n === null) return
  // With an edit id, everything sent before for this subject goes again (the newest row replaces
  // the rest). Without one, a tip after the tap goes as a tip only: the tap was already counted.
  const prev = mine.editable ? (mine.get(props.code)?.answers ?? {}) : {}
  const full = { ...prev, ...answers(n, tip || (typeof prev.wish === 'string' ? prev.wish : '')) }
  const values = sentDifficulty.value !== null && !mine.editable ? { code: props.code, wish: tip, language: locale.value } : full
  try {
    await post(values)
  } catch {
    return
  }
  sentDifficulty.value = n
  setOwnRating(props.code, { difficulty: n })
  markRated(props.code)
  if (mine.editable) mine.save(props.code, id, full)
  if (tip) {
    tipSent.value = true
    trackEvent('rating-tip')
  } else trackEvent('rating-quick')
}

async function sendTip(): Promise<void> {
  const tip = wish.value.trim()
  if (!tip) return
  await send(tip)
}

// Handed to the full form: it sends the difficulty, so nothing still waiting here goes on its own.
let handedOver = false
function more(): void {
  stopTimer()
  handedOver = true
  emit('more', { difficulty: picked.value!, sent: sentDifficulty.value !== null && picked.value === sentDifficulty.value, wish: tipSent.value ? '' : wish.value.trim() })
}

// Starters for the tip: each adds a short lead-in the student finishes in their own words.
const STARTERS = ['exam', 'work', 'study', 'watch'] as const
function starter(k: (typeof STARTERS)[number]): void {
  const lead = t.value(`rating.tipLead.${k}`)
  wish.value = wish.value.trim() ? `${wish.value.trimEnd()} ${lead} ` : `${lead} `
}

// A tap still waiting goes as the page closes; the request is sent with keepalive.
function flush(): void {
  if (pending.value && !handedOver && status.value !== 'sending') void send()
}
onMounted(() => window.addEventListener('pagehide', flush))
onBeforeUnmount(() => {
  window.removeEventListener('pagehide', flush)
  flush()
})
</script>

<template>
  <div v-if="ready" class="quick" role="group" :aria-label="t('rating.quickTitle', { code })">
    <div class="quick-head">
      <p class="quick-q">{{ t('rating.quickTitle', { code }) }}</p>
      <p v-if="picked === null" class="quick-proof">
        {{ count && count >= 3 ? t('rating.quickCount', { n: count }) : first ? t('rating.quickFirst') : '' }}
      </p>
    </div>

    <div class="quick-scale">
      <span class="quick-end">{{ t('rating.diffLow') }}</span>
      <button
        v-for="n in 5"
        :key="n"
        class="quick-btn"
        :class="{ 'quick-on': picked === n }"
        type="button"
        :disabled="locked || status === 'sending'"
        :aria-pressed="picked === n"
        :aria-label="`${n} / 5`"
        @click="pick(n)"
      >
        {{ n }}
      </button>
      <span class="quick-end">{{ t('rating.diffHigh') }}</span>
    </div>

    <p v-if="status === 'failed'" class="quick-note quick-bad" role="alert">{{ t('rating.failed') }}</p>
    <p v-else-if="picked === null" class="quick-note">{{ mine.editable ? t('rating.quickNoteEdit') : t('rating.quickNote') }}</p>
    <p v-else-if="pending" class="quick-note quick-wait" role="status">
      <span>{{ t('rating.quickPending', { n: picked, s: left }) }}</span>
      <button class="quick-link" type="button" @click="undo">{{ t('rating.quickUndo') }}</button>
    </p>
    <p v-else class="quick-note quick-done" role="status">
      {{ t('rating.quickGot', { n: picked }) }}<template v-if="mine.editable"> {{ t('rating.quickChange') }}</template>
    </p>

    <!-- After the tap: one optional tip, right here, and the way into the full form. -->
    <div v-if="picked !== null" class="quick-tip">
      <p v-if="tipSent" class="quick-done" role="status">{{ t('rating.tipSent') }}</p>
      <template v-else>
        <label class="quick-tip-label" :for="`tip-${code}`">{{ t('rating.tipAsk') }}</label>
        <div class="quick-starters">
          <button v-for="k in STARTERS" :key="k" class="chip" type="button" @click="starter(k)">{{ t(`rating.tipLead.${k}`) }}</button>
        </div>
        <textarea :id="`tip-${code}`" v-model="wish" class="textarea" rows="3" :maxlength="MAX_COMMENT_LENGTH" :placeholder="t('rating.tipPlaceholder')" />
        <div class="quick-tip-foot">
          <span class="quick-note">{{ t('rating.tipNote') }}</span>
          <span class="quick-count">{{ wish.length }} / {{ MAX_COMMENT_LENGTH }}</span>
        </div>
        <div class="quick-actions">
          <button class="button" type="button" :disabled="!wish.trim() || status === 'sending'" @click="sendTip">{{ t('rating.tipSend') }}</button>
          <button class="button button-quiet" type="button" @click="more">{{ t('rating.quickMore') }}</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.quick {
  display: grid;
  gap: 10px;
}

.quick-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 2px 12px;
}

.quick-q {
  margin: 0;
  font-weight: var(--fw-semibold);
}

.quick-proof {
  margin: 0;
  color: var(--ink-soft);
  font-size: var(--fs-small);
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

.quick-btn:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}

.quick-btn:disabled {
  cursor: default;
}

.quick-on,
.quick-on:hover:not(:disabled) {
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

.quick-wait {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  color: var(--ink);
}

.quick-bad {
  color: var(--bad);
}

.quick-done {
  margin: 0;
  color: var(--good);
}

.quick-link {
  padding: 0;
  color: var(--accent);
  font: inherit;
  font-weight: var(--fw-semibold);
  background: none;
  border: 0;
  cursor: pointer;
}

.quick-link:hover {
  color: var(--ink);
}

.quick-tip {
  display: grid;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.quick-tip-label {
  font-weight: var(--fw-semibold);
}

.quick-starters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  padding: 4px 11px;
  color: var(--ink);
  font: inherit;
  font-size: var(--fs-small);
  background: var(--surface);
  border: 1px dashed var(--line);
  border-radius: 999px;
  cursor: pointer;
}

.chip:hover {
  border-style: solid;
  border-color: var(--accent);
}

.textarea {
  resize: vertical;
}

.quick-tip-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.quick-count {
  flex: none;
  color: var(--ink-soft);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

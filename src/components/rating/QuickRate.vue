<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { RATINGS_FORM } from '@/config'
import { useI18n } from '@/i18n'
import { useProfile } from '@/composables/useProfile'
import { useRated } from '@/composables/useRated'
import { useMyRatings, type QuickStart } from '@/composables/useMyRatings'
import { isFormReady, submitGoogleForm } from '@/utils/googleForm'
import { trackEvent } from '@/utils/analytics'
import { tipText } from '@/engine/comments'
import RatingScale from './RatingScale.vue'
import TipBox from './TipBox.vue'

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

// The tip with any lead-in tapped but left empty taken out ("To do well:" alone is no tip).
const tipLeads = computed(() => (['exam', 'work', 'study', 'watch'] as const).map((k) => t.value(`rating.tipLead.${k}`)))
const tip = computed(() => tipText(wish.value, tipLeads.value))

async function sendTip(): Promise<void> {
  if (!tip.value) return
  await send(tip.value)
}

// Handed to the full form: it sends the difficulty, so nothing still waiting here goes on its own.
let handedOver = false
function more(): void {
  stopTimer()
  handedOver = true
  emit('more', { difficulty: picked.value!, sent: sentDifficulty.value !== null && picked.value === sentDifficulty.value, wish: tipSent.value ? '' : wish.value.trim() })
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
  <div v-if="ready" class="rating-card quick" role="group" :aria-label="t('rating.quickTitle', { code })">
    <div class="quick-head">
      <p class="rating-q">{{ t('rating.quickTitle', { code }) }}</p>
      <p v-if="picked === null && ((count ?? 0) >= 3 || first)" class="rating-note">
        {{ (count ?? 0) >= 3 ? t('rating.quickCount', { n: count ?? 0 }) : t('rating.quickFirst') }}
      </p>
    </div>

    <RatingScale :value="picked" low="rating.diffLow" high="rating.diffHigh" :disabled="locked || status === 'sending'" @pick="pick" />

    <p v-if="status === 'failed'" class="rating-bad" role="alert">{{ t('rating.failed') }}</p>
    <p v-else-if="picked === null" class="rating-note">{{ mine.editable ? t('rating.quickNoteEdit') : t('rating.quickNote') }}</p>
    <p v-else-if="pending" class="rating-note quick-wait" role="status">
      <span>{{ t('rating.quickPending', { n: picked, s: left }) }}</span>
      <button class="rating-link" type="button" @click="undo">{{ t('rating.quickUndo') }}</button>
    </p>
    <p v-else class="rating-done" role="status">
      {{ t('rating.quickGot', { n: picked }) }}<template v-if="mine.editable"> {{ t('rating.quickChange') }}</template>
    </p>

    <!-- After the tap: one optional tip, right here, and the way on to the rest of the questions. -->
    <div v-if="picked !== null" class="rating-split quick-tip">
      <p v-if="tipSent" class="rating-done" role="status">{{ t('rating.tipSent') }}</p>
      <template v-else>
        <TipBox v-model="wish" :code="code" />
        <div class="rating-actions">
          <button class="button" type="button" :disabled="!tip || status === 'sending'" @click="sendTip">{{ t('rating.tipSend') }}</button>
          <button class="button button-quiet" type="button" @click="more">{{ t('rating.quickMore') }}</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped src="./rating.css"></style>
<style scoped>
.quick-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 2px 12px;
}

.quick-wait {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  color: var(--ink);
}

.quick-tip {
  display: grid;
  gap: 10px;
}
</style>

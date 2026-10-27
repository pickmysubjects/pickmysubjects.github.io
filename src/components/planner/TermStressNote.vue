<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import { Lock, X } from 'lucide-vue-next'
import { FEEDBACK_FORM } from '@/config'
import { usePlanStress } from '@/composables/usePlanStress'
import { usePlan } from '@/composables/usePlan'
import { useDataset } from '@/composables/useDataset'
import { isFormReady, submitGoogleForm } from '@/utils/googleForm'
import { useI18n } from '@/i18n'
import { stressShort, stressText, termLabel } from '@/i18n/format'

/**
 * A heavy semester as a one-line chip in its column (level and the main reason in a few words),
 * so every column stays compact. The chip opens the full explanation, the subject codes, why it
 * can't be split and the fix: a popover beside it on wide screens, a bottom sheet on phones.
 */
const props = defineProps<{ termIndex: number }>()
const { t, locale } = useI18n()
const plan = usePlan()
const { data } = useDataset()
const { stress, relief, pinned, applyRelief } = usePlanStress()
const sheet = useTemplateRef<HTMLDialogElement>('sheet')
const chip = useTemplateRef<HTMLButtonElement>('chip')
// Wide screens: the popover sits under the chip, kept inside the window. With too little room
// below (a chip near the bottom of the screen) it opens above instead; either way it never runs
// past the window's edge (it scrolls inside).
const at = shallowRef<{ top: number; left: number; maxHeight: number } | null>(null)
const EDGE = 12
async function show(): Promise<void> {
  const r = chip.value?.getBoundingClientRect()
  const wide = matchMedia('(min-width: 641px)').matches
  const left = r ? Math.max(EDGE, Math.min(r.left, innerWidth - 372)) : 0
  const below = r ? r.bottom + 6 : 0
  at.value = r && wide ? { top: below, left, maxHeight: innerHeight - below - EDGE } : null
  sheet.value?.showModal()
  await nextTick()
  const el = sheet.value
  if (!r || !wide || !el || !at.value) return
  // The popover's full height, measured once it's open.
  const height = el.scrollHeight
  const roomBelow = innerHeight - below - EDGE
  const roomAbove = r.top - 6 - EDGE
  if (height > roomBelow && roomAbove > roomBelow) {
    const h = Math.min(height, roomAbove)
    at.value = { top: r.top - 6 - h, left, maxHeight: roomAbove }
  }
}
function onSheetClick(e: MouseEvent): void {
  if (e.target === sheet.value) sheet.value?.close()
}

const here = computed(() => stress.value.terms[props.termIndex])
const reasons = computed(() => (here.value?.reasons ?? []).map((r) => stressText(t.value, r)))
const short = computed(() => (here.value?.reasons[0] ? stressShort(t.value, here.value.reasons[0]) : ''))
const fix = computed(() => (here.value && here.value.level !== 'ok' ? relief(props.termIndex) : null))
// No fix: say which required subjects have nowhere else to go, so it doesn't look like an oversight.
const stuck = computed(() => {
  if (!here.value || here.value.level === 'ok' || fix.value) return []
  return pinned(props.termIndex)
})
// "Is this right?": the only way to learn whether the rules match how students find a
// semester. Sends the verdict, the rules that fired and the subject codes — nothing about the student.
const askable = isFormReady(FEEDBACK_FORM)
const verdict = shallowRef<'idle' | 'sent'>('idle')
async function rate(accurate: boolean): Promise<void> {
  verdict.value = 'sent'
  try {
    await submitGoogleForm(FEEDBACK_FORM, {
      topic: 'stress-hint',
      rating: accurate ? '1' : '0',
      subject: (plan.terms.value[props.termIndex]?.subjects ?? []).join(' '),
      message: `${here.value?.level}: ${(here.value?.reasons ?? []).map((r) => r.key).join(', ')}`,
      contact: '',
      language: locale.value,
    })
  } catch {
    // A lost vote isn't worth bothering the student about.
  }
}

const fixLabel = computed(() => {
  const r = fix.value
  if (!r) return ''
  if (r.kind === 'shortTerm') return t.value('stress.moveTo', { code: r.code, term: termLabel(t.value, r) })
  if (r.kind === 'replace') return t.value('stress.replaceWith', { a: r.code, b: r.with, title: data.value.subjects[r.with]?.title ?? '' })
  // One swap: say exactly what changes, and where the other subject comes from.
  const only = r.swaps.length === 1 ? r.swaps[0] : undefined
  const there = only ? plan.terms.value.find((x) => x.subjects.includes(only.b)) : undefined
  return only && there ? t.value('stress.swapWith', { a: only.a, b: only.b, term: termLabel(t.value, there) }) : t.value('stress.spread')
})
</script>

<template>
  <div v-if="here && here.level !== 'ok'" class="stress" :class="`stress-${here.level}`" :data-stress-term="termIndex">
    <button ref="chip" type="button" class="stress-chip" aria-haspopup="dialog" @click="show">
      <span class="stress-text" :title="short || undefined"><span class="stress-level">{{ t(`stress.${here.level}`) }}</span><span v-if="short" class="stress-short"> · {{ short }}</span></span>
      <Lock v-if="stuck.length" :size="12" class="stress-lock" :aria-label="t('stress.short.stuck')" />
    </button>
    <dialog
      ref="sheet"
      class="stress-sheet"
      :class="[`stress-${here.level}`, { 'stress-pop': at }]"
      :style="at ? { top: `${at.top}px`, left: `${at.left}px`, maxHeight: `${at.maxHeight}px` } : undefined"
      :aria-label="`${t(`stress.${here.level}`)} · ${termLabel(t, plan.terms.value[termIndex] ?? { year: 0, period: 'semester-1' })}`"
      @click="onSheetClick"
    >
      <div class="sheet-body">
        <header class="sheet-head">
          <p class="stress-level">{{ t(`stress.${here.level}`) }} · {{ termLabel(t, plan.terms.value[termIndex] ?? { year: 0, period: 'semester-1' }) }}</p>
          <button type="button" class="sheet-x" :aria-label="t('menu.close')" @click="sheet?.close()"><X :size="16" aria-hidden="true" /></button>
        </header>
        <ul class="stress-rest">
          <li v-for="(r, i) in reasons" :key="i">{{ r }}</li>
        </ul>
        <p v-if="stuck.length" class="stress-stuck"><Lock :size="13" aria-hidden="true" /> {{ t('stress.pinned', { codes: stuck.join(t('listSep')) }) }}</p>
        <button v-if="fix" type="button" class="stress-fix" @click="applyRelief(termIndex, fix); sheet?.close()">{{ fixLabel }}</button>
        <p v-if="askable" class="stress-ask">
          <template v-if="verdict === 'idle'">
            {{ t('stress.accurate') }}
            <button type="button" class="stress-vote" @click="rate(true)">{{ t('stress.yes') }}</button>
            <button type="button" class="stress-vote" @click="rate(false)">{{ t('stress.no') }}</button>
          </template>
          <template v-else>{{ t('stress.thanks') }}</template>
        </p>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.stress {
  --tone: var(--warn);
  --tone-soft: var(--warn-soft);
  grid-column: 1 / -1;
  margin-top: 4px;
  min-width: 0;
}

.stress-veryHeavy {
  --tone: var(--bad);
  --tone-soft: var(--bad-soft);
}

/* A fixed height, the same in every column: the reason wraps to a second line in a narrow
   column instead of being cut off; the tap area reaches 44px around it. */
.stress-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--tone) 28%, var(--glass-edge));
  border-radius: 999px;
  background: var(--glass-shine), color-mix(in srgb, var(--tone-soft) 75%, transparent);
  box-shadow: var(--glass-shadow);
  font: inherit;
  font-size: 0.8125rem;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.stress-chip::before {
  content: '';
  position: absolute;
  inset: -2px 0;
}

.stress-chip:hover {
  border-color: var(--tone);
}

.stress-chip:focus-visible,
.stress:focus-within .stress-chip:focus {
  outline: 2px solid var(--tone);
  outline-offset: 2px;
}

.stress-level {
  flex: none;
  margin: 0;
  font-weight: 700;
  color: var(--tone);
}

/* Level and reason flow as one text, up to two lines (a narrow column wraps instead of cutting). */
.stress-text {
  display: -webkit-box;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  font-size: 0.75rem;
  line-height: 1.25;
  /* Chinese and Korean break between words (at the spaces), not inside one ("论文写 / 作");
     a run too long for the line still wraps rather than overflowing. */
  word-break: keep-all;
  overflow-wrap: break-word;
}

.stress-lock {
  flex: none;
  color: var(--ink-soft);
}

.stress-go {
  flex: none;
  margin-left: auto;
  color: var(--ink-soft);
}

.stress-sheet {
  width: min(360px, calc(100% - 24px));
  margin: auto;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--glass-shine), color-mix(in srgb, var(--sheet-fill) 40%, var(--bg));
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  backdrop-filter: blur(24px) saturate(1.4);
  color: var(--ink);
  box-shadow: var(--shadow-2);
}

.stress-sheet::backdrop {
  background: rgb(16 16 20 / 30%);
}

/* Wide screens: a popover under the chip (top/left set from the chip). */
.stress-pop {
  position: fixed;
  margin: 0;
  max-height: calc(100vh - 24px);
  overflow: auto;
}

.stress-pop::backdrop {
  background: transparent;
}

.sheet-body {
  display: grid;
  gap: 10px;
  padding: 14px 16px 16px;
  font-size: var(--fs-small);
  line-height: 1.5;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sheet-x {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: -10px -12px -10px 0;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--ink-soft);
  cursor: pointer;
}

.stress-rest {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
}

.stress-stuck {
  display: flex;
  gap: 6px;
  margin: 0;
  color: var(--ink-soft);
}

.stress-stuck svg {
  flex: none;
  margin-top: 4px;
}

.stress-fix {
  min-height: 44px;
  padding: 6px 12px;
  border: 1px solid var(--glass-edge);
  border-radius: 10px;
  background: var(--glass-shine), var(--glass-fill-hover);
  box-shadow: var(--glass-shadow);
  font: inherit;
  font-weight: 650;
  color: var(--ink);
  cursor: pointer;
}

.stress-fix:hover {
  border-color: var(--tone);
}

.stress-ask {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin: 0;
  color: var(--ink-soft);
}

.stress-vote {
  min-height: 44px;
  padding: 0 8px;
  border: 0;
  background: none;
  font: inherit;
  color: var(--ink-soft);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

@media (max-width: 640px) {
  .stress-sheet {
    width: 100%;
    max-width: none;
    margin: auto 0 0;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
}

@media print {
  .stress-go {
    display: none;
  }
}
</style>

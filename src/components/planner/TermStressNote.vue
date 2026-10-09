<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { FEEDBACK_FORM } from '@/config'
import { usePlanStress } from '@/composables/usePlanStress'
import { usePlan } from '@/composables/usePlan'
import { isFormReady, submitGoogleForm } from '@/utils/googleForm'
import { useI18n } from '@/i18n'
import { stressText, termLabel } from '@/i18n/format'

/**
 * A heavy semester, said in one sentence where the student is looking, with the one thing
 * that fixes it when there is one (spread the subjects out, or move one to summer/winter).
 */
const props = defineProps<{ termIndex: number }>()
const { t, locale } = useI18n()
const plan = usePlan()
const { stress, relief, applyRelief } = usePlanStress()
const open = shallowRef(false)

const here = computed(() => stress.value.terms[props.termIndex])
const reasons = computed(() => (here.value?.reasons ?? []).map((r) => stressText(t.value, r)))
const fix = computed(() => (here.value && here.value.level !== 'ok' ? relief(props.termIndex) : null))
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
  return r.kind === 'spread' ? t.value('stress.spread') : t.value('stress.moveTo', { code: r.code, term: termLabel(t.value, r) })
})
</script>

<template>
  <div v-if="here && here.level !== 'ok'" class="stress" :class="`stress-${here.level}`" role="note">
    <p class="stress-line">
      <span class="stress-level">{{ t(`stress.${here.level}`) }}</span>
      {{ reasons[0] }}
    </p>
    <ul v-if="open && reasons.length > 1" class="stress-rest">
      <li v-for="(r, i) in reasons.slice(1)" :key="i">{{ r }}</li>
    </ul>
    <div v-if="fix || reasons.length > 1" class="stress-actions">
      <button v-if="fix" type="button" class="stress-fix" @click="applyRelief(termIndex, fix)">{{ fixLabel }}</button>
      <button v-if="reasons.length > 1" type="button" class="stress-more" :aria-expanded="open" @click="open = !open">
        {{ open ? t('stress.less') : t('stress.more', { n: reasons.length - 1 }) }}
      </button>
    </div>
    <p v-if="askable" class="stress-ask">
      <template v-if="verdict === 'idle'">
        {{ t('stress.accurate') }}
        <button type="button" class="stress-vote" @click="rate(true)">{{ t('stress.yes') }}</button>
        <button type="button" class="stress-vote" @click="rate(false)">{{ t('stress.no') }}</button>
      </template>
      <template v-else>{{ t('stress.thanks') }}</template>
    </p>
  </div>
</template>

<style scoped>
.stress {
  --tone: var(--warn);
  --tone-soft: var(--warn-soft);
  display: grid;
  gap: 8px;
  grid-column: 1 / -1;
  margin-top: 4px;
  padding: 9px 11px;
  border: 1px solid color-mix(in srgb, var(--tone) 22%, var(--glass-edge));
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--tone-soft) 70%, transparent);
  box-shadow: var(--glass-shadow);
  font-size: 0.8125rem;
  line-height: 1.45;
}

.stress-veryHeavy {
  --tone: var(--bad);
  --tone-soft: var(--bad-soft);
}

.stress-line {
  margin: 0;
  color: var(--ink);
}

.stress-level {
  margin-right: 4px;
  font-weight: 700;
  color: var(--tone);
}

.stress-rest {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 16px;
  color: var(--ink);
}

.stress-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
}

.stress-fix {
  flex: 1 1 100%;
  padding: 6px 10px;
  border: 1px solid var(--glass-edge);
  border-radius: 8px;
  background: var(--glass-shine), var(--glass-fill-hover);
  box-shadow: var(--glass-shadow);
  font: inherit;
  font-weight: 650;
  color: var(--tone);
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
  font-size: 0.75rem;
  color: var(--ink-faint);
}

.stress-vote {
  padding: 0 2px;
  border: 0;
  background: none;
  font: inherit;
  color: var(--ink-soft);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.stress-more {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--ink-soft);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

@media print {
  .stress-ask,
  .stress-actions {
    display: none;
  }
}
</style>

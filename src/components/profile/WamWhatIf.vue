<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { gradeOf, wamIf } from '@/utils/wamGoal'

/**
 * "If I get X in this subject, my WAM becomes …". Fixed to one subject (`code`), or the student
 * picks one of `choices` (their planned subjects). Pass/fail subjects aren't offered: no mark counts.
 */
const props = defineProps<{ code?: string; choices?: string[] }>()
const { data } = useDataset()
const { profile, wam } = useProfile()
const { t } = useI18n()

const options = computed(() => (props.choices ?? []).filter((c) => !data.value.subjects[c]?.passFail))
const picked = shallowRef(props.code ?? options.value[0] ?? '')
watch(options, (o) => {
  if (!props.code && !o.includes(picked.value)) picked.value = o[0] ?? ''
})
const mark = shallowRef(Math.round(wam.value ?? 70))
const result = computed(() => (picked.value ? wamIf(profile.value.results, data.value, picked.value, mark.value) : null))
const shown = computed(() => !!props.code ? !data.value.subjects[props.code]?.passFail : options.value.length > 0)
const delta = computed(() => (result.value === null || wam.value === null ? null : Math.round((result.value - wam.value) * 10) / 10))
const deltaText = computed(() => (delta.value === null || delta.value === 0 ? '' : `${delta.value > 0 ? '+' : '−'}${Math.abs(delta.value)}`))
function onMark(e: Event): void {
  const n = Number((e.target as HTMLInputElement).value)
  mark.value = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0
}
</script>

<template>
  <div v-if="shown" class="whatif-sub">
    <p class="wi-title">{{ t('whatIf.title') }}</p>
    <div class="wi-row">
      <label v-if="!code" class="wi-field wi-pick">
        <span class="visually-hidden">{{ t('whatIf.subject') }}</span>
        <select v-model="picked" class="input wi-select">
          <option v-for="c in options" :key="c" :value="c">{{ c }} {{ data.subjects[c]?.title ?? '' }}</option>
        </select>
      </label>
      <label class="wi-field">
        <span>{{ t('whatIf.ifMark') }}</span>
        <input class="input wi-mark" type="number" min="0" max="100" step="1" :value="mark" @input="onMark" />
        <span class="wi-grade">{{ gradeOf(mark) }}</span>
      </label>
    </div>
    <p class="wi-answer" role="status">
      {{ t('whatIf.becomes', { wam: result ?? '–' }) }}
      <span v-if="deltaText" class="wi-delta" :class="{ down: (delta ?? 0) < 0 }">{{ deltaText }}</span>
    </p>
  </div>
</template>

<style scoped>
.whatif-sub {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.wi-title {
  font-size: 0.9375rem;
  font-weight: 650;
}

.wi-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.wi-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  font-size: 0.9375rem;
}

.wi-pick {
  flex: 1 1 16rem;
}

.wi-select {
  width: 100%;
  min-width: 0;
  text-overflow: ellipsis;
}

.wi-mark {
  width: 84px;
  padding: 6px 10px;
}

.wi-grade {
  font-family: var(--font-code);
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.wi-answer {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  padding: 10px 12px;
  font-weight: 600;
  background: var(--accent-soft);
  border-radius: var(--radius-sm);
}

.wi-delta {
  font-family: var(--font-code);
  font-size: 0.875rem;
  color: var(--good);
}

.wi-delta.down {
  color: var(--bad);
}
</style>

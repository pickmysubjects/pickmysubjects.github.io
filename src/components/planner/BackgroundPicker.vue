<script setup lang="ts">
import { computed } from 'vue'
import type { Background, StudyArea, UniMelbRecord } from '@/engine'
import { useI18n } from '@/i18n'

/**
 * A master's setup: the bachelor's the student brings. UniMelb reads the bachelor's side of the
 * site (nothing to type); elsewhere asks the few things the Handbook's entry rules turn on.
 */
const props = defineProps<{ modelValue: Background | undefined; record: UniMelbRecord | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: Background] }>()
const { t } = useI18n()

const AREAS: { id: StudyArea; key: string }[] = [
  { id: 'computing', key: 'areaComputing' },
  { id: 'statistics', key: 'areaStatistics' },
  { id: 'both', key: 'areaBoth' },
  { id: 'engineering', key: 'areaEngineering' },
  { id: 'other', key: 'areaOther' },
]

const where = computed(() => props.modelValue?.where)

function set(change: Partial<Background>): void {
  emit('update:modelValue', { where: where.value ?? 'other', ...props.modelValue, ...change })
}

const recordLine = computed(() => {
  const r = props.record
  if (!r) return ''
  const majors = r.majors.join(', ') || '—'
  return r.wam !== undefined ? t.value('entryAdvice.fromRecord', { majors, wam: Math.round(r.wam * 10) / 10 }) : t.value('entryAdvice.fromRecordNoWam', { majors })
})
</script>

<template>
  <fieldset class="bg">
    <legend class="bg-title">{{ t('entryAdvice.where') }}</legend>
    <div class="bg-chips" role="group" :aria-label="t('entryAdvice.where')">
      <button type="button" class="chip bg-chip" :aria-pressed="where === 'unimelb'" @click="emit('update:modelValue', { where: 'unimelb' })">
        {{ t('entryAdvice.unimelb') }}
      </button>
      <button type="button" class="chip bg-chip" :aria-pressed="where === 'other'" @click="set({ where: 'other' })">
        {{ t('entryAdvice.other') }}
      </button>
    </div>

    <p v-if="where === 'unimelb'" class="bg-note">{{ record ? recordLine : t('entryAdvice.noRecord') }}</p>

    <div v-else-if="where === 'other'" class="bg-other">
      <label class="bg-field">
        <span class="bg-label">{{ t('entryAdvice.area') }}</span>
        <select class="select-glass" :value="modelValue?.area ?? ''" @change="set({ area: (($event.target as HTMLSelectElement).value || undefined) as StudyArea | undefined })">
          <option value="">—</option>
          <option v-for="a in AREAS" :key="a.id" :value="a.id">{{ t(`entryAdvice.${a.key}`) }}</option>
        </select>
      </label>
      <label class="bg-check"><input type="checkbox" :checked="!!modelValue?.wam65" @change="set({ wam65: ($event.target as HTMLInputElement).checked })" />{{ t('entryAdvice.wam65') }}</label>
      <label class="bg-check"><input type="checkbox" :checked="!!modelValue?.fourYear" @change="set({ fourYear: ($event.target as HTMLInputElement).checked })" />{{ t('entryAdvice.fourYear') }}</label>
      <label class="bg-check"><input type="checkbox" :checked="!!modelValue?.work" @change="set({ work: ($event.target as HTMLInputElement).checked })" />{{ t('entryAdvice.work') }}</label>
    </div>
  </fieldset>
</template>

<style scoped>
.bg {
  display: grid;
  gap: 10px;
  margin: 0 0 18px;
  padding: 0;
  border: 0;
  min-width: 0;
}

.bg-title {
  padding: 0;
  margin-bottom: 8px;
  font-weight: var(--fw-semibold);
  color: var(--ink);
}

.bg-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bg-note {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.bg-other {
  display: grid;
  gap: 8px;
}

.bg-field {
  display: grid;
  gap: 4px;
  max-width: 360px;
}

.bg-label {
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.bg-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-small);
  color: var(--ink);
}
</style>

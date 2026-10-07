<script setup lang="ts">
import { computed } from 'vue'
import type { Component, Course, Period } from '@/engine'
import { useI18n } from '@/i18n'
import type { PlanSetup } from '@/composables/usePlan'

const setup = defineModel<PlanSetup>({ required: true })
const props = defineProps<{ courses: Course[]; components: Component[] }>()
const emit = defineEmits<{ generate: []; startEmpty: [] }>()

const forCourse = computed(() => props.components.filter((c) => c.course === setup.value.course))
const majors = computed(() => forCourse.value.filter((c) => c.kind === 'major'))
const specialisations = computed(() => forCourse.value.filter((c) => c.kind === 'specialisation'))
const startPeriods: Period[] = ['semester-1', 'semester-2']
const { t } = useI18n()

function set<K extends keyof PlanSetup>(key: K, value: PlanSetup[K]): void {
  setup.value = { ...setup.value, [key]: value }
}

function onCourse(code: string): void {
  const course = props.courses.find((c) => c.code === code)
  const major = props.components.find((c) => c.course === code && c.kind === 'major')
  setup.value = {
    ...setup.value,
    course: code,
    courseYear: course?.year ?? setup.value.courseYear,
    major: major?.id ?? '',
    specialisation: '',
  }
}

function label(c: Component): string {
  return c.requirements === 'unknown' ? t.value('plan.notCurated', { title: c.title }) : c.title
}

function value(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value
}
</script>

<template>
  <form class="setup" @submit.prevent="emit('generate')">
    <label class="field">
      {{ t('plan.course') }}
      <select class="select" :value="setup.course" @change="onCourse(value($event))">
        <option v-for="c in courses" :key="`${c.code}-${c.year}`" :value="c.code">{{ t('plan.courseOption', { title: c.title, year: c.year }) }}</option>
      </select>
    </label>
    <label class="field field-narrow">
      {{ t('plan.starting') }}
      <span class="start">
        <input
          class="input"
          type="number"
          min="2020"
          max="2035"
          :value="setup.startYear"
          :aria-label="t('plan.startYear')"
          @change="set('startYear', Number(value($event)))"
        />
        <select class="select" :value="setup.startPeriod" :aria-label="t('plan.startSemester')" @change="set('startPeriod', value($event) as Period)">
          <option v-for="p in startPeriods" :key="p" :value="p">{{ t(`period.${p}`) }}</option>
        </select>
      </span>
    </label>
    <label class="field">
      {{ t('plan.major') }}
      <select class="select" :value="setup.major" @change="set('major', value($event))">
        <option value="">{{ t('plan.notDecided') }}</option>
        <option v-for="m in majors" :key="m.id" :value="m.id">{{ label(m) }}</option>
      </select>
    </label>
    <label v-if="specialisations.length" class="field">
      {{ t('plan.specialisation') }}
      <select class="select" :value="setup.specialisation" @change="set('specialisation', value($event))">
        <option value="">{{ t('plan.none') }}</option>
        <option v-for="s in specialisations" :key="s.id" :value="s.id">{{ label(s) }}</option>
      </select>
    </label>
    <div class="actions">
      <button class="button" type="submit">{{ t('plan.build') }}</button>
      <button class="button button-quiet" type="button" @click="emit('startEmpty')">{{ t('plan.startEmpty') }}</button>
    </div>
  </form>
</template>

<style scoped>
.setup {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px 16px;
}

.setup > .field {
  flex: 1 1 200px;
}

.setup > .field-narrow {
  flex: 0 1 220px;
}

.start {
  display: grid;
  grid-template-columns: 84px 1fr;
  gap: 6px;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>

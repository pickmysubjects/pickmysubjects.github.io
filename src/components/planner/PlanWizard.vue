<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ArrowLeft, ArrowRight, Check } from 'lucide-vue-next'
import type { Component, Course, Period } from '@/engine'
import type { PlanSetup } from '@/composables/usePlan'
import MajorPicker from './MajorPicker.vue'
import { useI18n } from '@/i18n'

/** Three plain questions, one at a time, then "Build my plan". */
const props = defineProps<{ setup: PlanSetup; courses: Course[]; components: Component[] }>()
const emit = defineEmits<{ done: [setup: PlanSetup]; cancel: [] }>()
const { t } = useI18n()

const draft = shallowRef<PlanSetup>({ ...props.setup })
const step = shallowRef(0)
const thisYear = new Date().getFullYear()
const years = [thisYear - 2, thisYear - 1, thisYear, thisYear + 1]
const periods: Period[] = ['semester-1', 'semester-2']

const majors = computed(() => props.components.filter((c) => c.course === draft.value.course && c.kind === 'major'))
// Specialisations that go with the chosen major (an extra, optional choice).
const specs = computed(() =>
  props.components.filter(
    (c) =>
      c.course === draft.value.course &&
      c.kind === 'specialisation' &&
      (c.requiresMajor.length === 0 || c.requiresMajor.includes(draft.value.major)),
  ),
)

function set(patch: Partial<PlanSetup>): void {
  draft.value = { ...draft.value, ...patch }
}

// A specialisation that doesn't go with the final major choice is dropped.
function finish(): void {
  const spec = specs.value.some((sp) => sp.id === draft.value.specialisation) ? draft.value.specialisation : ''
  emit('done', { ...draft.value, specialisation: spec })
}

function chooseCourse(c: Course): void {
  set({ course: c.code, courseYear: c.year, major: '', specialisation: '' })
}
</script>

<template>
  <section class="wizard surface">
    <header class="wizard-head">
      <p class="eyebrow">{{ t('wizard.step', { n: step + 1 }) }}</p>
      <span class="dots" aria-hidden="true">
        <span v-for="n in 3" :key="n" class="dot" :class="{ 'dot-on': n - 1 <= step }" />
      </span>
    </header>

    <div v-if="step === 0" class="q">
      <h2 class="q-title">{{ t('wizard.qCourse') }}</h2>
      <div class="options">
        <button
          v-for="c in courses"
          :key="`${c.code}-${c.year}`"
          type="button"
          class="option"
          :aria-pressed="draft.course === c.code"
          @click="chooseCourse(c)"
        >
          <span>{{ c.title }}</span>
          <Check v-if="draft.course === c.code" :size="18" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-else-if="step === 1" class="q">
      <h2 class="q-title">{{ t('wizard.qStart') }}</h2>
      <div class="options options-grid">
        <template v-for="y in years" :key="y">
          <button
            v-for="p in periods"
            :key="`${y}-${p}`"
            type="button"
            class="option option-small"
            :aria-pressed="draft.startYear === y && draft.startPeriod === p"
            @click="set({ startYear: y, startPeriod: p })"
          >
            {{ y }} · {{ t(`period.${p}`) }}
          </button>
        </template>
      </div>
      <label class="intl">
        <input type="checkbox" :checked="draft.international === true" @change="set({ international: ($event.target as HTMLInputElement).checked })" />
        <span>
          {{ t('wizard.international') }}
          <span class="intl-hint">{{ t('wizard.internationalHint') }}</span>
        </span>
      </label>
    </div>

    <div v-else class="q">
      <h2 class="q-title">{{ t('wizard.qMajor') }}</h2>
      <MajorPicker :majors="majors" :model-value="draft.major" @update:model-value="set({ major: $event })" />
      <div v-if="specs.length" class="spec">
        <p class="spec-title">{{ t('wizard.qSpec') }}</p>
        <div class="spec-chips" role="group" :aria-label="t('wizard.qSpec')">
          <button type="button" class="chip spec-chip" :aria-pressed="!draft.specialisation" @click="set({ specialisation: '' })">
            {{ t('wizard.noSpec') }}
          </button>
          <button
            v-for="sp in specs"
            :key="sp.id"
            type="button"
            class="chip spec-chip"
            :aria-pressed="draft.specialisation === sp.id"
            @click="set({ specialisation: sp.id })"
          >
            {{ sp.title }}
          </button>
        </div>
      </div>
    </div>

    <footer class="wizard-foot">
      <button v-if="step > 0" class="button button-quiet" type="button" @click="step--">
        <ArrowLeft :size="16" aria-hidden="true" /> {{ t('wizard.back') }}
      </button>
      <button v-else class="button button-quiet" type="button" @click="emit('cancel')">{{ t('rating.cancel') }}</button>
      <button v-if="step < 2" class="button" type="button" :disabled="step === 0 && !draft.course" @click="step++">
        {{ t('wizard.next') }} <ArrowRight :size="16" aria-hidden="true" />
      </button>
      <button v-else class="button button-accent" type="button" @click="finish">
        {{ t('wizard.build') }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.wizard {
  display: grid;
  gap: 22px;
  max-width: 680px;
  width: 100%;
  margin: 0 auto;
  padding: 28px;
}

.wizard-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 28px;
  height: 5px;
  border-radius: 999px;
  background: var(--line);
}

.dot-on {
  background: var(--accent);
}

.q {
  display: grid;
  gap: 16px;
}

.q-title {
  font-size: 1.5rem;
  font-weight: 700;
}

.options {
  display: grid;
  gap: 10px;
}

.options-grid {
  grid-template-columns: repeat(2, 1fr);
}

.option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 0 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: 1rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.option:hover {
  border-color: var(--ink-faint);
}

.option[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.option-small {
  min-height: 48px;
  justify-content: center;
}

.wizard-foot {
  display: flex;
  justify-content: space-between;
}

@media (max-width: 560px) {
  .wizard {
    padding: 20px;
  }

  .options-grid {
    grid-template-columns: 1fr;
  }
}
.intl {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 16px;
  font-weight: 600;
  cursor: pointer;
}

.intl input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--accent);
}

.intl-hint {
  display: block;
  margin-top: 2px;
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--ink-soft);
}
.spec {
  display: grid;
  gap: 8px;
  margin-top: 18px;
}

.spec-title {
  font-weight: 600;
}

.spec-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.spec-chip {
  color: var(--ink);
  cursor: pointer;
}

.spec-chip[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
</style>

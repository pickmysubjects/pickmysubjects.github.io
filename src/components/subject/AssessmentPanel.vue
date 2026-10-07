<script setup lang="ts">
import { computed } from 'vue'
import { CircleCheck, Clock, TriangleAlert, Users } from 'lucide-vue-next'
import { ASSESSMENT_KINDS, periodsFor, type Subject } from '@/engine'
import { useI18n } from '@/i18n'

const props = defineProps<{ subject: Subject; year: number }>()
const { t } = useI18n()

const round = (x: number): number => Math.round(x * 10) / 10
const tasks = computed(() => props.subject.assessment ?? [])

/** Weight per kind of task, biggest first. */
const parts = computed(() =>
  ASSESSMENT_KINDS.map((kind) => ({
    kind,
    weight: round(tasks.value.filter((x) => x.kind === kind).reduce((sum, x) => sum + x.weight, 0)),
  }))
    .filter((p) => p.weight > 0)
    .sort((a, b) => b.weight - a.weight),
)
const summary = computed(() => parts.value.map((p) => `${t.value(`assess.kind.${p.kind}`)} ${p.weight}%`).join(', '))
const group = computed(() => round(tasks.value.filter((x) => x.group).reduce((sum, x) => sum + x.weight, 0)))
const noExam = computed(() => tasks.value.length > 0 && !tasks.value.some((x) => x.kind === 'exam'))
const examHurdle = computed(() => tasks.value.some((x) => x.kind === 'exam' && x.hurdle))
const otherHurdle = computed(() => !examHurdle.value && tasks.value.some((x) => x.hurdle))
const hasFacts = computed(
  () =>
    noExam.value ||
    examHurdle.value ||
    otherHurdle.value ||
    group.value > 0 ||
    !!props.subject.weeklyContactHours ||
    !!props.subject.minAttendance,
)
// The Handbook lists summer/winter versions separately; we keep the semester one.
const otherTerms = computed(
  () => tasks.value.length > 0 && periodsFor(props.subject, props.year).some((p) => p === 'summer' || p === 'winter'),
)
</script>

<template>
  <section class="assess">
    <h2 class="assess-title">{{ t('assess.title') }}</h2>

    <template v-if="parts.length">
      <div class="assess-bar" role="img" :aria-label="summary">
        <span v-for="p in parts" :key="p.kind" class="assess-seg" :class="`k-${p.kind}`" :style="{ flexGrow: p.weight }" />
      </div>
      <ul class="assess-legend">
        <li v-for="p in parts" :key="p.kind">
          <span class="assess-dot" :class="`k-${p.kind}`" aria-hidden="true" />
          {{ t(`assess.kind.${p.kind}`) }} <strong>{{ p.weight }}%</strong>
        </li>
      </ul>
    </template>
    <p v-else class="assess-muted">{{ t('assess.none') }}</p>

    <p v-if="hasFacts" class="assess-facts">
      <span v-if="noExam" class="chip chip-good"><CircleCheck :size="14" aria-hidden="true" /> {{ t('assess.noExam') }}</span>
      <span v-if="examHurdle" class="chip chip-warn"><TriangleAlert :size="14" aria-hidden="true" /> {{ t('assess.mustPassExam') }}</span>
      <span v-if="otherHurdle" class="chip chip-warn"><TriangleAlert :size="14" aria-hidden="true" /> {{ t('assess.hurdles') }}</span>
      <span v-if="subject.minAttendance" class="chip chip-warn">
        <TriangleAlert :size="14" aria-hidden="true" /> {{ t('assess.attendance', { n: subject.minAttendance }) }}
      </span>
      <span v-if="group > 0" class="chip"><Users :size="14" aria-hidden="true" /> {{ t('assess.group', { n: group }) }}</span>
      <span v-if="subject.weeklyContactHours" class="chip">
        <Clock :size="14" aria-hidden="true" /> {{ t('assess.hours', { n: subject.weeklyContactHours }) }}
      </span>
    </p>
    <p v-if="otherTerms" class="assess-muted assess-small">{{ t('assess.otherTerms') }}</p>

    <div v-if="subject.skills.length || subject.topics.length" class="assess-tags">
      <p v-if="subject.skills.length" class="assess-row">
        <span class="assess-label">{{ t('assess.uses') }}</span>
        <span v-for="k in subject.skills" :key="k" class="chip">{{ t(`skill.${k}`) }}</span>
      </p>
      <p v-if="subject.topics.length" class="assess-row">
        <span class="assess-label">{{ t('assess.about') }}</span>
        <span v-for="k in subject.topics" :key="k" class="chip">{{ t(`topic.${k}`) }}</span>
      </p>
    </div>
  </section>
</template>

<style scoped>
.assess {
  display: grid;
  align-content: start;
  gap: 12px;
}

.assess-title {
  font-size: 0.95rem;
  font-weight: 650;
}

.assess-bar {
  display: flex;
  gap: 3px;
  height: 14px;
  border-radius: 999px;
  overflow: hidden;
}

.assess-seg {
  min-width: 6px;
}

.assess-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.92rem;
}

.assess-legend li {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.assess-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

/* One hue per kind; the exam gets the accent because it's what students check first. */
.k-exam { background: var(--accent); }
.k-test { background: #8b5cf6; }
.k-quiz { background: #c4b5fd; }
.k-assignment { background: #6366f1; }
.k-project { background: #0ea5e9; }
.k-report { background: #14b8a6; }
.k-presentation { background: #f59e0b; }
.k-participation { background: #a3a3ad; }

.assess-facts,
.assess-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.chip-good {
  border-color: transparent;
  background: var(--good-soft);
  color: var(--good);
}

.chip-warn {
  border-color: transparent;
  background: var(--warn-soft);
  color: var(--warn);
}

.assess-tags {
  display: grid;
  gap: 8px;
  padding-top: 4px;
}

.assess-label {
  min-width: 7.5em;
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.assess-muted {
  font-size: 0.95rem;
  color: var(--ink-soft);
}

.assess-small {
  font-size: 0.82rem;
}

@media (max-width: 560px) {
  .assess-label {
    flex-basis: 100%;
  }
}
</style>

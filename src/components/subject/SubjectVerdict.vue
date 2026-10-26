<script setup lang="ts">
import { computed } from 'vue'
import { Star } from 'lucide-vue-next'
import type { Subject } from '@/engine'
import RatingForm from '@/components/rating/RatingForm.vue'
import RatingTagChips from '@/components/rating/RatingTagChips.vue'
import DiscussionSummary from '@/components/subject/DiscussionSummary.vue'
import SubjectTips from '@/components/subject/SubjectTips.vue'
import StudentFactsRow from '@/components/subject/StudentFactsRow.vue'
import { useRated } from '@/composables/useRated'
import { useI18n } from '@/i18n'

/**
 * Should I take it? Students' ratings first (the four that decide most: overall, difficulty,
 * workload, would recommend), then the rest, then what reviews elsewhere say.
 */
const props = defineProps<{ subject: Subject; taken: boolean; thanks: boolean; detailReady: boolean }>()
const formOpen = defineModel<boolean>('formOpen', { required: true })
const emit = defineEmits<{ rated: [sent: boolean] }>()
const { rated } = useRated()
const { t } = useI18n()

interface Meter {
  key: string
  value: number
  low: string
  high: string
}
const all = computed<Meter[]>(() => {
  const s = props.subject.signals
  if (!s) return []
  const list = [
    { key: 'rating.overall', value: s.overall, low: 'rating.teachLow', high: 'rating.teachHigh' },
    { key: 'rating.difficulty', value: s.difficulty, low: 'rating.diffLow', high: 'rating.diffHigh' },
    { key: 'rating.workload', value: s.workload, low: 'rating.loadLow', high: 'rating.loadHigh' },
    { key: 'rating.examDifficulty', value: s.examDifficulty, low: 'rating.diffLow', high: 'rating.diffHigh' },
    { key: 'rating.generosity', value: s.grading, low: 'rating.genLow', high: 'rating.genHigh' },
    { key: 'rating.usefulness', value: s.usefulness, low: 'rating.useLow', high: 'rating.useHigh' },
    { key: 'rating.interest', value: s.interest, low: 'rating.intLow', high: 'rating.intHigh' },
    { key: 'rating.teaching', value: s.teaching, low: 'rating.teachLow', high: 'rating.teachHigh' },
  ]
  // Optional questions only show once enough students answered them.
  return list.filter((m): m is Meter => m.value !== undefined)
})
const headline = computed(() => all.value.slice(0, 3))
const rest = computed(() => all.value.slice(3))
const recommend = computed(() => (props.subject.signals?.recommend === undefined ? null : Math.round(props.subject.signals.recommend * 100)))
const hours = computed(() => props.subject.signals?.hours)
const hasRatings = computed(() => all.value.length > 0 || recommend.value !== null || !!hours.value)
const discussions = computed(() => (props.detailReady ? (props.subject.discussions ?? []) : []))
</script>

<template>
  <div class="verdict">
    <template v-if="hasRatings">
      <div class="tiles">
        <div v-for="m in headline" :key="m.key" class="tile">
          <span class="tile-label">{{ t(m.key) }}</span>
          <span class="tile-value">{{ m.value }}<small>/5</small></span>
          <span class="tile-track" aria-hidden="true"><span class="tile-fill" :style="{ width: `${(m.value / 5) * 100}%` }" /></span>
          <span class="tile-ends">{{ t(m.low) }} · {{ t(m.high) }}</span>
        </div>
        <div v-if="recommend !== null" class="tile tile-accent">
          <span class="tile-value">{{ recommend }}<small>%</small></span>
          <span class="tile-text">{{ t('subject.recommendShare', { pct: recommend }) }}</span>
        </div>
      </div>
      <p class="meta">
        {{ t('subject.reviews', { n: subject.signals?.reviews ?? 0 }) }}<template v-if="hours"> · {{ t('subject.hoursWeek', { n: hours }) }}</template>
      </p>
      <RatingTagChips :tags="subject.signals?.tags" />
      <dl v-if="rest.length" class="rest">
        <div v-for="m in rest" :key="m.key" class="rest-row">
          <dt>{{ t(m.key) }}</dt>
          <dd>
            <span class="rest-track" aria-hidden="true"><span class="tile-fill" :style="{ width: `${(m.value / 5) * 100}%` }" /></span>
            <span class="rest-value">{{ m.value }}/5</span>
          </dd>
        </div>
      </dl>
    </template>
    <p v-else class="muted">{{ t('subject.noRatings') }}</p>
    <StudentFactsRow v-if="detailReady" :facts="subject.studentFacts" />

    <p v-if="thanks" class="good" role="status">{{ t('rating.sent') }}</p>
    <p v-else-if="rated.has(subject.code)" class="muted">{{ t('rating.rated') }}</p>
    <button v-else-if="!formOpen" class="button button-quiet rate-ask" :class="{ 'rate-ask-strong': taken }" type="button" @click="formOpen = true">
      <Star :size="16" aria-hidden="true" /> {{ t('subject.rateAsk') }}
    </button>
    <RatingForm v-if="formOpen" :code="subject.code" @done="emit('rated', $event)" />

    <DiscussionSummary v-if="discussions.length" class="reviews" :discussions="discussions" />
    <SubjectTips v-if="detailReady && subject.comments" :code="subject.code" :comments="subject.comments" />
  </div>
</template>

<style scoped>
.verdict {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
}

.tile {
  display: grid;
  align-content: start;
  gap: 6px;
  min-width: 0;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--surface-2);
}

.tile-label {
  font-size: var(--fs-small);
  font-weight: 600;
  color: var(--ink-soft);
}

.tile-value {
  font-family: var(--font-code);
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--ink);
}

.tile-value small {
  margin-left: 2px;
  font-size: var(--fs-small);
  font-weight: 500;
  color: var(--ink-faint);
}

.tile-track,
.rest-track {
  display: block;
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 9%, transparent);
  overflow: hidden;
}

.tile-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}

.tile-ends {
  font-size: var(--fs-meta);
  color: var(--ink-faint);
}

.tile-accent {
  background: var(--accent-soft);
}

.tile-accent .tile-value {
  color: var(--accent);
}

.tile-text {
  font-size: var(--fs-small);
  color: var(--ink);
}

.meta {
  margin: 0;
  font-size: var(--fs-body);
  color: var(--ink-soft);
}

.rest {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px 28px;
  margin: 0;
}

.rest-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(80px, 120px) auto;
  align-items: center;
  gap: 12px;
}

.rest-row dt {
  font-size: var(--fs-body);
}

.rest-row dd {
  display: contents;
}

.rest-value {
  font-family: var(--font-code);
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.muted {
  margin: 0;
  color: var(--ink-soft);
}

.good {
  margin: 0;
  color: var(--good);
  font-weight: 600;
}

.rate-ask {
  justify-self: start;
}

.rate-ask-strong {
  border-color: var(--accent);
  color: var(--accent);
}

.reviews {
  margin-top: var(--space-2);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}
</style>

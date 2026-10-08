<script setup lang="ts">
import { link } from '@/composables/useView'
import { computed } from 'vue'
import type { Recommendation, Subject } from '@/engine'
import { useI18n } from '@/i18n'
import { describeReq, reasonText } from '@/i18n/format'
import { summariseAssessment } from '@/utils/assessment'

const props = defineProps<{
  rec: Recommendation
  subject?: Subject
  addLabel: string | null
}>()
const emit = defineEmits<{ add: [] }>()

const width = computed(() => `${props.rec.score}%`)
const { t } = useI18n()
const reasons = computed(() => props.rec.reasons.map((n) => reasonText(t.value, n)))
const warnings = computed(() => props.rec.warnings.map((n) => reasonText(t.value, n)))
const confidence = computed(() => t.value(`suggest.confidence.${props.rec.confidence}`))
const assessment = computed(() => (props.subject ? summariseAssessment(props.subject.assessment) : null))
// When the student already meets them, say so instead of spelling out every alternative.
const prereqText = computed(() => {
  const pre = props.subject?.prerequisites
  if (!pre) return ''
  if (pre !== 'none' && props.rec.eligibility === 'ok') return t.value('suggest.prereqMet')
  return describeReq(t.value, pre)
})
</script>

<template>
  <article class="rec surface">
    <header class="rec-head">
      <div class="rec-name">
        <span class="code rec-code">{{ rec.code }}</span>
        <h3 class="rec-title"><a class="rec-link" :href="link(`subject/${rec.code}`)">{{ rec.title }}</a></h3>
      </div>
      <div class="rec-score" :aria-label="t('suggest.fit', { score: rec.score, confidence })" :title="t('suggest.fitHint')">
        <span class="rec-score-num">{{ rec.score }}</span>
        <span class="rec-score-bar" aria-hidden="true"><span class="rec-score-fill" :style="{ width }" /></span>
        <span class="rec-confidence">{{ confidence }}</span>
      </div>
    </header>
    <p v-if="assessment" class="rec-assess">
      <span class="chip" :class="{ 'chip-good': assessment.exam === 0 }">
        {{ assessment.exam === 0 ? t('assess.noExam') : t('assess.examShare', { n: assessment.exam }) }}
      </span>
      <span v-if="assessment.group > 0" class="chip">{{ t('assess.group', { n: assessment.group }) }}</span>
    </p>
    <ul class="rec-points">
      <li v-for="(r, i) in reasons" :key="`r${i}`" class="rec-reason">{{ r }}</li>
      <li v-for="(w, i) in warnings" :key="`w${i}`" class="rec-warning">{{ w }}</li>
      <li v-if="reasons.length === 0 && warnings.length === 0" class="rec-neutral">{{ t('suggest.neutral') }}</li>
    </ul>
    <footer class="rec-foot">
      <span v-if="subject" class="rec-meta">
        {{ t('suggest.meta', { level: subject.level, points: subject.points, prereq: prereqText }) }}
      </span>
      <span class="rec-actions">
        <button v-if="addLabel" class="button button-quiet rec-add" type="button" @click="emit('add')">
          {{ t('suggest.add', { term: addLabel }) }}
        </button>
      </span>
    </footer>
  </article>
</template>

<style scoped>
.rec {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
}

.rec-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.rec-assess {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rec-assess .chip {
  font-size: 0.8rem;
  padding: 2px 9px;
}

.chip-good {
  border-color: transparent;
  background: var(--good-soft);
  color: var(--good);
}

.rec-code {
  font-size: 0.82rem;
  color: var(--overprint);
  font-weight: 600;
}

.rec-link {
  color: inherit;
  text-decoration: none;
}

.rec-link:hover {
  color: var(--accent);
}

.rec-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.rec-score {
  display: grid;
  grid-template-columns: auto 90px;
  align-items: center;
  gap: 2px 8px;
  flex: none;
}

.rec-score-num {
  font-family: var(--font-code);
  font-size: 1.4rem;
  font-weight: 600;
}

.rec-score-bar {
  height: 6px;
  background: var(--contour);
  border-radius: 3px;
  overflow: hidden;
}

.rec-score-fill {
  display: block;
  height: 100%;
  background: var(--overprint);
}

.rec-confidence {
  grid-column: 1 / -1;
  font-size: 0.72rem;
  color: var(--ink-soft);
  text-align: right;
}

.rec-points {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.9rem;
}

.rec-reason::before,
.rec-warning::before {
  display: inline-block;
  width: 1.2em;
  font-weight: 700;
}

.rec-reason::before {
  content: '+';
  color: var(--forest);
}

.rec-warning::before {
  content: '!';
  color: var(--open);
}

.rec-neutral {
  color: var(--ink-soft);
}

.rec-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px 16px;
  padding-top: 8px;
  border-top: 1px solid var(--contour);
  font-size: 0.8rem;
}

.rec-meta {
  color: var(--ink-soft);
}

.rec-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
}

.rec-add {
  padding: 4px 10px;
  font-size: 0.8rem;
}
</style>

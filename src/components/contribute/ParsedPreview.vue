<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { PasteResult } from '@/engine'
import { useI18n } from '@/i18n'
import { describeReq, periodLabel } from '@/i18n/format'
import { summariseAssessment } from '@/utils/assessment'

const props = defineProps<{ parsed: PasteResult; yaml: string }>()

const { t } = useI18n()
const copied = shallowRef(false)
const offerings = computed(() =>
  props.parsed.offerings === 'unknown'
    ? t.value('contribute.notFound')
    : props.parsed.offerings.map((p) => periodLabel(t.value, p)).join(', '),
)
const nonAllowed = computed(() =>
  props.parsed.nonAllowed === 'unknown'
    ? t.value('contribute.notFound')
    : props.parsed.nonAllowed.join(', ') || t.value('contribute.none'),
)

const assessment = computed(() => {
  const info = summariseAssessment(props.parsed.assessment)
  if (!info) return t.value('contribute.notFound')
  const parts = info.parts.map((p) => `${t.value(`assess.kind.${p.kind}`)} ${p.weight}%`)
  if (info.group) parts.push(t.value('assess.group', { n: info.group }))
  if (info.examHurdle) parts.push(t.value('assess.mustPassExam'))
  else if (info.otherHurdle) parts.push(t.value('assess.hurdles'))
  return parts.join(' · ')
})
const hours = computed(() =>
  props.parsed.weeklyContactHours ? t.value('assess.hours', { n: props.parsed.weeklyContactHours }) : t.value('contribute.notFound'),
)

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.yaml)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <section class="preview" aria-labelledby="preview-title">
    <h2 id="preview-title" class="section-title">{{ t('contribute.read') }}</h2>
    <dl class="facts">
      <dt>{{ t('contribute.prerequisites') }}</dt>
      <dd>{{ describeReq(t, parsed.prerequisites) }}</dd>
      <dt>{{ t('contribute.corequisites') }}</dt>
      <dd>{{ describeReq(t, parsed.corequisites) }}</dd>
      <dt>{{ t('contribute.nonAllowed') }}</dt>
      <dd>{{ nonAllowed }}</dd>
      <dt>{{ t('contribute.runsIn') }}</dt>
      <dd>{{ offerings }}</dd>
      <dt>{{ t('assess.title') }}</dt>
      <dd>{{ assessment }}</dd>
      <dt>{{ t('assess.classTime') }}</dt>
      <dd>{{ hours }}</dd>
    </dl>
    <ul v-if="parsed.warnings.length" class="warnings">
      <li v-for="(w, i) in parsed.warnings" :key="i">{{ w }}</li>
    </ul>
    <div class="yaml-head">
      <h2 class="section-title">{{ t('contribute.dataFile') }}</h2>
      <button class="button button-quiet" type="button" @click="copy">
        {{ copied ? t('contribute.copied') : t('contribute.copy') }}
      </button>
    </div>
    <pre class="yaml code">{{ yaml }}</pre>
  </section>
</template>

<style scoped>
.section-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.facts {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 6px 12px;
  margin: 10px 0 0;
  font-size: 0.9rem;
}

.facts dt {
  font-weight: 600;
  color: var(--ink-soft);
}

.facts dd {
  margin: 0;
}

.warnings {
  margin: 12px 0 0;
  padding: 10px 12px 10px 28px;
  border-left: 3px solid var(--open);
  background: var(--open-tint);
  font-size: 0.85rem;
}

.yaml-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.yaml {
  margin: 8px 0 0;
  padding: 12px;
  border: 1px solid var(--contour);
  border-radius: var(--radius);
  background: var(--paper);
  font-size: 0.8rem;
  overflow-x: auto;
}
</style>

<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue'
import { CalendarRange, ExternalLink, X } from 'lucide-vue-next'
import { periodsFor, type Subject } from '@/engine'
import AssessmentPanel from '@/components/subject/AssessmentPanel.vue'
import { useI18n } from '@/i18n'
import { categoryLabel, describeReq } from '@/i18n/format'

/** A quick look at a subject without leaving the planner. */
const props = defineProps<{ code: string; subject?: Subject; course: string; year: number }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')

onMounted(() => dialog.value?.showModal())

const periods = computed(() => (props.subject ? periodsFor(props.subject, props.year) : []))
const category = computed(() => categoryLabel(t.value, props.subject?.categories[props.course]))
const ratings = computed(() => {
  const s = props.subject?.signals
  if (!s) return []
  return [
    { key: 'rating.difficulty', value: s.difficulty },
    { key: 'rating.workload', value: s.workload },
    { key: 'rating.generosity', value: s.grading },
  ].filter((r): r is { key: string; value: number } => r.value !== undefined)
})

// Clicking the dimmed backdrop (the dialog element itself) closes it.
function onClick(event: MouseEvent): void {
  if (event.target === dialog.value) dialog.value?.close()
}
</script>

<template>
  <dialog ref="dialog" class="peek" :aria-label="code" @close="emit('close')" @click="onClick">
    <div class="peek-body">
      <header class="peek-head">
        <div>
          <p class="code peek-code">{{ code }}</p>
          <h2 class="peek-title">{{ subject?.title ?? t('plan.notInDataset') }}</h2>
        </div>
        <button class="peek-close" type="button" :aria-label="t('subject.close')" @click="dialog?.close()">
          <X :size="18" aria-hidden="true" />
        </button>
      </header>

      <template v-if="subject">
        <p class="peek-facts">
          <span class="chip">{{ t('subject.level', { level: subject.level }) }}</span>
          <span class="chip">{{ t('subject.points', { points: subject.points }) }}</span>
          <span v-if="category" class="chip">{{ category }}</span>
          <span class="chip">
            <CalendarRange :size="14" aria-hidden="true" />
            <template v-if="subject.offerings === 'unknown'">{{ t('subject.runsUnknown') }}</template>
            <template v-else-if="periods.length === 0">{{ t('subject.notRunning') }}</template>
            <template v-else>{{ periods.map((p) => t(`period.${p}`)).join(' · ') }}</template>
          </span>
        </p>

        <section class="peek-section">
          <h3 class="peek-label">{{ t('subject.needs') }}</h3>
          <p v-if="subject.prerequisites === 'none'">{{ t('subject.needsNone') }}</p>
          <p v-else-if="subject.prerequisites === 'unknown'" class="muted">{{ t('subject.notRecorded') }}</p>
          <p v-else>{{ describeReq(t, subject.prerequisites) }}</p>
        </section>

        <AssessmentPanel class="peek-section" :subject="subject" :year="year" />

        <section class="peek-section">
          <h3 class="peek-label">{{ t('subject.ratingsTitle') }}</h3>
          <p v-if="ratings.length === 0" class="muted">{{ t('subject.noRatings') }}</p>
          <template v-else>
            <p v-for="r in ratings" :key="r.key" class="peek-rating">
              <span>{{ t(r.key) }}</span><strong>{{ r.value }}/5</strong>
            </p>
            <p class="muted">{{ t('subject.reviews', { n: subject.signals?.reviews ?? 0 }) }}</p>
          </template>
        </section>
      </template>

      <footer class="peek-actions">
        <a class="button button-accent" :href="`#/subject/${code}`">
          {{ t('subject.fullPage') }} <ExternalLink :size="15" aria-hidden="true" />
        </a>
        <button class="button button-quiet" type="button" @click="dialog?.close()">{{ t('subject.close') }}</button>
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.peek {
  width: min(560px, calc(100vw - 32px));
  max-height: min(86vh, 760px);
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-2);
}

.peek::backdrop {
  background: rgb(16 16 20 / 40%);
}

.peek-body {
  display: grid;
  gap: 16px;
  padding: 22px;
}

.peek-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.peek-code {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--accent);
}

.peek-title {
  margin-top: 2px;
  font-size: 1.35rem;
}

.peek-close {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink-soft);
  cursor: pointer;
}

.peek-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.peek-section {
  display: grid;
  gap: 6px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.peek-label {
  font-size: 0.9rem;
  font-weight: 650;
}

.peek-rating {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.92rem;
}

.muted {
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.peek-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

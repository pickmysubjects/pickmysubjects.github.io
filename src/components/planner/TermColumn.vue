<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { X } from 'lucide-vue-next'
import { periodsFor, termShare, type Issue, type PlanTerm, type Subject } from '@/engine'
import { termLabel } from '@/i18n/format'
import { useI18n } from '@/i18n'
import SubjectCard from './SubjectCard.vue'
import DoneCard from './DoneCard.vue'
import type { PastResult } from '@/utils/pastTerms'
import SubjectPicker from './SubjectPicker.vue'
import TermStressNote from './TermStressNote.vue'

const props = defineProps<{
  /** Subjects on My record in this same semester (done or failed), shown above the planned ones. */
  done?: PastResult[]
  term: PlanTerm
  termIndex: number
  subjects: Record<string, Subject>
  issuesByCode: Record<string, Issue[]>
  termIssues: Issue[]
  course: string
  load: number
  options: { code: string; title: string }[]
  roles: Record<string, 'required' | 'option'>
  related: Set<string> | null
  /** Year-long subjects whose other half is in this term: begun in Semester 1, or on the record in the other semester. */
  carried?: string[]
}>()
const emit = defineEmits<{
  add: [code: string]
  remove: [code: string]
  drop: [code: string, from: number]
  moveBy: [code: string, delta: number]
  hover: [code: string | null]
  removeTerm: []
  open: [code: string]
}>()

const { t } = useI18n()
const dragOver = shallowRef(false)
// Enrolled points, a fail included: the semester was that full.
const donePoints = computed(() => (props.done ?? []).reduce((sum, r) => sum + termShare(props.subjects[r.code]), 0))
// A year-long subject puts half its points on each of its two semesters.
const points = computed(() => donePoints.value + [...props.term.subjects, ...(props.carried ?? [])].reduce((sum, c) => sum + termShare(props.subjects[c]), 0))
const overloaded = computed(() => points.value > props.load)
const fill = computed(() => `${Math.min(100, (points.value / props.load) * 100)}%`)

/** "S1 only" / "S2 only" for subjects that run in a single semester. */
function onlyIn(code: string): string | null {
  const s = props.subjects[code]
  if (!s) return null
  if (s.yearLong) return t.value('plan.yearLong')
  const sems = periodsFor(s, props.term.year).filter((p) => p === 'semester-1' || p === 'semester-2')
  if (sems.length !== 1) return null
  return t.value(sems[0] === 'semester-1' ? 'plan.s1Only' : 'plan.s2Only')
}

function onDrop(event: DragEvent): void {
  dragOver.value = false
  try {
    const { code, from } = JSON.parse(event.dataTransfer?.getData('text/plain') ?? '') as { code: string; from: number }
    emit('drop', code, from)
  } catch {
    // Not one of our cards.
  }
}
</script>

<template>
  <section
    class="term"
    :class="{ 'term-over': dragOver }"
    :aria-label="termLabel(t, term)"
    @dragover.prevent="dragOver = true"
    @dragleave="dragOver = false"
    @drop.prevent="onDrop"
  >
    <header class="term-head">
      <h3 class="term-name">{{ termLabel(t, term) }}</h3>
      <button
        v-if="term.subjects.length === 0 && (term.period === 'summer' || term.period === 'winter')"
        class="term-remove"
        type="button"
        :aria-label="t('plan.removeThisTerm')"
        :title="t('plan.removeThisTerm')"
        @click="emit('removeTerm')"
      >
        <X :size="14" aria-hidden="true" />
      </button>
      <span class="term-points" :class="{ 'term-points-over': overloaded }">{{ points }} / {{ load }}</span>
      <span class="term-bar" aria-hidden="true"><span class="term-bar-fill" :style="{ width: fill }" /></span>
      <TermStressNote :term-index="termIndex" />
    </header>
    <!-- Already on My record for this semester: the same card, done. -->
    <DoneCard
      v-for="r in done ?? []"
      :key="`done-${r.code}`"
      :result="r"
      :subject="subjects[r.code]"
      :highlighted="related?.has(r.code) ?? false"
      :dimmed="related !== null && !related.has(r.code)"
      @open="emit('open', r.code)"
      @hover="emit('hover', $event ? r.code : null)"
    />
    <SubjectCard
      v-for="code in term.subjects"
      :key="code"
      :code="code"
      :subject="subjects[code]"
      :issues="issuesByCode[code] ?? []"
      :course="course"
      :only-in="onlyIn(code)"
      :role="roles[code]"
      :term-index="termIndex"
      :highlighted="related?.has(code) ?? false"
      :dimmed="related !== null && !related.has(code)"
      @open="emit('open', code)"
      @remove="emit('remove', code)"
      @move-by="emit('moveBy', code, $event)"
      @hover="emit('hover', $event ? code : null)"
    />
    <!-- Year-long subjects carried on from Semester 1: planned there, studied here too. -->
    <button
      v-for="code in carried ?? []"
      :key="`carried-${code}`"
      class="carried"
      type="button"
      @click="emit('open', code)"
    >
      <span class="carried-code">{{ code }}</span>
      <span class="carried-note">{{ t(term.period === 'semester-2' ? 'plan.yearLongCont' : 'plan.yearLong') }}</span>
    </button>
    <p v-if="term.subjects.length === 0 && !done?.length && !carried?.length" class="term-empty">{{ t('plan.emptyTerm') }}</p>
    <SubjectPicker :options="options" :term-index="termIndex" @pick="emit('add', $event)" />
  </section>
</template>

<style scoped>
.carried {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  align-items: baseline;
  padding: 8px 10px;
  border-radius: var(--radius);
  border: 1px dashed var(--glass-edge);
  background: var(--paper-raised);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.carried-code {
  font-weight: 600;
}

.carried-note {
  font-size: 0.85em;
  opacity: 0.75;
}

.term {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex: 1 1 185px;
  min-width: 185px;
  max-width: 300px;
  padding: 10px;
  border-radius: var(--radius);
  transition: background 0.15s;
}

.term-over {
  background: var(--overprint-tint);
}

.term-remove {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid var(--glass-edge);
  background: var(--glass-fill);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  color: var(--ink-soft);
  cursor: pointer;
}

.term-head {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 4px 8px;
}

.term-name {
  font-size: 0.9375rem;
  font-weight: 700;
}

.term-points {
  font-family: var(--font-code);
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.term-points-over {
  color: var(--stop);
  font-weight: 600;
}

.term-bar {
  grid-column: 1 / -1;
  height: 3px;
  background: var(--contour);
  border-radius: 2px;
  overflow: hidden;
}

.term-bar-fill {
  display: block;
  height: 100%;
  background: var(--overprint);
}

.term-empty {
  margin: 0;
  padding: 18px 8px;
  border: 1.5px dashed var(--contour);
  border-radius: var(--radius);
  font-size: 0.8125rem;
  color: var(--ink-soft);
  text-align: center;
}
</style>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { X } from 'lucide-vue-next'
import { periodsFor, type Issue, type PlanTerm, type Subject } from '@/engine'
import { issueText, termLabel } from '@/i18n/format'
import { useI18n } from '@/i18n'
import SubjectCard from './SubjectCard.vue'
import SubjectPicker from './SubjectPicker.vue'

const props = defineProps<{
  term: PlanTerm
  termIndex: number
  subjects: Record<string, Subject>
  issuesByCode: Record<string, Issue[]>
  termIssues: Issue[]
  course: string
  load: number
  options: { code: string; title: string }[]
  related: Set<string> | null
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
const points = computed(() => props.term.subjects.reduce((sum, c) => sum + (props.subjects[c]?.points ?? 0), 0))
const overloaded = computed(() => points.value > props.load)
// A gentle "this term looks heavy" note, from ratings or class hours.
const heavy = computed(() => {
  const issue = props.termIssues.find((i) => i.kind.startsWith('heavy-term'))
  return issue ? issueText(t.value, issue, [], []) : null
})
const fill = computed(() => `${Math.min(100, (points.value / props.load) * 100)}%`)

/** "S1 only" / "S2 only" for subjects that run in a single semester (pain point: when is it offered?). */
function onlyIn(code: string): string | null {
  const s = props.subjects[code]
  if (!s) return null
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
      <span v-if="heavy" class="term-heavy" :title="heavy" tabindex="0" role="note" :aria-label="heavy">{{ t('plan.heavy') }}</span>
      <span class="term-bar" aria-hidden="true"><span class="term-bar-fill" :style="{ width: fill }" /></span>
    </header>
    <SubjectCard
      v-for="code in term.subjects"
      :key="code"
      :code="code"
      :subject="subjects[code]"
      :issues="issuesByCode[code] ?? []"
      :course="course"
      :only-in="onlyIn(code)"
      :term-index="termIndex"
      :highlighted="related?.has(code) ?? false"
      :dimmed="related !== null && !related.has(code)"
      @open="emit('open', code)"
      @remove="emit('remove', code)"
      @move-by="emit('moveBy', code, $event)"
      @hover="emit('hover', $event ? code : null)"
    />
    <p v-if="term.subjects.length === 0" class="term-empty">{{ t('plan.emptyTerm') }}</p>
    <SubjectPicker :options="options" :term-index="termIndex" @pick="emit('add', $event)" />
  </section>
</template>

<style scoped>
.term {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 210px;
  flex: none;
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
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
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
  font-size: 0.95rem;
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
  font-size: 0.8rem;
  color: var(--ink-soft);
  text-align: center;
}
.term-heavy {
  order: 3;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--warn-soft);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--warn);
  cursor: help;
}
</style>

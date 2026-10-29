<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import { periodsFor, termShare, type Issue, type PlanTerm, type Subject } from '@/engine'
import { termLabel } from '@/i18n/format'
import { useI18n } from '@/i18n'
import SubjectCard, { type CardTone, type MoveTarget } from './SubjectCard.vue'
import DoneCard from './DoneCard.vue'
import { termState, type PastResult } from '@/utils/pastTerms'
import type { DropVerdict } from '@/utils/planBoard'
import TermStressNote from './TermStressNote.vue'

const props = defineProps<{
  /** Subjects on My record in this same semester (done or failed), shown above the planned ones. */
  done?: PastResult[]
  term: PlanTerm
  termIndex: number
  subjects: Record<string, Subject>
  issuesByCode: Record<string, Issue[]>
  course: string
  load: number
  roles: Record<string, 'required' | 'option'>
  /** How each subject relates to what's selected (a subject's timeline, or a rule); null: nothing selected. */
  tones: Map<string, CardTone> | null
  /** Year-long subjects whose other half is in this term: begun in Semester 1, or on the record in the other semester. */
  carried?: string[]
  /** While a card is being dragged: whether it may land here, and why not. */
  dropVerdict: DropVerdict | null
  /** The card whose move list is open, and the terms it lists. */
  moveFor: string | null
  selected: string | null
  moveTargets: MoveTarget[]
}>()
const emit = defineEmits<{
  add: []
  remove: [code: string]
  drop: [code: string, from: number]
  hover: [code: string | null]
  select: [code: string]
  open: [code: string]
  swap: [code: string]
  moveSheet: [code: string | null]
  moveTo: [code: string, to: number]
  dragStart: [code: string]
  dragEnd: []
  removeTerm: []
  /** Marked done (to My record, with its mark) or back to planned. */
  done: [code: string, mark: number | undefined]
  undo: [code: string]
}>()

const { t } = useI18n()
const dragOver = shallowRef(false)
// Enrolled points, a fail included: the semester was that full.
const donePoints = computed(() => (props.done ?? []).reduce((sum, r) => sum + termShare(props.subjects[r.code]), 0))
// A year-long subject puts half its points on each of its two semesters.
const points = computed(() => donePoints.value + [...props.term.subjects, ...(props.carried ?? [])].reduce((sum, c) => sum + termShare(props.subjects[c]), 0))
const overloaded = computed(() => points.value > props.load)
const fill = computed(() => `${Math.min(100, (points.value / props.load) * 100)}%`)
const free = computed(() => Math.max(0, props.load - points.value))
const state = computed(() => termState(props.term))
const short = computed(() => props.term.period === 'summer' || props.term.period === 'winter')
const empty = computed(() => props.term.subjects.length === 0 && !props.done?.length && !props.carried?.length)
const dropClass = computed(() => {
  const v = props.dropVerdict
  if (!v || (!v.ok && v.reason === 'same')) return null
  return v.ok ? (dragOver.value ? 'drop-ok drop-over' : 'drop-ok') : 'drop-no'
})
const dropReason = computed(() => {
  const v = props.dropVerdict
  if (!v) return null
  if (v.ok) return v.warn ? t.value(`plan.why.${v.warn}`) : null
  return v.reason !== 'same' ? t.value(`plan.why.${v.reason}`) : null
})

/** "S1 only" / "S2 only" for subjects that run in a single semester. */
function onlyIn(code: string): string | null {
  const s = props.subjects[code]
  if (!s) return null
  if (s.yearLong) return t.value('plan.yearLong')
  const sems = periodsFor(s, props.term.year).filter((p) => p === 'semester-1' || p === 'semester-2')
  // Only worth saying where it could be misread: in its own semester's column it says nothing new
  // (moving it elsewhere says "not offered then" anyway).
  if (sems.length !== 1 || sems[0] === props.term.period) return null
  return t.value(sems[0] === 'semester-1' ? 'plan.s1Only' : 'plan.s2Only')
}

function onDragOver(event: DragEvent): void {
  // Only where it's allowed: no drop target for a subject that can't run or isn't ready here.
  if (props.dropVerdict && !props.dropVerdict.ok) return
  event.preventDefault()
  dragOver.value = true
}

function onDrop(event: DragEvent): void {
  dragOver.value = false
  if (props.dropVerdict && !props.dropVerdict.ok) return
  try {
    const { code, from } = JSON.parse(event.dataTransfer?.getData('text/plain') ?? '') as { code: string; from: number }
    emit('drop', code, from)
  } catch {
    // Not one of our cards.
  }
}
const tone = (code: string): CardTone | null => props.tones?.get(code) ?? null
</script>

<template>
  <section
    class="term"
    :class="[dropClass, { 'term-short': short }]"
    :aria-label="termLabel(t, term)"
    :data-term="termIndex"
    :data-term-key="`${term.year}-${term.period}`"
    @dragover="onDragOver"
    @dragleave="dragOver = false"
    @drop.prevent="onDrop"
  >
    <header class="term-head">
      <h3 class="term-name">{{ termLabel(t, term) }}</h3>
      <span class="term-points" :class="{ 'term-points-over': overloaded }">{{ points }} / {{ load }}</span>
      <button
        v-if="term.subjects.length === 0 && short"
        class="term-remove"
        type="button"
        :aria-label="t('plan.removeThisTerm')"
        :title="t('plan.removeThisTerm')"
        @click="emit('removeTerm')"
      >
        <X :size="14" aria-hidden="true" />
      </button>
      <span class="term-bar" aria-hidden="true"><span class="term-bar-fill" :style="{ width: fill }" /></span>
      <span v-if="state !== 'ahead'" class="term-state">{{ t(state === 'now' ? 'plan.termInProgress' : 'plan.termEnded') }}</span>
    </header>
    <TermStressNote :term-index="termIndex" />
    <p v-if="dropReason" class="drop-reason">{{ dropReason }}</p>
    <div class="cards">
      <!-- Already on My record for this semester: the same card, done. -->
      <DoneCard
        v-for="r in done ?? []"
        :key="`done-${r.code}`"
        :result="r"
        :subject="subjects[r.code]"
        :highlighted="tone(r.code) !== null"
        :dimmed="tones !== null && tone(r.code) === null"
        :future="state === 'ahead'"
        @open="emit('open', r.code)"
        @hover="emit('hover', $event ? r.code : null)"
        @done="emit('done', r.code, $event)"
        @undo="emit('undo', r.code)"
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
        :year="term.year"
        :tone="tone(code)"
        :selected="selected === code"
        :dimmed="tones !== null && tone(code) === null"
        :move-open="moveFor === code"
        :move-targets="moveFor === code ? moveTargets : []"
        @select="emit('select', code)"
        @open="emit('open', code)"
        @hover="emit('hover', $event ? code : null)"
        @swap="emit('swap', code)"
        @move-sheet="emit('moveSheet', $event ? code : null)"
        @move-to="emit('moveTo', code, $event)"
        @remove="emit('remove', code)"
        @done="emit('done', code, $event)"
        @drag-start="emit('dragStart', code)"
        @drag-end="emit('dragEnd')"
      />
      <!-- Year-long subjects carried on from Semester 1: planned there, studied here too. -->
      <button v-for="code in carried ?? []" :key="`carried-${code}`" class="carried" type="button" :data-carried="code" @click="emit('select', code)">
        <span class="carried-code">{{ code }}</span>
        <span class="carried-note">{{ t(term.period === 'semester-2' ? 'plan.yearLongCont' : 'plan.yearLong') }}</span>
      </button>
      <button v-if="free > 0 || empty" class="add-slot" :class="{ 'add-slot-empty': empty }" type="button" @click="emit('add')">
        <Plus :size="16" aria-hidden="true" />
        <span>{{ free > 0 ? t('plan.addFree', { n: free }) : t('plan.addInTerm') }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.term {
  display: flex;
  /* A fixed, comfortable width: the board scrolls sideways rather than squeezing a semester. */
  flex: 0 0 208px;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 10px;
  scroll-margin: 96px 24px;
  /* A lane on the board's glass: a faint tint and a hairline, no shine or shadow of its own. */
  border: 1px solid var(--col-edge);
  border-radius: var(--radius);
  background: var(--col-fill);
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}

/* No backdrop blur on the columns: a blur makes each column its own layer, which would paint
   over the prerequisite lines (PlanMap's .routes), and the board is already the glass. */
.term-short {
  flex-basis: 192px;
  background: color-mix(in srgb, var(--warn) 5%, transparent);
}

/* While dragging: allowed terms go green, the rest grey out and say why. */
.drop-ok {
  border: 1px dashed var(--good);
  background: color-mix(in srgb, var(--good-soft) 60%, transparent);
}

.drop-over {
  border-style: solid;
  background: var(--good-soft);
}

.drop-no {
  opacity: 0.55;
  border: 1px dashed var(--line);
  background: color-mix(in srgb, var(--ink) 5%, transparent);
}

.drop-reason {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}

.carried {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  align-items: baseline;
  padding: 8px 10px;
  border-radius: var(--radius);
  border: 1px dashed var(--line);
  background: var(--glass-shine), var(--tile-fill);
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

.term-head {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: baseline;
  gap: 4px 8px;
}

.term-state {
  grid-column: 1 / -1;
  font-size: 0.75rem;
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
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

.term-remove {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--glass-shine), var(--sheet-fill);
  color: var(--ink-soft);
  cursor: pointer;
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

.add-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 30px;
  padding: 4px 8px;
  border: 1px dashed var(--line);
  border-radius: var(--radius);
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.add-slot:hover,
.add-slot:focus-visible {
  border-color: var(--accent);
  color: var(--accent);
}

.add-slot-empty {
  min-height: 60px;
}

/* Arrived from the compare page's Edit: this semester glows for a moment. */
.term-flash {
  animation: term-flash 1.6s ease-out;
}

@keyframes term-flash {
  0%,
  40% {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 45%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .term-flash {
    animation: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 45%, transparent);
  }
}

@media (max-width: 640px) {
  .term {
    flex-basis: auto;
    min-width: 0;
  }

  .add-slot {
    min-height: 44px;
  }
}
</style>

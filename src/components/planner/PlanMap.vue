<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import { carriedInto, SHORT_TERM_LOAD, termKey, type Issue, type Period, type PlanTerm, type Subject } from '@/engine'
import { termLabel } from '@/i18n/format'
import TermColumn from './TermColumn.vue'
import PastTermColumn from './PastTermColumn.vue'
import SlotPicker from './SlotPicker.vue'
import type { CardTone, MoveTarget } from './SubjectCard.vue'
import type { PastResult, PastTerm } from '@/utils/pastTerms'
import { chainOf, dropVerdict, type DropVerdict, type Edge } from '@/utils/planBoard'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'

/**
 * The plan, one row per year (summer, Semester 1, winter, Semester 2 side by side), so the whole
 * degree fits on one screen. Selecting a subject lights up its prerequisite route and what it
 * unlocks; a requirement from the side panel lights up the subjects counting toward it.
 */
const props = defineProps<{
  /** Semesters already done, from the student's record (read-only, before the plan). */
  past?: { terms: PastTerm[]; undated: PastResult[] }
  terms: PlanTerm[]
  subjects: Record<string, Subject>
  issues: Issue[]
  course: string
  load: number
  /** Subjects the degree or major requires, and picks from a major's lists. */
  roles: Record<string, 'required' | 'option'>
  /** Every subject on the major's or specialisation's lists. */
  optionSet: ReadonlySet<string>
  edges: Edge[]
  selected: string | null
  /** Subjects counting toward the requirement picked in the side panel. */
  ruleCodes: ReadonlySet<string> | null
}>()
const emit = defineEmits<{
  add: [termIndex: number, code: string]
  replace: [termIndex: number, from: string, to: string]
  remove: [termIndex: number, code: string]
  move: [code: string, from: number, to: number]
  addTerm: []
  addTermAt: [year: number, period: Period]
  removeTerm: [index: number]
  removeLastTerm: []
  open: [code: string]
  select: [code: string | null]
}>()

interface Route {
  key: string
  d: string
}

const { t } = useI18n()
const { data } = useDataset()
const plan = usePlan()

const board = useTemplateRef<HTMLElement>('board')
const routes = shallowRef<Route[]>([])
const hovered = shallowRef<string | null>(null)
const moveFor = shallowRef<string | null>(null)
const dragging = shallowRef<{ code: string; from: number } | null>(null)
const picker = shallowRef<{ termIndex: number; replacing?: string } | null>(null)

const issuesByCode = computed(() => {
  const map: Record<string, Issue[]> = {}
  for (const i of props.issues) if (i.subject) (map[i.subject] ??= []).push(i)
  return map
})

// A recorded semester that the plan also has shares its column: done subjects sit at the top.
const sameTerm = (a: { year: number; period: string }, b: { year: number; period: string }) => a.year === b.year && a.period === b.period
const pastOnly = computed(() => (props.past?.terms ?? []).filter((p) => !props.terms.some((x) => sameTerm(x, p))))
// Year-long results on the record in the other semester of the same year: half their points are studied here.
const recordCarried = (x: { year: number; period: Period }): string[] => {
  if (x.period !== 'semester-1' && x.period !== 'semester-2') return []
  const other = x.period === 'semester-1' ? 'semester-2' : 'semester-1'
  return (props.past?.terms.find((p) => p.year === x.year && p.period === other)?.results ?? []).filter((r) => props.subjects[r.code]?.yearLong).map((r) => r.code)
}
const doneIn = (x: PlanTerm) => props.past?.terms.find((p) => sameTerm(p, x))?.results ?? []
const isShort = (p: Period) => p === 'summer' || p === 'winter'
const termLoadFor = (p: Period) => (isShort(p) ? Math.min(SHORT_TERM_LOAD, props.load) : props.load)

type Column = { kind: 'past'; key: number; p: PastTerm } | { kind: 'plan'; key: number; term: PlanTerm; i: number }

// Summer (Jan–Feb) and winter (Jun–Jul) terms the student could add: between the board's first
// semester (recorded ones included) and the plan's last.
const span = computed(() => {
  const all = [...(props.past?.terms ?? []), ...props.terms]
  if (!all.length || !props.terms.length) return null
  const keys = all.map((x) => termKey(x.year, x.period))
  const last = props.terms.at(-1) as PlanTerm
  return { from: Math.min(...keys), to: termKey(last.year, last.period) }
})
function shortSlots(year: number): { year: number; period: Period }[] {
  const s = span.value
  if (!s) return []
  return (['summer', 'winter'] as const)
    .filter((period) => {
      const key = termKey(year, period)
      return key > s.from && key < s.to && ![...props.terms, ...(props.past?.terms ?? [])].some((x) => x.year === year && x.period === period)
    })
    .map((period) => ({ year, period }))
}

// Every column in time order: recorded-only semesters and planned ones (which may hold done subjects).
const columns = computed<Column[]>(() =>
  [
    ...pastOnly.value.map((p) => ({ kind: 'past' as const, key: termKey(p.year, p.period), p })),
    ...props.terms.map((term, i) => ({ kind: 'plan' as const, key: termKey(term.year, term.period), term, i })),
  ].sort((a, b) => a.key - b.key),
)
// Summer and winter terms that can be added, each one tap.
const shortTerms = computed(() => {
  const years = [...new Set([...(props.past?.terms ?? []), ...props.terms].map((x) => x.year))].sort()
  return years.flatMap((y) => shortSlots(y))
})

/** How each subject relates to what's in focus: the selected (or hovered) subject's route, or a rule's subjects. */
const focus = computed(() => props.selected ?? (props.ruleCodes ? null : hovered.value))
const tones = computed<Map<string, CardTone> | null>(() => {
  if (props.ruleCodes) return new Map([...props.ruleCodes].map((c) => [c, 'rule' as const]))
  const code = focus.value
  if (!code) return null
  const { needs, unlocks } = chainOf(code, props.edges)
  // A hover only previews a route there is: a subject with no links leaves the board as it is.
  if (!props.selected && needs.size + unlocks.size === 0) return null
  const out = new Map<string, CardTone>([[code, 'self']])
  for (const c of needs) out.set(c, 'need')
  for (const c of unlocks) out.set(c, 'unlock')
  return out
})
const toneSet = computed(() => (tones.value ? new Set(tones.value.keys()) : null))
// Only the focused route's links are drawn: a quiet board until something is picked.
const shownEdges = computed(() => {
  const set = tones.value
  if (!set || props.ruleCodes) return []
  return props.edges.filter((e) => set.has(e.from) && set.has(e.to))
})

function measure(): void {
  const el = board.value
  if (!el) return
  const base = el.getBoundingClientRect()
  const box = (code: string) =>
    (el.querySelector<HTMLElement>(`[data-code="${code}"]`) ?? el.querySelector<HTMLElement>(`[data-past-code="${code}"]`))?.getBoundingClientRect()
  const next: Route[] = []
  for (const e of shownEdges.value) {
    const a = box(e.from)
    const b = box(e.to)
    if (!a || !b) continue
    let d: string
    if (b.left >= a.right - 4) {
      // A later column: right edge to left edge.
      const x1 = a.right - base.left
      const y1 = a.top + a.height / 2 - base.top
      const x2 = b.left - base.left
      const y2 = b.top + b.height / 2 - base.top
      const bend = Math.max(20, (x2 - x1) / 2)
      d = `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`
    } else {
      // Stacked (phones): bottom of the earlier card to the top of the later one.
      const x1 = a.left + a.width / 2 - base.left
      const y1 = a.bottom - base.top
      const x2 = b.left + b.width / 2 - base.left
      const y2 = b.top - base.top
      const bend = Math.max(20, (y2 - y1) / 2)
      d = `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`
    }
    next.push({ key: `${e.from}-${e.to}`, d })
  }
  routes.value = next
}

watch([shownEdges, () => props.terms], () => nextTick(measure), { flush: 'post' })

// While dragging: where the card may go (green) and where it can't, with the reason.
const verdicts = computed<DropVerdict[] | null>(() => {
  const d = dragging.value
  if (!d) return null
  return props.terms.map((_, i) => dropVerdict(plan.plan.value, data.value, d.code, d.from, i, props.load))
})
const moveTargets = computed<MoveTarget[]>(() => {
  const code = moveFor.value
  if (!code) return []
  const from = props.terms.findIndex((x) => x.subjects.includes(code))
  return props.terms.map((term, i) => ({ index: i, label: termLabel(t.value, term), verdict: dropVerdict(plan.plan.value, data.value, code, from, i, props.load) }))
})

function onMoveTo(code: string, from: number, to: number): void {
  moveFor.value = null
  emit('move', code, from, to)
}
function onDrop(code: string, from: number, to: number): void {
  dragging.value = null
  emit('move', code, from, to)
}
function onSelect(code: string): void {
  moveFor.value = null
  emit('select', props.selected === code ? null : code)
}
function onPick(code: string): void {
  const p = picker.value
  if (!p) return
  if (p.replacing) emit('replace', p.termIndex, p.replacing, code)
  else emit('add', p.termIndex, code)
}

// The subject window's Swap and Move hand over to the board.
defineExpose({
  openSwap(code: string): void {
    const i = props.terms.findIndex((x) => x.subjects.includes(code))
    if (i >= 0) picker.value = { termIndex: i, replacing: code }
  },
  openMove(code: string): void {
    moveFor.value = code
  },
})

// Esc clears the selection and closes the move list; a tap outside the list closes it.
function onKey(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || picker.value) return
  if (moveFor.value) moveFor.value = null
  else if (props.selected) emit('select', null)
}
function onPointer(event: PointerEvent): void {
  if (moveFor.value && !(event.target as Element).closest('.sheet, .act')) moveFor.value = null
}

let observer: ResizeObserver | null = null
onMounted(() => {
  measure()
  observer = new ResizeObserver(() => measure())
  if (board.value) observer.observe(board.value)
  document.addEventListener('keydown', onKey)
  document.addEventListener('pointerdown', onPointer)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('pointerdown', onPointer)
})
</script>

<template>
  <div ref="board" class="board" :class="{ 'board-dragging': dragging }">
    <svg class="routes" aria-hidden="true">
      <defs>
        <marker id="route-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L8 4 L0 8 z" class="route-head" />
        </marker>
      </defs>
      <path v-for="r in routes" :key="r.key" class="route" :d="r.d" marker-end="url(#route-arrow)" />
    </svg>

    <div class="track" @scroll.passive="measure">
      <PastTermColumn
        v-if="past?.undated.length"
        :term="null"
        :results="past.undated"
        :subjects="subjects"
        :planned="terms"
        :load="load"
        :related="toneSet"
        @open="onSelect"
        @hover="hovered = $event"
      />
      <template v-for="col in columns" :key="col.key">
        <PastTermColumn
          v-if="col.kind === 'past'"
          :term="col.p"
          :results="col.p.results"
          :carried="recordCarried(col.p)"
          :subjects="subjects"
          :planned="terms"
          :load="termLoadFor(col.p.period)"
          :related="toneSet"
          @open="onSelect"
          @hover="hovered = $event"
        />
        <TermColumn
          v-else
          :term="col.term"
          :term-index="col.i"
          :carried="[...recordCarried(col.term), ...carriedInto(terms, col.i, { subjects })]"
          :done="doneIn(col.term)"
          :subjects="subjects"
          :issues-by-code="issuesByCode"
          :course="course"
          :load="termLoadFor(col.term.period)"
          :roles="roles"
          :tones="tones"
          :drop-verdict="verdicts ? (verdicts[col.i] ?? null) : null"
          :move-for="moveFor"
          :selected="selected"
          :move-targets="moveTargets"
          @add="picker = { termIndex: col.i }"
          @swap="(code) => (picker = { termIndex: col.i, replacing: code })"
          @remove="(code) => emit('remove', col.i, code)"
          @drop="(code, from) => onDrop(code, from, col.i)"
          @move-sheet="moveFor = $event"
          @move-to="(code, to) => onMoveTo(code, col.i, to)"
          @select="onSelect"
          @open="emit('open', $event)"
          @hover="hovered = $event"
          @drag-start="(code) => (dragging = { code, from: col.i })"
          @drag-end="dragging = null"
          @remove-term="emit('removeTerm', col.i)"
        />
      </template>
      <div class="board-tools">
        <button class="tool" type="button" @click="emit('addTerm')"><Plus :size="14" aria-hidden="true" /> {{ t('plan.addTerm') }}</button>
        <!-- Summer and winter terms: one tap each, no menu. -->
        <button v-for="s in shortTerms" :key="`${s.year}|${s.period}`" class="tool tool-short" type="button" @click="emit('addTermAt', s.year, s.period)">
          <Plus :size="14" aria-hidden="true" /> {{ termLabel(t, s) }}
        </button>
        <button v-if="terms.length > 0 && terms.at(-1)?.subjects.length === 0" class="tool" type="button" @click="emit('removeLastTerm')">{{ t('plan.removeTerm') }}</button>
      </div>
    </div>

    <SlotPicker
      v-if="picker"
      :key="`${picker.termIndex}-${picker.replacing ?? ''}`"
      :term-index="picker.termIndex"
      :replacing="picker.replacing"
      :role="picker.replacing ? roles[picker.replacing] : undefined"
      :option-set="optionSet"
      @pick="onPick"
      @close="picker = null"
    />
  </div>
</template>

<style scoped>
.board {
  position: relative;
  display: grid;
  gap: 18px;
  min-width: 0;
}

.routes {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.route {
  fill: none;
  stroke: var(--overprint);
  stroke-width: 2.2;
  stroke-dasharray: 6 4;
}

.route-head {
  fill: var(--overprint);
}

.track {
  display: flex;
  gap: 10px;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 6px;
}

.board-tools {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 6px;
  width: 130px;
  padding-top: 4px;
}

.tool {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 30px;
  padding: 4px 10px;
  border: 1px dashed var(--line);
  border-radius: 999px;
  background: none;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.tool:hover,
.tool:focus-visible {
  border-color: var(--accent);
  color: var(--accent);
}

.tool-short:hover {
  border-color: var(--warn);
  color: var(--warn);
}

/* Phones: terms stack top to bottom, no sideways swiping. */
@media (max-width: 640px) {
  .track {
    flex-direction: column;
    overflow: visible;
  }

  .board-tools {
    flex-direction: row;
    flex-wrap: wrap;
    width: auto;
  }
}

/* On paper: no route lines. */
@media print {
  .routes {
    display: none;
  }

  .track {
    flex-wrap: wrap;
    overflow: visible;
  }
}
</style>

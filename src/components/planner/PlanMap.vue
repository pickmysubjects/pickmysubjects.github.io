<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { referencedSubjects, SHORT_TERM_LOAD, termKey, type Issue, type Period, type PlanTerm, type Subject } from '@/engine'
import { termLabel } from '@/i18n/format'
import { ChevronDown } from 'lucide-vue-next'
import TermColumn from './TermColumn.vue'
import PastTermColumn from './PastTermColumn.vue'
import type { PastResult, PastTerm } from '@/utils/pastTerms'
import { useI18n } from '@/i18n'

const props = defineProps<{
  /** Semesters already done, from the student's record (read-only, before the plan). */
  past?: { terms: PastTerm[]; undated: PastResult[] }
  terms: PlanTerm[]
  subjects: Record<string, Subject>
  issues: Issue[]
  course: string
  load: number
  options: { code: string; title: string }[]
  /** Subjects the degree or major requires, and picks from a major's lists. */
  roles: Record<string, 'required' | 'option'>
}>()
const emit = defineEmits<{
  add: [termIndex: number, code: string]
  remove: [termIndex: number, code: string]
  move: [code: string, from: number, to: number]
  addTerm: []
  addTermAt: [year: number, period: Period]
  removeTerm: [index: number]
  removeLastTerm: []
  open: [code: string]
}>()

interface Route {
  from: string
  to: string
  d: string
}

const { t } = useI18n()

// Summer (Jan–Feb) and winter (Jun–Jul) terms the student could add, within the plan's span.
// From the first semester on the board, recorded ones included (a summer taken back then can be
// added and marked done), to the plan's last.
const shortTerms = computed(() => {
  const recorded = props.past?.terms ?? []
  const first = [...recorded, ...props.terms].reduce<{ year: number; period: Period } | undefined>(
    (a, b) => (a && termKey(a.year, a.period) <= termKey(b.year, b.period) ? a : b),
    undefined,
  )
  const last = props.terms.at(-1)
  if (!first || !last) return []
  const from = termKey(first.year, first.period)
  const to = termKey(last.year, last.period)
  const slots: { year: number; period: Period }[] = []
  for (let year = first.year; year <= last.year; year++) {
    for (const period of ['summer', 'winter'] as const) {
      const key = termKey(year, period)
      const taken = [...props.terms, ...recorded].some((x) => x.year === year && x.period === period)
      if (key > from && key < to && !taken) slots.push({ year, period })
    }
  }
  return slots
})

// The summer/winter terms open as a short list of buttons under their own button, so the
// three tools look and work alike (a native dropdown can't be styled to match).
const shortOpen = shallowRef(false)
function addShortTerm(year: number, period: Period): void {
  emit('addTermAt', year, period)
  shortOpen.value = false
}
const track = useTemplateRef<HTMLElement>('track')
const routes = shallowRef<Route[]>([])
const hovered = shallowRef<string | null>(null)

const issuesByCode = computed(() => {
  const map: Record<string, Issue[]> = {}
  for (const i of props.issues) if (i.subject) (map[i.subject] ??= []).push(i)
  return map
})

// A recorded semester that the plan also has shares its column: done subjects sit at the top.
const sameTerm = (a: { year: number; period: string }, b: { year: number; period: string }) => a.year === b.year && a.period === b.period
const pastOnly = computed(() => (props.past?.terms ?? []).filter((p) => !props.terms.some((t) => sameTerm(t, p))))
const doneIn = (t: PlanTerm) => props.past?.terms.find((p) => sameTerm(p, t))?.results ?? []

/**
 * Prerequisite edges, earlier term → later term: between planned subjects, and from subjects
 * already passed (the record's columns sit before the plan; undated ones first of all).
 */
const edges = computed(() => {
  // Ordered by when, not by column: recorded and planned semesters interleave.
  const termOf = new Map<string, number>()
  for (const r of props.past?.undated ?? []) if (!r.failed) termOf.set(r.code, -Infinity)
  for (const t of pastOnly.value) for (const r of t.results) if (!r.failed) termOf.set(r.code, termKey(t.year, t.period))
  for (const t of props.terms) {
    for (const r of doneIn(t)) if (!r.failed) termOf.set(r.code, termKey(t.year, t.period))
    for (const c of t.subjects) termOf.set(c, termKey(t.year, t.period))
  }
  const out: { from: string; to: string }[] = []
  for (const [code, i] of termOf) {
    const s = props.subjects[code]
    if (!s) continue
    for (const pre of referencedSubjects(s.prerequisites)) {
      const j = termOf.get(pre)
      if (j !== undefined && j < i) out.push({ from: pre, to: code })
    }
  }
  return out
})

/** Subjects linked to the hovered one: itself, what it needs, and what needs it. */
const related = computed(() => {
  if (!hovered.value) return null
  const set = new Set([hovered.value])
  for (const e of edges.value) {
    if (e.to === hovered.value) set.add(e.from)
    if (e.from === hovered.value) set.add(e.to)
  }
  return set
})

function measure(): void {
  const el = track.value
  if (!el) return
  const base = el.getBoundingClientRect()
  const box = (code: string) =>
    (el.querySelector<HTMLElement>(`[data-code="${code}"]`) ?? el.querySelector<HTMLElement>(`[data-past-code="${code}"]`))?.getBoundingClientRect()
  const next: Route[] = []
  for (const e of edges.value) {
    const a = box(e.from)
    const b = box(e.to)
    if (!a || !b) continue
    const x1 = a.right - base.left
    const y1 = a.top + a.height / 2 - base.top
    const x2 = b.left - base.left
    const y2 = b.top + b.height / 2 - base.top
    const bend = Math.max(24, (x2 - x1) / 2)
    next.push({ ...e, d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}` })
  }
  routes.value = next
}

watch(() => [props.terms, props.subjects, props.past], () => nextTick(measure), { deep: true, flush: 'post' })

let observer: ResizeObserver | null = null
onMounted(() => {
  measure()
  observer = new ResizeObserver(() => measure())
  if (track.value) observer.observe(track.value)
})
onBeforeUnmount(() => observer?.disconnect())

function routeClass(r: Route): string {
  if (!hovered.value) return 'route'
  return r.from === hovered.value || r.to === hovered.value ? 'route route-on' : 'route route-off'
}

function onMoveBy(code: string, from: number, delta: number): void {
  const to = from + delta
  if (to >= 0 && to < props.terms.length) emit('move', code, from, to)
}
// Wide enough for every term at its narrowest (and the add-term tools); wider screens stretch the
// columns instead. Sized from the term count, not the content, so a long title can't widen them all.
const MIN_TERM = 185
const GAP = 20
// The add-term buttons (about 158px) plus the track's own padding.
const TOOLS = 170
// Every column in time order: recorded-only semesters and planned ones (which may hold done subjects).
const columns = computed(() =>
  [
    ...pastOnly.value.map((p) => ({ kind: 'past' as const, key: termKey(p.year, p.period), p, i: -1 })),
    ...props.terms.map((term, i) => ({ kind: 'plan' as const, key: termKey(term.year, term.period), term, i })),
  ].sort((a, b) => a.key - b.key),
)
const pastCount = computed(() => pastOnly.value.length + (props.past?.undated.length ? 1 : 0))
const trackWidth = computed(() => `max(100%, ${(props.terms.length + pastCount.value) * (MIN_TERM + GAP) + TOOLS}px)`)
</script>

<template>
  <div class="map">
    <div ref="track" class="track" :style="{ width: trackWidth }">
      <svg class="routes" aria-hidden="true">
        <path v-for="r in routes" :key="`${r.from}-${r.to}`" :class="routeClass(r)" :d="r.d" />
      </svg>
      <PastTermColumn
        v-if="past?.undated.length"
        :term="null"
        :results="past.undated"
        :subjects="subjects"
        :planned="terms"
        :load="load"
        :related="related"
        @open="emit('open', $event)"
        @hover="hovered = $event"
      />
      <template v-for="col in columns" :key="col.key">
        <PastTermColumn
          v-if="col.kind === 'past'"
          :key="`past-${col.key}`"
          :term="col.p"
          :results="col.p.results"
          :subjects="subjects"
          :planned="terms"
          :load="load"
          :related="related"
          @open="emit('open', $event)"
          @hover="hovered = $event"
        />
        <TermColumn
          v-else
          :key="`${col.term.year}-${col.term.period}`"
          :term="col.term"
          :term-index="col.i"
          :done="doneIn(col.term)"
          :subjects="subjects"
          :issues-by-code="issuesByCode"
          :term-issues="issues.filter((x) => x.termIndex === col.i && !x.subject)"
          :course="course"
          :load="col.term.period === 'summer' || col.term.period === 'winter' ? Math.min(SHORT_TERM_LOAD, load) : load"
          :options="options"
          :roles="roles"
          :related="related"
          @add="emit('add', col.i, $event)"
          @remove="emit('remove', col.i, $event)"
          @drop="(code, from) => emit('move', code, from, col.i)"
          @move-by="(code, delta) => onMoveBy(code, col.i, delta)"
          @hover="hovered = $event"
          @remove-term="emit('removeTerm', col.i)"
          @open="emit('open', $event)"
        />
      </template>
      <div class="term-tools">
        <button class="button button-quiet" type="button" @click="emit('addTerm')">{{ t('plan.addTerm') }}</button>
        <template v-if="shortTerms.length">
          <button class="button button-quiet" type="button" :aria-expanded="shortOpen" @click="shortOpen = !shortOpen">
            {{ t('plan.addShortTerm') }}
            <ChevronDown :size="14" aria-hidden="true" class="short-chevron" :class="{ open: shortOpen }" />
          </button>
          <div v-if="shortOpen" class="short-list">
            <button
              v-for="s in shortTerms"
              :key="`${s.year}|${s.period}`"
              class="button button-quiet short-item"
              type="button"
              @click="addShortTerm(s.year, s.period)"
            >
              {{ termLabel(t, s) }}
            </button>
          </div>
        </template>
        <button class="button button-quiet" type="button" @click="emit('removeLastTerm')">{{ t('plan.removeTerm') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map {
  overflow-x: auto;
  margin: 0 -6px;
  padding: 0 6px;
}

.track {
  position: relative;
  display: flex;
  gap: 20px;
  padding: 6px 6px 14px;
}

.routes {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.route {
  fill: none;
  stroke: var(--overprint);
  stroke-width: 1.6;
  opacity: 0.55;
  transition: opacity 0.15s, stroke-width 0.15s;
}

.route-on {
  opacity: 1;
  stroke-width: 2.4;
}

.route-off {
  opacity: 0.12;
}

.term-tools {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 8px;
  padding-top: 38px;
}

.short-chevron {
  transition: transform 0.15s;
}

.short-chevron.open {
  transform: rotate(180deg);
}

.short-list {
  display: grid;
  gap: 6px;
  padding-left: 12px;
  border-left: 2px solid var(--glass-edge);
}

.term-tools .short-item {
  min-height: 34px;
  font-weight: 500;
}

.term-tools .button {
  padding: 0 12px;
  font-size: 0.8125rem;
  white-space: nowrap;
}
/* Phones: terms stack top to bottom, so no column is cut off at the screen edge. The route lines
   only make sense side by side, so they are dropped here (each card still names its prerequisites). */
@media (max-width: 720px) {
  .map {
    overflow: visible;
  }

  .track {
    flex-direction: column;
    gap: 14px;
    width: auto !important;
  }

  .track > :deep(.term),
  .track > :deep(.past) {
    max-width: none;
  }

  .routes {
    display: none;
  }

  .term-tools {
    flex-direction: row;
    flex-wrap: wrap;
    padding-top: 0;
  }
}
/* On paper the terms wrap into rows instead of scrolling sideways (the route lines are dropped). */
@media print {
  .map {
    overflow: visible;
  }

  .track {
    flex-wrap: wrap;
    width: auto;
  }

  .routes {
    display: none;
  }
}
</style>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next'
import { carriedInto, SHORT_TERM_LOAD, termKey, type Issue, type Period, type PlanTerm, type Subject } from '@/engine'
import { termLabel } from '@/i18n/format'
import TermColumn from './TermColumn.vue'
import PastTermColumn from './PastTermColumn.vue'
import SlotPicker from './SlotPicker.vue'
import type { CardTone, MoveTarget } from './SubjectCard.vue'
import type { PastResult, PastTerm } from '@/utils/pastTerms'
import { dropVerdict, LINK_COUNTS, type DropVerdict, type Edge } from '@/utils/planBoard'
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
  /** A semester column of My record edited on the board. */
  /** Marked done (to My record) or back to planned, from any card. */
  done: [code: string, mark: number | undefined]
  undo: [code: string]
}>()

interface Route {
  key: string
  d: string
  /** Upstream of the focused subject (its prerequisites) or downstream (what it unlocks). */
  dir: 'need' | 'unlock'
}

const { t } = useI18n()
const { data } = useDataset()
const plan = usePlan()

const board = useTemplateRef<HTMLElement>('board')
// The semesters keep their width and the board scrolls sideways; a soft fade marks an edge with more beyond it.
const track = useTemplateRef<HTMLElement>('track')
const edgeStart = shallowRef(false)
const edgeEnd = shallowRef(false)
// Not named `edges`: that would hide the `edges` prop in the template (the legend read it).
function updateFades(): void {
  const el = track.value
  if (!el) return
  edgeStart.value = el.scrollLeft > 2
  edgeEnd.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
}
// Scrolling fires many times a frame: the fades and the lines are read and redrawn once per frame,
// and only while a route is drawn (otherwise the next route reads the layout fresh).
let scrollFrame = 0
let layoutStale = false
function onTrackScroll(): void {
  if (scrollFrame) return
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0
    updateFades()
    if (focus.value) measure()
    else layoutStale = true
  })
}
// The ‹ › buttons: most of a screen's width each way.
function scrollBy(dir: -1 | 1): void {
  const el = track.value
  if (!el) return
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.8), behavior: reduce ? 'auto' : 'smooth' })
}
// Terms added or emptied change how far the board scrolls without changing its size.
watch(
  () => props.terms.map((x) => x.subjects.length).join(),
  () => nextTick(updateFades),
)
const routes = shallowRef<Route[]>([])
const hovered = shallowRef<string | null>(null)
// Hover intent: leaving a card waits a moment, so the pointer can reach the "N more" pill.
let leaveTimer: ReturnType<typeof setTimeout> | undefined
function onHover(code: string | null): void {
  clearTimeout(leaveTimer)
  // The first card shows at once; moving on to another (or off the board) waits, so crossing
  // cards on the way to the pill doesn't swap the chain away.
  if (code && !hovered.value) hovered.value = code
  else leaveTimer = setTimeout(() => (hovered.value = code), 250)
}
function keepHover(): void {
  clearTimeout(leaveTimer)
}
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
  // Direct links only (one hop): a long chain on a busy board is unreadable.
  const needs = new Set(props.edges.filter((e) => e.to === code).map((e) => e.from))
  const unlocks = new Set(props.edges.filter((e) => e.from === code).map((e) => e.to))
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
  const f = focus.value
  return props.edges.filter((e) => e.from === f || e.to === f)
})

/** A polyline with rounded corners (radius 10, smaller where a leg is short). */
function rounded(pts: [number, number][]): string {
  let d = `M ${pts[0]![0]} ${pts[0]![1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1]!
    const [x, y] = pts[i]!
    const [nx, ny] = pts[i + 1]!
    const r = Math.min(10, Math.hypot(x - px, y - py) / 2, Math.hypot(nx - x, ny - y) / 2)
    const ax = x - Math.sign(x - px) * r
    const ay = y - Math.sign(y - py) * r
    const bx = x + Math.sign(nx - x) * r
    const by = y + Math.sign(ny - y) * r
    d += ` L ${ax} ${ay} Q ${x} ${y} ${bx} ${by}`
  }
  const [lx, ly] = pts[pts.length - 1]!
  return `${d} L ${lx} ${ly}`
}

/** Where everything is on the board, read once per layout change (not on every hover). */
interface Layout {
  cards: Map<string, DOMRect>
  cols: DOMRect[]
}
const layout = shallowRef<Layout | null>(null)
/** At most this many links per direction are drawn; the rest are counted on a pill. */
const MAX_DRAWN = 6

function readLayout(): void {
  const el = board.value
  if (!el) return
  const base = el.getBoundingClientRect()
  const rel = (r: DOMRect) => new DOMRect(r.left - base.left, r.top - base.top, r.width, r.height)
  const cards = new Map<string, DOMRect>()
  for (const c of el.querySelectorAll<HTMLElement>('[data-code], [data-past-code]')) {
    const code = c.dataset.code ?? c.dataset.pastCode
    if (code && !cards.has(code)) cards.set(code, rel(c.getBoundingClientRect()))
  }
  const cols = [...el.querySelectorAll<HTMLElement>('.term, .past')].map((c) => rel(c.getBoundingClientRect()))
  layout.value = { cards, cols }
}

const overflow = shallowRef<{ n: number; x: number; y: number } | null>(null)

function drawRoutes(): void {
  const lay = layout.value
  const f = focus.value
  if (!lay || !f) {
    routes.value = []
    overflow.value = null
    return
  }
  const { cards, cols } = lay
  const colOf = (r: DOMRect) => cols.findIndex((c) => r.left >= c.left - 1 && r.right <= c.right + 1)
  const gutter = (i: number) => (cols[i]!.right + cols[i + 1]!.left) / 2
  const next: Route[] = []
  let more: { n: number; x: number; y: number } | null = null
  for (const dir of ['need', 'unlock'] as const) {
    let list = shownEdges.value.filter((e) => (dir === 'need' ? e.to === f : e.from === f))
    const other = (e: Edge) => (dir === 'need' ? e.from : e.to)
    // Many links: draw the nearest column's only; the rest go on a "N more" pill.
    if (list.length > MAX_DRAWN) {
      const cs = list.map((e) => colOf(cards.get(other(e)) ?? new DOMRect()))
      const near = dir === 'need' ? Math.max(...cs) : Math.min(...cs.filter((c) => c >= 0))
      const keep = list.filter((_, i) => cs[i] === near).slice(0, MAX_DRAWN)
      if (dir === 'unlock') more = { n: list.length - keep.length, x: 0, y: 0 }
      list = keep
    }
    const self = cards.get(f)
    if (!self) continue
    const cf = colOf(self)
    const far = list.map((e) => colOf(cards.get(other(e)) ?? new DOMRect()))
    // One shared lane under the cards between this column and the farthest target: links bundle into a trunk.
    const lo = dir === 'need' ? Math.min(...far, cf) : cf
    const hi = dir === 'need' ? cf : Math.max(...far, cf)
    let lane = 0
    for (const r of cards.values()) {
      const c = colOf(r)
      if (c > lo && c < hi) lane = Math.max(lane, r.bottom)
    }
    for (let i = lo + 1; i < hi; i++) lane = Math.max(lane, cols[i]!.top + 40)
    const yl = lane + (dir === 'need' ? 10 : 18)
    for (const e of list) {
      const a = cards.get(e.from)
      const b = cards.get(e.to)
      if (!a || !b) continue
      const ca = colOf(a)
      const cb = colOf(b)
      let d: string
      const y1 = a.top + a.height / 2
      const y2 = b.top + b.height / 2
      if (ca >= 0 && cb > ca && cols.length > cb && b.left >= a.right - 4) {
        const x1 = a.right
        const x2 = b.left - 3
        const g1 = gutter(ca)
        if (cb === ca + 1) d = rounded([[x1, y1], [g1, y1], [g1, y2], [x2, y2]])
        else {
          const g2 = gutter(cb - 1)
          d = rounded([[x1, y1], [g1, y1], [g1, yl], [g2, yl], [g2, y2], [x2, y2]])
        }
        if (more && dir === 'unlock') {
          // The pill sits in the gutter below the lowest card on either side, so it never covers one.
          const g = gutter(ca)
          let low = 0
          for (const r of cards.values()) {
            const c = colOf(r)
            if (c === ca || c === ca + 1) low = Math.max(low, r.bottom)
          }
          more = { n: more.n, x: g, y: low + 18 }
        }
      } else {
        // Stacked (phones): out of the left edge, down the strip beside the cards, into the later card's left edge.
        const xg = Math.min(a.left, b.left) - 6
        d = rounded([[a.left, y1], [xg, y1], [xg, y2], [b.left - 3, y2]])
        if (more && dir === 'unlock') {
          let low = 0
          for (const r of cards.values()) low = Math.max(low, r.bottom)
          more = { n: more.n, x: xg + 40, y: low + 18 }
        }
      }
      next.push({ key: `${e.from}-${e.to}`, d, dir })
    }
  }
  // A stub from the trunk down to the pill, so it reads as the rest of the same bundle.
  const self = cards.get(f)
  if (more && more.n > 0 && self) {
    const c = colOf(self)
    const x = c >= 0 && cols.length > c + 1 && more.x > self.right ? more.x : self.left - 6
    next.push({ key: 'more', d: rounded([[x, self.top + self.height / 2], [x, more.y - 12]]), dir: 'unlock' })
  }
  routes.value = next
  overflow.value = more && more.n > 0 ? more : null
}

// How many of each card's prerequisites and follow-ons are on the board: the cards show it in
// their own tag row (never over a neighbour's text). Hidden (space kept) while something is
// selected or hovered: removing them made cards whose only tag it was shrink under the pointer.
const linkCounts = computed(() => {
  const count = new Map<string, { needs: number; unlocks: number }>()
  for (const e of props.edges) {
    const from = count.get(e.from) ?? { needs: 0, unlocks: 0 }
    from.unlocks++
    count.set(e.from, from)
    const to = count.get(e.to) ?? { needs: 0, unlocks: 0 }
    to.needs++
    count.set(e.to, to)
  }
  return { counts: count, quiet: tones.value !== null }
})
provide(LINK_COUNTS, linkCounts)

function measure(): void {
  layoutStale = false
  readLayout()
  drawRoutes()
  updateFades()
}

watch(shownEdges, () => (layoutStale ? measure() : drawRoutes()))
watch([() => props.edges, () => props.terms], () => nextTick(measure), { flush: 'post' })

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
  /** The add-a-subject picker for the first planned semester with room left (else the last). */
  openAdd(): void {
    const points = (x: PlanTerm) => x.subjects.reduce((sum, c) => sum + (props.subjects[c]?.points ?? 12.5), 0)
    const main = props.terms.findIndex((x) => !isShort(x.period) && points(x) < termLoadFor(x.period))
    const i = main >= 0 ? main : props.terms.length - 1
    if (i >= 0) picker.value = { termIndex: i }
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
  clearTimeout(leaveTimer)
  cancelAnimationFrame(scrollFrame)
  observer?.disconnect()
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('pointerdown', onPointer)
})
</script>

<template>
  <div ref="board" class="board" :class="{ 'board-dragging': dragging }">
    <p v-if="edges.length" class="route-legend" aria-hidden="true">
      <span class="legend-need">{{ t('subject.needs') }}</span>
      <span class="legend-unlock">{{ t('subject.unlocks') }}</span>
    </p>
    <svg class="routes" aria-hidden="true">
      <defs>
        <marker id="route-arrow-need" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M1.5 1.5 L8.5 5 L1.5 8.5" class="route-head route-head-need" />
        </marker>
        <marker id="route-arrow-unlock" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M1.5 1.5 L8.5 5 L1.5 8.5" class="route-head route-head-unlock" />
        </marker>
      </defs>
      <path v-for="r in routes" :key="r.key" pathLength="1" class="route" :class="`route-${r.dir}`" :d="r.d" :marker-end="`url(#route-arrow-${r.dir})`" />
    </svg>
    <button
      v-if="overflow && focus"
      type="button"
      class="route-more"
      :style="{ left: `${overflow.x}px`, top: `${overflow.y}px` }"
      @click="emit('open', focus)"
      @mouseenter="keepHover"
      @mouseleave="onHover(null)"
    >{{ t('stress.more', { n: overflow.n }) }}</button>

 <div class="track-wrap">
    <button v-if="edgeStart" class="track-nav track-prev" type="button" :aria-label="t('plan.scrollBack')" @click="scrollBy(-1)"><ChevronLeft :size="18" aria-hidden="true" /></button>
    <button v-if="edgeEnd" class="track-nav track-next" type="button" :aria-label="t('plan.scrollMore')" @click="scrollBy(1)"><ChevronRight :size="18" aria-hidden="true" /></button>
    <div ref="track" class="track" :class="{ 'fade-start': edgeStart, 'fade-end': edgeEnd }" @scroll.passive="onTrackScroll">
      <PastTermColumn
        v-if="past?.undated.length"
        :term="null"
        :results="past.undated"
        :subjects="subjects"
        :planned="terms"
        :load="load"
        :related="toneSet"
        @open="emit('open', $event)"
        @hover="onHover($event)"
        @done="(code, mark) => emit('done', code, mark)"
        @undo="emit('undo', $event)"
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
          @open="emit('open', $event)"
          @hover="onHover($event)"
          @done="(code, mark) => emit('done', code, mark)"
          @undo="emit('undo', $event)"
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
          @hover="onHover($event)"
          @drag-start="(code) => (dragging = { code, from: col.i })"
          @drag-end="dragging = null"
          @remove-term="emit('removeTerm', col.i)"
          @done="(code, mark) => emit('done', code, mark)"
          @undo="emit('undo', $event)"
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
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
  animation: route-draw 150ms ease-out;
}

.route-need {
  stroke: #7a63f0;
}

.route-unlock {
  stroke: var(--overprint);
}

.route-head {
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.route-head-need {
  stroke: #7a63f0;
}

/* Dark: a lighter violet keeps the line at 3:1 or more on the dark glass. */
@media (prefers-color-scheme: dark) {
  .route-need,
  .route-head-need {
    stroke: #a796ff;
  }

  .legend-need::before {
    background: #a796ff;
  }
}

.route-head-unlock {
  stroke: var(--overprint);
}

@keyframes route-draw {
  from {
    stroke-dashoffset: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .route {
    animation: none;
  }
}

/* "← 2 · → 1": the card has links inside the plan; hover or tap it to see them. */

.route-more {
  position: absolute;
  z-index: 5;
  padding: 2px 10px;
  border: 1px solid var(--card-edge);
  border-radius: 999px;
  background: var(--glass-shine), var(--sheet-fill);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 60%), 0 4px 12px -6px rgb(60 20 80 / 45%);
  font: inherit;
  font-size: var(--fs-meta);
  font-weight: 650;
  color: var(--accent);
  transform: translate(-50%, -50%);
  white-space: nowrap;
  cursor: pointer;
}

.route-legend {
  display: flex;
  gap: var(--space-4);
  margin: 0;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.route-legend span::before {
  content: '';
  display: inline-block;
  width: 14px;
  height: 2px;
  margin-right: 6px;
  vertical-align: middle;
  border-radius: 2px;
}

.legend-need::before {
  background: #7a63f0;
}

.legend-unlock::before {
  background: var(--overprint);
}

.track {
  display: flex;
  gap: 10px;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 8px;
  scroll-padding-inline: 24px;
  /* A thin scrollbar that stays visible, so the board plainly scrolls sideways. */
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--ink) 28%, transparent) transparent;
  --fade-start: 0px;
  --fade-end: 0px;
  -webkit-mask-image: linear-gradient(to right, transparent, #000 var(--fade-start), #000 calc(100% - var(--fade-end)), transparent);
  mask-image: linear-gradient(to right, transparent, #000 var(--fade-start), #000 calc(100% - var(--fade-end)), transparent);
}

.track.fade-start {
  --fade-start: 32px;
}

.track.fade-end {
  --fade-end: 48px;
}

.track::-webkit-scrollbar {
  height: 6px;
}

.track::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 28%, transparent);
}

/* The ‹ › buttons sit over the faded edges, only while there's more that way. */
.track-wrap {
  position: relative;
  min-width: 0;
}

.track-nav {
  position: absolute;
  z-index: 6;
  top: 50%;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-shine), var(--sheet-fill);
  box-shadow: var(--glass-shadow);
  color: var(--ink);
  cursor: pointer;
  transform: translateY(-50%);
}

.track-nav:hover,
.track-nav:focus-visible {
  color: var(--accent);
}

.track-prev {
  left: 4px;
}

.track-next {
  right: 4px;
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
  padding: 4px 12px;
  /* Flat on the board's glass: a solid pill with a hairline, no blur or lift of its own. */
  border: 1px solid var(--divider);
  border-radius: 999px;
  background: var(--card-solid);
  color: var(--ink);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.tool:hover,
.tool:focus-visible {
  background: color-mix(in srgb, var(--accent) 6%, var(--card-solid));
  color: var(--accent);
}

.tool-short {
  color: var(--ink-soft);
}

/* "Add a term" first, then the summer and winter ones as their own group. */
.board-tools > .tool:first-child {
  margin-bottom: 6px;
}

/* Phones: terms stack top to bottom, no sideways swiping. */
@media (max-width: 640px) {
  .track-nav {
    display: none;
  }

  .track {
    flex-direction: column;
    overflow: visible;
    -webkit-mask-image: none;
    mask-image: none;
  }

  .tool {
    min-height: 44px;
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

  .track-nav {
    display: none;
  }
}
</style>

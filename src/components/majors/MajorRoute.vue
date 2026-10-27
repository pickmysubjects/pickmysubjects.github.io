<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import InfoTip from '@/components/InfoTip.vue'
import { MoveHorizontal } from 'lucide-vue-next'
import { majorRoute, routeChain } from '@/engine/majorRoute'
import { routeLines } from '@/engine/majorRouteText'
import type { MajorOverview } from '@/engine/roles'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'

/**
 * A major's prerequisite route: levels as columns, a line from each subject to what it opens.
 * The diagram is for the eye; the list under it says the same for screen readers.
 */
const props = defineProps<{ overview: MajorOverview; course: string }>()
const { data } = useDataset()
const { t, locale } = useI18n()

const route = computed(() => majorRoute(data.value, props.overview, props.course))
const lines = computed(() => routeLines(route.value))

// Layout: fixed-size boxes in columns, a "pick N" label above each choice list.
// Columns widen to fill the card (names stop being cut off), never below the old 156px. On a
// phone they're narrower with tighter gaps, so two whole columns fit and the rest scrolls.
const MAX_COL_W = 260
const NODE_H = 46
const GAP = 8
const HEAD_H = 26

const scroller = useTemplateRef<HTMLElement>('scroller')
const avail = shallowRef(0)
let ro: ResizeObserver | undefined
onMounted(() => {
  const el = scroller.value
  if (!el || typeof ResizeObserver === 'undefined') return
  ro = new ResizeObserver(() => (avail.value = el.clientWidth - 24))
  ro.observe(el)
})
onBeforeUnmount(() => ro?.disconnect())
const narrow = computed(() => avail.value > 0 && avail.value < 480)
const MIN_COL_W_ = computed(() => (narrow.value ? 128 : 156))
const COL_GAP_ = computed(() => (narrow.value ? 32 : 56))
const PAD_ = computed(() => (narrow.value ? 12 : 24))
const COL_W_ = computed(() => {
  const COL_GAP = COL_GAP_.value
  const PAD = PAD_.value
  const MIN_COL_W = MIN_COL_W_.value
  const n = Math.max(1, route.value.columns.length)
  const fit = Math.floor((avail.value - 2 * PAD - (n - 1) * COL_GAP) / n)
  return Math.min(MAX_COL_W, Math.max(MIN_COL_W, fit || MIN_COL_W))
})

interface Box { code: string; x: number; y: number; title: string; role: string }
interface Label { x: number; y: number; text: string }
const layout = computed(() => {
  const COL_W = COL_W_.value
  const COL_GAP = COL_GAP_.value
  const PAD = PAD_.value
  const boxes: Record<string, Box> = {}
  const labels: Label[] = []
  let height = 0
  route.value.columns.forEach((col, i) => {
    const x = PAD + i * (COL_W + COL_GAP)
    labels.push({ x, y: 0, text: t.value('majors.level', { n: col.level }) })
    let y = HEAD_H
    let group: number | undefined
    for (const code of col.codes) {
      const n = route.value.nodes[code]!
      if (n.role === 'choice' && n.group !== group) {
        labels.push({ x, y: y + 4, text: t.value('majors.routePick', { n: route.value.groups[n.group!]!.pick }) })
        y += HEAD_H - 4
      }
      group = n.role === 'choice' ? n.group : undefined
      const s = data.value.subjects[code]
      boxes[code] = { code, x, y, role: n.role, title: s ? localTitle(s, locale.value) || s.title : '' }
      y += NODE_H + GAP
    }
    height = Math.max(height, y)
  })
  const width = PAD + route.value.columns.length * (COL_W + COL_GAP) - COL_GAP + 4
  return { boxes, labels, width, height }
})

const paths = computed(() =>
  route.value.edges.map((e) => {
    const COL_W = COL_W_.value
    const COL_GAP = COL_GAP_.value
    const PAD = PAD_.value
    const a = layout.value.boxes[e.from]!
    const b = layout.value.boxes[e.to]!
    const ay = a.y + NODE_H / 2
    const by = b.y + NODE_H / 2
    // Same column: a loop out to the left; otherwise a curve from right side to left side.
    const d =
      a.x === b.x
        ? `M${a.x} ${ay} C${a.x - PAD} ${ay} ${b.x - PAD} ${by} ${b.x} ${by}`
        : `M${a.x + COL_W} ${ay} C${a.x + COL_W + COL_GAP / 2} ${ay} ${b.x - COL_GAP / 2} ${by} ${b.x} ${by}`
    return { key: `${e.from}>${e.to}`, d, oneOf: e.oneOf, from: e.from, to: e.to }
  }),
)

// Hover or tap a subject: its chain lights up. On touch the first tap only lights it up.
const active = shallowRef('')
const chain = computed(() => (active.value ? routeChain(route.value, active.value) : null))
let touch = false
function onDown(ev: PointerEvent): void {
  touch = ev.pointerType === 'touch'
}
function onEnter(ev: PointerEvent, code: string): void {
  if (ev.pointerType !== 'touch') active.value = code
}
function onClick(ev: MouseEvent, code: string): void {
  if (touch && active.value !== code) {
    ev.preventDefault()
    active.value = code
  }
}
const titleOf = (c: string) => {
  const s = data.value.subjects[c]
  return s ? `${c} ${localTitle(s, locale.value) || s.title}` : c
}
const join = (codes: string[]) => codes.join(t.value('listSep'))

// Wider than the card (a phone): a fade on the side with more, and one line saying it scrolls.
const more = shallowRef<{ left: boolean; right: boolean }>({ left: false, right: false })
function onScroll(): void {
  const el = scroller.value
  if (!el) return
  more.value = { left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 }
}
onMounted(() => requestAnimationFrame(onScroll))
// Each column's left edge, for snapping: the diagram stops on whole columns, not mid-box.
const snaps = computed(() => route.value.columns.map((_, i) => PAD_.value + i * (COL_W_.value + COL_GAP_.value) - PAD_.value / 2))
</script>

<template>
  <section class="block">
    <h2 class="block-title">{{ t('majors.routeTitle') }}</h2>
    <p class="block-hint">{{ t('majors.routeHint') }}<InfoTip :text="t('majors.routeTip')" /></p>

    <p v-if="more.left || more.right" class="swipe" aria-hidden="true"><MoveHorizontal :size="15" /> {{ t('majors.routeSwipe') }}</p>
    <div ref="scroller" class="scroller surface" :class="{ 'more-left': more.left, 'more-right': more.right }" aria-hidden="true" @pointerleave="active = ''" @scroll.passive="onScroll">
      <div class="graph" :style="{ width: `${layout.width}px`, height: `${layout.height}px` }">
        <span v-for="(x, i) in snaps" :key="`snap${i}`" class="snap" :style="{ left: `${Math.max(0, x)}px` }" />
        <svg class="edges" :width="layout.width" :height="layout.height" focusable="false">
          <path
            v-for="p in paths"
            :key="p.key"
            :d="p.d"
            class="edge"
            :class="{ 'one-of': p.oneOf, on: chain && chain.has(p.from) && chain.has(p.to), off: chain && !(chain.has(p.from) && chain.has(p.to)) }"
          />
        </svg>
        <span v-for="(l, i) in layout.labels" :key="i" class="label" :style="{ left: `${l.x}px`, top: `${l.y}px` }">{{ l.text }}</span>
        <a
          v-for="b in layout.boxes"
          :key="b.code"
          class="node"
          :class="[`role-${b.role}`, { on: chain?.has(b.code), off: chain && !chain.has(b.code) }]"
          :style="{ left: `${b.x}px`, top: `${b.y}px`, width: `${COL_W_}px`, height: `${NODE_H}px` }"
          :href="link(`subject/${b.code}`)"
          tabindex="-1"
          :title="b.title"
          @pointerdown="onDown"
          @pointerenter="onEnter($event, b.code)"
          @click="onClick($event, b.code)"
        >
          <span class="code">{{ b.code }}</span>
          <span class="name">{{ b.title }}</span>
        </a>
      </div>
    </div>

    <!-- The same route as text, for screen readers. -->
    <div class="visually-hidden">
      <template v-for="col in lines" :key="col.level">
        <h3>{{ t('majors.level', { n: col.level }) }}</h3>
        <ul>
          <li v-for="l in col.lines" :key="l.code">
            <a :href="link(`subject/${l.code}`)">{{ titleOf(l.code) }}</a>
            <template v-if="l.needs.length">. {{ t('majors.routeNeeds', { list: join(l.needs) }) }}</template>
            <template v-if="l.oneOf.length">. {{ t('majors.routeOneOf', { list: join(l.oneOf) }) }}</template>
            <template v-if="l.leads.length">. {{ t('majors.routeLeads', { list: join(l.leads) }) }}</template>
          </li>
        </ul>
      </template>
    </div>
  </section>
</template>

<style scoped>
.block {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.block-title {
  font-size: 1.15rem;
  font-weight: 650;
}

.block-hint {
  margin-top: -4px;
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

/* Only the diagram scrolls sideways, never the page; it stops on whole columns. */
.scroller {
  max-width: 100%;
  overflow-x: auto;
  padding: 14px 12px;
  border-radius: 20px;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
}

.snap {
  position: absolute;
  top: 0;
  width: 1px;
  height: 1px;
  scroll-snap-align: start;
}

/* A fade on the side that has more. */
.more-right {
  -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 36px), transparent);
  mask-image: linear-gradient(90deg, #000 calc(100% - 36px), transparent);
}

.more-left {
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 36px);
  mask-image: linear-gradient(90deg, transparent, #000 36px);
}

.more-left.more-right {
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 36px, #000 calc(100% - 36px), transparent);
  mask-image: linear-gradient(90deg, transparent, #000 36px, #000 calc(100% - 36px), transparent);
}

.swipe {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.graph {
  position: relative;
}

.edges {
  position: absolute;
  inset: 0;
  overflow: visible;
}

.edge {
  fill: none;
  stroke: var(--ink-faint);
  stroke-width: 1.25;
  opacity: 0.55;
  transition: opacity 0.15s;
}

.edge.one-of {
  stroke-dasharray: 4 4;
  opacity: 0.3;
}

.edge.on {
  stroke: var(--accent);
  stroke-width: 1.75;
  opacity: 1;
}

.edge.off {
  opacity: 0.08;
}

.label {
  position: absolute;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-soft);
  white-space: nowrap;
}

.node {
  position: absolute;
  display: grid;
  align-content: center;
  padding: 0 10px;
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius-sm);
  background: var(--glass-shine), color-mix(in srgb, var(--glass-fill) 70%, transparent);
  box-shadow: inset 0 1px 0 var(--glass-edge);
  color: var(--ink);
  text-decoration: none;
  line-height: 1.2;
  transition: opacity 0.15s, border-color 0.15s;
}

.node .code {
  font-size: 0.8125rem;
  font-weight: 650;
  font-family: var(--font-code);
}

.node .name {
  overflow: hidden;
  font-size: 0.8125rem;
  color: var(--ink-soft);
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Compulsory: accent edge; one way among several: dashed. */
.role-core,
.role-pathway {
  border-color: var(--accent);
}

.role-core .code {
  color: var(--accent);
}

.role-route {
  border-style: dashed;
}

.node.on {
  border-color: var(--accent);
}

.node.off {
  opacity: 0.35;
}

.node:hover .code {
  color: var(--accent);
}
</style>

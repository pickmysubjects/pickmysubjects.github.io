<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import InfoTip from '@/components/InfoTip.vue'
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
const COL_W = 156
const COL_GAP = 56
const NODE_H = 40
const GAP = 8
const HEAD_H = 26
const PAD = 24

interface Box { code: string; x: number; y: number; title: string; role: string }
interface Label { x: number; y: number; text: string }
const layout = computed(() => {
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
</script>

<template>
  <section class="block">
    <h2 class="block-title">{{ t('majors.routeTitle') }}</h2>
    <p class="block-hint">{{ t('majors.routeHint') }}<InfoTip :text="t('majors.routeTip')" /></p>

    <div class="scroller surface" aria-hidden="true" @pointerleave="active = ''">
      <div class="graph" :style="{ width: `${layout.width}px`, height: `${layout.height}px` }">
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
          :style="{ left: `${b.x}px`, top: `${b.y}px`, width: `${COL_W}px`, height: `${NODE_H}px` }"
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

/* Only the diagram scrolls sideways, never the page. */
.scroller {
  max-width: 100%;
  overflow-x: auto;
  padding: 14px 12px;
  border-radius: 20px;
  overscroll-behavior-x: contain;
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
  color: var(--ink-faint);
  white-space: nowrap;
}

.node {
  position: absolute;
  display: grid;
  align-content: center;
  padding: 0 10px;
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius-sm);
  background: var(--glass-shine), var(--sheet-fill);
  color: var(--ink);
  text-decoration: none;
  line-height: 1.2;
  transition: opacity 0.15s, border-color 0.15s;
}

.node .code {
  font-size: 0.75rem;
  font-weight: 650;
  font-family: var(--font-code);
}

.node .name {
  overflow: hidden;
  font-size: 0.75rem;
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

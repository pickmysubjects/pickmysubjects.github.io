<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import InfoTip from '@/components/InfoTip.vue'
import { periodsFor, type MajorOverview } from '@/engine'
import { majorRoute, routeChain, type RouteRole } from '@/engine/majorRoute'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useDataYear } from '@/composables/useDataYear'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'

/**
 * A major in one view: one column per level, left to right, each subject once. In a column: the
 * subjects to take first, the usual ways in, the compulsory ones and the lists to pick from
 * (with how many to choose). The prerequisite links are drawn between side-by-side columns
 * (solid: needed; dashed: one of several) and said on every subject as text ("needs ANCW10007"),
 * so they still read when the columns stack on a phone. Hover or focus a subject: its chain
 * lights up. Every subject links to its page (or the Handbook, when it isn't in our data yet).
 */
const props = defineProps<{ overview: MajorOverview; year: number; course: string }>()
const { data } = useDataset()
const { handbookFor } = useDataYear()
const { t, locale } = useI18n()

const route = computed(() => majorRoute(data.value, props.overview, props.course))

/** At most this many codes in a line of text; the rest are counted. */
const MAX_CODES = 3
function codes(list: string[]): string {
  const sep = t.value('listSep')
  return list.length > MAX_CODES ? `${list.slice(0, MAX_CODES).join(sep)} +${list.length - MAX_CODES}` : list.join(sep)
}

interface Item {
  code: string
  title: string
  when: string
  href: string
  missing: boolean
  /** What it needs and (for an earlier subject) what it leads to, as short lines. */
  links: string[]
  /** The full lists, for the tooltip when they're cut short. */
  full: string
}
function item(code: string, role: RouteRole): Item {
  const s = data.value.subjects[code]
  const into = route.value.edges.filter((e) => e.to === code)
  const needs = into.filter((e) => !e.oneOf).map((e) => e.from)
  const oneOf = into.filter((e) => e.oneOf).map((e) => e.from)
  // What an earlier subject opens is why it's here; later ones just say what they need.
  const leads = role === 'pathway' || role === 'route' ? route.value.edges.filter((e) => e.from === code).map((e) => e.to) : []
  const sep = t.value('listSep')
  // A subject in more than one pick list shows once, in the first; it says which others it counts for.
  const others = role === 'choice' ? props.overview.choices.flatMap((c, i) => (c.from.includes(code) && i !== route.value.nodes[code]?.group ? [groupName(i)] : [])) : []
  const lines = (f: (l: string[]) => string) =>
    [
      others.length ? t.value('majors.alsoIn', { list: others.join(sep) }) : '',
      needs.length ? t.value('majors.routeNeeds', { list: f(needs) }) : '',
      oneOf.length ? t.value('majors.routeOneOf', { list: f(oneOf) }) : '',
      leads.length ? t.value('majors.routeLeads', { list: f(leads) }) : '',
    ].filter(Boolean)
  return {
    code,
    title: s ? localTitle(s, locale.value) || s.title : t.value('subject.notYetAdded'),
    when: s ? periodsFor(s, props.year).map((p) => t.value(`periodShort.${p}`)).join(' · ') || t.value('browse.notRunning') : '',
    href: s ? link(`subject/${code}`) : handbookFor(code, props.year),
    missing: !s,
    links: lines(codes),
    full: lines((l) => l.join(sep)).join('\n'),
  }
}

interface Part {
  key: string
  label: string
  kind: 'first' | 'route' | 'core' | 'pick'
  items: Item[]
  /** For a pick list: its subjects shown under an earlier part of this level instead. */
  elsewhere: string[]
}
const letter = (i: number) => String.fromCharCode(65 + i)
const groupName = (i: number) => t.value('majors.factPickN', { g: letter(i) })
/** Where a subject listed in more than one part is shown: compulsory, or its first pick list. */
function shownIn(code: string): string {
  const n = route.value.nodes[code]
  return n?.role === 'core' ? t.value('majors.tagCore') : n?.role === 'choice' ? groupName(n.group!) : ''
}
// Columns follow the route's order inside each part, which keeps most drawn lines from crossing.
const columns = computed(() =>
  route.value.columns.map((col) => {
    const nodes = col.codes.map((c) => route.value.nodes[c]!)
    const of = (role: RouteRole, group?: number) =>
      nodes.filter((n) => n.role === role && (group === undefined || n.group === group)).map((n) => item(n.code, role))
    // A pick list's subjects shown elsewhere at this level: "plus 24 listed under group C".
    const elsewhere = (i: number) => {
      const by = new Map<string, number>()
      for (const n of nodes) {
        if (!props.overview.choices[i]!.from.includes(n.code) || (n.role === 'choice' && n.group === i)) continue
        const where = shownIn(n.code)
        if (where) by.set(where, (by.get(where) ?? 0) + 1)
      }
      return [...by].map(([where, n]) => t.value('majors.listedIn', { n, where }))
    }
    const parts: Part[] = [
      { key: 'first', label: t.value('majors.tagFirst'), kind: 'first' as const, items: of('pathway'), elsewhere: [] },
      { key: 'route', label: t.value('subject.role.route'), kind: 'route' as const, items: of('route'), elsewhere: [] },
      { key: 'core', label: t.value('majors.tagCore'), kind: 'core' as const, items: of('core'), elsewhere: [] },
      ...props.overview.choices.map((c, i) => ({
        key: `pick${i}`,
        label: t.value('majors.tagPick', { g: letter(i), n: c.points / 12.5, of: c.from.length }),
        kind: 'pick' as const,
        items: of('choice', i),
        elsewhere: elsewhere(i),
      })),
    ].filter((p) => p.items.length > 0 || p.elsewhere.length > 0)
    return { level: col.level, parts }
  }),
)

// Hover or focus a subject: what it needs and what it opens light up, the rest fade.
const active = shallowRef('')
const chain = computed(() => (active.value ? routeChain(route.value, active.value) : null))
const linked = computed(() => new Set(route.value.edges.flatMap((e) => [e.from, e.to])))
function enter(ev: PointerEvent, code: string): void {
  if (ev.pointerType !== 'touch') active.value = linked.value.has(code) ? code : ''
}

// The lines: measured from the laid-out boxes, drawn only between columns side by side (a
// subject's own column gets a small loop on its left, when close). Stacked on a phone, the
// text says it.
const wrap = useTemplateRef<HTMLElement>('wrap')
interface Line { key: string; d: string; from: string; to: string; oneOf: boolean }
const lines = shallowRef<Line[]>([])
const box = shallowRef({ w: 0, h: 0 })
function measure(): void {
  const el = wrap.value
  if (!el) return
  const base = el.getBoundingClientRect()
  const cols = [...el.querySelectorAll<HTMLElement>('.col')].map((c) => c.getBoundingClientRect())
  const at = new Map<string, { r: DOMRect; col: number }>()
  for (const a of el.querySelectorAll<HTMLAnchorElement>('a[data-code]')) at.set(a.dataset.code!, { r: a.getBoundingClientRect(), col: Number(a.dataset.col) })
  const out: Line[] = []
  const first = cols[0]
  const sideBySide = !!first && cols.some((c) => Math.abs(c.top - first.top) < 2 && Math.abs(c.left - first.left) > 2)
  if (sideBySide) {
    for (const e of route.value.edges) {
      const a = at.get(e.from)
      const b = at.get(e.to)
      if (!a || !b) continue
      const ay = a.r.top + a.r.height / 2 - base.top
      const by = b.r.top + b.r.height / 2 - base.top
      let d = ''
      // A loop inside one column only between near neighbours: a long one would run down the
      // whole column's edge; the text on the subject says it either way.
      if (a.col === b.col && Math.abs(by - ay) < 180) {
        const x = a.r.left - base.left
        d = `M${x} ${ay} C${x - 10} ${ay} ${x - 10} ${by} ${x} ${by}`
      } else if (b.col === a.col + 1 && Math.abs(cols[a.col]!.top - cols[b.col]!.top) < 2) {
        const ax = a.r.right - base.left
        const bx = b.r.left - base.left
        const mid = (bx - ax) / 2
        d = `M${ax} ${ay} C${ax + mid} ${ay} ${bx - mid} ${by} ${bx} ${by}`
      }
      if (d) out.push({ key: `${e.from}>${e.to}`, d, from: e.from, to: e.to, oneOf: e.oneOf })
    }
  }
  lines.value = out
  box.value = { w: base.width, h: base.height }
}
let ro: ResizeObserver | undefined
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && wrap.value) {
    ro = new ResizeObserver(() => measure())
    ro.observe(wrap.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())
watch(columns, () => nextTick(measure))
// A dense route (a maths-heavy major) draws its lines lighter until one is picked out.
const dense = computed(() => route.value.edges.length > 40)
</script>

<template>
  <div class="structure">
    <p v-if="route.edges.length" class="legend">
      <span class="key"><svg width="22" height="8" aria-hidden="true"><path d="M1 4H21" class="edge" /></svg>{{ t('majors.legendNeeds') }}</span>
      <span class="key"><svg width="22" height="8" aria-hidden="true"><path d="M1 4H21" class="edge one-of" /></svg>{{ t('majors.legendOneOf') }}</span>
      <InfoTip :text="t('majors.structTip')" />
    </p>
    <div ref="wrap" class="wrap" :class="{ dense, lit: !!chain }" @pointerleave="active = ''">
      <svg v-if="lines.length" class="edges" :width="box.w" :height="box.h" aria-hidden="true" focusable="false">
        <path v-for="l in lines" :key="l.key" :d="l.d" class="edge" :class="{ 'one-of': l.oneOf, on: chain && chain.has(l.from) && chain.has(l.to) }" />
      </svg>
      <ol class="path">
        <li v-for="(col, ci) in columns" :key="col.level" class="col">
          <h3 class="col-title">{{ t('majors.level', { n: col.level }) }}</h3>
          <div v-for="p in col.parts" :key="p.key" class="part">
            <p class="part-label"><span class="dot" :class="`dot-${p.kind}`" aria-hidden="true" />{{ p.label }}</p>
            <p v-for="x in p.elsewhere" :key="x" class="part-note">{{ x }}</p>
            <ul v-if="p.items.length" class="items">
              <li v-for="s in p.items" :key="s.code">
                <a
                  class="it"
                  :class="[`it-${p.kind}`, { missing: s.missing, on: chain?.has(s.code), off: chain && !chain.has(s.code) }]"
                  :href="s.href"
                  :data-code="s.code"
                  :data-col="ci"
                  :title="s.full || undefined"
                  :target="s.missing ? '_blank' : undefined"
                  :rel="s.missing ? 'noopener' : undefined"
                  @pointerenter="enter($event, s.code)"
                  @focus="active = linked.has(s.code) ? s.code : ''"
                  @blur="active = ''"
                >
                  <span class="it-code">{{ s.code }}</span><span class="it-title">{{ s.title }}</span>
                  <span v-if="s.when" class="it-when">{{ s.when }}</span>
                  <span v-for="(l, i) in s.links" :key="i" class="it-link">{{ l }}</span>
                </a>
              </li>
            </ul>
          </div>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.structure {
  display: grid;
  gap: 12px;
  min-width: 0;
}

/* What the two kinds of line mean, with the full explanation behind ⓘ. */
.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  margin: 0;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.key {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.wrap {
  position: relative;
}

.edges {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: visible;
  pointer-events: none;
}

.edge {
  fill: none;
  stroke: var(--ink-soft);
  stroke-width: 1.25;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.edge.one-of {
  stroke-dasharray: 4 4;
  opacity: 0.45;
}

.legend .edge {
  opacity: 1;
}

.dense .edge {
  opacity: 0.28;
}

.dense .edge.one-of {
  opacity: 0.16;
}

.lit .edge {
  opacity: 0.06;
}

.wrap .edge.on {
  stroke: var(--accent);
  stroke-width: 1.75;
  opacity: 1;
}

/* Levels side by side with room for the lines between them; stacked on narrow screens. */
.path {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px 36px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.col {
  display: grid;
  align-content: start;
  gap: 14px;
  min-width: 0;
  padding: 14px;
  border-radius: 18px;
  background: var(--inset-fill);
}

.col-title {
  margin: 0;
  font-size: var(--fs-small);
  font-weight: var(--fw-bold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
}

.part {
  display: grid;
  gap: 6px;
}

.part-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
}

.part-note {
  margin: 0;
  font-size: var(--fs-caption);
  color: var(--ink-soft);
}

.dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.dot-first {
  border: 2px solid var(--ink-soft);
}

.dot-route {
  border: 2px dashed var(--ink-soft);
}

.dot-core {
  background: var(--accent-fill);
}

.dot-pick {
  border: 2px solid var(--accent-fill);
}

.items {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A subject: code, name, when it runs, what it needs; the compulsory ones carry a pink edge. */
.it {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0 8px;
  padding: 8px 10px;
  color: var(--ink);
  text-decoration: none;
  border: 1px solid var(--card-edge);
  border-radius: 12px;
  background: var(--peek-fill);
  transition: border-color 0.15s, opacity 0.15s;
}

.it-core {
  box-shadow: inset 3px 0 0 var(--accent-fill);
}

.it-route {
  border-style: dashed;
}

.it:hover,
.it.on {
  border-color: var(--accent);
}

.it.off {
  opacity: 0.4;
}

.it:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.it-code {
  font-family: var(--font-code);
  font-size: var(--fs-meta);
  font-weight: 650;
  color: var(--accent);
}

.it-title {
  overflow: hidden;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.it-when,
.it-link {
  grid-column: 2;
  font-size: var(--fs-caption);
  color: var(--ink-soft);
}

.it-link {
  overflow-wrap: anywhere;
}

.missing .it-title {
  font-weight: var(--fw-regular);
  color: var(--ink-soft);
}

@media (prefers-reduced-motion: reduce) {
  .it,
  .edge {
    transition: none;
  }
}
</style>

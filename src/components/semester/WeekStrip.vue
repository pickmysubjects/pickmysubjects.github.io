<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from '@/i18n'
import type { SemesterShape, WeekSegment } from '@/utils/semester'
import { numericRange } from '@/utils/taskTiming'

/** One of the student's tasks shown under a week: due that week, or running through it. */
export interface StripTask {
  label: string
  ongoing?: boolean
}

/**
 * The semester as a row of weeks: teaching weeks by number with their dates, the break, SWOT Vac
 * and the exam period (as wide as its weeks), month names where a month starts. Weeks gone by are
 * filled softly, this week in the accent. `tasks` (by segment index) marks weeks with the
 * student's assessment; hovering or tapping a week lists them below the strip.
 * `slim`: a thin bar without labels, for the home preview.
 */
const props = defineProps<{ sem: SemesterShape; today: string; name: string; slim?: boolean; tasks?: StripTask[][] }>()
const { t, locale } = useI18n()

const label = (s: WeekSegment) =>
  s.kind === 'teach' ? t.value('timing.week', { n: s.week }) : t.value(s.kind === 'break' ? 'sem.segBreak' : s.kind === 'swotvac' ? 'sem.segSwot' : 'sem.segExams')
const short = (s: WeekSegment) => (s.kind === 'teach' ? String(s.week) : label(s))
const state = (s: WeekSegment) => (props.today > s.end ? 'past' : props.today >= s.start ? 'now' : 'next')
const monthFmt = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'short', timeZone: 'UTC' }))

// The exam segment shows the official exam dates, not the Monday-to-Sunday weeks around them.
const datesOf = (s: WeekSegment) => (s.kind === 'exams' && props.sem.exams ? numericRange(locale.value, props.sem.exams.start, props.sem.exams.end) : numericRange(locale.value, s.start, s.end))

const cells = computed(() =>
  props.sem.segments.map((s, i) => {
    const prev = props.sem.segments[i - 1]
    const month = s.start.slice(0, 7)
    const tasks = props.tasks?.[i] ?? []
    return {
      ...s,
      i,
      label: label(s),
      short: short(s),
      state: state(s),
      dates: datesOf(s),
      // A month's name over the first week that starts in it.
      month: !prev || prev.start.slice(0, 7) !== month ? monthFmt.value.format(new Date(`${s.start}T00:00:00Z`)) : '',
      due: tasks.filter((x) => !x.ongoing),
      tasks,
    }
  }),
)

const nowIndex = computed(() => cells.value.findIndex((c) => c.state === 'now'))
const picked = shallowRef<number | null>(null)
const shownIndex = computed(() => picked.value ?? (nowIndex.value >= 0 ? nowIndex.value : 0))
const shown = computed(() => cells.value[shownIndex.value])

// This week scrolled into view inside the strip's own box (never the page).
const box = useTemplateRef<HTMLElement>('box')
function centreNow(): void {
  const el = box.value
  const cell = el?.querySelector<HTMLElement>('.is-now')?.parentElement
  if (!el || !cell) return
  el.scrollLeft = Math.max(0, cell.offsetLeft - el.offsetLeft - (el.clientWidth - cell.offsetWidth) / 2)
}
onMounted(() => void nextTick(centreNow))
watch(() => props.today, () => void nextTick(centreNow))
</script>

<template>
  <ol v-if="slim" class="strip slim" :aria-label="t('sem.stripLabel', { term: name })">
    <li v-for="c in cells" :key="c.i" class="cell" :class="[`is-${c.state}`, `k-${c.kind}`]" :style="{ flexGrow: c.span }" :aria-current="c.state === 'now' ? 'step' : undefined">
      <span class="sr-only">{{ c.short }}</span>
    </li>
  </ol>

  <div v-else class="week-strip">
    <div ref="box" class="strip-box">
      <ol class="strip" :aria-label="t('sem.stripLabel', { term: name })">
        <li v-for="c in cells" :key="c.i" class="col" :style="{ flexGrow: c.span, flexBasis: `${c.span * 52 + (c.span - 1) * 4}px` }">
          <span class="month" aria-hidden="true">{{ c.month }}</span>
          <button
            type="button"
            class="cell"
            :class="[`is-${c.state}`, `k-${c.kind}`, { 'is-shown': c.i === shownIndex && picked !== null }]"
            :aria-current="c.state === 'now' ? 'step' : undefined"
            :aria-pressed="c.i === shownIndex"
            :aria-label="`${c.label}, ${c.dates}${c.due.length ? `, ${t('timing.dueCount', { n: c.due.length })}` : ''}`"
            @click="picked = c.i"
            @mouseenter="picked = c.i"
            @focus="picked = c.i"
          >
            <span class="cell-label">{{ c.short }}</span>
            <span class="cell-dates">{{ c.dates }}</span>
          </button>
          <span class="marks" aria-hidden="true">
            <span v-if="c.due.length" class="dots"><span v-for="n in Math.min(c.due.length, 3)" :key="n" class="dot" /></span>
          </span>
        </li>
      </ol>
    </div>

    <div v-if="shown" class="due" aria-live="polite">
      <p class="due-head">
        <span class="due-week">{{ shown.label }}</span>
        <span class="due-dates">{{ shown.dates }}</span>
        <span v-if="shown.state === 'now'" class="due-now">{{ t('timing.thisWeek') }}</span>
      </p>
      <ul v-if="shown.tasks.length" class="due-list">
        <li v-for="(x, k) in shown.tasks" :key="k" class="due-item" :class="{ ongoing: x.ongoing }">
          <span class="due-mark" aria-hidden="true" />
          <span>{{ x.label }}</span>
        </li>
      </ul>
      <p v-else-if="tasks" class="due-none">{{ t('timing.nothingDue') }}</p>
    </div>
  </div>
</template>

<style scoped>
.week-strip {
  display: grid;
  gap: 12px;
  min-width: 0;
}

/* The strip scrolls inside its own box, never the page. */
.strip-box {
  position: relative;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.strip {
  display: flex;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: max-content;
}

.col {
  display: grid;
  grid-template-rows: 18px auto 10px;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-width: 0;
}

.month {
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
  white-space: nowrap;
  padding-inline-start: 2px;
}

.cell {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 2px;
  width: 100%;
  min-height: 56px;
  padding: 6px 4px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: transparent;
  font: inherit;
  color: var(--ink-soft);
  cursor: pointer;
  white-space: nowrap;
}

.cell-label {
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

.cell-dates {
  max-width: 5.5em;
  font-size: var(--fs-meta);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  text-align: center;
  white-space: normal;
}

.cell:hover,
.cell.is-shown {
  border-color: var(--accent);
}

.cell:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Not teaching: the break hatched, SWOT Vac dashed, the exam period warm. */
.cell.k-break {
  border-style: dashed;
  background: repeating-linear-gradient(135deg, transparent 0 6px, var(--divider) 6px 7px);
}

.cell.k-swotvac {
  border-style: dashed;
}

.cell.k-exams {
  border-color: color-mix(in srgb, var(--warn) 45%, transparent);
  background: var(--warn-soft);
}

.cell.k-exams .cell-label {
  color: var(--warn);
}

.cell.is-past {
  border-color: transparent;
  background: var(--accent-soft);
}

.cell.is-past .cell-label {
  color: var(--accent);
}

.cell.is-now {
  border-color: var(--accent-fill);
  background: var(--accent-fill);
  color: var(--accent-fill-ink);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-fill) 25%, transparent);
}

.cell.is-now .cell-label {
  color: var(--accent-fill-ink);
}

.marks {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 10px;
}

.dots {
  display: inline-flex;
  gap: 3px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

/* What's due in the week shown: this week unless another is hovered or tapped. */
.due {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-soft) 55%, transparent);
}

.due-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin: 0;
}

.due-week {
  font-weight: var(--fw-semibold);
}

.due-dates,
.due-none {
  font-size: var(--fs-small);
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}

.due-none {
  margin: 0;
}

.due-now {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-fill);
  color: var(--accent-fill-ink);
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
}

.due-list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-small);
}

.due-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.due-mark {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

.due-item.ongoing {
  color: var(--ink-soft);
}

.due-item.ongoing .due-mark {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--accent);
}

/* Home: a thin bar, no words. */
.strip.slim {
  gap: 3px;
  min-width: 0;
}

.slim .cell {
  display: block;
  flex: 1 0 auto;
  min-width: 0;
  min-height: 0;
  height: 6px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--line);
  cursor: default;
}

.slim .cell.is-past {
  background: color-mix(in srgb, var(--accent-fill) 45%, transparent);
}

.slim .cell.is-now {
  background: var(--accent-fill);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>

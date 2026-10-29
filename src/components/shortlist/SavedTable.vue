<script setup lang="ts">
import { computed, shallowRef, toRef } from 'vue'
import QuickAdd from '@/components/browse/QuickAdd.vue'
import ShortlistToggle from './ShortlistToggle.vue'
import { PERIODS } from '@/engine'
import { link } from '@/composables/useView'
import { usePhone } from '@/composables/usePhone'
import { useShortlist } from '@/composables/useShortlist'
import { useSubjectCompare, type CompareColumn } from '@/composables/useSubjectCompare'
import { useI18n } from '@/i18n'
import { prereqGist } from '@/i18n/gist'
import { localTitle } from '@/i18n/localized'

/**
 * The saved subjects as one table: a row per subject, a column per fact, every answer the one its
 * own page gives. A column header sorts; "Only differences" hides the columns where every row
 * says the same. Phones get a card per subject with the same facts as a two-column list.
 * `highlight`: subjects from an old ?compare= link, shown first and marked.
 */
const props = defineProps<{ codes: string[]; highlight: string[] }>()
const { t, locale } = useI18n()
const shortlist = useShortlist()
const phone = usePhone('(max-width: 720px)')
const { columns } = useSubjectCompare(toRef(props, 'codes'))

type Key = 'points' | 'runs' | 'exam' | 'difficulty' | 'prereq' | 'hurdles' | 'ratings'
const KEYS: Key[] = ['points', 'runs', 'exam', 'difficulty', 'prereq', 'hurdles', 'ratings']
interface Cell {
  text: string
  sub?: string
  tone?: 'good' | 'warn'
  /** What it sorts by: lower first. */
  rank: number
}

const LEVEL_RANK = { easier: 0, average: 1, harder: 2, unknown: 3 } as const
const PREREQ_RANK = { none: 0, ok: 1, unknown: 2, fail: 3 } as const

function cell(c: CompareColumn, key: Key): Cell {
  const tr = t.value
  switch (key) {
    case 'points':
      return { text: String(c.subject.points), rank: c.subject.points }
    case 'runs':
      return c.periods.length
        ? { text: c.periods.map((p) => tr(`periodShort.${p}`)).join(' · '), rank: PERIODS.indexOf(c.periods[0]!) }
        : { text: tr('shortlist.notRunning'), tone: 'warn', rank: 99 }
    case 'exam':
      return c.exam === null ? { text: tr('shortlist.unknown'), rank: 999 } : { text: c.exam === 0 ? tr('shortlist.noExam') : `${c.exam}%`, rank: c.exam }
    case 'difficulty': {
      const level = c.difficulty.level
      return {
        text: level === 'unknown' ? tr('shortlist.unknown') : tr(`fit.level.${level}`),
        tone: level === 'easier' ? 'good' : level === 'harder' ? 'warn' : undefined,
        rank: LEVEL_RANK[level],
      }
    }
    case 'prereq':
      // The subject page's words for what it needs, then whether the record meets it.
      return {
        text: prereqGist(tr, c.needs),
        sub: c.prereq === 'ok' || c.prereq === 'fail' ? tr(`shortlist.prereq.${c.prereq}`) : undefined,
        tone: c.prereq === 'ok' || c.prereq === 'none' ? 'good' : c.prereq === 'fail' ? 'warn' : undefined,
        rank: PREREQ_RANK[c.prereq],
      }
    case 'hurdles':
      return c.hurdles === null ? { text: tr('shortlist.unknown'), rank: 999 } : { text: c.hurdles ? String(c.hurdles) : tr('shortlist.prereq.none'), rank: c.hurdles }
    case 'ratings':
      // Most rated first: the order students want for this one.
      return { text: String(c.reviews), rank: -c.reviews }
  }
}

const rows = computed(() =>
  columns.value.map((c, i) => ({
    c,
    i,
    title: localTitle(c.subject, locale.value) || c.subject.title,
    saved: shortlist.has(c.subject.code),
    marked: props.highlight.includes(c.subject.code),
    cells: Object.fromEntries(KEYS.map((k) => [k, cell(c, k)])) as Record<Key, Cell>,
  })),
)

const sortKey = shallowRef<Key | 'subject' | ''>('')
const sortDir = shallowRef<1 | -1>(1)
function sortBy(key: Key | 'subject'): void {
  if (sortKey.value === key) sortDir.value = sortDir.value === 1 ? -1 : 1
  else {
    sortKey.value = key
    sortDir.value = 1
  }
}
function onSortSelect(e: Event): void {
  sortKey.value = (e.target as HTMLSelectElement).value as Key | 'subject' | ''
  sortDir.value = 1
}
const sorted = computed(() => {
  const key = sortKey.value
  const list = [...rows.value]
  // Unsorted: subjects from an old compare link first, then the saved order.
  if (!key) return list.sort((a, b) => Number(b.marked) - Number(a.marked) || a.i - b.i)
  return list.sort((a, b) => {
    const d = key === 'subject' ? a.c.subject.code.localeCompare(b.c.subject.code) : a.cells[key].rank - b.cells[key].rank
    return d * sortDir.value || a.i - b.i
  })
})
function ariaSort(key: Key | 'subject'): 'ascending' | 'descending' | undefined {
  return sortKey.value === key ? (sortDir.value === 1 ? 'ascending' : 'descending') : undefined
}

const onlyDiff = shallowRef(false)
// A column every subject answers the same way says nothing about which to pick.
const same = computed(() => new Set(KEYS.filter((k) => rows.value.length > 1 && rows.value.every((r) => r.cells[k].text === rows.value[0]!.cells[k].text && r.cells[k].sub === rows.value[0]!.cells[k].sub))))
const shown = computed(() => (onlyDiff.value ? KEYS.filter((k) => !same.value.has(k)) : KEYS))
</script>

<template>
  <div class="saved">
    <div class="bar">
      <label v-if="rows.length > 1" class="diff">
        <input v-model="onlyDiff" type="checkbox" />
        <span>{{ t('shortlist.onlyDiff') }}</span>
      </label>
      <label v-if="phone" class="sort">
        <span>{{ t('shortlist.sortBy') }}</span>
        <select class="input" :value="sortKey" @change="onSortSelect">
          <option value="">{{ t('shortlist.savedOrder') }}</option>
          <option value="subject">{{ t('shortlist.col.subject') }}</option>
          <option v-for="k in shown" :key="k" :value="k">{{ t(`shortlist.col.${k}`) }}</option>
        </select>
      </label>
    </div>

    <ul v-if="phone" class="cards">
      <li v-for="r in sorted" :key="r.c.subject.code" class="card" :class="{ marked: r.marked }">
        <span class="code">{{ r.c.subject.code }}</span>
        <a class="title" :href="link(`subject/${r.c.subject.code}`)">{{ r.title }}</a>
        <dl class="spec">
          <div v-for="k in shown" :key="k" class="spec-row">
            <dt>{{ t(`shortlist.col.${k}`) }}</dt>
            <dd :class="r.cells[k].tone && `tone-${r.cells[k].tone}`">
              {{ r.cells[k].text }}<span v-if="r.cells[k].sub" class="sub">{{ r.cells[k].sub }}</span>
            </dd>
          </div>
        </dl>
        <div class="acts">
          <QuickAdd :subject="r.c.subject" text />
          <button v-if="r.saved" type="button" class="text-btn" :aria-label="t('shortlist.removeLabel', { code: r.c.subject.code })" @click="shortlist.remove(r.c.subject.code)">{{ t('shortlist.remove') }}</button>
          <ShortlistToggle v-else :code="r.c.subject.code" />
        </div>
      </li>
    </ul>

    <div v-else class="scroll" tabindex="0" role="region" :aria-label="t('shortlist.title')">
      <table class="table">
        <thead>
          <tr>
            <th scope="col" class="col-subject" :aria-sort="ariaSort('subject')">
              <button type="button" class="sort-btn" @click="sortBy('subject')">
                {{ t('shortlist.col.subject') }}<span class="arrow" aria-hidden="true">{{ sortKey === 'subject' ? (sortDir === 1 ? '↑' : '↓') : '' }}</span>
              </button>
            </th>
            <th v-for="k in shown" :key="k" scope="col" :aria-sort="ariaSort(k)">
              <button type="button" class="sort-btn" @click="sortBy(k)">
                {{ t(`shortlist.col.${k}`) }}<span class="arrow" aria-hidden="true">{{ sortKey === k ? (sortDir === 1 ? '↑' : '↓') : '' }}</span>
              </button>
            </th>
            <th scope="col"><span class="visually-hidden">{{ t('record.colActions') }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in sorted" :key="r.c.subject.code" :class="{ marked: r.marked }">
            <th scope="row" class="col-subject">
              <span class="code">{{ r.c.subject.code }}</span>
              <a class="title" :href="link(`subject/${r.c.subject.code}`)">{{ r.title }}</a>
            </th>
            <td v-for="k in shown" :key="k" :class="r.cells[k].tone && `tone-${r.cells[k].tone}`">
              <span class="val">{{ r.cells[k].text }}</span>
              <span v-if="r.cells[k].sub" class="sub">{{ r.cells[k].sub }}</span>
            </td>
            <td class="acts-cell">
              <div class="acts">
                <QuickAdd :subject="r.c.subject" text />
                <button v-if="r.saved" type="button" class="text-btn" :aria-label="t('shortlist.removeLabel', { code: r.c.subject.code })" @click="shortlist.remove(r.c.subject.code)">{{ t('shortlist.remove') }}</button>
                <ShortlistToggle v-else :code="r.c.subject.code" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.saved {
  display: grid;
  min-width: 0;
}

.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--line);
}

.bar:empty {
  display: none;
}

.diff,
.sort {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--ink);
  cursor: pointer;
}

.diff input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
}

.sort > span {
  white-space: nowrap;
}

.sort .input {
  min-height: 44px;
  max-width: 60vw;
}

/* Wide tables scroll sideways inside their own box, never the page. */
.scroll {
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
}

.scroll:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}

th,
td {
  padding: 12px 10px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--line);
}

thead th {
  padding: 4px 6px;
  vertical-align: bottom;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
}

tbody tr:last-child > * {
  border-bottom: 0;
}

.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 0 8px;
  border: 0;
  border-radius: 8px;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.sort-btn:hover {
  color: var(--ink);
  text-decoration: underline;
}

.sort-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

th[aria-sort] .sort-btn {
  color: var(--accent);
}

/* Room for the arrow either way, so a sorted header never changes width. */
.arrow {
  display: inline-block;
  width: 1ch;
}

.col-subject {
  width: 26%;
  min-width: 160px;
}

tbody .col-subject {
  font-weight: inherit;
}

.code {
  display: block;
  font-size: 0.8125rem;
  font-weight: 650;
  color: var(--accent);
}

.title {
  display: block;
  margin-top: 2px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--ink);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.title:hover {
  text-decoration: underline;
}

.val {
  display: block;
  font-weight: 550;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.sub {
  display: block;
  margin-top: 2px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ink-soft);
}

/* A thin bar on the left of the answer says which way it leans, without colouring the cell. */
.tone-good .val,
.tone-warn .val {
  padding-left: 8px;
  border-left: 3px solid;
}

.tone-good .val {
  border-color: var(--good);
}

.tone-warn .val {
  border-color: var(--warn);
}

tr.marked > *,
.card.marked {
  background: color-mix(in srgb, var(--accent-soft) 70%, transparent);
}

.acts-cell {
  width: 1%;
  min-width: 8em;
}

.acts-cell :deep(.qa) {
  white-space: normal;
}

/* In the table the two actions stack, so the facts keep the width. */
.acts-cell .acts {
  flex-direction: column;
  align-items: flex-start;
}

.acts {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px 12px;
}

.text-btn {
  min-height: 36px;
  padding: 0 4px;
  border: 0;
  background: none;
  font: inherit;
  font-size: var(--fs-meta, 0.875rem);
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
  cursor: pointer;
}

.text-btn:hover {
  color: var(--ink);
  text-decoration: underline;
}

.text-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 6px;
}

@media (pointer: coarse) {
  .text-btn {
    min-height: 44px;
  }
}

/* Phones: a card per subject, its facts as a two-column list. */
.cards {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: grid;
  gap: 2px;
  padding: var(--space-4);
  border-bottom: 1px solid var(--line);
}

.card:last-child {
  border-bottom: 0;
}

.spec {
  display: grid;
  margin: var(--space-3) 0 var(--space-2);
}

.spec-row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: var(--space-3);
  padding: 6px 0;
  border-top: 1px solid var(--line);
  font-size: 0.875rem;
}

.spec dt {
  color: var(--ink-soft);
}

.spec dd {
  margin: 0;
  font-weight: 550;
  overflow-wrap: anywhere;
}

.spec dd.tone-good,
.spec dd.tone-warn {
  padding-left: 8px;
  border-left: 3px solid var(--good);
}

.spec dd.tone-warn {
  border-color: var(--warn);
}
</style>

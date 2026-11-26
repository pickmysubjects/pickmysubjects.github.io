<script setup lang="ts">
import { computed, shallowRef, toRef, watch } from 'vue'
import { X } from 'lucide-vue-next'
import QuickAdd from '@/components/browse/QuickAdd.vue'
import ShortlistToggle from './ShortlistToggle.vue'
import { PERIODS } from '@/engine'
import { link } from '@/composables/useView'
import { usePhone } from '@/composables/usePhone'
import { useShortlist } from '@/composables/useShortlist'
import { useSubjectCompare, type CompareColumn } from '@/composables/useSubjectCompare'
import { useI18n } from '@/i18n'
import { prereqGist } from '@/i18n/gist'
import { reasonText } from '@/i18n/format'
import { fitHeadlineText, whyText } from '@/i18n/fitText'
import { whyNotFit } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { localTitle } from '@/i18n/localized'

/**
 * The saved subjects as one table: a row per subject, a column per fact, every answer the one its
 * own page gives. A column header sorts; "Only differences" hides the columns where every row
 * says the same. Phones get a card per subject with the same facts as a two-column list.
 * `highlight`: subjects from an old ?compare= link, shown first and marked.
 */
// droppable: rows added only to compare (not saved): they get an × to take them out again.
const props = defineProps<{ codes: string[]; highlight: string[]; droppable?: string[] }>()
const emit = defineEmits<{ drop: [code: string] }>()
const { t, locale } = useI18n()
const shortlist = useShortlist()
const phone = usePhone('(max-width: 720px)')
const { columns, hasProfile } = useSubjectCompare(toRef(props, 'codes'))
const { data } = useDataset()
const { profile } = useProfile()

type Key = 'fit' | 'points' | 'runs' | 'exam' | 'difficulty' | 'prereq' | 'hurdles' | 'ratings'
const FACTS: Key[] = ['points', 'runs', 'exam', 'difficulty', 'prereq', 'hurdles', 'ratings']
// "Fits you" leads once the student has a profile to judge by (marks, strengths, interests).
const KEYS = computed<Key[]>(() => (hasProfile.value ? ['fit', ...FACTS] : FACTS))
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
    case 'fit': {
      // The subject page card's answer: its band and "fits better than n%", or why it's off the list now.
      const f = c.fit
      if (!f || f.kind === 'missing') return { text: '—', rank: 999 }
      if (f.kind === 'out') return { text: fitHeadlineText(tr, f, () => prereqGist(tr, c.needs)), tone: 'warn', rank: 500 }
      return {
        text: tr(`suggest.band.${f.band}`),
        sub: tr('suggest.betterPct', { n: f.rec.betterThan }),
        tone: f.band === 'great' || f.band === 'good' ? 'good' : f.band === 'low' ? 'warn' : undefined,
        rank: -f.rec.betterThan,
      }
    }
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
      return { text: c.reviews ? String(c.reviews) : tr('shortlist.noRatings'), rank: -c.reviews }
  }
}

const rows = computed(() =>
  columns.value.map((c, i) => ({
    c,
    i,
    title: localTitle(c.subject, locale.value) || c.subject.title,
    saved: shortlist.has(c.subject.code),
    marked: props.highlight.includes(c.subject.code),
    cells: Object.fromEntries(KEYS.value.map((k) => [k, cell(c, k)])) as Record<Key, Cell>,
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

// "Which fits you": the subjects by how well they fit, each with its two strongest reasons (or
// what holds it back), the same words as its subject page's card. Nothing here scores anything.
const trimEnd = (x: string) => x.replace(/[。.]\s*$/, '')
const fitList = computed(() => {
  if (!hasProfile.value || rows.value.length < 2) return []
  return [...rows.value]
    .filter((r) => r.c.fit && r.c.fit.kind !== 'missing')
    .sort((a, b) => a.cells.fit!.rank - b.cells.fit!.rank || a.i - b.i)
    .map((r) => {
      const f = r.c.fit!
      let why: string[] = []
      if (f.kind === 'fit') {
        const weak = f.band === 'low' || f.band === 'ok'
        why = weak
          ? whyNotFit(f.rec, profile.value, r.c.subject, data.value).slice(0, 2).map((x) => trimEnd(whyText(t.value, x)))
          : f.reasons.filter((n) => n.key !== 'noMatch').slice(0, 2).map((n) => trimEnd(reasonText(t.value, n)))
      }
      return { code: r.c.subject.code, title: r.title, cell: r.cells.fit!, why, difficulty: r.cells.difficulty.text }
    })
})
const best = computed(() => (fitList.value[0]?.cell.rank ?? 999) < 0 ? fitList.value[0] : null)

const onlyDiff = shallowRef(false)
// A column every subject answers the same way says nothing about which to pick.
const same = computed(() => new Set(KEYS.value.filter((k) => rows.value.length > 1 && rows.value.every((r) => r.cells[k].text === rows.value[0]!.cells[k].text && r.cells[k].sub === rows.value[0]!.cells[k].sub))))
const shown = computed(() => (onlyDiff.value ? KEYS.value.filter((k) => !same.value.has(k)) : KEYS.value))
// Sorting by a column that "Only differences" just hid would order the list by something unseen.
watch(shown, (keys) => {
  if (sortKey.value && sortKey.value !== 'subject' && !keys.includes(sortKey.value)) sortKey.value = ''
})
</script>

<template>
  <div class="saved">
    <section v-if="rows.length > 1" class="fitsum" aria-labelledby="fitsum-title">
      <h3 id="fitsum-title" class="fitsum-title">{{ t('shortlist.fitTitle') }}</h3>
      <template v-if="hasProfile">
        <p v-if="best" class="fitsum-best">{{ t('shortlist.fitBest', { code: best.code, title: best.title }) }}</p>
        <ol class="fitsum-list">
          <li v-for="x in fitList" :key="x.code" class="fitsum-row">
            <span class="fitsum-head">
              <span class="code">{{ x.code }}</span>
              <span class="fitsum-band" :class="x.cell.tone && `tone-${x.cell.tone}`">{{ x.cell.text }}</span>
              <span v-if="x.cell.sub" class="fitsum-pct">{{ x.cell.sub }}</span>
              <span class="fitsum-diff">{{ t('shortlist.col.difficulty') }}{{ t('labelSep') }}{{ x.difficulty }}</span>
            </span>
            <span v-if="x.why.length" class="fitsum-why">{{ x.why.join(t('listSep')) }}</span>
          </li>
        </ol>
        <p class="fitsum-note">{{ t('shortlist.fitNote') }}</p>
      </template>
      <p v-else class="fitsum-note">
        {{ t('shortlist.fitNeedsProfile') }} <a :href="link('record/')">{{ t('shortlist.fitAdd') }}</a>
      </p>
    </section>
    <div class="bar">
      <label v-if="rows.length > 1" class="diff">
        <input v-model="onlyDiff" type="checkbox" />
        <span>{{ t('shortlist.onlyDiff') }}</span>
      </label>
      <label v-if="phone && rows.length > 2" class="sort">
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
          <ShortlistToggle v-else :code="r.c.subject.code" compact />
                <button v-if="!r.saved && droppable?.includes(r.c.subject.code)" type="button" class="drop-btn" :aria-label="t('shortlist.dropLabel', { code: r.c.subject.code })" :title="t('shortlist.dropLabel', { code: r.c.subject.code })" @click="emit('drop', r.c.subject.code)"><X :size="18" aria-hidden="true" /></button>
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
            <th v-for="k in shown" :key="k" scope="col" :class="{ 'col-fit': k === 'fit' }" :aria-sort="ariaSort(k)">
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
            <td v-for="k in shown" :key="k" :class="[r.cells[k].tone && `tone-${r.cells[k].tone}`, { 'col-fit': k === 'fit' }]">
              <span class="val">{{ r.cells[k].text }}</span>
              <span v-if="r.cells[k].sub" class="sub">{{ r.cells[k].sub }}</span>
            </td>
            <td class="acts-cell">
              <div class="acts">
                <QuickAdd :subject="r.c.subject" text />
                <button v-if="r.saved" type="button" class="text-btn" :aria-label="t('shortlist.removeLabel', { code: r.c.subject.code })" @click="shortlist.remove(r.c.subject.code)">{{ t('shortlist.remove') }}</button>
                <ShortlistToggle v-else :code="r.c.subject.code" compact />
                <button v-if="!r.saved && droppable?.includes(r.c.subject.code)" type="button" class="drop-btn" :aria-label="t('shortlist.dropLabel', { code: r.c.subject.code })" :title="t('shortlist.dropLabel', { code: r.c.subject.code })" @click="emit('drop', r.c.subject.code)"><X :size="18" aria-hidden="true" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.fitsum {
  display: grid;
  gap: 10px;
  padding: var(--space-4);
  border-bottom: 1px solid var(--line);
}

.fitsum-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
}

.fitsum-best {
  margin: 0;
  font-weight: var(--fw-semibold);
  color: var(--accent);
}

.fitsum-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.fitsum-row {
  display: grid;
  gap: 2px;
  padding-top: 8px;
  border-top: 1px solid var(--divider);
}

.fitsum-row:first-child {
  padding-top: 0;
  border-top: 0;
}

.fitsum-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
}

.fitsum-band {
  font-weight: var(--fw-semibold);
}

.fitsum-pct,
.fitsum-diff,
.fitsum-why,
.fitsum-note {
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.fitsum-note {
  margin: 0;
}

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
/* "Fits you" keeps its band on one line ("Great fit"), its percentage under it. */
.col-fit {
  min-width: 9em;
}

.col-fit .val {
  white-space: nowrap;
}

td {
  padding: 12px 10px;
  text-align: left;
  vertical-align: middle;
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
  text-align: left;
  text-wrap: balance;
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
  white-space: nowrap;
}

/* Add and save side by side, as on the subject cards: "+ Add to plan" and the heart. */
.acts-cell .acts {
  gap: 4px;
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

.drop-btn {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  padding: 0;
  color: var(--ink-faint);
  background: transparent;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.drop-btn:hover {
  color: var(--ink);
  background: var(--accent-soft);
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

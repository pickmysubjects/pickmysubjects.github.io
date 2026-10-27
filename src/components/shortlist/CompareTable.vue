<script setup lang="ts">
import { computed, toRef } from 'vue'
import { link } from '@/composables/useView'
import { useShortlist } from '@/composables/useShortlist'
import { useSubjectCompare, type CompareColumn } from '@/composables/useSubjectCompare'
import ShortlistToggle from './ShortlistToggle.vue'
import { useI18n } from '@/i18n'
import { categoryTag, describeReq } from '@/i18n/format'
import { localTitle } from '@/i18n/localized'

/**
 * Two or three subjects side by side, one row per question a student weighs. Every answer is the
 * one the subject's own page gives (difficulty and fit from the same functions as its fit card).
 * Wide tables scroll sideways inside their own box, never the page.
 */
const props = defineProps<{ codes: string[] }>()
const { t, locale } = useI18n()
const { columns, course, hasProfile } = useSubjectCompare(toRef(props, 'codes'))
const shortlist = useShortlist()

type Tone = 'good' | 'warn' | 'neutral'
interface Cell {
  text: string
  sub?: string
  tone?: Tone
  href?: string
}
const trim = (s: string) => s.replace(/[。.]\s*$/, '')

function difficulty(c: CompareColumn): Cell {
  const level = c.difficulty.level
  return { text: t.value(`fit.level.${level}`), tone: level === 'easier' ? 'good' : level === 'harder' ? 'warn' : 'neutral' }
}

// The fit card's headline and its "better fit than" line, word for word.
function fit(c: CompareColumn): Cell {
  if (!hasProfile.value) return { text: t.value('fit.noProfile'), href: link('record') }
  const f = c.fit
  if (!f || f.kind === 'missing') return { text: t.value('shortlist.unknown') }
  if (f.kind === 'fit')
    return {
      text: t.value(`suggest.band.${f.band}`),
      sub: t.value('fit.betterThan', { n: f.rec.betterThan }),
      tone: f.band === 'great' || f.band === 'good' ? 'good' : f.band === 'low' ? 'warn' : 'neutral',
    }
  const w = f.why
  if (w.key === 'needsFirst') return { text: t.value('fit.out.needsFirst', { needs: trim(describeReq(t.value, c.subject.prerequisites, course.value)) }) }
  return { text: t.value(`fit.out.${w.key}`, { codes: (w.codes ?? []).join(', '), level: w.level ?? '' }) }
}

function assessment(c: CompareColumn): Cell {
  if (!c.assessment) return { text: t.value('shortlist.unknown') }
  return { text: c.assessment.map((a) => `${t.value(`assess.kind.${a.kind}`)} ${a.weight}%`).join(' · ') }
}

function prereq(c: CompareColumn): Cell {
  const text = t.value(`shortlist.prereq.${c.prereq}`)
  if (c.prereq === 'none') return { text, tone: 'good' }
  return {
    text,
    sub: trim(describeReq(t.value, c.subject.prerequisites, course.value)),
    tone: c.prereq === 'ok' ? 'good' : c.prereq === 'fail' ? 'warn' : 'neutral',
  }
}

function ratings(c: CompareColumn): Cell {
  const r = c.ratings
  if (!r) return { text: t.value('shortlist.noRatings') }
  const parts = [
    r.overall !== undefined ? t.value('shortlist.overall', { x: r.overall }) : '',
    r.recommend !== undefined ? t.value('shortlist.recommend', { pct: Math.round(r.recommend * 100) }) : '',
  ].filter(Boolean)
  return { text: parts.join(' · ') || t.value('shortlist.ratingsLine', { n: r.reviews }), sub: parts.length ? t.value('shortlist.ratingsLine', { n: r.reviews }) : undefined }
}

const rows = computed(() => [
  { key: 'difficulty', cells: columns.value.map(difficulty) },
  { key: 'fit', cells: columns.value.map(fit) },
  { key: 'assessment', cells: columns.value.map(assessment) },
  {
    key: 'exam',
    cells: columns.value.map<Cell>((c) => ({
      text: c.exam === null ? t.value('shortlist.unknown') : c.exam === 0 ? t.value('shortlist.noExam') : t.value('shortlist.examPct', { n: c.exam }),
    })),
  },
  {
    key: 'hours',
    cells: columns.value.map<Cell>((c) => ({
      text: c.hours ? t.value(c.hours.reported ? 'shortlist.hoursReported' : 'shortlist.hoursClass', { n: c.hours.n }) : t.value('shortlist.unknown'),
    })),
  },
  {
    key: 'runs',
    cells: columns.value.map<Cell>((c) => ({
      text: c.periods.length ? c.periods.map((p) => t.value(`period.${p}`)).join(' · ') : t.value('shortlist.notRunning'),
      tone: c.periods.length ? undefined : 'warn',
    })),
  },
  { key: 'prereq', cells: columns.value.map(prereq) },
  { key: 'ratings', cells: columns.value.map(ratings) },
  {
    key: 'counts',
    cells: columns.value.map<Cell>((c) =>
      c.category === 'closed'
        ? { text: t.value('browse.closedForYou'), tone: 'warn' }
        : { text: c.category ? categoryTag(t.value, c.category) : t.value('shortlist.notCounted') },
    ),
  },
])
</script>

<template>
  <div class="scroll" tabindex="0" role="region" :aria-label="t('shortlist.compareTitle')">
    <table class="table" :style="{ '--cols': columns.length }">
      <thead>
        <tr>
          <td class="corner" />
          <th v-for="c in columns" :key="c.subject.code" scope="col" class="col-head">
            <span class="code">{{ c.subject.code }}</span>
            <a class="title" :href="link(`subject/${c.subject.code}`)">{{ localTitle(c.subject, locale) || c.subject.title }}</a>
            <span v-if="!shortlist.has(c.subject.code)" class="not-saved">
              {{ t('shortlist.notSaved') }}
              <ShortlistToggle :code="c.subject.code" compact />
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.key">
          <th scope="row" class="row-head">{{ t(`shortlist.row.${r.key}`) }}</th>
          <td v-for="(cell, i) in r.cells" :key="i" :class="cell.tone && `tone-${cell.tone}`">
            <a v-if="cell.href" :href="cell.href" class="cell-link">{{ cell.text }}</a>
            <span v-else class="cell-text">{{ cell.text }}</span>
            <span v-if="cell.sub" class="cell-sub">{{ cell.sub }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Sideways scrolling stays inside this box (the page itself never scrolls sideways). */
.scroll {
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  border-radius: var(--radius);
}

.scroll:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.table {
  width: 100%;
  min-width: calc(128px + var(--cols) * 176px);
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-size: 0.9375rem;
}

.corner,
.row-head {
  position: sticky;
  left: 0;
  z-index: 1;
  width: 128px;
  background: var(--glass-shine), var(--sheet-fill);
}

th,
td {
  padding: 12px 14px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--line);
}

tbody tr:last-child > * {
  border-bottom: 0;
}

.col-head {
  display: table-cell;
  border-bottom: 2px solid var(--line);
}

.col-head > * {
  display: block;
}

.code {
  font-size: 0.8125rem;
  font-weight: 650;
  color: var(--accent);
}

.title {
  margin-top: 2px;
  font-weight: 650;
  line-height: 1.3;
  color: var(--ink);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.title:hover {
  text-decoration: underline;
}

.not-saved {
  display: flex !important;
  align-items: center;
  gap: 2px;
  margin-top: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ink-soft);
}

.row-head {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.cell-text,
.cell-link {
  display: block;
  font-weight: 550;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.cell-link {
  color: var(--accent);
}

.cell-sub {
  display: block;
  margin-top: 2px;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}

/* A thin bar on the left of the answer says which way it leans, without colouring the whole cell. */
td.tone-good .cell-text,
td.tone-warn .cell-text {
  padding-left: 9px;
  border-left: 3px solid;
}

td.tone-good .cell-text {
  border-color: var(--good);
}

td.tone-warn .cell-text {
  border-color: var(--warn);
}

@media (max-width: 720px) {
  .table {
    min-width: calc(104px + var(--cols) * 156px);
    font-size: 0.875rem;
  }

  .corner,
  .row-head {
    width: 104px;
  }

  th,
  td {
    padding: 10px;
  }
}

/* Phones: no sideways scrolling. Each fact is a labelled band with the subjects side by side under it,
   so every column stays in view and the eye compares straight across. */
@media (max-width: 600px) {
  .scroll {
    overflow-x: visible;
  }

  .table,
  .table thead,
  .table tbody {
    display: block;
    min-width: 0;
    font-size: 0.875rem;
  }

  .table tr {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    column-gap: 10px;
    padding: 10px 2px;
    border-bottom: 1px solid var(--line);
  }

  .table tbody tr:last-child {
    border-bottom: 0;
  }

  .table th,
  .table td {
    display: block;
    padding: 0;
    border: 0;
  }

  .corner {
    display: none !important;
  }

  .row-head {
    position: static;
    grid-column: 1 / -1;
    width: auto;
    margin-bottom: 4px;
    background: none;
    font-size: 0.75rem;
    letter-spacing: 0.02em;
  }

  .table thead tr {
    position: sticky;
    top: 64px;
    z-index: 2;
    border-bottom: 2px solid var(--line);
    background: var(--glass-shine), var(--sheet-fill);
    border-radius: 12px;
  }

  .col-head .title {
    font-size: 0.875rem;
  }
}
</style>

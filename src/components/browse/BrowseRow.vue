<script setup lang="ts">
import { computed } from 'vue'
import { Check, MessageSquareText } from 'lucide-vue-next'
import { simplifyFor, type IndexedRow, type Recommendation } from '@/engine'
import FitBadge from './FitBadge.vue'
import QuickAdd from './QuickAdd.vue'
import ShortlistToggle from '@/components/shortlist/ShortlistToggle.vue'
import RowWarnings from './RowWarnings.vue'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import { prereqGist } from '@/i18n/gist'

/**
 * One subject in the results, as a card with the same parts in the same places for every
 * subject: code and level, the title (the reader's language first), one line on what it's
 * about, then five facts in fixed columns (when it runs, points, final exam, prerequisites,
 * difficulty). A fact that isn't recorded shows a quiet dash, never a gap.
 * `reasons`: why it's on the list chosen (or suits the student). `rec` ("sort for me"): adds the
 * fit badge when `fit` is set (with nothing filled in, every row would show the same score) and
 * the cautions.
 */
const props = defineProps<{ row: IndexedRow; course: string; about: string; reasons?: string[]; rec?: Recommendation; fit?: boolean; hasRecord?: boolean }>()
const { t, locale } = useI18n()
const { data } = useDataset()

const s = computed(() => props.row.subject)
const local = computed(() => localTitle(s.value, locale.value))
const category = computed(() => s.value.categories[props.course])
// Closed to new students of this course (B-COM's ACCT10002).
const closed = computed(() => data.value.courses.some((c) => c.code === props.course && c.closed.includes(s.value.code)))

const runs = computed(() => {
  const r = props.row
  if (r.periods.length) return r.periods.map((p) => t.value(`periodShort.${p}`)).join(' · ')
  return s.value.offerings === 'unknown' ? '—' : t.value('browse.notRunning')
})
const exam = computed(() => {
  const n = props.row.exam
  return n === null ? '—' : n === 0 ? t.value('subject.factNone') : `${n}%`
})
// The subject page's wording; a rule too long for a cell reads "Yes, see details".
const prereq = computed(() => {
  const needs = simplifyFor(s.value.prerequisites, props.course)
  if (needs === 'unknown') return '—'
  const g = prereqGist(t.value, needs)
  return g === t.value('subject.factSeeBelow') ? t.value('browse.prereqSome') : g
})
const met = computed(() => props.hasRecord && props.row.prereqMet && !props.row.prereqNone)
const ease = computed(() => {
  const o = props.row.options.ease
  if (o.includes('easy')) return { text: t.value('browse.easeOpt.easy'), cls: 'ease-easy' }
  if (o.includes('hard')) return { text: t.value('browse.easeOpt.hard'), cls: 'ease-hard' }
  return props.row.exam !== null || props.row.reviewed ? { text: t.value('browse.easeMid'), cls: '' } : { text: '—', cls: 'quiet' }
})
</script>

<template>
  <!-- The title link stretches over the whole card, so the buttons inside stay real buttons. -->
  <article class="card">
    <div class="top">
      <p class="meta">
        <span class="code">{{ s.code }}</span>
        <span class="lvl">{{ t('subject.level', { level: s.level }) }}</span>
        <span v-if="closed" class="tag tag-closed">{{ t('browse.closedForYou') }}</span>
        <span v-else-if="category === 'breadth'" class="tag tag-breadth">{{ t('browse.cat.breadth') }}</span>
      </p>
      <span class="top-actions">
        <FitBadge v-if="rec && fit" :rec="rec" class="above" />
        <ShortlistToggle :code="s.code" compact class="above" />
      </span>
    </div>
    <h3 class="title">
      <a :href="link(`subject/${s.code}`)">{{ local || s.title }}</a>
    </h3>
    <p v-if="local" class="title-en" lang="en">{{ s.title }}</p>
    <p v-if="about" class="about">{{ about }}</p>

    <dl class="facts">
      <div class="fact">
        <dt>{{ t('subject.factRuns') }}</dt>
        <dd :class="{ off: !row.periods.length && s.offerings !== 'unknown' }">{{ runs }}</dd>
      </div>
      <div class="fact">
        <dt>{{ t('subject.factPoints') }}</dt>
        <dd class="num">{{ s.points }}</dd>
      </div>
      <div class="fact">
        <dt>{{ t('subject.factExam') }}</dt>
        <dd class="num" :class="{ good: row.exam === 0, quiet: row.exam === null }">{{ exam }}</dd>
      </div>
      <div class="fact">
        <dt>{{ t('subject.factPrereq') }}</dt>
        <dd :class="{ good: row.prereqNone, quiet: prereq === '—' }">
          {{ prereq }}<span v-if="met" class="met" :title="t('plan.iMeetThis')"><Check :size="12" :stroke-width="3" aria-hidden="true" /><span class="visually-hidden">{{ t('plan.iMeetThis') }}</span></span>
        </dd>
      </div>
      <div class="fact">
        <dt>{{ t('browse.ease') }}</dt>
        <dd :class="ease.cls">{{ ease.text }}</dd>
      </div>
    </dl>

    <p v-if="reasons?.length" class="reasons">
      <span v-for="x in reasons" :key="x" class="reason">{{ x }}</span>
    </p>
    <RowWarnings v-if="rec" :rec="rec" class="notes above" />

    <div class="foot">
      <span class="foot-meta">
        <span v-if="row.hours !== null">{{ t('browse.metaHours', { n: row.hours }) }}</span>
        <span v-if="row.reviewed" class="rev"><MessageSquareText :size="13" aria-hidden="true" />{{ t('browse.reviewedTag') }}</span>
      </span>
      <QuickAdd :subject="s" />
    </div>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 16px 18px 12px;
  border: 1px solid var(--card-edge);
  border-radius: 20px;
  background: var(--glass-shine), var(--card-fill);
  box-shadow: var(--glass-shadow);
  transition: border-color 0.15s, background 0.15s;
}

.card:hover {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--card-edge));
  background: var(--glass-shine), var(--peek-fill);
}

.card:has(.title a:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Buttons and badges sit above the stretched title link. */
.above {
  position: relative;
  z-index: 1;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 32px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin: 0;
  min-width: 0;
}

.code {
  font-size: var(--fs-meta);
  font-weight: 650;
  color: var(--accent);
}

.lvl {
  font-size: var(--fs-caption);
  font-weight: var(--fw-medium);
  color: var(--ink-soft);
}

.top-actions {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  margin-right: -6px;
}

.tag {
  padding: 1px 8px;
  font-size: var(--fs-caption);
  font-weight: 600;
  border-radius: 999px;
}

.tag-closed {
  color: var(--bad);
  background: var(--bad-soft);
}

.tag-breadth {
  /* Pulled toward the ink so it stays AA over the thin glass in both themes. */
  color: color-mix(in srgb, var(--warn) 72%, var(--ink));
  background: var(--warn-soft);
}

.title {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: var(--fw-semibold);
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.title a {
  color: var(--ink);
  text-decoration: none;
}

.title a::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.title a:focus-visible {
  outline: none;
}

.card:hover .title a {
  color: var(--accent);
}

.title-en {
  margin: 0;
  overflow: hidden;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* What it's about: one line, cut with an ellipsis (the subject page has the rest). */
.about {
  display: -webkit-box;
  margin: 2px 0 0;
  overflow: hidden;
  font-size: var(--fs-meta);
  line-height: 1.5;
  color: var(--ink-soft);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
}

/* Five facts in fixed columns: the same place on every card, easy to compare down the list. */
.facts {
  display: grid;
  grid-template-columns: 1.25fr 0.8fr 0.9fr 1.25fr 0.9fr;
  gap: 8px;
  margin: 10px 0 0;
  padding: 10px 0 0;
  border-top: 1px solid var(--divider);
}

.fact {
  min-width: 0;
}

.fact dt {
  overflow: hidden;
  font-size: var(--fs-caption);
  color: var(--ink-soft);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.fact dd {
  margin: 2px 0 0;
  overflow: hidden;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.fact dd.good {
  color: color-mix(in srgb, var(--good) 82%, var(--ink));
}

.fact dd.off,
.fact dd.quiet {
  font-weight: var(--fw-regular);
  color: var(--ink-soft);
}

.fact dd.ease-easy {
  color: color-mix(in srgb, var(--good) 82%, var(--ink));
}

.fact dd.ease-hard {
  color: color-mix(in srgb, var(--bad) 85%, var(--ink));
}

.met {
  display: inline-grid;
  place-items: center;
  width: 16px;
  height: 16px;
  margin-left: 4px;
  color: var(--accent-fill-ink);
  vertical-align: -2px;
  background: var(--good);
  border-radius: 50%;
}

.reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  margin: 8px 0 0;
  font-size: var(--fs-meta);
  line-height: 1.4;
}

/* Plain accent text, not more pills. */
.reason {
  color: var(--accent);
}

.reason + .reason::before {
  content: '·';
  margin-right: 12px;
  color: var(--ink-faint);
}

.notes {
  margin-top: 6px;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}

.foot-meta {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 12px;
  min-width: 0;
  font-size: var(--fs-caption);
  color: var(--ink-soft);
}

.rev {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* Narrow cards (phones): the facts wrap to three, then two columns. */
@container results (max-width: 420px) {
  .facts {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    row-gap: 10px;
  }
}

@media (max-width: 720px) {
  .reasons {
    flex-direction: column;
    gap: 2px;
  }

  .reason + .reason::before {
    content: none;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import type { Period, Subject } from '@/engine'
import { useI18n } from '@/i18n'

/** One subject on the printed page: done (with its mark), not passed, or planned. */
export interface PrintItem {
  code: string
  mark?: number
  state: 'done' | 'failed' | 'planned'
}
/** A semester on the printed page; period null for subjects whose semester wasn't given. */
export interface PrintTerm {
  year: number | null
  period: Period | null
  items: PrintItem[]
}

/**
 * The whole degree as a printed page: done and planned subjects, one block per calendar year,
 * one line per subject. Hidden on screen.
 */
const props = defineProps<{
  summary: string
  terms: PrintTerm[]
  subjects: Record<string, Subject>
  roles: Record<string, 'required' | 'option'>
  notes: string[]
}>()
const { t, locale } = useI18n()

const years = computed(() => {
  const by = new Map<number | null, PrintTerm[]>()
  for (const term of props.terms) by.set(term.year, [...(by.get(term.year) ?? []), term])
  return [...by.entries()].map(([year, terms]) => ({ year, terms }))
})
// Points earned or planned: a fail gives none.
const pointsOf = (items: PrintItem[]) => items.filter((x) => x.state !== 'failed').reduce((sum, x) => sum + (props.subjects[x.code]?.points ?? 12.5), 0)
const total = computed(() => pointsOf(props.terms.flatMap((x) => x.items)))
// Calendar years numbered from the first dated one (undated subjects don't take a number).
const firstYear = computed(() => Math.min(...props.terms.flatMap((x) => (x.year === null ? [] : [x.year]))))
const today = computed(() => new Date().toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' }))

/** Required or one of the major's choices; when a subject runs isn't news once it's planned. */
function role(code: string): 'required' | 'option' | null {
  return props.roles[code] ?? null
}
// "Bachelor of Science · 2024 S1 start · Computing and Software Systems": the major is the title.
const parts = computed(() => props.summary.split(' · '))
const headline = computed(() => parts.value.at(-1) ?? props.summary)
const subline = computed(() => parts.value.slice(0, -1))
</script>

<template>
  <article class="print">
    <header class="top">
      <div class="top-main">
        <p class="brand">PickMySubjects · {{ t('print.title') }}</p>
        <h1 class="headline">{{ headline }}</h1>
        <p class="subline">
          <span v-for="(p, i) in subline" :key="i" class="nowrap">{{ p }}<template v-if="i < subline.length - 1"> · </template></span>
        </p>
      </div>
      <div class="top-side">
        <p class="total"><strong>{{ total }}</strong> {{ t('print.pointsUnit') }}</p>
        <p class="printed">{{ t('print.printed', { date: today }) }}</p>
      </div>
    </header>

    <section v-for="y in years" :key="String(y.year)" class="year">
      <div class="year-label">
        <template v-if="y.year !== null">
          <span class="year-n">{{ t('home.year', { n: y.year - firstYear + 1 }) }}</span>
          <span class="year-cal">{{ y.year }}</span>
        </template>
        <span v-else class="year-n">{{ t('plan.pastUndated') }}</span>
        <span class="year-pts">{{ t('print.points', { n: pointsOf(y.terms.flatMap((x) => x.items)) }) }}</span>
      </div>
      <div class="terms" :style="{ gridTemplateColumns: `repeat(${y.terms.length}, minmax(0, 1fr))` }">
        <div v-for="term in y.terms" :key="String(term.period)" class="term">
          <h3 class="term-title">
            <span>{{ term.period ? t(`period.${term.period}`) : '' }}</span>
            <span class="term-points">{{ t('print.points', { n: pointsOf(term.items) }) }}</span>
          </h3>
          <ul class="subjects">
            <li v-for="x in term.items" :key="`${x.code}-${x.state}`" :class="`item-${x.state}`">
              <span class="code">{{ x.code }}</span>
              <span class="name">{{ subjects[x.code]?.title ?? t('plan.notInDataset') }}</span>
              <span v-if="x.state === 'failed'" class="tag tag-failed">{{ t('plan.pastNotPassed') }}{{ x.mark !== undefined ? ` ${x.mark}` : '' }}</span>
              <span v-else-if="x.state === 'done'" class="tag tag-done">{{ x.mark !== undefined ? x.mark : t('plan.pastTag') }}</span>
              <span v-else-if="role(x.code)" class="tag" :class="`tag-${role(x.code)}`">
                {{ role(x.code) === 'required' ? t('plan.tagRequired') : t('plan.tagOption') }}
              </span>
            </li>
            <li v-if="term.items.length === 0" class="empty">—</li>
          </ul>
        </div>
      </div>
    </section>

    <section v-if="notes.length" class="notes">
      <h2 class="notes-title">{{ t('print.checks') }}</h2>
      <ul>
        <li v-for="(n, i) in notes" :key="i">{{ n }}</li>
      </ul>
    </section>

    <footer class="foot">{{ t('print.footer') }} · pickmysubjects.github.io</footer>
  </article>
</template>

<style scoped>
.print {
  display: none;
  --ink: #16161a;
  --soft: #6b6b75;
  --line: #e4e2ea;
  --accent: #c2227a;
  color: var(--ink);
  font-size: 9.5pt;
  line-height: 1.35;
}

@media print {
  @page {
    size: A4;
    margin: 13mm 14mm;
  }

  .print {
    display: block;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

.nowrap {
  white-space: nowrap;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16pt;
  padding-bottom: 9pt;
  margin-bottom: 10pt;
  border-bottom: 2pt solid var(--ink);
}

.brand {
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}

.headline {
  margin-top: 2pt;
  font-size: 18pt;
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.subline {
  margin-top: 3pt;
  font-size: 9.5pt;
  color: var(--soft);
}

.top-side {
  flex: none;
  text-align: right;
}

.total {
  font-size: 9pt;
  color: var(--soft);
}

.total strong {
  font-size: 22pt;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.printed {
  font-size: 8pt;
  color: var(--soft);
}

.year {
  display: grid;
  grid-template-columns: 52pt minmax(0, 1fr);
  gap: 10pt;
  padding: 8pt 0;
  border-bottom: 0.75pt solid var(--line);
  break-inside: avoid;
}

.year-label {
  display: grid;
  align-content: start;
  gap: 1pt;
}

.year-n {
  font-size: 11pt;
  font-weight: 750;
}

.year-cal,
.year-pts {
  font-size: 8pt;
  color: var(--soft);
}

.terms {
  display: grid;
  gap: 12pt;
}

.term-title {
  display: flex;
  justify-content: space-between;
  padding-bottom: 3pt;
  margin-bottom: 4pt;
  font-size: 8.5pt;
  font-weight: 700;
  letter-spacing: 0.02em;
  border-bottom: 1.25pt solid var(--accent);
}

.term-points {
  font-weight: 500;
  color: var(--soft);
}

.subjects {
  display: grid;
  gap: 3pt;
  margin: 0;
  padding: 0;
  list-style: none;
}

.subjects li {
  display: grid;
  grid-template-columns: 50pt minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 5pt;
}

.code {
  font-family: var(--font-code);
  font-size: 8pt;
  font-weight: 700;
  color: var(--soft);
}

.name {
  font-size: 9pt;
}

.tag {
  padding: 0.5pt 4pt;
  border-radius: 6pt;
  font-size: 6.5pt;
  font-weight: 700;
  white-space: nowrap;
}

.tag-required {
  background: var(--accent-fill);
  color: #fff;
}

.tag-option {
  border: 0.75pt solid var(--accent);
  color: var(--accent);
}

.empty {
  color: #aaa;
}

.notes {
  margin-top: 9pt;
  padding: 6pt 9pt;
  font-size: 8pt;
  background: #fbf6e9;
  border-left: 2pt solid #d9a43a;
  break-inside: avoid;
}

.notes-title {
  margin-bottom: 2pt;
  font-size: 8.5pt;
  font-weight: 700;
}

.notes ul {
  margin: 0;
  padding-left: 11pt;
}

.foot {
  margin-top: 9pt;
  font-size: 7pt;
  color: var(--soft);
}
.tag-done {
  font-family: var(--font-code);
  font-weight: 700;
  color: #1f8a52;
}

.tag-failed {
  color: #b42318;
}

.item-done .name,
.item-failed .name {
  color: var(--soft);
}
</style>

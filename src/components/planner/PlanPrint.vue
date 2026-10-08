<script setup lang="ts">
import { computed } from 'vue'
import { periodsFor, type PlanTerm, type Subject } from '@/engine'
import { useI18n } from '@/i18n'

/** The plan as a printed page: one block per calendar year, one line per subject. Hidden on screen. */
const props = defineProps<{
  summary: string
  terms: PlanTerm[]
  subjects: Record<string, Subject>
  roles: Record<string, 'required' | 'option'>
  notes: string[]
}>()
const { t, locale } = useI18n()

const years = computed(() => {
  const by = new Map<number, PlanTerm[]>()
  for (const term of props.terms) by.set(term.year, [...(by.get(term.year) ?? []), term])
  return [...by.entries()].map(([year, terms]) => ({ year, terms }))
})
const pointsOf = (codes: string[]) => codes.reduce((sum, c) => sum + (props.subjects[c]?.points ?? 0), 0)
const total = computed(() => pointsOf(props.terms.flatMap((x) => x.subjects)))
const today = computed(() => new Date().toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' }))

/** Small notes after a subject: required/option, and "S1 only" when it runs in one semester. */
function marks(code: string, year: number): string[] {
  const out: string[] = []
  const role = props.roles[code]
  if (role === 'required') out.push(t.value('plan.tagRequired'))
  if (role === 'option') out.push(t.value('plan.tagOption'))
  const s = props.subjects[code]
  const sems = s ? periodsFor(s, year).filter((p) => p === 'semester-1' || p === 'semester-2') : []
  if (sems.length === 1) out.push(t.value(sems[0] === 'semester-1' ? 'plan.s1Only' : 'plan.s2Only'))
  return out
}
</script>

<template>
  <article class="print">
    <header class="top">
      <p class="brand">PickMySubjects · {{ t('print.title') }}</p>
      <h1 class="summary">{{ summary }}</h1>
      <p class="meta">{{ t('print.total', { n: total }) }} · {{ t('print.printed', { date: today }) }}</p>
    </header>

    <section v-for="y in years" :key="y.year" class="year">
      <h2 class="year-title">{{ y.year }}</h2>
      <div class="terms" :style="{ gridTemplateColumns: `repeat(${y.terms.length}, minmax(0, 1fr))` }">
        <div v-for="term in y.terms" :key="term.period" class="term">
          <h3 class="term-title">
            <span>{{ t(`period.${term.period}`) }}</span>
            <span class="term-points">{{ t('print.points', { n: pointsOf(term.subjects) }) }}</span>
          </h3>
          <ul class="subjects">
            <li v-for="code in term.subjects" :key="code">
              <span class="code">{{ code }}</span>
              <span class="name">
                {{ subjects[code]?.title ?? t('plan.notInDataset') }}
                <span v-if="marks(code, term.year).length" class="marks">{{ marks(code, term.year).join(' · ') }}</span>
              </span>
            </li>
            <li v-if="term.subjects.length === 0" class="empty">—</li>
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
  color: #111;
  font-size: 10pt;
  line-height: 1.4;
}

@media print {
  .print {
    display: block;
  }
}

.top {
  padding-bottom: 10pt;
  margin-bottom: 14pt;
  border-bottom: 1.5pt solid #111;
}

.brand {
  font-size: 8.5pt;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #c2227a;
}

.summary {
  margin-top: 3pt;
  font-size: 16pt;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.meta {
  margin-top: 3pt;
  font-size: 9pt;
  color: #555;
}

.year {
  margin-bottom: 12pt;
  break-inside: avoid;
}

.year-title {
  margin-bottom: 5pt;
  font-size: 11pt;
  font-weight: 700;
}

.terms {
  display: grid;
  gap: 10pt;
}

.term {
  padding: 7pt 9pt;
  border: 0.75pt solid #bbb;
  border-radius: 4pt;
}

.term-title {
  display: flex;
  justify-content: space-between;
  padding-bottom: 4pt;
  margin-bottom: 4pt;
  font-size: 9.5pt;
  font-weight: 700;
  border-bottom: 0.75pt solid #ddd;
}

.term-points {
  font-weight: 400;
  color: #555;
}

.subjects {
  display: grid;
  gap: 4pt;
  margin: 0;
  padding: 0;
  list-style: none;
}

.subjects li {
  display: grid;
  grid-template-columns: 62pt 1fr;
  gap: 6pt;
}

.code {
  font-family: var(--font-code);
  font-size: 8.5pt;
  font-weight: 700;
}

.marks {
  display: block;
  font-size: 7.5pt;
  color: #c2227a;
}

.empty {
  color: #999;
}

.notes {
  margin-top: 4pt;
  padding: 7pt 9pt;
  font-size: 8.5pt;
  border: 0.75pt solid #e0b44c;
  border-radius: 4pt;
  break-inside: avoid;
}

.notes-title {
  margin-bottom: 3pt;
  font-size: 9pt;
  font-weight: 700;
}

.notes ul {
  margin: 0;
  padding-left: 12pt;
}

.foot {
  margin-top: 14pt;
  padding-top: 6pt;
  font-size: 7.5pt;
  color: #777;
  border-top: 0.75pt solid #ddd;
}
</style>

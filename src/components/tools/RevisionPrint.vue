<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import { addDays, weekday, type RevisionDay, type RevisionPlan, type RevisionType } from '@/engine/revisionPlan'

/**
 * The printed revision plan (A4 portrait, fits Letter): a title block, a small legend table, the
 * schedule week by week (Mon–Sun) and the reasons as a short list at the end. Hidden on screen;
 * when printing, it is the only thing on the page. Subjects are told apart by a bordered tag with
 * its own border style, never by colour alone. When the days hold too much for a 7-column grid, the
 * schedule falls back to a day list.
 */
const props = defineProps<{
  plan: RevisionPlan
  term: string
  rows: readonly { code: string; exam: string; time?: string }[]
  nameOf: (code: string) => string
  whyOf: (d: RevisionDay) => string
}>()
const { t, locale } = useI18n()
const asDate = (d: string) => new Date(`${d}T00:00:00Z`)
const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale.value, { ...opts, timeZone: 'UTC' })
const dayLabel = (d: string) => fmt({ day: 'numeric', month: 'short' }).format(asDate(d))
const weekdayLabel = (d: string) => fmt({ weekday: 'short' }).format(asDate(d))
const hours = (h: number) => t.value('rev.hoursN', { n: h })
const typeOf = (x: RevisionType) => t.value(`rev.type.${x}`)
const codes = computed(() => props.plan.totals.map((x) => x.code))
// A border style per subject: the tag tells subjects apart in black and white.
const STYLES = ['solid', 'dashed', 'dotted', 'double'] as const
const styleOf = (code: string) => `p-${STYLES[Math.max(0, codes.value.indexOf(code)) % STYLES.length]}`
const timeOf = (code: string) => props.rows.find((r) => r.code === code)?.time
const examOf = (code: string) => props.rows.find((r) => r.code === code)?.exam ?? ''
const examText = (code: string) => [t.value('rev.exam'), code, timeOf(code)].filter(Boolean).join(' ')
const total = computed(() => props.plan.totals.reduce((s, x) => s + x.hours, 0))
const first = computed(() => props.plan.days[0]?.date ?? '')
const last = computed(() => props.plan.days.at(-1)?.date ?? '')
const today = new Date().toISOString().slice(0, 10)
const meta = computed(() => t.value('rev.printMeta', { from: dayLabel(first.value), to: dayLabel(last.value), hours: hours(total.value), date: dayLabel(today) }))

/** A day's sittings, back-to-back ones of the same subject and kind joined: "COMP10001 3 h · 自测". */
function lines(d: RevisionDay): { code: string; hours: number; type: RevisionType }[] {
  const out: { code: string; hours: number; type: RevisionType }[] = []
  for (const s of d.sessions) {
    const same = out.find((x) => x.code === s.code && x.type === s.type)
    if (same) same.hours += s.hours
    else out.push({ code: s.code, hours: s.hours, type: s.type })
  }
  return out
}

/** Whole weeks, Monday to Sunday; days outside the plan are blank. */
const weeks = computed(() => {
  const days = props.plan.days
  if (!days.length) return []
  const byDate = new Map(days.map((d) => [d.date, d]))
  const out: { date: string; day?: RevisionDay }[][] = []
  for (let d = addDays(first.value, -((weekday(first.value) + 6) % 7)); d <= last.value; d = addDays(d, 7)) {
    out.push(Array.from({ length: 7 }, (_, i) => ({ date: addDays(d, i), day: byDate.get(addDays(d, i)) })))
  }
  return out
})
// More than four lines in a day won't fit a grid cell on A4: use the day list instead.
const asList = computed(() => props.plan.days.some((d) => lines(d).length > 4))
const reasons = computed(() => props.plan.days.filter((d) => d.reason).map((d) => ({ date: d.date, text: props.whyOf(d) })))
</script>

<template>
  <section class="rev-print" aria-hidden="true">
    <header class="pr-head">
      <h1>{{ t('rev.printTitle', { term }) }}</h1>
      <p>{{ meta }}</p>
    </header>

    <table class="pr-legend">
      <thead>
        <tr><th>{{ t('rev.subject') }}</th><th>{{ t('rev.printName') }}</th><th>{{ t('rev.printHours') }}</th><th>{{ t('rev.exam') }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="x in plan.totals" :key="x.code">
          <td><span class="pr-tag" :class="styleOf(x.code)">{{ x.code }}</span></td>
          <td>{{ nameOf(x.code) }}</td>
          <td class="pr-num">{{ hours(x.hours) }}</td>
          <td class="pr-num">{{ [weekdayLabel(examOf(x.code)), dayLabel(examOf(x.code)), timeOf(x.code)].filter(Boolean).join(' ') }}</td>
        </tr>
      </tbody>
    </table>

    <table v-if="!asList" class="pr-grid">
      <thead>
        <tr><th v-for="c in weeks[0]" :key="c.date">{{ weekdayLabel(c.date) }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="(w, i) in weeks" :key="i">
          <td v-for="c in w" :key="c.date" :class="{ 'pr-out': !c.day }">
            <span class="pr-date">{{ dayLabel(c.date) }}</span>
            <template v-if="c.day">
              <strong v-for="x in c.day.exams" :key="x" class="pr-exam">{{ examText(x) }}</strong>
              <span v-if="c.day.kind === 'rest'" class="pr-rest">{{ t('rev.restDay') }}</span>
              <span v-for="(l, j) in lines(c.day)" :key="j" class="pr-line"><span class="pr-tag" :class="styleOf(l.code)">{{ l.code }}</span><span class="pr-what">{{ hours(l.hours) }} · {{ typeOf(l.type) }}</span></span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <ol v-else class="pr-list">
      <li v-for="d in plan.days" :key="d.date">
        <span class="pr-ldate">{{ weekdayLabel(d.date) }} {{ dayLabel(d.date) }}</span>
        <span>
          <strong v-for="x in d.exams" :key="x" class="pr-exam">{{ examText(x) }}</strong>
          <span v-if="d.kind === 'rest'" class="pr-rest">{{ t('rev.restDay') }}</span>
          <span v-for="(l, j) in lines(d)" :key="j" class="pr-line"><span class="pr-tag" :class="styleOf(l.code)">{{ l.code }}</span><span class="pr-what">{{ hours(l.hours) }} · {{ typeOf(l.type) }}</span></span>
          <span v-if="d.reason" class="pr-why">{{ whyOf(d) }}</span>
        </span>
      </li>
    </ol>

    <section v-if="!asList && reasons.length" class="pr-reasons">
      <h2>{{ t('rev.printWhy') }}</h2>
      <ul>
        <li v-for="r in reasons" :key="r.date"><span class="pr-num">{{ dayLabel(r.date) }}</span> {{ r.text }}</li>
      </ul>
    </section>
  </section>
</template>

<style>
.rev-print {
  display: none;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 14mm 12mm 16mm;

    @bottom-left {
      content: 'PickMySubjects';
      font-size: 8pt;
      color: #555;
    }

    @bottom-right {
      content: counter(page) ' / ' counter(pages);
      font-size: 8pt;
      color: #555;
    }
  }

  /* On this page, only the printed plan. */
  body:has(.rev-print) :is(.header, .footer, .backdrop, .preview-pill, .dhero),
  body:has(.rev-print) .rev > :not(.rev-print) {
    display: none !important;
  }

  body:has(.rev-print) :is(main, .tools, .rev) {
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
    max-width: none !important;
  }

  .rev-print {
    display: block;
    color: #000;
    background: #fff;
    font-size: 8.5pt;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .rev-print * {
    box-shadow: none !important;
    text-shadow: none !important;
  }

  .pr-head h1 {
    margin: 0;
    font-size: 15pt;
  }

  .pr-head p {
    margin: 2pt 0 8pt;
    color: #333;
  }

  .rev-print table {
    width: 100%;
    border-collapse: collapse;
  }

  .pr-legend {
    margin-bottom: 8pt;
  }

  .pr-legend :is(th, td) {
    padding: 2pt 4pt;
    border-bottom: 0.5pt solid #999;
    text-align: left;
    vertical-align: top;
  }

  .rev-print th {
    font-weight: 600;
  }

  .pr-num {
    font-variant-numeric: tabular-nums;
  }

  .pr-grid {
    table-layout: fixed;
  }

  .pr-grid th {
    padding: 2pt 3pt;
    border: 0.5pt solid #666;
    text-align: left;
  }

  .pr-grid tr {
    break-inside: avoid;
  }

  .pr-grid td {
    height: 22mm;
    padding: 2pt 3pt;
    border: 0.5pt solid #666;
    vertical-align: top;
  }

  .pr-out {
    color: #999;
  }

  .pr-date {
    display: block;
    margin-bottom: 1pt;
    font-weight: 600;
  }

  .pr-exam,
  .pr-rest,
  .pr-line,
  .pr-why {
    display: block;
  }

  .pr-exam {
    font-weight: 700;
  }

  .pr-rest {
    font-style: italic;
  }

  .pr-line {
    margin-top: 1pt;
    font-size: 7.5pt;
  }

  .pr-what {
    display: block;
  }

  .pr-tag {
    padding: 0 2pt;
    border: 1pt solid #000;
    border-radius: 2pt;
    font-weight: 600;
  }

  .pr-tag.p-dashed {
    border-style: dashed;
  }

  .pr-tag.p-dotted {
    border-style: dotted;
  }

  .pr-tag.p-double {
    border-width: 2.5pt;
    border-style: double;
  }

  .pr-why {
    margin-top: 1pt;
    font-size: 7.5pt;
    color: #333;
  }

  .pr-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .pr-list li {
    display: grid;
    grid-template-columns: 22mm 1fr;
    gap: 4pt;
    padding: 3pt 0;
    border-top: 0.5pt solid #999;
    break-inside: avoid;
  }

  .pr-ldate {
    font-weight: 600;
  }

  .pr-reasons {
    margin-top: 8pt;
    break-inside: avoid;
  }

  .pr-reasons h2 {
    margin: 0 0 3pt;
    font-size: 10pt;
  }

  .pr-reasons ul {
    margin: 0;
    padding-left: 12pt;
    font-size: 7.5pt;
    color: #222;
  }
}
</style>

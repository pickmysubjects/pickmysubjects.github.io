<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ArrowRight, Calculator, CalendarDays, CalendarPlus, Check, Gauge, LifeBuoy, NotebookPen } from 'lucide-vue-next'
import DetailHero from '@/components/browse/DetailHero.vue'
import WeekStrip, { type StripTask } from '@/components/semester/WeekStrip.vue'
import QuickRate from '@/components/rating/QuickRate.vue'
import RatingForm from '@/components/rating/RatingForm.vue'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePersisted } from '@/composables/usePersisted'
import { usePhone } from '@/composables/usePhone'
import { usePlan } from '@/composables/usePlan'
import { useRated } from '@/composables/useRated'
import { useSemester } from '@/composables/useSemester'
import type { QuickStart } from '@/composables/useMyRatings'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import { summariseAssessment } from '@/utils/assessment'
import { buildIcs, datesForTerms, downloadIcs, KEY_DATES, type KeyDate } from '@/utils/keyDates'
import { useFinalCalc } from '@/composables/useFinalCalc'
import { finalBand, finalNeeds, partsFromRows, percentOf } from '@/engine/finalCalc'
import type { Timing } from '@/engine/timing'
import { cleanStringLists } from '@/utils/sanitize'
import { nextKeyDates } from '@/utils/semester'
import { subjectsIn } from '@/utils/whatsNext'
import { dueSegments, numericRange, spanSegments, timingLabel, timingOrder } from '@/utils/taskTiming'
import { RATINGS_FORM } from '@/config'
import { isFormReady, LIVE_HOST } from '@/utils/googleForm'

/**
 * /this-semester/: which week it is, the semester as a strip of weeks, the next official dates,
 * and the student's own subjects this term with their assessment in plain words. Everything
 * personal (and the week itself) is drawn after mounting; the prerendered page carries the
 * semester's weeks and dates in words (scripts/prerender.ts).
 */
const { t, locale } = useI18n()
const { data } = useDataset()
const phone = usePhone()
const { rated, markRated } = useRated()
const { today, now, subjects, termSubjects, shortTerm, day, range, when, termName, status, dateLabel } = useSemester()
const plan = usePlan()

const art = () => import('@/components/tools/art/ArtRevision.vue')

// Saved on this device only: hidden subjects and ticked tasks, by term ("2027-semester-1").
const asStringLists = cleanStringLists
const calc = useFinalCalc()
const hiddenStore = usePersisted<Record<string, string[]>>('sc:semHidden', {}, asStringLists)
const doneStore = usePersisted<Record<string, string[]>>('sc:semDone', {}, asStringLists)
const rateSeen = usePersisted<string[]>('sc:semRateSeen', [], (raw) => (Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []))

const termKey = computed(() => (now.value ? `${now.value.sem.year}-${now.value.sem.term}` : ''))
const name = computed(() => (now.value ? termName(now.value.sem.year, now.value.sem.term) : ''))
const hidden = computed(() => new Set(hiddenStore.value[termKey.value] ?? []))
const shown = computed(() => subjects.value.filter((c) => !hidden.value.has(c)))
// Only the hidden ones still in this term count (one taken off the plan since isn't "hidden").
const hiddenCount = computed(() => subjects.value.filter((c) => hidden.value.has(c)).length)

function hide(code: string): void {
  hiddenStore.value = { ...hiddenStore.value, [termKey.value]: [...hidden.value, code] }
}
function showAll(): void {
  const { [termKey.value]: _gone, ...rest } = hiddenStore.value
  hiddenStore.value = rest
}

// The official exam dates, short ("6/7–6/25"), for tasks in the exam period.
const examRange = computed(() => (now.value?.sem.exams ? numericRange(locale.value, now.value.sem.exams.start, now.value.sem.exams.end) : ''))

// Each task of a subject, numbered within its kind ("Assignment 2"), with its Handbook timing,
// in the order they come up (untimed ones last). Once the student has the subject in the final
// mark calculator, its parts come from there instead (a part added, a weight or hurdle changed),
// each with the mark typed; a part keeps the Handbook timing of the same kind in the same place.
const cardsFor = (codes: string[]) =>
  codes.map((code) => {
    const s = data.value.subjects[code]!
    const handbook = Array.isArray(s.assessment) ? s.assessment : []
    const rows = calc.value[code]?.rows
    // The nth part of a kind in the calculator is the nth of that kind in the Handbook.
    const nth = new Map<string, number>()
    const parts = rows
      ? rows.map((r, j) => {
          const k = nth.get(r.kind) ?? 0
          nth.set(r.kind, k + 1)
          const i = handbook.map((x, ix) => (x.kind === r.kind ? ix : -1)).filter((ix) => ix >= 0)[k] ?? -1
          const pct = r.score === '' ? null : percentOf(r.score, r.outOf === '' ? 100 : r.outOf)
          // A week the student set in the calculator wins over the Handbook's timing.
          const timing: Timing | undefined = r.week ? { kind: 'week', from: r.week, text: '' } : i >= 0 ? handbook[i]!.timing : undefined
          return { kind: r.kind, weight: r.weight, hurdle: !!r.hurdle, timing, id: i >= 0 ? `${code}:${i}` : `${code}:calc${j}`, mark: pct === null ? '' : `${r.score}/${r.outOf === '' ? 100 : r.outOf}` }
        })
      : handbook.map((x, i) => ({ kind: x.kind, weight: x.weight, hurdle: !!x.hurdle, timing: x.timing, id: `${code}:${i}`, mark: '' }))
    const counts = new Map<string, number>()
    for (const x of parts) counts.set(x.kind, (counts.get(x.kind) ?? 0) + 1)
    // Sorted by when they happen, then numbered in that order; the id keeps the Handbook position.
    const seen = new Map<string, number>()
    const items = [...parts]
      .sort((a, b) => timingOrder(a.timing) - timingOrder(b.timing))
      .map((x) => {
        const n = (seen.get(x.kind) ?? 0) + 1
        seen.set(x.kind, n)
        const label = t.value(`assess.kind.${x.kind}`) + ((counts.get(x.kind) ?? 0) > 1 ? ` ${n}` : '')
        return { id: x.id, label, weight: x.weight, hurdle: x.hurdle, timing: x.timing, when: timingLabel(t.value, x.timing, examRange.value), mark: x.mark }
      })
    const done = new Set(doneStore.value[termKey.value] ?? [])
    return {
      code,
      title: localTitle(s, locale.value) || s.title,
      summary: summariseAssessment(rows ? parts.map((p) => ({ kind: p.kind, weight: p.weight, ...(p.hurdle ? { hurdle: true } : {}) })) : s.assessment),
      fromCalc: calc.value[code]?.custom === true,
      items,
      done: items.filter((i) => done.has(i.id)).length,
      doneSet: done,
    }
  })
const cards = computed(() => cardsFor(shown.value))

// Marks typed into the final calculator, in a line under each subject: what's in so far and the
// best grade still within reach ("H1 needs 81% on the rest"), or the mark once everything is in.
function marksLine(code: string): string {
  const rows = calc.value[code]?.rows
  const r = rows ? finalNeeds(partsFromRows(rows)) : null
  if (!r || r.doneWeight <= 0) return ''
  // Same grade as the calculator: a failed hurdle is NH, a pass/fail subject is P or N.
  const passFail = !!data.value.subjects[code]?.passFail
  if (r.mark !== null) return t.value('sem.markFinal', { mark: r.mark, band: finalBand(r, passFail) })
  // Both out of 100, as the calculator counts them (hand-typed weights may not add up to 100).
  const soFar = t.value('sem.marksSoFar', { earned: r.earned, done: Math.round(r.doneWeight * (100 / r.totalWeight) * 10) / 10 })
  // A hurdle already failed: no grade is in reach, the calculator says why.
  if (r.hurdlesMissed.length) return soFar
  const aim = r.bands.find((b) => b.status !== 'impossible' && (!passFail || b.band === 'P'))
  if (!aim) return soFar
  return `${soFar} · ${aim.status === 'secured' ? t.value('sem.bandSecured', { band: aim.band }) : t.value('sem.bandNeeds', { band: aim.band, n: aim.needed! })}`
}

// This semester as a calendar file: its census, exam and results dates, and each task in the
// week the Handbook puts it (Monday to Friday, or the exam period), never a made-up day.
function saveCalendar(): void {
  const n = now.value
  if (!n) return
  const sem = n.sem
  const official = datesForTerms(KEY_DATES, [{ year: sem.year, period: sem.term }])
  // Before the semester starts too: its subjects come from the plan (hidden ones left out).
  const tasks = cardsFor(termSubjects.value.filter((c) => !hidden.value.has(c))).flatMap((c) =>
    c.items.flatMap((i) =>
      dueSegments(i.timing, sem).map((k) => {
        const seg = sem.segments[k]!
        const end = seg.kind === 'teach' ? addDays(seg.start, 4) : (sem.exams?.end ?? seg.end)
        // One event per week, each with its own id (a task due in Weeks 7 and 12 is two events).
        // The exam period starts on the first exam day, not the Monday of its week.
        const start = seg.kind === 'exams' ? (sem.exams?.start ?? seg.start) : seg.start
        return { id: `${termKey.value}-${i.id.replace(':', '-')}-${k}`, start, end, url: `https://${LIVE_HOST}/subject/${c.code}/`, summary: t.value('sem.icsTask', { code: c.code, task: i.label, weight: i.weight, when: i.when }) }
      }),
    ),
  )
  const label = (d: { summary?: string; kind?: KeyDate['kind'] }) => d.summary ?? `${kindName(d as KeyDate)} · ${name.value}`
  downloadIcs(buildIcs<(typeof tasks)[number] | KeyDate>([...official, ...tasks], label), `unimelb-${termKey.value}.ics`)
}
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

function toggle(id: string): void {
  const list = doneStore.value[termKey.value] ?? []
  doneStore.value = { ...doneStore.value, [termKey.value]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] }
}

// The week strip's markers: each task under the week it's due in ("COMP10001 Quiz 20%, hurdle"),
// and ranged ones ("Weeks 4–12") under every week they run through, marked as ongoing.
const stripTasks = computed<StripTask[][]>(() => {
  const sem = now.value?.sem
  if (!sem) return []
  const out: StripTask[][] = sem.segments.map(() => [])
  for (const c of cards.value) {
    for (const i of c.items) {
      const base = `${c.code} ${i.label} ${i.weight}%${i.hurdle ? `, ${t.value('next.hurdle')}` : ''}`
      for (const k of dueSegments(i.timing, sem)) out[k]!.push({ label: base })
      for (const k of spanSegments(i.timing, sem)) out[k]!.push({ label: `${base} · ${t.value('timing.ongoing', { when: i.when })}`, ongoing: true })
    }
  }
  return out
})

/** "Final exam 60%, hurdle · Assignments 40%": the summary in plain words. */
function plainSummary(c: (typeof cards.value)[number]): string {
  const a = c.summary
  if (!a) return t.value('next.notRecorded')
  return a.parts
    .map((p) => `${t.value(`assess.kind.${p.kind}`)} ${p.weight}%${p.kind === 'exam' && a.examHurdle ? `, ${t.value('next.hurdle')}` : ''}`)
    .join(' · ')
}

// The official dates: the next one large with an action beside it, then three more.
const upcoming = computed(() => (today.value ? nextKeyDates(KEY_DATES, today.value, 4) : []))
const first = computed(() => upcoming.value[0])
const later = computed(() => upcoming.value.slice(1))
const kindName = (d: KeyDate) => t.value(`guide.kd.kind.${d.kind}`)
// The last day the University has published; past it, the page says so instead of going blank.
const lastPublished = KEY_DATES.reduce((m, d) => (d.end > m ? d.end : m), '')
// With the year: it's read from a later year.
const lastPublishedText = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${lastPublished}T00:00:00Z`)))
function dateWhen(i: { date: KeyDate; days: number; running: boolean }): string {
  if (i.running) return t.value('next.until', { date: day(i.date.end) })
  return when(i.days, i.date.start)
}
/** Red only for something within two days. */
const soon = (i: { days: number; running: boolean }) => !i.running && i.days >= 0 && i.days <= 2

/** What to do about a date, beside its countdown. */
function actionFor(d: KeyDate): { to: string; label: string } {
  switch (d.kind) {
    case 'swotvac':
    case 'exams':
      return { to: 'tools/revision/', label: t.value('sem.revision') }
    case 'results':
    case 'supp':
      return { to: 'tools/wam/', label: t.value('sem.wam') }
    case 'reenrol':
    case 'reenrolLate':
    case 'selfEnrol':
      return { to: 'plan/', label: t.value('sem.toPlanner') }
    case 'census':
    case 'withdraw':
      return { to: 'guide/enrolling/', label: t.value('guide.cat.enrolling.nav') }
    case 'orientation':
    case 'teaching':
      return { to: 'guide/semester/#first-week', label: t.value('guide.weekTitle') }
    default:
      return { to: 'guide/semester/', label: t.value('sem.guideLink') }
  }
}

// After results: "rate what you just finished", once a term, only subjects not rated yet.
const ratingReady = isFormReady(RATINGS_FORM)
const toRate = computed(() => (now.value?.phase === 'results' && ratingReady && !rateSeen.value.includes(termKey.value) ? subjects.value.filter((c) => !rated.value.has(c)) : []))
const rateOpen = shallowRef<Record<string, QuickStart | undefined>>({})
const rateFull = shallowRef<string | null>(null)
function more(code: string, start: QuickStart): void {
  rateOpen.value = { ...rateOpen.value, [code]: start }
  rateFull.value = code
}
function rateDone(code: string, sent: boolean): void {
  rateFull.value = null
  if (sent) markRated(code)
}
function dismissRate(): void {
  rateSeen.value = [...rateSeen.value, termKey.value]
}

// What the main column shows for the student's own subjects.
const teachingish = computed(() => !!now.value && ['teach', 'break', 'swotvac', 'exams', 'waiting'].includes(now.value.phase))
const nextSem = computed(() => {
  const n = now.value
  if (!n) return null
  if (n.phase === 'before') return { name: name.value, days: n.days, start: n.sem.teaching.start }
  if (n.phase === 'results' && n.next) return { name: termName(n.next.year, n.next.term), days: Math.round((Date.parse(n.next.teaching.start) - Date.parse(today.value)) / 86_400_000), start: n.next.teaching.start }
  return null
})
// Between semesters: what the plan already has in the semester coming up (planned only, not the record).
const nextPlanned = computed(() => {
  const n = now.value
  const sem = n?.phase === 'before' ? n.sem : n?.phase === 'results' ? n.next : null
  if (!sem) return []
  return subjectsIn(sem.year, sem.term, plan.terms.value, [])
    .filter((c) => c in data.value.subjects)
    .map((code) => ({ code, title: localTitle(data.value.subjects[code]!, locale.value) || data.value.subjects[code]!.title }))
})
const nextSemLine = computed(() => {
  const s = nextSem.value
  if (!s) return ''
  const w = s.days > 14 ? t.value('sem.inWeeks', { n: Math.round(s.days / 7) }) : when(s.days, s.start)
  return t.value('sem.starts', { term: s.name, when: w })
})

// The rail's semester guide link: the first-weeks section until census is past, the whole page after.
const guideTo = computed(() => {
  const n = now.value
  const early = n?.phase === 'before' || n?.phase === 'results' || (n?.phase === 'teach' && n.week <= 4)
  return early ? 'guide/semester/#first-week' : 'guide/semester/'
})

// The week strip's caption: this week's dates, or the break after week n.
const caption = computed(() => {
  const n = now.value
  if (!n) return ''
  if (n.phase === 'teach') return `${t.value('sem.weekOf', { n: n.week, total: n.sem.weeks })} · ${range(n.sem.segments[n.segment]!)}`
  if (n.phase === 'break') return `${t.value('sem.break')} · ${t.value('sem.breakAfter', { n: n.week })}`
  if (n.phase === 'swotvac' && n.sem.swotvac) return `${t.value('sem.swotvac')} · ${range(n.sem.swotvac)}`
  if (n.phase === 'exams' && n.sem.exams) return `${t.value('sem.exams')} · ${range(n.sem.exams)}`
  if (n.phase === 'before') return `${range(n.sem.teaching)}`
  return ''
})
</script>

<template>
  <div class="sem">
    <DetailHero :title="t('sem.title')" :art="art">
      <p v-if="status" class="sem-status">{{ status }}</p>
      <p class="lede">{{ t('sem.lede') }}</p>
    </DetailHero>

    <div v-if="today" class="sem-grid">
      <div class="sem-main">
        <!-- Results are out: lead with rating what was just finished. -->
        <section v-if="toRate.length" class="surface card rate-card" aria-labelledby="sem-rate">
          <header class="card-head">
            <h2 id="sem-rate" class="card-title">{{ t('sem.rateTitle') }}</h2>
            <button class="button button-quiet" type="button" @click="dismissRate">{{ t('sem.rateDismiss') }}</button>
          </header>
          <p class="card-sub">{{ t('sem.rateText') }}</p>
          <ul class="rate-list">
            <li v-for="code in toRate" :key="code" class="rate-row">
              <p class="rate-name"><span class="code">{{ code }}</span> {{ localTitle(data.subjects[code]!, locale) || data.subjects[code]!.title }}</p>
              <RatingForm v-if="rateFull === code" :code="code" :start="rateOpen[code]" @done="(sent: boolean) => rateDone(code, sent)" />
              <QuickRate v-else :code="code" @more="(s: QuickStart) => more(code, s)" />
            </li>
          </ul>
        </section>

        <!-- A Summer or Winter Term under way with the student's subjects in it. -->
        <section v-if="shortTerm" class="surface card empty-card" aria-labelledby="sem-short">
          <h2 id="sem-short" class="card-title">{{ t('sem.shortTitle', { term: termName(shortTerm.year, shortTerm.term) }) }}</h2>
          <p class="card-sub">
            {{ shortTerm.exams ? t('sem.shortWhen', { classes: range(shortTerm.teaching), exams: range(shortTerm.exams) }) : t('sem.shortClasses', { classes: range(shortTerm.teaching) }) }}
          </p>
          <ul class="planned">
            <li v-for="code in shortTerm.subjects" :key="code">
              <a class="planned-row" :href="link(`subject/${code}/`)"><span class="code">{{ code }}</span> {{ localTitle(data.subjects[code]!, locale) || data.subjects[code]!.title }}</a>
            </li>
          </ul>
          <p class="note">{{ t('assess.otherTerms') }}</p>
        </section>

        <section v-if="now" class="surface card strip-card" aria-labelledby="sem-weeks">
          <header class="card-head">
            <h2 id="sem-weeks" class="card-title">{{ t('sem.stripLabel', { term: name }) }}</h2>
            <span v-if="caption" class="card-meta">{{ caption }}</span>
          </header>
          <WeekStrip :sem="now.sem" :today="today" :name="name" :tasks="teachingish && cards.length ? stripTasks : undefined" />
        </section>

        <!-- The student's own subjects this term. -->
        <section v-if="teachingish && cards.length" class="surface card subjects-card" aria-labelledby="sem-mine">
          <header class="card-head">
            <h2 id="sem-mine" class="card-title">{{ t('sem.mineTitle') }}</h2>
            <span class="card-meta">{{ t('sem.mineFrom') }}</span>
          </header>
          <p class="card-sub">{{ t('sem.handbookNote') }}</p>
          <div class="subjects">
            <details v-for="(c, n) in cards" :key="c.code + phone" class="subject" :open="!phone && n === 0">
              <summary class="subject-head">
                <span class="subject-name"><span class="code">{{ c.code }}</span> {{ c.title }}</span>
                <span class="subject-sum">{{ plainSummary(c) }}</span>
                <span v-if="c.fromCalc" class="subject-from">{{ t('sem.fromCalc') }}</span>
                <span v-if="marksLine(c.code)" class="subject-marks">{{ marksLine(c.code) }}</span>
                <span v-if="c.items.length" class="subject-done" :class="{ tall: marksLine(c.code) }">{{ t('sem.doneOf', { done: c.done, total: c.items.length }) }}</span>
              </summary>
              <ul v-if="c.items.length" class="tasks">
                <li v-for="i in c.items" :key="i.id" class="task">
                  <label class="task-tick">
                    <input type="checkbox" :checked="c.doneSet.has(i.id)" @change="toggle(i.id)" />
                    <span class="tick-box" aria-hidden="true"><Check :size="14" /></span>
                    <span class="task-name" :class="{ 'is-done': c.doneSet.has(i.id) }">{{ i.label }} {{ i.weight }}%<span v-if="i.mark" class="task-mark">{{ i.mark }}</span></span>
                  </label>
                  <span v-if="i.hurdle" class="pill">{{ t('next.hurdle') }}</span>
                  <span class="task-when" :class="{ quote: i.timing?.kind === 'other' }" :title="i.timing?.text && i.timing.kind !== 'other' ? t('timing.source', { text: i.timing.text }) : undefined">{{ i.when }}</span>
                </li>
              </ul>
              <div class="subject-actions">
                <a class="button button-accent" :href="link(`tools/final/?subject=${c.code}`)"><Calculator :size="16" aria-hidden="true" />{{ t('sem.finalCalc') }}</a>
                <a class="button" :href="link('tools/revision/')"><CalendarDays :size="16" aria-hidden="true" />{{ t('sem.revision') }}</a>
                <button class="button button-quiet hide" type="button" :aria-label="t('sem.hideLabel', { code: c.code })" @click="hide(c.code)">{{ t('sem.hide') }}</button>
              </div>
            </details>
          </div>
          <p v-if="hiddenCount" class="hidden-line">
            {{ t('sem.hiddenCount', { n: hiddenCount }) }}
            <button class="text-button" type="button" @click="showAll">{{ t('sem.showHidden') }}</button>
          </p>
        </section>

        <!-- Under way but nothing of theirs: one way to add them. -->
        <section v-else-if="teachingish" class="surface card empty-card">
          <h2 class="card-title">{{ hiddenCount ? t('sem.mineTitle') : t('sem.emptyTitle') }}</h2>
          <template v-if="hiddenCount">
            <p class="hidden-line">
              {{ t('sem.hiddenCount', { n: hiddenCount }) }}
              <button class="text-button" type="button" @click="showAll">{{ t('sem.showHidden') }}</button>
            </p>
          </template>
          <template v-else>
            <p class="card-sub">{{ t('sem.emptyText') }}</p>
            <div class="row-actions">
              <a class="button button-accent" :href="link('plan/')">{{ t('sem.toPlan') }}</a>
              <a class="text-link" :href="link('record/')">{{ t('sem.toRecord') }}<ArrowRight :size="14" aria-hidden="true" /></a>
            </div>
          </template>
        </section>

        <!-- Between semesters: when the next one starts, and the planner. -->
        <section v-if="nextSem" class="surface card empty-card">
          <h2 class="card-title">{{ nextSemLine }}</h2>
          <p class="card-sub">{{ t('sem.beforeText') }}</p>
          <template v-if="nextPlanned.length">
            <h3 class="card-eyebrow planned-title">{{ t('sem.plannedTitle') }}<span class="pill">{{ t('sem.nextSemLabel') }}</span></h3>
            <ul class="planned">
              <li v-for="p in nextPlanned" :key="p.code">
                <a class="planned-row" :href="link(`subject/${p.code}/`)"><span class="code">{{ p.code }}</span> {{ p.title }}</a>
              </li>
            </ul>
          </template>
          <div class="row-actions">
            <a class="button button-accent" :href="link('plan/')">{{ t('sem.toPlanner') }}</a>
          </div>
        </section>
        <!-- Past the last published date: say so rather than leave the page blank. -->
        <section v-if="!first" class="surface card empty-card">
          <h2 class="card-title">{{ t('sem.nextTitle') }}</h2>
          <p class="card-sub">{{ t('sem.noMoreDates', { date: lastPublishedText }) }}</p>
          <div class="row-actions">
            <a class="text-link" :href="link('guide/key-dates/')">{{ t('next.all') }}<ArrowRight :size="14" aria-hidden="true" /></a>
          </div>
        </section>
      </div>

      <aside class="sem-rail">
        <section v-if="first" class="surface card next-card" aria-labelledby="sem-next">
          <h2 id="sem-next" class="card-eyebrow">{{ t('sem.nextTitle') }}</h2>
          <p class="next-what">{{ dateLabel(first.date) }}</p>
          <p class="next-date">
            <span>{{ range(first.date) }}</span>
            <span v-if="!first.running && first.days <= 14" class="next-when" :class="{ soon: soon(first) }">{{ dateWhen(first) }}</span>
          </p>
          <a class="text-link" :href="link(actionFor(first.date).to)">{{ actionFor(first.date).label }}<ArrowRight :size="14" aria-hidden="true" /></a>
          <template v-if="later.length">
            <h3 class="card-eyebrow later-title">{{ t('sem.laterTitle') }}</h3>
            <ul class="later">
              <li v-for="i in later" :key="i.date.id" class="later-row">
                <span class="later-what">{{ dateLabel(i.date) }}</span>
                <span class="later-when" :class="{ soon: soon(i) }">{{ i.days <= 14 || i.running ? dateWhen(i) : range(i.date) }}</span>
              </li>
            </ul>
          </template>
          <p class="note">{{ t('sem.officialNote') }}</p>
          <a class="text-link" :href="link('guide/key-dates/')">{{ t('next.all') }}<ArrowRight :size="14" aria-hidden="true" /></a>
        </section>

        <section class="surface card tools-card" aria-labelledby="sem-tools">
          <h2 id="sem-tools" class="card-eyebrow">{{ t('sem.toolsTitle') }}</h2>
          <ul class="tool-list">
            <li><a class="tool" :href="link('tools/final/')"><Calculator :size="18" aria-hidden="true" /><span>{{ t('sem.finalCalc') }}</span></a></li>
            <li><a class="tool" :href="link('tools/revision/')"><CalendarDays :size="18" aria-hidden="true" /><span>{{ t('sem.revision') }}</span></a></li>
            <!-- After results the semester shown is the one just finished: nothing ahead to add. -->
            <li v-if="now && now.phase !== 'results'">
              <button class="tool" type="button" @click="saveCalendar"><CalendarPlus :size="18" aria-hidden="true" /><span>{{ t('sem.addCalendar') }}<small>{{ t('sem.addCalendarText') }}</small></span></button>
            </li>
            <li><a class="tool" :href="link('tools/wam/')"><Gauge :size="18" aria-hidden="true" /><span>{{ t('sem.wam') }}</span></a></li>
            <li>
              <a class="tool" :href="link(guideTo)"><NotebookPen :size="18" aria-hidden="true" /><span>{{ t('sem.guideLink') }}<small>{{ t('sem.guideText') }}</small></span></a>
            </li>
            <li>
              <a class="tool" :href="link('guide/life/')"><LifeBuoy :size="18" aria-hidden="true" /><span>{{ t('sem.supportLink') }}<small>{{ t('sem.supportText') }}</small></span></a>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.sem {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--space-4);
  min-width: 0;
}

.lede {
  margin: 0;
  color: var(--ink-soft);
}

.sem-status {
  margin: 0;
  font-size: var(--fs-section);
  font-weight: var(--fw-bold);
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

/* Desktop: the week and the subjects on the left, the dates and tools in a rail on the right. */
.sem-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  align-items: start;
  gap: var(--space-5);
}

.sem-main,
.sem-rail {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.card {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 22px 24px;
}

.card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 16px;
}

.card-title {
  margin: 0;
  font-size: var(--fs-section);
  font-weight: var(--fw-bold);
  line-height: var(--lh-heading);
  letter-spacing: var(--track-heading);
}

.card-meta,
.card-sub,
.note {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}

.note {
  font-size: var(--fs-meta);
}

.card-eyebrow {
  margin: 0;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  min-height: 44px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--accent);
  text-decoration: none;
}

.text-button {
  min-height: 44px;
  padding: 0 4px;
  border: 0;
  background: none;
  font: inherit;
  font-weight: var(--fw-semibold);
  color: var(--accent);
  cursor: pointer;
}

.planned-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.planned-title .pill {
  letter-spacing: normal;
  text-transform: none;
}

.planned {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.planned-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.planned li:last-child .planned-row {
  border-bottom: 0;
}

.planned-row:hover {
  color: var(--accent);
}

.code {
  font-weight: var(--fw-bold);
  font-variant-numeric: tabular-nums;
}

.subjects {
  display: grid;
}

.subject {
  border-top: 1px solid var(--divider);
}

.subject:first-child {
  border-top: 0;
}

.subject-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 2px 16px;
  min-height: 44px;
  padding: 12px 0;
  cursor: pointer;
  list-style: none;
}

.subject-head::-webkit-details-marker {
  display: none;
}

.subject-name {
  min-width: 0;
  font-weight: var(--fw-semibold);
  overflow-wrap: anywhere;
}

.subject-sum {
  grid-column: 1;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.subject-done.tall {
  grid-row: 1 / span 3;
}

.subject-done {
  grid-column: 2;
  grid-row: 1 / span 2;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tasks {
  display: grid;
  margin: 0;
  padding: 0 0 4px;
  list-style: none;
}

.task {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 4px 12px;
  min-height: 44px;
  font-size: var(--fs-small);
}

.task-tick {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  cursor: pointer;
}

.task-tick input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.tick-box {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  border: 1.5px solid var(--line);
  border-radius: 7px;
  color: transparent;
}

.task-tick input:checked + .tick-box {
  border-color: var(--accent-fill);
  background: var(--accent-fill);
  color: var(--accent-fill-ink);
}

.task-tick input:focus-visible + .tick-box {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.task-name.is-done {
  color: var(--ink-soft);
}

.task-when {
  color: var(--ink-soft);
  text-align: end;
}

/* The Handbook's own words can be a sentence: on their own line, under the task's name. */
.task-when.quote {
  grid-column: 1 / -1;
  margin-top: -10px;
  padding-inline-start: 32px;
  padding-bottom: 6px;
  text-align: start;
}

.pill {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: var(--fs-meta);
}

.subject-actions,
.row-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 4px 0 16px;
}

.row-actions {
  padding: 0;
}

.subject-from {
  grid-column: 1;
  color: var(--ink-soft);
  font-size: var(--fs-meta);
}

.task-mark {
  margin-inline-start: 8px;
  color: var(--accent);
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
}

.subject-marks {
  grid-column: 1;
  color: var(--ink);
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
}

.subject-actions .button {
  gap: 6px;
}

.hide {
  margin-inline-start: auto;
}

.hidden-line {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

/* The next date, large; the next three small. */
.next-what {
  margin: 0;
  font-size: 1.375rem;
  font-weight: var(--fw-bold);
  line-height: var(--lh-heading);
}

.next-date {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.next-when,
.later-when {
  color: var(--accent);
  font-weight: var(--fw-semibold);
}

.soon {
  color: var(--bad);
}

.later-title {
  padding-top: 12px;
  border-top: 1px solid var(--divider);
}

.later {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-small);
}

.later-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 36px;
}

.later-when {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tool-list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tool {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 6px 0;
  border-top: 1px solid var(--divider);
  color: var(--ink);
  font-weight: var(--fw-semibold);
  text-decoration: none;
}

/* The calendar one is a button (it saves a file): looks the same as the links around it. */
button.tool {
  width: 100%;
  border: 0;
  border-top: 1px solid var(--divider);
  background: none;
  font: inherit;
  font-weight: var(--fw-semibold);
  text-align: start;
  cursor: pointer;
}

.tool-list li:first-child .tool {
  border-top: 0;
}

.tool svg {
  flex: none;
  color: var(--accent);
}

.tool span {
  display: grid;
}

.tool small {
  font-size: var(--fs-meta);
  font-weight: var(--fw-regular);
  color: var(--ink-soft);
}

.tool:hover span {
  color: var(--accent);
}

.rate-list {
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rate-row {
  display: grid;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--divider);
}

.rate-name {
  margin: 0;
  font-weight: var(--fw-semibold);
}

/* Phone: one column, in the order a student checks: the week, what's next, the strip, their subjects, tools. */
@media (max-width: 900px) {
  .sem-grid {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .sem-main,
  .sem-rail {
    display: contents;
  }

  .rate-card {
    order: 0;
  }

  .next-card {
    order: 1;
  }

  .strip-card {
    order: 2;
  }

  .subjects-card,
  .empty-card {
    order: 3;
  }

  .tools-card {
    order: 4;
  }
}

@media (max-width: 560px) {
  .card {
    padding: 18px 16px;
  }

  .task {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .task-when {
    grid-column: 1 / -1;
    padding-inline-start: 32px;
    margin-top: -10px;
    padding-bottom: 6px;
    text-align: start;
  }
}
</style>

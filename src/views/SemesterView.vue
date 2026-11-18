<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ArrowRight, Calculator, CalendarDays, Check, Gauge, LifeBuoy, NotebookPen } from 'lucide-vue-next'
import DetailHero from '@/components/browse/DetailHero.vue'
import WeekStrip from '@/components/semester/WeekStrip.vue'
import QuickRate from '@/components/rating/QuickRate.vue'
import RatingForm from '@/components/rating/RatingForm.vue'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePersisted } from '@/composables/usePersisted'
import { usePhone } from '@/composables/usePhone'
import { useRated } from '@/composables/useRated'
import { useSemester } from '@/composables/useSemester'
import type { QuickStart } from '@/composables/useMyRatings'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import { summariseAssessment } from '@/utils/assessment'
import { KEY_DATES, type KeyDate } from '@/utils/keyDates'
import { nextKeyDates, taskTiming } from '@/utils/semester'
import { RATINGS_FORM } from '@/config'
import { isFormReady } from '@/utils/googleForm'

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
const { today, now, subjects, day, range, when, termName, status } = useSemester()

const art = () => import('@/components/tools/art/ArtRevision.vue')

// Saved on this device only: hidden subjects and ticked tasks, by term ("2027-semester-1").
const asStringLists = (raw: unknown): Record<string, string[]> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === 'string')
  return out
}
const hiddenStore = usePersisted<Record<string, string[]>>('sc:semHidden', {}, asStringLists)
const doneStore = usePersisted<Record<string, string[]>>('sc:semDone', {}, asStringLists)
const rateSeen = usePersisted<string[]>('sc:semRateSeen', [], (raw) => (Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []))

const termKey = computed(() => (now.value ? `${now.value.sem.year}-${now.value.sem.term}` : ''))
const name = computed(() => (now.value ? termName(now.value.sem.year, now.value.sem.term) : ''))
const hidden = computed(() => new Set(hiddenStore.value[termKey.value] ?? []))
const shown = computed(() => subjects.value.filter((c) => !hidden.value.has(c)))

function hide(code: string): void {
  hiddenStore.value = { ...hiddenStore.value, [termKey.value]: [...hidden.value, code] }
}
function showAll(): void {
  const { [termKey.value]: _gone, ...rest } = hiddenStore.value
  hiddenStore.value = rest
}

// Each task of a subject, numbered within its kind ("Assignment 2"), with what's known of its timing.
const cards = computed(() =>
  shown.value.map((code) => {
    const s = data.value.subjects[code]!
    const tasks = Array.isArray(s.assessment) ? s.assessment : []
    const counts = new Map<string, number>()
    for (const x of tasks) counts.set(x.kind, (counts.get(x.kind) ?? 0) + 1)
    const seen = new Map<string, number>()
    const items = tasks.map((x, i) => {
      const n = (seen.get(x.kind) ?? 0) + 1
      seen.set(x.kind, n)
      const label = t.value(`assess.kind.${x.kind}`) + ((counts.get(x.kind) ?? 0) > 1 ? ` ${n}` : '')
      return { id: `${code}:${i}`, label, weight: x.weight, hurdle: !!x.hurdle, timing: taskTiming(x.kind) }
    })
    const done = new Set(doneStore.value[termKey.value] ?? [])
    return {
      code,
      title: localTitle(s, locale.value) || s.title,
      summary: summariseAssessment(s.assessment),
      items,
      done: items.filter((i) => done.has(i.id)).length,
      doneSet: done,
    }
  }),
)

function toggle(id: string): void {
  const list = doneStore.value[termKey.value] ?? []
  doneStore.value = { ...doneStore.value, [termKey.value]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] }
}

const examRange = computed(() => (now.value?.sem.exams ? range(now.value.sem.exams) : ''))
function timingText(timing: 'exams' | 'semester'): string {
  if (timing === 'semester') return t.value('sem.whenSemester')
  return examRange.value ? t.value('sem.whenExams', { range: examRange.value }) : t.value('sem.whenExamsNoDate')
}

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
      return { to: 'guide/new-students/', label: t.value('guide.cat.new-students.nav') }
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
const nextSemLine = computed(() => {
  const s = nextSem.value
  if (!s) return ''
  const w = s.days > 14 ? t.value('sem.inWeeks', { n: Math.round(s.days / 7) }) : when(s.days, s.start)
  return t.value('sem.starts', { term: s.name, when: w })
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

        <section v-if="now" class="surface card strip-card" aria-labelledby="sem-weeks">
          <header class="card-head">
            <h2 id="sem-weeks" class="card-title">{{ t('sem.stripLabel', { term: name }) }}</h2>
            <span v-if="caption" class="card-meta">{{ caption }}</span>
          </header>
          <div class="strip-scroll">
            <WeekStrip :sem="now.sem" :today="today" :name="name" />
          </div>
        </section>

        <!-- The student's own subjects this term. -->
        <section v-if="teachingish && cards.length" class="surface card subjects-card" aria-labelledby="sem-mine">
          <header class="card-head">
            <h2 id="sem-mine" class="card-title">{{ t('sem.mineTitle') }}</h2>
            <span class="card-meta">{{ t('sem.mineFrom') }}</span>
          </header>
          <p class="card-sub">{{ t('sem.handbookNote') }}</p>
          <div class="subjects">
            <details v-for="c in cards" :key="c.code + phone" class="subject" :open="!phone">
              <summary class="subject-head">
                <span class="subject-name"><span class="code">{{ c.code }}</span> {{ c.title }}</span>
                <span class="subject-sum">{{ plainSummary(c) }}</span>
                <span v-if="c.items.length" class="subject-done">{{ t('sem.doneOf', { done: c.done, total: c.items.length }) }}</span>
              </summary>
              <ul v-if="c.items.length" class="tasks">
                <li v-for="i in c.items" :key="i.id" class="task">
                  <label class="task-tick">
                    <input type="checkbox" :checked="c.doneSet.has(i.id)" @change="toggle(i.id)" />
                    <span class="tick-box" aria-hidden="true"><Check :size="14" /></span>
                    <span class="task-name" :class="{ 'is-done': c.doneSet.has(i.id) }">{{ i.label }} {{ i.weight }}%</span>
                  </label>
                  <span v-if="i.hurdle" class="pill">{{ t('next.hurdle') }}</span>
                  <span class="task-when">{{ timingText(i.timing) }}</span>
                </li>
              </ul>
              <div class="subject-actions">
                <a class="button button-accent" :href="link(`tools/final/?subject=${c.code}`)"><Calculator :size="16" aria-hidden="true" />{{ t('sem.finalCalc') }}</a>
                <a class="button" :href="link('tools/revision/')"><CalendarDays :size="16" aria-hidden="true" />{{ t('sem.revision') }}</a>
                <button class="button button-quiet hide" type="button" :aria-label="t('sem.hideLabel', { code: c.code })" @click="hide(c.code)">{{ t('sem.hide') }}</button>
              </div>
            </details>
          </div>
          <p v-if="hidden.size" class="hidden-line">
            {{ t('sem.hiddenCount', { n: hidden.size }) }}
            <button class="text-button" type="button" @click="showAll">{{ t('sem.showHidden') }}</button>
          </p>
        </section>

        <!-- Under way but nothing of theirs: one way to add them. -->
        <section v-else-if="teachingish" class="surface card empty-card">
          <h2 class="card-title">{{ hidden.size ? t('sem.mineTitle') : t('sem.emptyTitle') }}</h2>
          <template v-if="hidden.size">
            <p class="hidden-line">
              {{ t('sem.hiddenCount', { n: hidden.size }) }}
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
          <div class="row-actions">
            <a class="button button-accent" :href="link('plan/')">{{ t('sem.toPlanner') }}</a>
          </div>
        </section>
      </div>

      <aside class="sem-rail">
        <section v-if="first" class="surface card next-card" aria-labelledby="sem-next">
          <h2 id="sem-next" class="card-eyebrow">{{ t('sem.nextTitle') }}</h2>
          <p class="next-what">{{ kindName(first.date) }}</p>
          <p class="next-date">
            <span>{{ range(first.date) }}</span>
            <span v-if="!first.running" class="next-when" :class="{ soon: soon(first) }">{{ dateWhen(first) }}</span>
          </p>
          <a class="text-link" :href="link(actionFor(first.date).to)">{{ actionFor(first.date).label }}<ArrowRight :size="14" aria-hidden="true" /></a>
          <template v-if="later.length">
            <h3 class="card-eyebrow later-title">{{ t('sem.laterTitle') }}</h3>
            <ul class="later">
              <li v-for="i in later" :key="i.date.id" class="later-row">
                <span class="later-what">{{ kindName(i.date) }}</span>
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
            <li><a class="tool" :href="link('tools/wam/')"><Gauge :size="18" aria-hidden="true" /><span>{{ t('sem.wam') }}</span></a></li>
            <li>
              <a class="tool" :href="link('guide/semester/')"><NotebookPen :size="18" aria-hidden="true" /><span>{{ t('sem.guideLink') }}<small>{{ t('sem.guideText') }}</small></span></a>
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

/* The strip scrolls inside its own box, never the page. */
.strip-scroll {
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
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

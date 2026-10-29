<script setup lang="ts">
import { computed, ref } from 'vue'
import InfoTip from '@/components/InfoTip.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import SubjectSearch from '@/components/SubjectSearch.vue'
import { useDataset } from '@/composables/useDataset'
import { useRevisionPlan } from '@/composables/useRevisionPlan'
import { useI18n } from '@/i18n'
import { termLabel } from '@/i18n/format'
import { localTitle } from '@/i18n/localized'
import { addDays, revisionIcs, termKey, weekday, type RevisionDay, type RevisionDifficulty } from '@/engine/revisionPlan'
import { downloadIcs } from '@/utils/keyDates'

/**
 * The revision planner: pick the exam period, fill in exam dates and the hours a student has, get
 * a day-by-day calendar. The plan only fills in the subjects; nothing here changes the plan or the record.
 *
 * Layout: on wide screens a sticky sidebar (period, totals as the colour legend, export) beside the
 * inputs and the calendar; narrower, the same blocks stack: period, inputs, totals, calendar.
 */
const { t, locale } = useI18n()
const { data } = useDataset()
const rp = useRevisionPlan()
const { saved, rows, prefilled, plan, start, periods, term, window: examWindow } = rp

const nameOf = (code: string) => {
  const s = data.value.subjects[code]
  return s ? localTitle(s, locale.value) || s.title : code
}
const LEVELS: readonly RevisionDifficulty[] = ['easier', 'average', 'harder']

type Row = (typeof rows.value)[number]
const active = computed(() => rows.value.filter((r) => !rp.noExam(r)))
const off = computed(() => rows.value.filter((r) => rp.noExam(r)))
// Colours tell subjects apart at a glance; the code is always written too.
const colourOf = (code: string) => `c${Math.max(0, active.value.findIndex((r) => r.code === code)) % 6}`

const fmtDay = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' }))
const fmtShort = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'numeric', timeZone: 'UTC' }))
const fmtWeekday = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' }))
const fmtNum = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', timeZone: 'UTC' }))
const asDate = (date: string) => new Date(`${date}T00:00:00Z`)
const dayLabel = (date: string) => fmtDay.value.format(asDate(date))
const shortLabel = (date: string) => fmtShort.value.format(asDate(date))
const weekdayLabel = (date: string) => fmtWeekday.value.format(asDate(date))
// Monday first, as Australian calendars are; 2026-10-26 is a Monday.
const WEEK = [1, 2, 3, 4, 5, 6, 0]
const weekdayName = (d: number) => weekdayLabel(addDays('2026-10-26', (d + 6) % 7))

const hours = (h: number) => t.value('rev.hoursN', { n: h })
const dayHours = (d: RevisionDay) => d.sessions.reduce((s, x) => s + x.hours, 0)
const timeOf = (code: string) => rows.value.find((r) => r.code === code)?.time
const examText = (c: string) => [t.value('rev.exam'), c, timeOf(c)].filter(Boolean).join(' ')

const totalHours = computed(() => plan.value.totals.reduce((s, x) => s + x.hours, 0))
const maxTotal = computed(() => Math.max(1, ...plan.value.totals.map((x) => x.hours)))
const needsDate = (r: Row) => !rp.noExam(r) && !r.exam
const missing = computed(() => (active.value.length === 0 ? 'none' : plan.value.days.length === 0 ? 'dates' : plan.value.empty ? 'hours' : ''))
const pastSkips = computed(() => plan.value.skipped.filter((x) => x.why === 'pastExam'))
const summary = computed(() => t.value('rev.summary', { hours: hours(totalHours.value), n: plan.value.totals.length, start: shortLabel(start.value) }))

/** The agenda in weeks (Monday to Sunday), for the list view. */
const weeks = computed(() => {
  const out: { label: string; days: RevisionDay[] }[] = []
  for (const d of plan.value.days) {
    if (!out.length || weekday(d.date) === 1) out.push({ label: '', days: [] })
    out.at(-1)!.days.push(d)
  }
  return out.map((w, i) => ({ ...w, label: t.value('rev.week', { n: i + 1, from: shortLabel(w.days[0]!.date), to: shortLabel(w.days.at(-1)!.date) }) }))
})

/** The calendar: whole weeks from the Monday before the first day to the Sunday after the last. */
const cells = computed(() => {
  const days = plan.value.days
  if (!days.length) return []
  const byDate = new Map(days.map((d) => [d.date, d]))
  const first = addDays(days[0]!.date, -((weekday(days[0]!.date) + 6) % 7))
  const lastDay = days.at(-1)!.date
  const last = addDays(lastDay, (7 - weekday(lastDay)) % 7)
  const out: { date: string; day?: RevisionDay; first: boolean }[] = []
  for (let d = first; d <= last; d = addDays(d, 1)) out.push({ date: d, day: byDate.get(d), first: d === first || d.endsWith('-01') })
  return out
})
const picked = ref('')
/** The day shown under the phone calendar: the one tapped, else today, else the first. */
const shown = computed(() => plan.value.days.find((d) => d.date === picked.value) ?? plan.value.days.find((d) => d.date === rp.today) ?? plan.value.days[0])
const cellNum = (c: { date: string; first: boolean }) => (c.first ? dayLabel(c.date) : fmtNum.value.format(asDate(c.date)))
function cellLabel(d: RevisionDay): string {
  const what = d.kind === 'exam' ? d.exams.map(examText).join(', ') : d.kind === 'rest' ? t.value('rev.restDay') : d.sessions.length ? d.sessions.map((s) => `${s.code} ${hours(s.hours)}`).join(', ') : t.value('rev.nothing')
  return `${weekdayLabel(d.date)} ${dayLabel(d.date)}: ${what}`
}

const view = ref<'calendar' | 'list'>('calendar')
const views = computed(() => [
  { value: 'calendar' as const, label: t.value('rev.view.calendar') },
  { value: 'list' as const, label: t.value('rev.view.list') },
])

const valueOf = (e: Event) => (e.target as HTMLInputElement).value
function onHours(e: Event): void {
  const raw = valueOf(e).trim()
  const n = Number(raw)
  rp.set('hoursPerDay', raw === '' || !Number.isFinite(n) ? null : Math.max(0, Math.min(16, n)))
}
function toggleRest(d: number): void {
  const list = saved.value.restWeekdays
  rp.set('restWeekdays', list.includes(d) ? list.filter((x) => x !== d) : [...list, d].sort())
}
function exportIcs(): void {
  const ics = revisionIcs(plan.value, rp.subjects.value, saved.value.dayStart, {
    session: (code, focus, h) => t.value(focus ? 'rev.icsFocus' : 'rev.icsSession', { code }) + (h ? ` · ${hours(h)}` : ''),
    exam: (code) => t.value('rev.icsExam', { code }),
    reminder: t.value('rev.icsReminder'),
  }, new Date())
  downloadIcs(ics, 'revision-plan.ics')
}
function print(): void {
  window.print()
}
</script>

<template>
  <div class="rev">
    <aside class="rev-side">
      <section v-if="periods.length" class="rev-period" aria-labelledby="rev-period">
        <h2 id="rev-period" class="rev-label">{{ t('rev.period') }}</h2>
        <div class="rev-periods">
          <button v-for="p in periods" :key="termKey(p)" type="button" class="chip" :aria-pressed="termKey(p) === rp.key.value" @click="rp.pick(termKey(p))">{{ termLabel(t, p) }}</button>
        </div>
        <p v-if="examWindow" class="rev-note">{{ t('rev.window', { from: shortLabel(examWindow.examsStart), to: shortLabel(examWindow.end) }) }}</p>
      </section>

      <section class="rev-sum" aria-labelledby="rev-sum">
        <h2 id="rev-sum" class="rev-subtitle">{{ t('rev.totals') }}<InfoTip :text="t('rev.rule')" /></h2>
        <template v-if="!missing">
          <p class="rev-line">{{ summary }}</p>
          <ul class="rev-totals">
            <li v-for="x in plan.totals" :key="x.code" :class="colourOf(x.code)">
              <span class="rev-tcode">{{ x.code }}</span>
              <span class="rev-th">{{ hours(x.hours) }}</span>
              <span class="rev-bar" aria-hidden="true"><span :style="{ width: `${(x.hours / maxTotal) * 100}%` }" /></span>
            </li>
            <li class="rev-total"><span>{{ t('rev.total') }}</span><span class="rev-th">{{ hours(totalHours) }}</span></li>
          </ul>
          <div class="rev-actions">
            <button type="button" class="button button-accent" @click="exportIcs">{{ t('rev.ics') }}</button>
            <button type="button" class="button button-quiet" @click="print">{{ t('rev.print') }}</button>
          </div>
        </template>
        <p v-else class="rev-note">{{ t(`rev.missing.${missing}`) }}</p>
        <ul v-if="pastSkips.length" class="rev-skipped">
          <li v-for="x in pastSkips" :key="x.code">{{ t('rev.skipPast', { code: x.code }) }}</li>
        </ul>
        <p class="rev-note rev-privacy">{{ t('rev.privacy') }}</p>
      </section>
    </aside>

    <section class="surface rev-input" aria-labelledby="rev-subjects">
      <div class="rev-head">
        <h2 id="rev-subjects" class="rev-subtitle">{{ t('rev.subjects') }}</h2>
        <span v-if="prefilled && term" class="rev-note">{{ t('rev.fromPlan') }}</span>
      </div>
      <div v-if="active.length" class="rev-table" role="table" :aria-label="t('rev.subjects')">
        <div class="rev-tr rev-thead" role="row">
          <span role="columnheader">{{ t('rev.subject') }}</span>
          <span role="columnheader">{{ t('rev.examDate') }}</span>
          <span role="columnheader">{{ t('rev.examTime') }} · {{ t('rev.optional') }}</span>
          <span role="columnheader">{{ t('rev.difficulty') }}</span>
          <span role="columnheader" class="visually-hidden">{{ t('rev.remove') }}</span>
        </div>
        <div v-for="r in active" :key="r.code" class="rev-tr" role="row">
          <span class="rev-subject" role="cell">
            <span class="rev-name"><span class="rev-code" :class="colourOf(r.code)">{{ r.code }}</span> {{ nameOf(r.code) }}</span>
            <span class="rev-meta">{{ [rp.examShare(r.code) !== undefined ? t('rev.examShare', { n: rp.examShare(r.code)! }) : '', r.difficulty ? '' : `${t('rev.difficulty')}: ${t('rev.estimate')}`].filter(Boolean).join(' · ') }}</span>
          </span>
          <label class="rev-cell rev-dateCell" role="cell" :class="{ 'is-empty': needsDate(r) }">
            <span class="rev-cl">{{ t('rev.examDate') }}</span>
            <span class="rev-dateWrap">
              <input class="input rev-in" type="date" :value="r.exam" :min="rp.examMin.value" :max="rp.examMax.value || undefined" :aria-label="`${r.code} ${t('rev.examDate')}`" @change="rp.setExam(r.code, valueOf($event))" />
              <span v-if="needsDate(r)" class="rev-ph" aria-hidden="true">{{ t('rev.needDate') }}</span>
            </span>
          </label>
          <label class="rev-cell" role="cell">
            <span class="rev-cl">{{ t('rev.examTime') }} · {{ t('rev.optional') }}</span>
            <input class="input rev-in" type="time" :value="r.time ?? ''" :aria-label="`${r.code} ${t('rev.examTime')}`" @change="rp.setTime(r.code, valueOf($event))" />
          </label>
          <label class="rev-cell" role="cell">
            <span class="rev-cl">{{ t('rev.difficulty') }}</span>
            <select class="select rev-in" :value="r.difficulty ?? rp.estimate(r.code)" :aria-label="`${r.code} ${t('rev.difficulty')}`" @change="rp.setDifficulty(r.code, valueOf($event) as RevisionDifficulty)">
              <option v-for="l in LEVELS" :key="l" :value="l">{{ t(`rev.level.${l}`) }}</option>
            </select>
          </label>
          <span class="rev-rowend" role="cell">
            <button type="button" class="rev-text" @click="rp.setNoExam(r.code, true)">{{ t('rev.skip') }}</button>
            <button type="button" class="rev-text rev-remove" @click="rp.remove(r.code)">{{ t('rev.remove') }}</button>
          </span>
        </div>
      </div>
      <p v-else-if="!off.length" class="rev-note">{{ t('rev.noSubjects') }}</p>
      <p v-if="off.length" class="rev-off">
        <span>{{ t('rev.noExam') }}:</span>
        <span v-for="r in off" :key="r.code" class="rev-offitem">{{ r.code }} <button type="button" class="rev-text" @click="rp.setNoExam(r.code, false)">{{ t('rev.putBack') }}</button></span>
      </p>
      <label class="rev-add">
        <span class="rev-label">{{ t('rev.add') }}</span>
        <SubjectSearch compact select :placeholder="t('calc.pickPrompt')" @pick="rp.add" />
      </label>

      <h2 class="rev-subtitle rev-time-title">{{ t('rev.time') }}<InfoTip :text="`${t('rev.loadTip')} ${t('rev.dayStartNote')}`" /></h2>
      <div class="rev-settings">
        <label class="rev-field">
          <span class="rev-label">{{ t('rev.start') }}</span>
          <input class="input rev-in" type="date" :value="start" :min="rp.today" :max="rp.examMax.value || undefined" @change="valueOf($event) && rp.set('start', valueOf($event))" />
        </label>
        <label class="rev-field">
          <span class="rev-label">{{ t('rev.hours') }} · {{ t('rev.optional') }}</span>
          <input class="input rev-in" type="number" inputmode="decimal" min="0" max="16" step="0.5" :placeholder="t('rev.hoursAuto')" :value="saved.hoursPerDay ?? ''" @change="onHours" />
        </label>
        <label class="rev-field">
          <span class="rev-label">{{ t('rev.dayStart') }} · {{ t('rev.optional') }}</span>
          <input class="input rev-in" type="time" :value="saved.dayStart" @change="rp.set('dayStart', valueOf($event))" />
        </label>
        <fieldset class="rev-field rev-rest">
          <legend class="rev-label">{{ t('rev.rest') }} · {{ t('rev.optional') }}</legend>
          <div class="rev-week">
            <button v-for="d in WEEK" :key="d" type="button" class="rev-wd" :aria-pressed="saved.restWeekdays.includes(d)" @click="toggleRest(d)">{{ weekdayName(d) }}</button>
          </div>
        </fieldset>
      </div>
    </section>

    <section class="surface rev-cal" aria-labelledby="rev-cal">
      <div class="rev-head rev-calhead">
        <h2 id="rev-cal" class="rev-subtitle">{{ t('rev.schedule') }}</h2>
        <SegmentedControl v-if="!missing" v-model="view" class="rev-views" :options="views" :label="t('rev.schedule')" />
      </div>
      <p v-if="missing" class="rev-empty">{{ t(`rev.missing.${missing}`) }}</p>

      <template v-else-if="view === 'calendar'">
        <div class="rev-grid">
          <span v-for="d in WEEK" :key="d" class="rev-wdh" aria-hidden="true">{{ weekdayName(d) }}</span>
          <template v-for="c in cells" :key="c.date">
            <button
              v-if="c.day"
              type="button"
              class="rev-cell-day"
              :class="[`rk-${c.day.kind}`, { 'is-today': c.date === rp.today, 'is-picked': shown?.date === c.date }]"
              :aria-label="cellLabel(c.day)"
              @click="picked = c.date"
            >
              <span class="rev-num"><span class="rev-nlong">{{ cellNum(c) }}</span><span class="rev-nshort" aria-hidden="true">{{ fmtNum.format(asDate(c.date)) }}</span><span v-if="c.date === rp.today" class="rev-today">{{ t('rev.today') }}</span></span>
              <span v-for="x in c.day.exams" :key="x" class="rev-cexam">{{ examText(x) }}</span>
              <span v-if="c.day.kind === 'rest'" class="rev-cfree">{{ t('rev.restDay') }}</span>
              <span v-for="s in c.day.sessions" :key="s.code" class="rev-block" :class="colourOf(s.code)">
                <span class="rev-scode">{{ s.code }}</span>
                <span class="rev-sh">{{ hours(s.hours) }}</span>
              </span>
            </button>
            <span v-else class="rev-cell-out" aria-hidden="true"><span class="rev-num"><span class="rev-nlong">{{ cellNum(c) }}</span><span class="rev-nshort">{{ fmtNum.format(asDate(c.date)) }}</span></span></span>
          </template>
        </div>
        <!-- Phones: the grid shows marks only; the tapped day's detail sits under it. -->
        <div v-if="shown" class="rev-detail" aria-live="polite">
          <p class="rev-detail-date">{{ weekdayLabel(shown.date) }} {{ dayLabel(shown.date) }}</p>
          <p v-for="x in shown.exams" :key="x" class="rev-cexam">{{ examText(x) }}</p>
          <p v-if="shown.kind === 'rest'" class="rev-note">{{ t('rev.restDay') }}</p>
          <ul v-else-if="shown.sessions.length" class="rev-dlist">
            <li v-for="s in shown.sessions" :key="s.code" class="rev-block" :class="colourOf(s.code)">
              <span class="rev-scode">{{ s.code }}</span> <span class="rev-sh">{{ hours(s.hours) }}</span><span v-if="s.focus" class="rev-focus"> · {{ t('rev.focus') }}</span>
            </li>
          </ul>
          <p v-else-if="shown.kind !== 'exam'" class="rev-note">{{ t('rev.nothing') }}</p>
        </div>
      </template>

      <template v-else>
        <div v-for="(w, i) in weeks" :key="i" class="rev-wk">
          <h3 class="rev-wklabel">{{ w.label }}</h3>
          <ol class="rev-days">
            <li v-for="d in w.days" :key="d.date" class="rev-day" :class="`rk-${d.kind}`">
              <span class="rev-date">
                <span class="rev-dw">{{ weekdayLabel(d.date) }}</span>
                <span>{{ dayLabel(d.date) }}</span>
                <span v-if="d.date === rp.today" class="rev-today">{{ t('rev.today') }}</span>
              </span>
              <span v-if="d.kind === 'exam'" class="rev-exam">
                <span v-for="c in d.exams" :key="c">{{ examText(c) }}</span>
              </span>
              <span v-else-if="d.kind === 'rest'" class="rev-free">{{ t('rev.restDay') }}</span>
              <template v-else-if="d.sessions.length">
                <ul class="rev-bars">
                  <li v-for="s in d.sessions" :key="s.code" class="rev-block" :class="colourOf(s.code)" :style="{ flexGrow: s.hours }">
                    <span class="rev-scode">{{ s.code }}</span> <span class="rev-sh">{{ hours(s.hours) }}</span><span v-if="s.focus" class="rev-focus"> · {{ t('rev.focus') }}</span>
                  </li>
                </ul>
                <span class="rev-dh">{{ hours(dayHours(d)) }}</span>
              </template>
              <span v-else class="rev-free">{{ t('rev.nothing') }}</span>
            </li>
          </ol>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
/* Stacked by default (phones, tablets): period, inputs, totals, calendar. */
.rev {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

.rev-side {
  display: contents;
}

.rev-period { order: 1; }
.rev-input { order: 2; }
.rev-sum { order: 3; }
.rev-cal { order: 4; }

.rev-period,
.rev-sum {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  min-width: 0;
}

.rev-sum {
  padding: var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
}

.rev-input,
.rev-cal {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4) var(--space-5);
}

.rev-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px var(--space-3);
}

.rev-subtitle {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
}

.rev-time-title {
  margin-top: var(--space-2);
}

.rev-note,
.rev-label,
.rev-cl,
.rev-meta,
.rev-thead {
  margin: 0;
  font-size: var(--fs-meta);
  font-weight: var(--fw-regular, 400);
  color: var(--ink-soft);
}

.rev-label {
  padding: 0;
}

.rev-periods {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* One control height everywhere in the inputs. */
.rev-in {
  height: 40px;
  min-height: 40px;
  padding-block: 0;
  color-scheme: light dark;
}

.rev-in[type='date'],
.rev-in[type='time'] {
  font-variant-numeric: tabular-nums;
}

/* The exams table: subject | date | time | difficulty | actions. */
.rev-table {
  display: grid;
}

.rev-tr {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 11.5rem 8.5rem 8rem auto;
  align-items: center;
  gap: var(--space-3);
  padding: 8px 0;
  border-top: 1px solid var(--divider);
}

.rev-thead {
  padding: 0 0 6px;
  border-top: 0;
}

.rev-cl {
  display: none;
}

.rev-subject {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.rev-name {
  font-weight: var(--fw-semibold);
  overflow-wrap: anywhere;
}

.rev-code {
  padding: 1px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--sub) 18%, transparent);
  font-size: var(--fs-meta);
  font-variant-numeric: tabular-nums;
}

.rev-cell,
.rev-field,
.rev-add {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.rev-dateWrap {
  position: relative;
  display: block;
}

.rev-dateWrap .rev-in {
  width: 100%;
}

/* An exam date still to fill: a dashed field with a quiet prompt in place of dd/mm/yyyy. */
.is-empty .rev-in {
  border-style: dashed;
}

.is-empty .rev-in:not(:focus),
.is-empty .rev-in:not(:focus)::-webkit-datetime-edit {
  color: transparent;
}

.rev-ph {
  position: absolute;
  inset: 0 36px 0 14px;
  display: flex;
  align-items: center;
  font-size: var(--fs-meta);
  white-space: nowrap;
  color: var(--ink-soft);
  pointer-events: none;
}

.rev-dateWrap:focus-within .rev-ph {
  display: none;
}

.rev-rowend {
  display: flex;
  gap: var(--space-3);
  white-space: nowrap;
}

/* Plain text buttons: no fill, underline on hover, nothing moves. */
.rev-text {
  min-height: 32px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: var(--fs-small);
  color: var(--accent);
  cursor: pointer;
}

.rev-text:hover {
  text-decoration: underline;
}

.rev-remove {
  color: var(--ink-soft);
}

.rev-remove:hover {
  color: var(--bad);
}

.rev-off {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px var(--space-3);
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.rev-offitem {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.rev-add {
  max-width: 420px;
}

.rev-settings {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.5fr);
  align-items: end;
  gap: var(--space-3);
}

.rev-rest {
  margin: 0;
  padding: 0;
  border: 0;
}

.rev-week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.rev-wd {
  min-width: 0;
  height: 40px;
  padding: 0 2px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--field-fill);
  font: inherit;
  font-size: var(--fs-meta);
  color: var(--ink);
  cursor: pointer;
}

.rev-wd:hover {
  border-color: var(--accent);
}

.rev-wd[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-fill);
  color: var(--accent-fill-ink);
}

/* Subject colours: a tint behind the code, which is always written, so colour is never the only sign. */
.c0 { --sub: #2f6fd6; }
.c1 { --sub: #d0457a; }
.c2 { --sub: #1f8a5b; }
.c3 { --sub: #c77700; }
.c4 { --sub: #7a4fd0; }
.c5 { --sub: #0f8a9a; }

/* Totals: the colour legend. */
.rev-line {
  margin: 0;
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
}

.rev-totals {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rev-totals li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px var(--space-2);
  font-size: var(--fs-small);
}

.rev-tcode {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
}

.rev-tcode::before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--sub);
}

.rev-bar {
  grid-column: 1 / -1;
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 8%, transparent);
  overflow: hidden;
}

.rev-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--sub);
}

.rev-th,
.rev-dh,
.rev-sh {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.rev-total {
  padding-top: 6px;
  border-top: 1px solid var(--divider);
  font-weight: var(--fw-semibold);
}

.rev-skipped {
  margin: 0;
  padding-left: 1.1em;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.rev-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.rev-privacy {
  padding-top: var(--space-2);
}

/* Calendar */
.rev-calhead .rev-views {
  min-width: 200px;
}

.rev-empty {
  margin: 0;
  padding: var(--space-6) var(--space-4);
  border: 1px dashed var(--line);
  border-radius: var(--radius);
  text-align: center;
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
}

.rev-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-auto-rows: minmax(7.25rem, 1fr);
  grid-template-rows: auto;
  border-top: 1px solid var(--divider);
  border-left: 1px solid var(--divider);
}

.rev-wdh {
  padding: 6px 8px;
  border-right: 1px solid var(--divider);
  border-bottom: 1px solid var(--divider);
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
}

.rev-cell-day,
.rev-cell-out {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 6px;
  border: 0;
  border-right: 1px solid var(--divider);
  border-bottom: 1px solid var(--divider);
  background: none;
  font: inherit;
  font-size: var(--fs-meta);
  color: var(--ink);
  text-align: left;
}

.rev-cell-day {
  cursor: default;
}

.rev-cell-out {
  color: var(--ink-soft);
  background: color-mix(in srgb, var(--ink) 3%, transparent);
}

.rev-num {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
}

.rev-nshort {
  display: none;
}

.rev-cell-out .rev-num {
  font-weight: var(--fw-regular, 400);
}

.rev-cell-day.rk-rest {
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}

.is-today {
  box-shadow: inset 0 0 0 2px var(--accent);
}

.rev-today {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent-fill);
  color: var(--accent-fill-ink);
  font-size: var(--fs-caption);
}

.rev-cexam {
  margin: 0;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--accent-fill);
  color: var(--accent-fill-ink);
  font-weight: var(--fw-semibold);
  overflow-wrap: anywhere;
}

.rev-cfree {
  color: var(--ink-soft);
}

.rev-block {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0 4px;
  padding: 2px 6px;
  border-left: 3px solid var(--sub);
  border-radius: 4px;
  background: color-mix(in srgb, var(--sub) 16%, transparent);
  line-height: 1.35;
}

.rev-scode {
  font-weight: var(--fw-semibold);
}

.rev-focus {
  color: var(--ink-soft);
}

.rev-detail {
  display: none;
}

/* List view (the agenda) */
.rev-wk {
  display: grid;
  gap: 2px;
}

.rev-wklabel {
  margin: var(--space-2) 0 0;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
}

.rev-days {
  margin: 0;
  padding: 0;
  list-style: none;
}

.rev-day {
  display: grid;
  grid-template-columns: 7.5em minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px var(--space-3);
  padding: 6px 0;
  border-top: 1px solid var(--divider);
}

.rev-date {
  display: flex;
  flex-wrap: wrap;
  gap: 0 6px;
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
}

.rev-dw {
  color: var(--ink-soft);
  font-weight: var(--fw-regular, 400);
}

.rev-bars {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rev-bars li {
  flex: 1 1 0;
  min-width: max-content;
  white-space: nowrap;
}

.rk-exam .rev-exam {
  display: flex;
  flex-wrap: wrap;
  gap: 2px var(--space-3);
  grid-column: 2 / -1;
  padding: 4px 10px;
  border-radius: 4px;
  background: var(--accent-fill);
  color: var(--accent-fill-ink);
  font-weight: var(--fw-semibold);
  overflow-wrap: anywhere;
}

.rev-day.rk-rest {
  font-size: var(--fs-small);
}

.rev-free {
  grid-column: 2 / -1;
  color: var(--ink-soft);
}

/* Wide: a sticky sidebar on the left; inputs then calendar on the right. */
@media (min-width: 1100px) {
  .rev {
    grid-template-columns: 264px minmax(0, 1fr);
    align-items: start;
    gap: var(--space-4);
  }

  .rev-side {
    position: sticky;
    top: 84px;
    display: grid;
    gap: var(--space-4);
    grid-row: 1 / span 2;
    grid-column: 1;
    max-height: calc(100vh - 100px);
    padding: var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: var(--shadow-1);
    overflow-y: auto;
  }

  .rev-sum {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: none;
  }

  .rev-line {
    display: none;
  }

  .rev-input,
  .rev-cal {
    grid-column: 2;
  }

  .rev-actions .button {
    flex: 1 1 auto;
  }
}

/* Tablets and phones: the table becomes one compact block per subject. */
@media (max-width: 899px) {
  .rev-thead {
    display: none;
  }

  .rev-tr {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: end;
    gap: var(--space-2);
    padding: 10px 0;
  }

  .rev-subject,
  .rev-rowend {
    grid-column: 1 / -1;
  }

  .rev-cl {
    display: block;
  }

  .rev-settings {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .rev-rest {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .rev-input,
  .rev-cal {
    padding: var(--space-4);
  }

  .rev-tr {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rev-dateCell {
    grid-column: 1 / -1;
  }

  .rev-settings {
    grid-template-columns: minmax(0, 1fr);
  }

  /* The phone calendar: a compact month grid of marks; tap a day for its detail below. */
  .rev-grid {
    grid-auto-rows: minmax(3.25rem, 1fr);
  }

  .rev-wdh {
    padding: 4px 2px;
    text-align: center;
    font-size: var(--fs-caption);
  }

  .rev-cell-day,
  .rev-cell-out {
    flex-direction: row;
    flex-wrap: wrap;
    align-content: flex-start;
    justify-content: center;
    gap: 3px;
    padding: 4px 2px;
  }

  .rev-cell-day {
    cursor: pointer;
  }

  .rev-num {
    flex-basis: 100%;
    justify-content: center;
    font-size: var(--fs-caption);
  }

  .rev-nlong {
    display: none;
  }

  .rev-nshort {
    display: inline;
  }

  .rev-num .rev-today,
  .rev-cell-day .rev-cfree {
    display: none;
  }

  .rev-cell-day .rev-cexam {
    flex-basis: 100%;
    height: 6px;
    padding: 0;
    font-size: 0;
  }

  .rev-cell-day .rev-block {
    width: 8px;
    height: 8px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--sub);
    font-size: 0;
  }

  .rev-cell-day.is-picked {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .rev-detail {
    display: grid;
    gap: 6px;
  }

  .rev-detail-date {
    margin: 0;
    font-weight: var(--fw-semibold);
  }

  .rev-dlist {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .rev-dlist .rev-block {
    justify-content: flex-start;
    padding: 4px 8px;
  }

  .rev-day {
    grid-template-columns: 4.5em minmax(0, 1fr);
  }

  .rev-dh {
    display: none;
  }

  .rev-bars {
    flex-direction: column;
  }

  .rev-bars li {
    flex: none !important;
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
  }
}

@media print {
  .rev-input,
  .rev-period,
  .rev-actions,
  .rev-views,
  .rev-detail,
  .rev-privacy,
  .rev-sum :deep(.infotip) {
    display: none !important;
  }

  .rev,
  .rev-side {
    display: block;
    position: static;
    max-height: none;
    border: 0;
    box-shadow: none;
  }

  .rev-cal,
  .rev-sum {
    padding: 0;
    border: 0;
    margin-bottom: 16px;
  }

  .rev-cell-day,
  .rev-day {
    break-inside: avoid;
  }
}
</style>

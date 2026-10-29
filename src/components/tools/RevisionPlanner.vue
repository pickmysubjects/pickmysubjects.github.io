<script setup lang="ts">
import { computed } from 'vue'
import InfoTip from '@/components/InfoTip.vue'
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
 * a day-by-day agenda. The plan only fills in the subjects; nothing here changes the plan or the record.
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
// Colours tell subjects apart at a glance; the code is always written too.
const colourOf = (code: string) => `c${Math.max(0, rows.value.findIndex((r) => r.code === code)) % 6}`

const fmtDay = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' }))
const fmtShort = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'numeric', timeZone: 'UTC' }))
const fmtWeekday = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' }))
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

/** The agenda in weeks (Monday to Sunday), each with its label. */
const weeks = computed(() => {
  const out: { label: string; days: RevisionDay[] }[] = []
  for (const d of plan.value.days) {
    if (!out.length || weekday(d.date) === 1) out.push({ label: '', days: [] })
    out.at(-1)!.days.push(d)
  }
  return out.map((w, i) => ({ ...w, label: t.value('rev.week', { n: i + 1, from: shortLabel(w.days[0]!.date), to: shortLabel(w.days.at(-1)!.date) }) }))
})

const totalHours = computed(() => plan.value.totals.reduce((s, x) => s + x.hours, 0))
const maxTotal = computed(() => Math.max(1, ...plan.value.totals.map((x) => x.hours)))
const needsDate = (r: (typeof rows.value)[number]) => !rp.noExam(r) && !r.exam
const missing = computed(() => (rows.value.length === 0 ? 'none' : plan.value.days.length === 0 ? 'dates' : plan.value.empty ? 'hours' : ''))
const pastSkips = computed(() => plan.value.skipped.filter((x) => x.why === 'pastExam'))

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
    <section class="surface rev-input" aria-labelledby="rev-subjects">
      <label v-if="periods.length" class="rev-field rev-period">
        <span class="rev-label">{{ t('rev.period') }}</span>
        <select class="select" :value="rp.key.value" @change="rp.pick(valueOf($event))">
          <option v-for="p in periods" :key="termKey(p)" :value="termKey(p)">{{ termLabel(t, p) }}</option>
        </select>
        <span v-if="examWindow" class="rev-note">{{ t('rev.window', { from: dayLabel(examWindow.examsStart), to: dayLabel(examWindow.end) }) }}</span>
      </label>
      <div class="rev-head">
        <h2 id="rev-subjects" class="sec-title">{{ t('rev.subjects') }}</h2>
        <span v-if="prefilled && term" class="rev-note">{{ t('rev.fromPlan') }}</span>
      </div>
      <ul v-if="rows.length" class="rev-rows">
        <li v-for="r in rows" :key="r.code" class="rev-row" :class="[colourOf(r.code), { 'is-off': rp.noExam(r) }]">
          <span class="rev-subject">
            <span class="code">{{ r.code }}</span>
            <span class="rev-name">{{ nameOf(r.code) }}</span>
            <span v-if="rp.examShare(r.code) !== undefined" class="rev-note">{{ t('rev.examShare', { n: rp.examShare(r.code)! }) }}</span>
          </span>
          <template v-if="!rp.noExam(r)">
            <label class="rev-field" :class="{ 'is-needed': needsDate(r) }">
              <span class="rev-label">{{ needsDate(r) ? t('rev.needDate') : t('rev.examDate') }}</span>
              <input class="input" type="date" :value="r.exam" :min="rp.examMin.value" :max="rp.examMax.value || undefined" :aria-invalid="needsDate(r) || undefined" @change="rp.setExam(r.code, valueOf($event))" />
            </label>
            <label class="rev-field rev-time">
              <span class="rev-label">{{ t('rev.examTime') }}</span>
              <input class="input" type="time" :value="r.time ?? ''" @change="rp.setTime(r.code, valueOf($event))" />
            </label>
            <label class="rev-field">
              <!-- "Our estimate" goes with the label, not in the option, so a phone's select never cuts it off. -->
              <span class="rev-label">{{ t('rev.difficulty') }}<template v-if="!r.difficulty"> · {{ t('rev.estimate') }}</template></span>
              <select class="select" :value="r.difficulty ?? rp.estimate(r.code)" @change="rp.setDifficulty(r.code, valueOf($event) as RevisionDifficulty)">
                <option v-for="l in LEVELS" :key="l" :value="l">{{ t(`rev.level.${l}`) }}</option>
              </select>
            </label>
          </template>
          <div class="rev-rowend">
            <label class="rev-check"><input type="checkbox" :checked="rp.noExam(r)" @change="rp.setNoExam(r.code, ($event.target as HTMLInputElement).checked)" /> {{ t('rev.noExam') }}</label>
            <button type="button" class="button button-quiet rev-remove" @click="rp.remove(r.code)">{{ t('rev.remove') }}</button>
          </div>
        </li>
      </ul>
      <p v-else class="rev-note">{{ t('rev.noSubjects') }}</p>
      <label class="rev-add">
        <span class="rev-label">{{ t('rev.add') }}</span>
        <SubjectSearch compact select :placeholder="t('calc.pickPrompt')" @pick="rp.add" />
      </label>

      <h2 class="sec-title rev-time-title">{{ t('rev.time') }}<InfoTip :text="t('rev.loadTip')" /></h2>
      <div class="rev-settings">
        <label class="rev-field">
          <span class="rev-label">{{ t('rev.start') }}</span>
          <input class="input" type="date" :value="start" :min="rp.today" :max="rp.examMax.value || undefined" @change="valueOf($event) && rp.set('start', valueOf($event))" />
        </label>
        <label class="rev-field">
          <span class="rev-label">{{ t('rev.hours') }} · {{ t('rev.optional') }}</span>
          <input class="input" type="number" inputmode="decimal" min="0" max="16" step="0.5" :placeholder="t('rev.hoursAuto')" :value="saved.hoursPerDay ?? ''" @change="onHours" />
        </label>
        <label class="rev-field">
          <span class="rev-label">{{ t('rev.dayStart') }} · {{ t('rev.optional') }}</span>
          <input class="input" type="time" :value="saved.dayStart" :aria-describedby="'rev-daystart-note'" @change="rp.set('dayStart', valueOf($event))" />
          <span id="rev-daystart-note" class="rev-note">{{ t('rev.dayStartNote') }}</span>
        </label>
      </div>
      <fieldset class="rev-rest">
        <legend class="rev-label">{{ t('rev.rest') }} · {{ t('rev.optional') }}</legend>
        <div class="rev-week">
          <button v-for="d in WEEK" :key="d" type="button" class="button button-quiet rev-wd" :aria-pressed="saved.restWeekdays.includes(d)" @click="toggleRest(d)">{{ weekdayName(d) }}</button>
        </div>
      </fieldset>
      <p class="rev-note">{{ t('rev.privacy') }}</p>
    </section>

    <div class="rev-out">
      <section class="rev-sum" aria-labelledby="rev-sum">
        <h2 id="rev-sum" class="sec-title">{{ t('rev.totals') }}<InfoTip :text="t('rev.rule')" /></h2>
        <ul v-if="plan.totals.length && !plan.empty" class="rev-totals">
          <li v-for="x in plan.totals" :key="x.code" :class="colourOf(x.code)">
            <span class="rev-tcode">{{ x.code }}</span>
            <span class="rev-bar" aria-hidden="true"><span :style="{ width: `${(x.hours / maxTotal) * 100}%` }" /></span>
            <span class="rev-th">{{ hours(x.hours) }}</span>
          </li>
          <li class="rev-total"><span>{{ t('rev.total') }}</span><span /><span class="rev-th">{{ hours(totalHours) }}</span></li>
        </ul>
        <ul v-if="pastSkips.length" class="rev-skipped">
          <li v-for="x in pastSkips" :key="x.code">{{ t('rev.skipPast', { code: x.code }) }}</li>
        </ul>
        <div v-if="!plan.empty" class="rev-actions">
          <button type="button" class="button button-accent" @click="exportIcs">{{ t('rev.ics') }}</button>
          <button type="button" class="button button-quiet" @click="print">{{ t('rev.print') }}</button>
        </div>
      </section>

      <section class="rev-cal" aria-labelledby="rev-cal">
        <h2 id="rev-cal" class="sec-title">{{ t('rev.schedule') }}</h2>
        <p v-if="missing" class="rev-note">{{ t(`rev.missing.${missing}`) }}</p>
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
                <span v-for="c in d.exams" :key="c">{{ [t('rev.exam'), c, timeOf(c)].filter(Boolean).join(' · ') }}</span>
              </span>
              <span v-else-if="d.kind === 'rest'" class="rev-free">{{ t('rev.restDay') }}</span>
              <template v-else-if="d.sessions.length">
                <ul class="rev-bars">
                  <li v-for="s in d.sessions" :key="s.code" :class="colourOf(s.code)" :style="{ flexGrow: s.hours }">
                    <span class="rev-scode">{{ s.code }}</span> <span class="rev-sh">{{ hours(s.hours) }}</span><span v-if="s.focus" class="rev-focus"> · {{ t('rev.focus') }}</span>
                  </li>
                </ul>
                <span class="rev-dh">{{ hours(dayHours(d)) }}</span>
              </template>
              <span v-else class="rev-free">{{ t('rev.nothing') }}</span>
            </li>
          </ol>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.rev {
  display: grid;
  gap: var(--space-4);
}

.rev-input {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-5);
}

.rev-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px var(--space-3);
}

.sec-title {
  margin: 0;
}

.rev-time-title {
  margin-top: var(--space-2);
}

.rev-note,
.rev-label {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.rev-period {
  max-width: 360px;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--divider);
}

.rev-rows {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* The subject on top; exam date, start time, difficulty, then "no final exam" and remove. */
.rev-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.2fr) auto;
  align-items: end;
  gap: var(--space-2) var(--space-3);
  padding: 0 0 var(--space-3) 12px;
  border-bottom: 1px solid var(--divider);
  border-left: 4px solid var(--sub);
}

.rev-row.is-off {
  grid-template-columns: minmax(0, 1fr);
  border-left-color: var(--divider);
}

.rev-subject {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
  grid-column: 1 / -1;
  min-width: 0;
}

.rev-subject .code {
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.rev-name {
  font-weight: var(--fw-semibold);
  overflow-wrap: anywhere;
}

.rev-field,
.rev-add {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.rev-field .input,
.rev-field .select {
  width: 100%;
  min-width: 0;
  min-height: var(--control-h);
}

/* An exam date still to fill: a quiet outline on the field, no banner. */
.rev-field.is-needed .rev-label {
  color: var(--ink);
}

.rev-field.is-needed .input {
  border-color: var(--accent);
}

.rev-rowend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.rev-row:not(.is-off) .rev-rowend {
  grid-column: 1 / -1;
}

.rev-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: var(--control-h);
  font-size: var(--fs-small);
  cursor: pointer;
}

.rev-check input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
}

.rev-remove {
  min-height: var(--control-h);
  color: var(--ink-soft);
}

.rev-remove:hover {
  color: var(--bad);
}

.rev-settings {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.rev-rest {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
}

.rev-week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.rev-wd {
  min-width: 0;
  min-height: var(--control-h);
  padding: 0 4px;
}

.rev-wd[aria-pressed='true'],
.rev-wd[aria-pressed='true']:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}

/* Subject colours: a stripe and a tint; the code is always written, so colour is never the only sign. */
.c0 { --sub: #2f6fd6; }
.c1 { --sub: #d0457a; }
.c2 { --sub: #1f8a5b; }
.c3 { --sub: #c77700; }
.c4 { --sub: #7a4fd0; }
.c5 { --sub: #0f8a9a; }

/* Results: totals first on phones; on wide screens the agenda leads and the totals sit beside it. */
.rev-out {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

.rev-sum,
.rev-cal {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-5);
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--divider);
}

.rev-totals {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rev-totals li {
  display: grid;
  grid-template-columns: max-content minmax(40px, 1fr) auto;
  align-items: center;
  gap: var(--space-2);
}

.rev-tcode {
  padding-left: 8px;
  border-left: 4px solid var(--sub);
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
}

.rev-total .rev-tcode,
.rev-total > span:first-child {
  border: 0;
}

.rev-bar {
  height: 10px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}

.rev-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--sub);
}

.rev-th,
.rev-dh {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.rev-total {
  padding-top: 8px;
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

.rev-actions .button {
  min-height: var(--control-h);
}

/* The agenda: plain rows with fine lines, one row a day. */
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
  padding: 8px 0;
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

.rev-today {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
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

/* Each session's length follows its hours (flex-grow); its text is the ink colour on a light tint. */
.rev-bars li {
  flex: 1 1 0;
  min-width: max-content;
  padding: 4px 8px;
  border-left: 4px solid var(--sub);
  border-radius: 4px;
  background: color-mix(in srgb, var(--sub) 16%, transparent);
  white-space: nowrap;
}

.rev-scode {
  font-weight: var(--fw-semibold);
}

.rev-sh,
.rev-focus {
  font-variant-numeric: tabular-nums;
}

.rev-focus {
  color: var(--ink-soft);
}

.rk-exam .rev-exam {
  display: flex;
  flex-wrap: wrap;
  gap: 2px var(--space-3);
  grid-column: 2 / -1;
  padding: 4px 10px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  font-weight: var(--fw-semibold);
  overflow-wrap: anywhere;
}

.rk-rest {
  padding: 2px 0;
  font-size: var(--fs-small);
}

.rev-free {
  grid-column: 2 / -1;
  color: var(--ink-soft);
}

@media (min-width: 1024px) {
  .rev-out {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
    align-items: start;
  }

  .rev-cal {
    grid-row: 1;
    grid-column: 1;
  }

  .rev-sum {
    grid-row: 1;
    grid-column: 2;
  }
}

@media (max-width: 720px) {
  .rev-input,
  .rev-sum,
  .rev-cal {
    padding: var(--space-4);
  }

  .rev-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .rev-row > .rev-field:nth-of-type(3) {
    grid-column: 1 / -1;
  }

  .rev-settings {
    grid-template-columns: minmax(0, 1fr);
  }

  /* A compact summary: the bars give way to code and hours side by side. */
  .rev-totals {
    display: flex;
    flex-wrap: wrap;
    gap: 6px var(--space-3);
  }

  .rev-totals li {
    display: flex;
    gap: 6px;
  }

  .rev-totals .rev-bar {
    display: none;
  }

  .rev-total {
    padding-top: 0;
    border-top: 0;
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
  .rev-actions,
  .rev-sum :deep(.infotip) {
    display: none !important;
  }

  .rev,
  .rev-out {
    display: block;
  }

  .rev-cal,
  .rev-sum {
    padding: 0;
    border: 0;
    margin-bottom: 16px;
  }

  .rev-day {
    break-inside: avoid;
  }
}
</style>

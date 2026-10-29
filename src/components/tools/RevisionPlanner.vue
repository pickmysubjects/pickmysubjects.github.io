<script setup lang="ts">
import { computed } from 'vue'
import InfoTip from '@/components/InfoTip.vue'
import SubjectSearch from '@/components/SubjectSearch.vue'
import { useDataset } from '@/composables/useDataset'
import { useRevisionPlan } from '@/composables/useRevisionPlan'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import { addDays, revisionIcs, weekday, type RevisionDay, type RevisionDifficulty } from '@/engine/revisionPlan'
import { downloadIcs } from '@/utils/keyDates'

/**
 * The revision planner: exam dates and the hours a student has in, a day-by-day timetable out.
 * The plan only fills in the subjects; nothing here changes the plan or the record.
 */
const { t, locale } = useI18n()
const { data } = useDataset()
const rp = useRevisionPlan()
const { saved, rows, prefilled, plan, start } = rp

const nameOf = (code: string) => {
  const s = data.value.subjects[code]
  return s ? localTitle(s, locale.value) || s.title : code
}
const LEVELS: readonly RevisionDifficulty[] = ['easier', 'average', 'harder']
// Colours tell subjects apart at a glance; the code is always written too.
const colourOf = (code: string) => `c${Math.max(0, rows.value.findIndex((r) => r.code === code)) % 6}`

const fmtDay = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' }))
const fmtWeekday = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' }))
const dayLabel = (date: string) => fmtDay.value.format(new Date(`${date}T00:00:00Z`))
const weekdayLabel = (date: string) => fmtWeekday.value.format(new Date(`${date}T00:00:00Z`))
// Monday first, as Australian calendars are; 2026-10-26 is a Monday.
const WEEK = [1, 2, 3, 4, 5, 6, 0]
const weekdayName = (d: number) => weekdayLabel(addDays('2026-10-26', (d + 6) % 7))

const hours = (h: number) => t.value('rev.hoursN', { n: h })
const sessionsOf = (d: RevisionDay) => d.sessions

/** The days in weeks, Monday to Sunday; days outside the plan are blanks. */
const weeks = computed(() => {
  const days = plan.value.days
  if (!days.length) return []
  const out: (RevisionDay | null)[][] = []
  let week: (RevisionDay | null)[] = Array.from({ length: (weekday(days[0]!.date) + 6) % 7 }, () => null)
  for (const d of days) {
    week.push(d)
    if (week.length === 7) {
      out.push(week)
      week = []
    }
  }
  if (week.length) out.push([...week, ...Array.from({ length: 7 - week.length }, () => null)])
  return out
})

const totalHours = computed(() => plan.value.totals.reduce((s, x) => s + x.hours, 0))
const maxTotal = computed(() => Math.max(1, ...plan.value.totals.map((x) => x.hours)))
const missing = computed(() => (rows.value.length === 0 ? 'none' : plan.value.days.length === 0 ? 'dates' : plan.value.empty ? 'hours' : ''))

const valueOf = (e: Event) => (e.target as HTMLInputElement).value
function onHours(e: Event): void {
  const n = Number(valueOf(e))
  rp.set('hoursPerDay', Number.isFinite(n) ? Math.max(0, Math.min(16, n)) : 0)
}
function toggleRest(d: number): void {
  const list = saved.value.restWeekdays
  rp.set('restWeekdays', list.includes(d) ? list.filter((x) => x !== d) : [...list, d].sort())
}
function exportIcs(): void {
  const ics = revisionIcs(plan.value, rp.subjects.value, saved.value.dayStart, {
    session: (code, focus) => t.value(focus ? 'rev.icsFocus' : 'rev.icsSession', { code }),
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
      <div class="rev-head">
        <h2 id="rev-subjects" class="sec-title">{{ t('rev.subjects') }}</h2>
        <span v-if="prefilled" class="rev-note">{{ t('rev.fromPlan') }}</span>
      </div>
      <ul v-if="rows.length" class="rev-rows">
        <li v-for="r in rows" :key="r.code" class="rev-row" :class="colourOf(r.code)">
          <span class="rev-subject">
            <span class="code">{{ r.code }}</span>
            <span class="rev-name">{{ nameOf(r.code) }}</span>
            <span v-if="rp.examShare(r.code) !== undefined" class="rev-note">{{ t('rev.examShare', { n: rp.examShare(r.code)! }) }}</span>
          </span>
          <label class="rev-field">
            <span class="rev-label">{{ t('rev.examDate') }}</span>
            <input class="input" type="date" :value="r.exam" :min="rp.today" @change="rp.setExam(r.code, valueOf($event))" />
          </label>
          <label class="rev-field rev-time">
            <span class="rev-label">{{ t('rev.examTime') }}</span>
            <input class="input" type="time" :value="r.time ?? ''" @change="rp.setTime(r.code, valueOf($event))" />
          </label>
          <label class="rev-field">
            <span class="rev-label">{{ t('rev.difficulty') }}</span>
            <select class="select" :value="r.difficulty ?? rp.estimate(r.code)" @change="rp.setDifficulty(r.code, valueOf($event) as RevisionDifficulty)">
              <option v-for="l in LEVELS" :key="l" :value="l">{{ t(`rev.level.${l}`) }}{{ !r.difficulty && l === rp.estimate(r.code) ? ` (${t('rev.estimate')})` : '' }}</option>
            </select>
          </label>
          <button type="button" class="button button-quiet rev-remove" @click="rp.remove(r.code)">{{ t('rev.remove') }}</button>
        </li>
      </ul>
      <p v-else class="rev-note">{{ t('rev.noSubjects') }}</p>
      <label class="rev-add">
        <span class="rev-label">{{ t('rev.add') }}</span>
        <SubjectSearch compact select :placeholder="t('calc.pickPrompt')" @pick="rp.add" />
      </label>

      <h2 class="sec-title rev-time-title">{{ t('rev.time') }}</h2>
      <div class="rev-settings">
        <label class="rev-field">
          <span class="rev-label">{{ t('rev.start') }}</span>
          <input class="input" type="date" :value="start" @change="rp.set('start', valueOf($event))" />
        </label>
        <label class="rev-field">
          <span class="rev-label">{{ t('rev.hours') }}</span>
          <input class="input" type="number" inputmode="decimal" min="0" max="16" step="0.5" :value="saved.hoursPerDay" @change="onHours" />
        </label>
        <label class="rev-field">
          <span class="rev-label">{{ t('rev.dayStart') }}</span>
          <input class="input" type="time" :value="saved.dayStart" @change="valueOf($event) && rp.set('dayStart', valueOf($event))" />
        </label>
      </div>
      <fieldset class="rev-rest">
        <legend class="rev-label">{{ t('rev.rest') }}</legend>
        <div class="rev-week">
          <button v-for="d in WEEK" :key="d" type="button" class="button button-quiet rev-wd" :aria-pressed="saved.restWeekdays.includes(d)" @click="toggleRest(d)">{{ weekdayName(d) }}</button>
        </div>
      </fieldset>
      <p class="rev-note">{{ t('rev.privacy') }}</p>
    </section>

    <section class="surface rev-sum" aria-labelledby="rev-sum">
      <h2 id="rev-sum" class="sec-title">{{ t('rev.totals') }}<InfoTip :text="t('rev.rule')" /></h2>
      <p class="rev-note">{{ t('rev.ruleShort') }}</p>
      <ul v-if="plan.totals.length && !plan.empty" class="rev-totals">
        <li v-for="x in plan.totals" :key="x.code" :class="colourOf(x.code)">
          <span class="rev-tcode">{{ x.code }}</span>
          <span class="rev-bar" aria-hidden="true"><span :style="{ width: `${(x.hours / maxTotal) * 100}%` }" /></span>
          <span class="rev-th">{{ hours(x.hours) }}</span>
        </li>
        <li class="rev-total"><span>{{ t('rev.total') }}</span><span /><span class="rev-th">{{ hours(totalHours) }}</span></li>
      </ul>
      <ul v-if="plan.skipped.length" class="rev-skipped">
        <li v-for="x in plan.skipped" :key="x.code">{{ t(x.why === 'noDate' ? 'rev.skipNoDate' : 'rev.skipPast', { code: x.code }) }}</li>
      </ul>
      <div v-if="!plan.empty" class="rev-actions">
        <button type="button" class="button button-accent" @click="exportIcs">{{ t('rev.ics') }}</button>
        <button type="button" class="button button-quiet" @click="print">{{ t('rev.print') }}</button>
      </div>
    </section>

    <section class="surface rev-cal" aria-labelledby="rev-cal">
      <h2 id="rev-cal" class="sec-title">{{ t('rev.schedule') }}</h2>
      <p v-if="missing" class="rev-note">{{ t(`rev.missing.${missing}`) }}</p>
      <template v-if="weeks.length">
        <div class="rev-wkhead" aria-hidden="true">
          <span v-for="d in WEEK" :key="d">{{ weekdayName(d) }}</span>
        </div>
        <ol class="rev-days">
          <template v-for="(w, i) in weeks" :key="i">
            <li v-for="(d, j) in w" :key="d ? d.date : `${i}-${j}`" :class="d ? ['rev-day', `k-${d.kind}`] : 'rev-blank'" :aria-hidden="d ? undefined : 'true'">
              <template v-if="d">
                <span class="rev-date"><span class="rev-dw">{{ weekdayLabel(d.date) }}</span> {{ dayLabel(d.date) }}</span>
                <span v-if="d.kind === 'exam'" class="rev-exam">{{ t('rev.examDay', { codes: d.exams.join(', ') }) }}</span>
                <span v-else-if="d.kind === 'rest'" class="rev-free">{{ t('rev.restDay') }}</span>
                <ul v-else-if="sessionsOf(d).length" class="rev-sessions">
                  <li v-for="s in sessionsOf(d)" :key="s.code" :class="colourOf(s.code)">
                    <span class="rev-scode">{{ s.code }}</span>
                    <span class="rev-sh">{{ hours(s.hours) }}</span>
                    <span v-if="s.focus" class="rev-focus">{{ t('rev.focus') }}</span>
                  </li>
                </ul>
                <span v-else class="rev-free">{{ t('rev.nothing') }}</span>
              </template>
            </li>
          </template>
        </ol>
      </template>
    </section>
  </div>
</template>

<style scoped>
.rev {
  display: grid;
  gap: var(--space-4);
}

.rev-input,
.rev-sum,
.rev-cal {
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

.rev-rows {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* The subject on top; exam date, start time, difficulty and remove under it. */
.rev-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.2fr) auto;
  align-items: end;
  gap: var(--space-2) var(--space-3);
  padding: 0 0 var(--space-3) 12px;
  border-bottom: 1px solid var(--divider);
  border-left: 4px solid var(--sub);
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

/* Subject colours: a stripe beside the code, never the only sign. */
.c0 { --sub: #2f6fd6; }
.c1 { --sub: #d0457a; }
.c2 { --sub: #1f8a5b; }
.c3 { --sub: #c77700; }
.c4 { --sub: #7a4fd0; }
.c5 { --sub: #0f8a9a; }

.rev-totals {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rev-totals li {
  display: grid;
  grid-template-columns: 6.5em minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2);
}

.rev-tcode {
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
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

.rev-th {
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

.rev-wkhead {
  display: none;
}

.rev-days {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rev-blank {
  display: none;
}

.rev-day {
  display: grid;
  grid-template-columns: 7.5em minmax(0, 1fr);
  align-items: start;
  gap: 4px var(--space-3);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.rev-date {
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
}

.rev-dw {
  color: var(--ink-soft);
  font-weight: var(--fw-regular, 400);
}

.k-rest,
.k-exam {
  background: transparent;
  border: 1px dashed var(--divider);
}

.k-exam {
  border: 1px solid var(--accent);
}

.rev-exam {
  font-weight: var(--fw-semibold);
  color: var(--accent);
  overflow-wrap: anywhere;
}

.rev-free {
  color: var(--ink-soft);
}

.rev-sessions {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rev-sessions li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  padding-left: 8px;
  border-left: 4px solid var(--sub);
}

.rev-scode {
  font-weight: var(--fw-semibold);
}

.rev-sh {
  font-variant-numeric: tabular-nums;
}

.rev-focus {
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

/* Wide screens: inputs beside the totals; the timetable as a week calendar under both. */
@media (min-width: 1024px) {
  .rev {
    grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
    align-items: start;
  }

  .rev-cal {
    grid-column: 1 / -1;
  }

  .rev-sum {
    position: sticky;
    top: 96px;
  }

  .rev-wkhead,
  .rev-days {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 6px;
  }

  .rev-wkhead span {
    font-size: var(--fs-small);
    color: var(--ink-soft);
    text-align: center;
  }

  .rev-blank {
    display: block;
  }

  .rev-day {
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
    min-height: 96px;
  }

  .rev-dw {
    display: none;
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

  .rev-remove {
    justify-self: start;
  }

  .rev-settings {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .rev-settings .rev-field:first-child {
    grid-column: 1 / -1;
  }

  .rev-day {
    grid-template-columns: 6.5em minmax(0, 1fr);
  }
}

@media print {
  .rev-input,
  .rev-actions,
  .rev-sum :deep(.infotip) {
    display: none !important;
  }

  .rev {
    display: block;
  }

  .rev-cal,
  .rev-sum {
    position: static;
    padding: 0;
    margin-bottom: 16px;
  }

  .rev-day {
    break-inside: avoid;
  }
}
</style>

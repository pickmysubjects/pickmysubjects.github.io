<script setup lang="ts">
import { link } from '@/composables/useView'
import { useDataYear } from '@/composables/useDataYear'
import FactsYearNote from '@/components/subject/FactsYearNote.vue'
import { computed, onBeforeUnmount, onMounted, shallowRef, toRef, useTemplateRef } from 'vue'
import { ArrowRightLeft, BookOpen, CalendarRange, Check, CheckCheck, ChevronDown, ExternalLink, TriangleAlert, X } from 'lucide-vue-next'
import { localTitle, pickLocalized } from '@/i18n/localized'
import {
  alternativeGroups,
  knownNotRunning,
  periodsFor,
  prereqStatus,
  prerequisiteRoute,
  referencedSubjects,
  simplifyFor,
  standingOf,
  type Period,
  type Subject,
} from '@/engine'
import AssessmentPanel from '@/components/subject/AssessmentPanel.vue'
import MajorRoles from '@/components/subject/MajorRoles.vue'
import WamWhatIf from '@/components/profile/WamWhatIf.vue'
import SubjectAbout from '@/components/subject/SubjectAbout.vue'
import { useProfile } from '@/composables/useProfile'
import { useDataset, useSubjectDetail } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { categoryTag, describeReq } from '@/i18n/format'
import { finalExamShare, prereqGist } from '@/i18n/gist'

/**
 * A quick look at a subject from the planner board, in the subject page's design: a glass panel
 * (a bottom sheet on phones) whose sticky header holds the code, title, the key facts and the
 * actions. Then what the student clicked for: where it sits in this plan, what it needs and
 * whether the plan meets that, what it leads to and what it can't be taken with, all in one
 * block; then the assessment; then the rest folded, each with a one-line summary.
 */
const props = defineProps<{
  code: string
  subject?: Subject
  subjects: Record<string, Subject>
  course: string
  year: number
  /** Codes in the plan or already passed, to mark which related subjects the student has. */
  have: string[]
  /** Of those, the ones already passed (the rest are only planned). */
  done?: string[]
  /** The plan's semester for it, once that semester has begun: it can be recorded as done there. */
  doneTerm?: string
  /** Marked pass/fail only: no mark to ask for. */
  passFail?: boolean
  /** In the plan: it can be swapped, moved or removed from here. */
  planned?: boolean
  /** Where each subject sits in the plan ("2027 S1", or "Done"). */
  whereOf?: Record<string, string>
  /** The plan's semester for it, to say when it isn't offered then. */
  term?: { year: number; period: Period }
}>()
const emit = defineEmits<{
  close: []
  open: [code: string]
  swap: [from: string, to: string]
  markDone: [mark: number | undefined]
  swapIt: []
  moveIt: []
  removeIt: []
}>()
// Hand over to the board (its picker or move list opens in this window's place), then close.
function act(e: 'swapIt' | 'moveIt' | 'removeIt'): void {
  if (e === 'swapIt') emit('swapIt')
  else if (e === 'moveIt') emit('moveIt')
  else emit('removeIt')
  dialog.value?.close()
}
const { subject: detailed, ready: detailReady } = useSubjectDetail(toRef(props, 'code'))
const doneMark = shallowRef<number | ''>('')
// Phones: the sheet opens at part height and goes full on a tap of its handle or a scroll.
const full = shallowRef(false)
function markDone(): void {
  const m = doneMark.value === '' ? undefined : Math.max(0, Math.min(100, Number(doneMark.value)))
  emit('markDone', m)
  dialog.value?.close()
}
const { t, locale } = useI18n()
const { data } = useDataset()
const local = computed(() => (props.subject ? localTitle(props.subject, locale.value) : ''))
const dialog = useTemplateRef<HTMLDialogElement>('dialog')

// A modal dialog keeps focus inside it and closes on Esc; focus goes back to the card after.
let opener: HTMLElement | null = null
onMounted(() => {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value?.showModal()
})
onBeforeUnmount(() => {
  // Opened from the phone's card menu (gone by now): back to the card itself.
  const back = opener?.isConnected ? opener : document.querySelector<HTMLElement>(`[data-code="${CSS.escape(props.code)}"] .row-main`)
  back?.focus({ preventScroll: true })
})

const periods = computed(() => (props.subject ? periodsFor(props.subject, props.year) : []))
const { facts, handbookFor } = useDataYear()
const factsFrom = computed(() => (props.subject ? facts(props.subject, props.year) : null))
const category = computed(() => categoryTag(t.value, props.subject?.categories[props.course]))
const runs = computed(() => {
  const s = props.subject
  if (!s) return ''
  if (s.offerings === 'unknown') return t.value('subject.runsUnknown')
  if (periods.value.length === 0) return knownNotRunning(s, props.year) ? t.value('subject.notRunning') : t.value('subject.runsUnknown')
  if (s.yearLong) return t.value('plan.yearLongRuns')
  return periods.value.map((p) => t.value(`period.${p}`)).join(' · ')
})
const exam = computed(() => {
  const n = props.subject ? finalExamShare(props.subject) : null
  return n === null ? t.value('subject.factUnknown') : n === 0 ? t.value('subject.factNone') : `${n}%`
})
// Planned in a semester the subject isn't offered in (when the offerings are known).
const notOfferedThen = computed(() => {
  const s = props.subject
  if (!s || !props.term || s.offerings === 'unknown' || s.yearLong) return false
  const then = periodsFor(s, props.term.year)
  return then.length > 0 && !then.includes(props.term.period)
})

const haveSet = computed(() => new Set(props.have))
const doneSet = computed(() => new Set(props.done ?? []))
const where = (c: string) => (doneSet.value.has(c) ? t.value('plan.doneIt') : (props.whereOf?.[c] ?? (haveSet.value.has(c) ? t.value('plan.plannedIt') : '')))

// Needs: the rule in words, each subject it names with where it is in the plan, and one tap to
// swap in an alternative. Met: as the subject page's hero says it (record, credit and the plan).
const needs = computed(() => (props.subject ? simplifyFor(props.subject.prerequisites, props.course) : 'unknown'))
const needCodes = computed(() => referencedSubjects(needs.value))
const prereq = computed(() => prereqGist(t.value, needs.value))
const { profile, setConfirmed } = useProfile()
const prereqMet = computed(() => {
  const n = needs.value
  if (!props.subject || n === 'none' || n === 'unknown') return null
  return prereqStatus(props.subject, standingOf(profile.value, data.value, props.have), { subjects: props.subjects, course: props.course }).status === 'ok'
})
const swapFrom = (c: string) => {
  if (haveSet.value.has(c) || !props.subjects[c]) return null
  for (const group of alternativeGroups(needs.value)) {
    if (!group.includes(c)) continue
    const planned = group.find((x) => x !== c && haveSet.value.has(x) && !doneSet.value.has(x))
    if (planned) return planned
  }
  return null
}
const route = computed(() => prerequisiteRoute(props.code, props.subjects, props.course, haveSet.value))
const routeMissing = computed(() => route.value.filter((c) => !haveSet.value.has(c)).length)
const hasManual = computed(() => /"(?:manual|placement|permission|school|average|wam)"/.test(JSON.stringify(props.subject?.prerequisites ?? '')))
const confirmed = computed(() => profile.value.confirmed?.includes(props.code) ?? false)

// Leads to, and can't be taken with: the ones in the plan first.
const inPlanFirst = (a: string, b: string) => Number(haveSet.value.has(b)) - Number(haveSet.value.has(a)) || a.localeCompare(b)
const leadsTo = computed(() =>
  Object.values(props.subjects)
    .filter((s) => referencedSubjects(s.prerequisites).includes(props.code))
    .map((s) => s.code)
    .sort(inPlanFirst),
)
const clashes = computed(() => {
  const own = props.subject && props.subject.nonAllowed !== 'unknown' ? props.subject.nonAllowed : []
  const listed = Object.values(props.subjects)
    .filter((s) => s.nonAllowed !== 'unknown' && s.nonAllowed.includes(props.code))
    .map((s) => s.code)
  return [...new Set([...own, ...listed])].sort(inPlanFirst)
})

const ratings = computed(() => {
  const s = props.subject?.signals
  if (!s) return []
  return [
    { key: 'rating.difficulty', value: s.difficulty },
    { key: 'rating.workload', value: s.workload },
    { key: 'rating.generosity', value: s.grading },
  ].filter((r): r is { key: string; value: number } => r.value !== undefined)
})
const ratingsShort = computed(() => (ratings.value.length ? t.value('subject.reviews', { n: props.subject?.signals?.reviews ?? 0 }) : t.value('subject.noRatings')))
// The first sentence of what it teaches, in the reader's language.
const aboutShort = computed(() => {
  const learn = detailed.value?.about?.learn
  return learn ? (pickLocalized(learn, locale.value).split(/(?<=[.。!?！？])\s*/)[0] ?? '') : ''
})

// Clicking the dimmed backdrop (the dialog element itself) closes it.
function onClick(event: MouseEvent): void {
  if (event.target === dialog.value) dialog.value?.close()
}
</script>

<template>
  <dialog ref="dialog" class="peek" :class="{ 'peek-expanded': full }" :aria-labelledby="`peek-title-${code}`" @close="emit('close')" @click="onClick" @scroll.passive="full = true">
    <!-- Sticky: the handle (phones), code, title, key facts and the actions. -->
    <header class="peek-head">
      <button type="button" class="peek-handle" :aria-label="code" :aria-expanded="full" @click="full = !full"><span aria-hidden="true" /></button>
      <div class="peek-top">
        <div class="peek-name">
          <p class="peek-code-row">
            <span class="code peek-code">{{ code }}</span>
            <span v-if="category" class="chip chip-strong peek-cat">{{ category }}</span>
          </p>
          <h2 :id="`peek-title-${code}`" class="peek-title">{{ local || subject?.title || t('plan.notInDataset') }}</h2>
          <p v-if="local" class="peek-title-en">{{ subject?.title }}</p>
        </div>
        <button class="peek-close" type="button" :aria-label="t('subject.close')" @click="dialog?.close()">
          <X :size="20" aria-hidden="true" />
        </button>
      </div>
      <dl v-if="subject" class="keyfacts">
        <div class="kf">
          <dt>{{ t('subject.factLevel') }}</dt>
          <dd class="kf-num">{{ subject.level }}</dd>
        </div>
        <div class="kf">
          <dt>{{ t('subject.factPoints') }}</dt>
          <dd class="kf-num">{{ subject.points }}</dd>
        </div>
        <div class="kf">
          <dt>{{ t('subject.factRuns') }}</dt>
          <dd>{{ runs }}</dd>
        </div>
        <div class="kf">
          <dt>{{ t('subject.factExam') }}</dt>
          <dd class="kf-num">{{ exam }}</dd>
        </div>
        <div class="kf">
          <dt>{{ t('subject.factPrereq') }}</dt>
          <dd>
            {{ prereq }}<span v-if="prereqMet" class="kf-met"><Check :size="14" aria-hidden="true" />{{ t('subject.prereqDone') }}</span>
          </dd>
        </div>
      </dl>
      <div class="peek-buttons">
        <a class="button button-accent peek-btn" :href="link(`subject/${code}`)">{{ t('subject.fullPage') }} <ExternalLink :size="15" aria-hidden="true" /></a>
        <a class="button button-quiet peek-btn" :href="handbookFor(code, year)" target="_blank" rel="noopener"><BookOpen :size="15" aria-hidden="true" /> Handbook</a>
        <template v-if="planned">
          <button class="button button-quiet peek-btn" type="button" @click="act('swapIt')"><ArrowRightLeft :size="15" aria-hidden="true" /> {{ t('plan.swap') }}</button>
          <button class="button button-quiet peek-btn" type="button" @click="act('moveIt')"><CalendarRange :size="15" aria-hidden="true" /> {{ t('plan.move') }}</button>
          <button class="button button-quiet peek-btn peek-remove" type="button" @click="act('removeIt')"><X :size="15" aria-hidden="true" /> {{ t('plan.removeShort') }}</button>
        </template>
      </div>
    </header>

    <div class="peek-body">
      <FactsYearNote v-if="factsFrom?.older" :year="factsFrom.year" />

      <!-- Finished it: record it in My record, in this semester, with an optional mark. -->
      <form v-if="doneTerm" class="peek-done" @submit.prevent="markDone">
        <span class="peek-done-title">{{ t('plan.doneAsk', { term: doneTerm }) }}</span>
        <label v-if="!passFail">
          <span class="visually-hidden">{{ t('record.markFor', { code }) }}</span>
          <input v-model="doneMark" class="input peek-done-mark" type="number" min="0" max="100" :placeholder="t('record.markShort')" />
        </label>
        <button class="button button-accent peek-btn" type="submit"><CheckCheck :size="16" aria-hidden="true" /> {{ t('plan.doneButton') }}</button>
      </form>

      <template v-if="subject">
        <!-- Why the student clicked: this subject in this plan, needs and leads-to in one block. -->
        <section class="peek-card peek-plan" :aria-labelledby="`peek-plan-${code}`">
          <h3 :id="`peek-plan-${code}`" class="peek-label">{{ t('peek.inPlan') }}</h3>
          <p class="peek-where">
            <strong>{{ where(code) || t('peek.notInPlan') }}</strong>
            <span v-if="notOfferedThen" class="peek-warn"><TriangleAlert :size="15" aria-hidden="true" />{{ t('peek.notOfferedThen') }}</span>
          </p>

          <div class="peek-links">
            <div class="peek-col">
              <h4 class="peek-sub">
                {{ t('subject.needs') }}
                <span v-if="prereqMet === true" class="peek-ok"><Check :size="14" aria-hidden="true" />{{ t('subject.prereqDone') }}</span>
                <span v-else-if="prereqMet === false" class="peek-bad">{{ t('peek.needsUnmet') }}</span>
              </h4>
              <p v-if="subject.prerequisites === 'none'" class="muted">{{ t('subject.needsNone') }}</p>
              <p v-else-if="subject.prerequisites === 'unknown'" class="muted">{{ t('subject.notRecorded') }}</p>
              <template v-else>
                <p class="peek-rule">{{ describeReq(t, subject.prerequisites, course) }}</p>
                <ul v-if="needCodes.length" class="peek-list">
                  <li v-for="c in needCodes" :key="c" class="peek-item">
                    <a v-if="!subjects[c]" class="peek-row" :href="handbookFor(c, year)" target="_blank" rel="noopener">
                      <span class="code">{{ c }}</span><span class="peek-row-title muted">{{ t('subject.notYetAdded') }}</span>
                    </a>
                    <button v-else type="button" class="peek-row" @click="emit('open', c)">
                      <span class="code">{{ c }}</span>
                      <span class="peek-row-title">{{ subjects[c]?.title }}</span>
                      <span v-if="where(c)" class="peek-when" :class="{ 'peek-when-done': doneSet.has(c) }">{{ where(c) }}</span>
                    </button>
                    <button v-if="swapFrom(c)" type="button" class="button button-quiet peek-swap" @click="emit('swap', swapFrom(c)!, c)">
                      {{ t('plan.swapTo', { code: swapFrom(c)! }) }}
                    </button>
                  </li>
                </ul>
                <details v-if="route.length > needCodes.length" class="peek-route">
                  <summary>{{ t('subject.routeTitle', { n: route.length, missing: routeMissing }) }}</summary>
                  <p class="peek-codes">
                    <button v-for="c in route" :key="c" type="button" class="chip code peek-code-chip" @click="emit('open', c)">
                      {{ c }}<span v-if="where(c)" class="peek-when">{{ where(c) }}</span>
                    </button>
                  </p>
                </details>
              </template>
              <label v-if="hasManual" class="peek-confirm">
                <input type="checkbox" :checked="confirmed" @change="setConfirmed(code, ($event.target as HTMLInputElement).checked)" />
                {{ t('plan.iMeetThisLong') }}
              </label>
            </div>

            <div class="peek-col">
              <h4 class="peek-sub">{{ t('subject.unlocks') }}</h4>
              <p v-if="!leadsTo.length" class="muted">{{ t('subject.unlocksNone') }}</p>
              <p v-else class="peek-codes">
                <button v-for="c in leadsTo" :key="c" type="button" class="chip code peek-code-chip" :class="{ 'peek-in': haveSet.has(c) }" @click="emit('open', c)">
                  {{ c }}<span v-if="where(c)" class="peek-when">{{ where(c) }}</span>
                </button>
              </p>
            </div>
          </div>

          <div v-if="clashes.length" class="peek-col">
            <h4 class="peek-sub">{{ t('subject.blocks') }}</h4>
            <p class="peek-codes">
              <button v-for="c in clashes" :key="c" type="button" class="chip code peek-code-chip" :class="{ 'peek-clash': haveSet.has(c) }" @click="emit('open', c)">
                <TriangleAlert v-if="haveSet.has(c)" :size="13" aria-hidden="true" />{{ c }}<span v-if="where(c)" class="peek-when">{{ where(c) }}</span>
              </button>
            </p>
          </div>
        </section>

        <AssessmentPanel class="peek-card" :subject="subject" :year="year" />

        <!-- The rest, folded, each with a one-line summary. -->
        <details v-if="detailReady && detailed?.about" class="peek-card peek-fold">
          <summary class="peek-fold-head">
            <span class="peek-fold-name">{{ t('subject.aboutLearn') }}</span>
            <span class="peek-fold-short">{{ aboutShort }}</span>
            <ChevronDown :size="18" aria-hidden="true" class="peek-chev" />
          </summary>
          <SubjectAbout :subject="detailed" />
        </details>

        <details class="peek-card peek-fold peek-roles">
          <summary class="peek-fold-head">
            <span class="peek-fold-name">{{ t('subject.rolesTitle') }}</span>
            <ChevronDown :size="18" aria-hidden="true" class="peek-chev" />
          </summary>
          <MajorRoles :code="code" />
        </details>

        <details v-if="ratings.length" class="peek-card peek-fold">
          <summary class="peek-fold-head">
            <span class="peek-fold-name">{{ t('subject.ratingsTitle') }}</span>
            <span class="peek-fold-short">{{ ratingsShort }}</span>
            <ChevronDown :size="18" aria-hidden="true" class="peek-chev" />
          </summary>
          <p v-for="r in ratings" :key="r.key" class="peek-rating">
            <span>{{ t(r.key) }}</span><strong>{{ r.value }}/5</strong>
          </p>
        </details>
        <p v-else class="peek-card peek-line">
          <span class="peek-fold-name">{{ t('subject.ratingsTitle') }}</span><span class="peek-fold-short">{{ ratingsShort }}</span>
        </p>

        <details v-if="!doneSet.has(code)" class="peek-card peek-fold">
          <summary class="peek-fold-head">
            <span class="peek-fold-name">{{ t('peek.whatIf') }}</span>
            <ChevronDown :size="18" aria-hidden="true" class="peek-chev" />
          </summary>
          <WamWhatIf :code="code" />
        </details>
      </template>
    </div>
  </dialog>
</template>

<style scoped>
.peek {
  width: min(640px, calc(100% - 32px));
  max-height: min(88vh, 820px);
  max-height: min(88dvh, 820px);
  padding: 0;
  border: 1px solid var(--card-edge);
  border-radius: 28px;
  /* A floating glass panel: the page's colour shows through, the text sits on a frosted fill. */
  background: linear-gradient(180deg, rgb(255 255 255 / 34%), rgb(255 255 255 / 0%) 120px), var(--peek-fill);
  -webkit-backdrop-filter: var(--glass-blur-strong);
  backdrop-filter: var(--glass-blur-strong);
  color: var(--ink);
  box-shadow: var(--card-shadow), 0 30px 80px -30px rgb(60 20 80 / 55%);
  overscroll-behavior: contain;
}

.peek::backdrop {
  background: rgb(40 20 50 / 22%);
}

/* The header stays put while the rest scrolls under it. */
.peek-head {
  position: sticky;
  top: 0;
  z-index: 3;
  display: grid;
  gap: 14px;
  padding: 22px 24px 16px;
  border-bottom: 1px solid var(--divider);
  background: var(--glass-shine), var(--sheet-fill);
  -webkit-backdrop-filter: var(--glass-blur-strong);
  backdrop-filter: var(--glass-blur-strong);
}

.peek-handle {
  display: none;
}

.peek-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.peek-name {
  display: grid;
  flex: 1;
  gap: 4px;
  min-width: 0;
}

.peek-code-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.peek-code {
  font-size: 0.9375rem;
  font-weight: 650;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
}

.peek-cat {
  font-size: 0.75rem;
}

.peek-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: var(--fw-bold);
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.peek-title-en {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.peek-close {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  color: var(--ink);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.peek-close:hover,
.peek-close:focus-visible {
  background: var(--glass-fill-hover);
  color: var(--accent);
}

/* The key facts as on the subject page: name above, value below, hairlines between. */
.keyfacts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 0;
  margin: 0;
}

.kf {
  display: grid;
  align-content: start;
  gap: 2px;
  min-width: 0;
  padding: 0 16px;
  border-left: 1px solid var(--divider);
}

.kf:first-child {
  padding-left: 0;
  border-left: 0;
}

.kf dt {
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.kf dd {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: var(--fw-semibold);
  line-height: 1.35;
}

.kf dd.kf-num {
  font-family: var(--font-code);
  font-size: 1.0625rem;
}

.kf-met,
.peek-ok {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--good);
}

.peek-bad {
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--bad);
}

.peek-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.peek-btn {
  min-height: 38px;
  padding: 0 14px;
  font-size: 0.875rem;
}

.peek-remove {
  color: var(--bad);
}

.peek-body {
  display: grid;
  gap: 14px;
  padding: 18px 24px 24px;
}

.peek-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  min-width: 0;
  margin: 0;
  padding: 16px 18px;
  border: 1px solid var(--card-edge);
  border-radius: 18px;
  background: var(--card-fill, var(--sheet-fill));
}

.peek-label {
  margin: 0;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
}

.peek-where {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin: 0;
  font-size: 1.0625rem;
}

.peek-warn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--bad);
}

.peek-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 14px 20px;
}

.peek-col {
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
}

.peek-sub {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: var(--fw-bold);
}

.peek-rule {
  margin: 0;
  font-size: 0.9375rem;
}

.peek-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.peek-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}

.peek-row {
  display: grid;
  flex: 1 1 200px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 2px 10px;
  min-width: 0;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid var(--card-edge);
  border-radius: 12px;
  background: var(--glass-fill);
  color: var(--ink);
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.peek-row:hover,
.peek-row:focus-visible {
  border-color: var(--accent);
  background: var(--glass-fill-hover);
}

.peek-row-title {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
}

.peek-when {
  margin-left: 6px;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
}

.peek-when-done {
  color: var(--good);
}

.peek-swap {
  min-height: 36px;
  padding: 0 12px;
  font-size: 0.8125rem;
}

.peek-codes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
}

.peek-code-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
  cursor: pointer;
  transition: border-color 0.15s;
}

.peek-code-chip:hover,
.peek-code-chip:focus-visible {
  border-color: var(--accent);
}

.peek-in {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
}

.peek-clash {
  border-color: var(--bad);
  color: var(--bad);
}

.peek-route summary {
  min-height: 32px;
  font-size: 0.875rem;
  font-weight: var(--fw-semibold);
  cursor: pointer;
}

.peek-route .peek-codes {
  margin-top: 8px;
}

.peek-confirm {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 0.9375rem;
  cursor: pointer;
}

.peek-confirm input {
  margin-top: 3px;
}

.muted {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

/* Folded sections: the name and a one-line summary, the detail on tap. Closed, the detail takes
   no room at all (it mustn't widen the panel). */
.peek-fold:not([open]) > :not(summary) {
  display: none;
}

.peek-fold > :not(summary) {
  min-width: 0;
}

.peek-fold {
  gap: 0;
  padding-block: 4px;
}

.peek-fold[open] {
  gap: 10px;
  padding-bottom: 16px;
}

.peek-fold-head,
.peek-line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
}

.peek-fold-head {
  list-style: none;
  cursor: pointer;
}

.peek-line {
  padding-block: 4px;
}

.peek-fold-head::-webkit-details-marker {
  display: none;
}

.peek-fold-name {
  flex: none;
  font-weight: var(--fw-bold);
}

.peek-fold-short {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 0.875rem;
  color: var(--ink-soft);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.peek-chev {
  flex: none;
  margin-left: auto;
  color: var(--ink-soft);
}

/* The open state shows as the chevron pointing up (no turning animation). */
.peek-fold[open] .peek-chev {
  transform: rotate(180deg);
}

/* MajorRoles brings its own heading; the fold's name says it already. */
.peek-roles :deep(.roles-title) {
  display: none;
}

.peek-rating {
  display: flex;
  justify-content: space-between;
  margin: 0;
}

.peek-done {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  padding: 10px 12px;
  border-radius: var(--radius);
  background: var(--good-soft);
}

.peek-done-title {
  flex: 1 1 200px;
  font-size: 0.875rem;
  font-weight: 600;
}

.peek-done-mark {
  width: 88px;
  min-height: 38px;
}

/* Phones: a full-width bottom sheet with a drag handle, part height until opened. */
@media (max-width: 640px) {
  .peek {
    width: 100%;
    max-width: 100%;
    max-height: 64vh;
    max-height: 64dvh;
    margin: auto 0 0;
    border-radius: 24px 24px 0 0;
    transition: max-height 0.25s ease;
  }

  .peek-expanded {
    max-height: 92vh;
    max-height: 92dvh;
    background: var(--glass-shine), var(--sheet-fill);
  }

  .peek-head {
    gap: 10px;
    padding: 0 16px 12px;
  }

  .peek-handle {
    display: grid;
    place-items: center;
    width: 100%;
    height: 24px;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  .peek-handle span {
    width: 40px;
    height: 5px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ink) 25%, transparent);
  }

  .peek-title {
    font-size: 1.1875rem;
  }

  .kf {
    padding: 0 10px;
  }

  .peek-btn,
  .peek-swap,
  .peek-row,
  .peek-code-chip,
  .peek-route summary {
    min-height: 44px;
  }

  .peek-body {
    padding: 14px 16px calc(20px + env(safe-area-inset-bottom));
  }

  .peek-card {
    padding: 14px;
  }
}

@media (max-width: 640px) and (prefers-reduced-motion: reduce) {
  .peek {
    transition: none;
  }
}
</style>

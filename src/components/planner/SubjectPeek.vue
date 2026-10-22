<script setup lang="ts">
import { link } from '@/composables/useView'
import { handbookUrl } from '@/utils/links'
import { computed, onMounted, shallowRef, toRef, useTemplateRef } from 'vue'
import { ArrowRightLeft, BookOpen, CalendarRange, CheckCheck, ExternalLink, X } from 'lucide-vue-next'
import { localTitle } from '@/i18n/localized'
import { alternativeGroups, periodsFor, prerequisiteRoute, referencedSubjects, simplifyFor, type Subject } from '@/engine'
import AssessmentPanel from '@/components/subject/AssessmentPanel.vue'
import MajorRoles from '@/components/subject/MajorRoles.vue'
import WamWhatIf from '@/components/profile/WamWhatIf.vue'
import SubjectAbout from '@/components/subject/SubjectAbout.vue'
import { useProfile } from '@/composables/useProfile'
import { useSubjectDetail } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { categoryLabel, describeReq } from '@/i18n/format'

/** A quick look at a subject without leaving the planner. */
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
// The plan's subjects carry only the English gist; load the full about (every language, outcomes).
const { subject: detailed, ready: detailReady } = useSubjectDetail(toRef(props, 'code'))
const doneMark = shallowRef<number | ''>('')
function markDone(): void {
  const m = doneMark.value === '' ? undefined : Math.max(0, Math.min(100, Number(doneMark.value)))
  emit('markDone', m)
  dialog.value?.close()
}
const { t, locale } = useI18n()
const local = computed(() => (props.subject ? localTitle(props.subject, locale.value) : ''))
const dialog = useTemplateRef<HTMLDialogElement>('dialog')

onMounted(() => dialog.value?.showModal())

const periods = computed(() => (props.subject ? periodsFor(props.subject, props.year) : []))
const category = computed(() => categoryLabel(t.value, props.subject?.categories[props.course]))
const ratings = computed(() => {
  const s = props.subject?.signals
  if (!s) return []
  return [
    { key: 'rating.difficulty', value: s.difficulty },
    { key: 'rating.workload', value: s.workload },
    { key: 'rating.generosity', value: s.grading },
  ].filter((r): r is { key: string; value: number } => r.value !== undefined)
})

// What it's a prerequisite for, and what it can't count alongside (either side may list it).
const leadsTo = computed(() =>
  Object.values(props.subjects)
    .filter((s) => referencedSubjects(s.prerequisites).includes(props.code))
    .map((s) => s.code)
    .sort(),
)
const clashes = computed(() => {
  const own = props.subject && props.subject.nonAllowed !== 'unknown' ? props.subject.nonAllowed : []
  const listed = Object.values(props.subjects)
    .filter((s) => s.nonAllowed !== 'unknown' && s.nonAllowed.includes(props.code))
    .map((s) => s.code)
  return [...new Set([...own, ...listed])].sort()
})
const haveSet = computed(() => new Set(props.have))

// The subjects it names, with titles to tap through; and the whole way back to first year,
// folded away, so a third-year subject doesn't need opening one prerequisite at a time.
const needs = computed(() => (props.subject ? simplifyFor(props.subject.prerequisites, props.course) : 'unknown'))
const needCodes = computed(() => referencedSubjects(needs.value))
const doneSet = computed(() => new Set(props.done ?? []))
const status = (c: string) => (doneSet.value.has(c) ? 'done' : haveSet.value.has(c) ? 'planned' : '')
// "COMP20003 or COMP20007": if one is only planned, the other can take its place in one tap.
const swapFrom = (c: string) => {
  if (haveSet.value.has(c) || !props.subjects[c]) return null
  for (const group of alternativeGroups(needs.value)) {
    if (!group.includes(c)) continue
    const planned = group.find((x) => x !== c && status(x) === 'planned')
    if (planned) return planned
  }
  return null
}
const route = computed(() => prerequisiteRoute(props.code, props.subjects, props.course, haveSet.value))
const routeMissing = computed(() => route.value.filter((c) => !haveSet.value.has(c)).length)
const routeByLevel = computed(() => {
  const groups = new Map<number, string[]>()
  for (const c of route.value) {
    const level = props.subjects[c]?.level ?? 0
    groups.set(level, [...(groups.get(level) ?? []), c])
  }
  return [...groups.entries()]
})

// Conditions we can't check (a VCE score, a test): the student can say they meet them.
const { profile, setConfirmed } = useProfile()
const hasManual = computed(() => /"(?:manual|placement|permission|school|average|wam)"/.test(JSON.stringify(props.subject?.prerequisites ?? '')))
const confirmed = computed(() => profile.value.confirmed?.includes(props.code) ?? false)

// Clicking the dimmed backdrop (the dialog element itself) closes it.
function onClick(event: MouseEvent): void {
  if (event.target === dialog.value) dialog.value?.close()
}
</script>

<template>
  <dialog ref="dialog" class="peek" :aria-label="code" @close="emit('close')" @click="onClick">
    <div class="peek-body">
      <header class="peek-head">
        <div class="peek-head-main">
          <p class="peek-code-row">
            <span class="code peek-code">{{ code }}</span>
            <a class="peek-hb" :href="handbookUrl(code)" target="_blank" rel="noopener"><BookOpen :size="14" aria-hidden="true" /> Handbook</a>
          </p>
          <h2 class="peek-title">{{ local || subject?.title || t('plan.notInDataset') }}</h2>
          <p v-if="local" class="peek-title-en">{{ subject?.title }}</p>
          <p v-if="subject" class="peek-facts">
            <span class="chip">{{ t('subject.level', { level: subject.level }) }}</span>
            <span class="chip">{{ t('subject.points', { points: subject.points }) }}</span>
            <span v-if="category" class="chip">{{ category }}</span>
            <span class="chip">
              <CalendarRange :size="14" aria-hidden="true" />
              <template v-if="subject.offerings === 'unknown'">{{ t('subject.runsUnknown') }}</template>
              <template v-else-if="periods.length === 0">{{ t('subject.notRunning') }}</template>
              <template v-else-if="subject.yearLong">{{ t('plan.yearLongRuns') }}</template>
              <template v-else>{{ periods.map((p) => t(`period.${p}`)).join(' · ') }}</template>
            </span>
          </p>
        </div>
        <button class="peek-close" type="button" :aria-label="t('subject.close')" @click="dialog?.close()">
          <X :size="18" aria-hidden="true" />
        </button>
      </header>

      <!-- The subject's place in the plan (needs → this → unlocks), from the planner. -->
      <slot />

      <template v-if="subject">
        <SubjectAbout v-if="detailReady && detailed" class="peek-section" :subject="detailed" />

        <MajorRoles class="peek-section" :code="code" />

        <section class="peek-section" :class="{ 'peek-inline': needCodes.length === 0 && route.length === 0 && !hasManual }">
          <h3 class="peek-label">{{ t('subject.needs') }}</h3>
          <p v-if="subject.prerequisites === 'none'">{{ t('subject.needsNone') }}</p>
          <p v-else-if="subject.prerequisites === 'unknown'" class="muted">{{ t('subject.notRecorded') }}</p>
          <template v-else>
            <p>{{ describeReq(t, subject.prerequisites, course) }}</p>
            <ul v-if="needCodes.length" class="peek-list">
              <li v-for="c in needCodes" :key="c">
                <a v-if="!subjects[c]" class="peek-row" :href="handbookUrl(c)" target="_blank" rel="noopener">
                  <span class="code">{{ c }}</span>
                  <span class="peek-row-title muted">{{ t('subject.notYetAdded') }}</span>
                </a>
                <div v-else class="peek-row-wrap">
                  <button type="button" class="peek-row" @click="emit('open', c)">
                    <span class="code">{{ c }}</span>
                    <span class="peek-row-title">{{ subjects[c]?.title }}</span>
                    <span v-if="status(c)" class="peek-have">{{ t(status(c) === 'done' ? 'plan.doneIt' : 'plan.plannedIt') }}</span>
                  </button>
                  <button v-if="swapFrom(c)" type="button" class="button button-quiet peek-swap" @click="emit('swap', swapFrom(c)!, c)">
                    {{ t('plan.swapTo', { code: swapFrom(c)! }) }}
                  </button>
                </div>
              </li>
            </ul>
            <details v-if="route.length > needCodes.length" class="peek-route">
              <summary>{{ t('subject.routeTitle', { n: route.length, missing: routeMissing }) }}</summary>
              <template v-for="[level, codes] in routeByLevel" :key="level">
                <h4 class="peek-route-level">{{ level ? t('subject.level', { level }) : t('plan.notInDataset') }}</h4>
                <ul class="peek-list">
                  <li v-for="c in codes" :key="c">
                    <a v-if="!subjects[c]" class="peek-row" :href="handbookUrl(c)" target="_blank" rel="noopener">
                      <span class="code">{{ c }}</span>
                      <span class="peek-row-title muted">{{ t('subject.notYetAdded') }}</span>
                    </a>
                    <button v-else type="button" class="peek-row" @click="emit('open', c)">
                      <span class="code">{{ c }}</span>
                      <span class="peek-row-title">{{ subjects[c]?.title }}</span>
                      <span v-if="status(c)" class="peek-have">{{ t(status(c) === 'done' ? 'plan.doneIt' : 'plan.plannedIt') }}</span>
                    </button>
                  </li>
                </ul>
              </template>
            </details>
          </template>
          <label v-if="hasManual" class="peek-confirm">
            <input type="checkbox" :checked="confirmed" @change="setConfirmed(code, ($event.target as HTMLInputElement).checked)" />
            {{ t('plan.iMeetThisLong') }}
          </label>
        </section>

        <section v-if="leadsTo.length === 0" class="peek-section peek-inline">
          <h3 class="peek-label">{{ t('subject.unlocks') }}</h3>
          <p class="muted">{{ t('subject.unlocksNone') }}</p>
        </section>
        <section v-else class="peek-section">
          <h3 class="peek-label">{{ t('subject.unlocks') }}</h3>
          <p class="peek-codes">
            <button v-for="c in leadsTo" :key="c" type="button" class="chip code peek-code-chip" @click="emit('open', c)">
              {{ c }}<span v-if="status(c)" class="peek-have">{{ t(status(c) === 'done' ? 'plan.doneIt' : 'plan.plannedIt') }}</span>
            </button>
          </p>
        </section>

        <section v-if="clashes.length" class="peek-section">
          <h3 class="peek-label">{{ t('subject.blocks') }}</h3>
          <p class="peek-codes">
            <button
              v-for="c in clashes"
              :key="c"
              type="button"
              class="chip code peek-code-chip"
              :class="{ 'peek-clash': haveSet.has(c) }"
              @click="emit('open', c)"
            >
              {{ c }}<span v-if="status(c)" class="peek-have">{{ t(status(c) === 'done' ? 'plan.doneIt' : 'plan.plannedIt') }}</span>
            </button>
          </p>
        </section>

        <AssessmentPanel class="peek-section" :subject="subject" :year="year" />

        <section class="peek-section" :class="{ 'peek-inline': ratings.length === 0 }">
          <h3 class="peek-label">{{ t('subject.ratingsTitle') }}</h3>
          <p v-if="ratings.length === 0" class="muted">{{ t('subject.noRatings') }}</p>
          <template v-else>
            <p v-for="r in ratings" :key="r.key" class="peek-rating">
              <span>{{ t(r.key) }}</span><strong>{{ r.value }}/5</strong>
            </p>
            <p class="muted">{{ t('subject.reviews', { n: subject.signals?.reviews ?? 0 }) }}</p>
          </template>
        </section>

        <!-- Not passed yet: what a mark in it would do to the WAM. -->
        <WamWhatIf v-if="!doneSet.has(code)" class="peek-section" :code="code" />
      </template>

      <!-- Everything to do with it, at the foot of the window: change it in the plan, record it, read more. -->
      <footer class="peek-actions">
        <!-- Finished it: record it in My record, in this semester, with an optional mark. -->
        <form v-if="doneTerm" class="peek-done" @submit.prevent="markDone">
          <span class="peek-done-title">{{ t('plan.doneAsk', { term: doneTerm }) }}</span>
          <label v-if="!passFail">
            <span class="visually-hidden">{{ t('record.markFor', { code }) }}</span>
            <input v-model="doneMark" class="input peek-done-mark" type="number" min="0" max="100" :placeholder="t('record.markShort')" />
          </label>
          <button class="button button-accent peek-btn" type="submit"><CheckCheck :size="16" aria-hidden="true" /> {{ t('plan.doneButton') }}</button>
        </form>
        <div class="peek-buttons">
          <template v-if="planned">
            <button class="button button-quiet peek-btn" type="button" @click="act('swapIt')"><ArrowRightLeft :size="15" aria-hidden="true" /> {{ t('plan.swap') }}</button>
            <button class="button button-quiet peek-btn" type="button" @click="act('moveIt')"><CalendarRange :size="15" aria-hidden="true" /> {{ t('plan.move') }}</button>
            <button class="button button-quiet peek-btn peek-remove" type="button" @click="act('removeIt')"><X :size="15" aria-hidden="true" /> {{ t('plan.removeShort') }}</button>
          </template>
          <a class="button button-quiet peek-btn peek-full" :href="link(`subject/${code}`)">
            {{ t('subject.fullPage') }} <ExternalLink :size="15" aria-hidden="true" />
          </a>
        </div>
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.peek-row-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.peek-row-wrap .peek-row {
  flex: 1;
  min-width: 0;
}

.peek-swap {
  flex: none;
  min-height: 32px;
  padding: 0 12px;
  font-size: 0.8125rem;
}

.peek {
  width: min(560px, calc(100vw - 32px));
  max-height: min(86vh, 760px);
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-2);
}

.peek::backdrop {
  background: rgb(16 16 20 / 40%);
}

.peek-body {
  display: grid;
  gap: var(--space-6);
  padding: var(--space-5) var(--space-5) 0;
}

.peek-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.peek-head-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.peek-code-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin: 0;
}

.peek-code {
  font-size: 0.875rem;
  font-weight: 650;
  color: var(--accent);
}

.peek-hb {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.peek-title {
  font-size: 1.35rem;
  line-height: 1.3;
}

.peek-title-en {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.peek-close {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--glass-edge);
  background: var(--glass-fill);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  color: var(--ink-soft);
  cursor: pointer;
}

.peek-facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 8px 0 0;
}

/* Sections are set apart by space, not rules; each opens with the same small heading. */
.peek-section {
  display: grid;
  gap: var(--space-2);
}

.peek-label,
.peek-section :deep(:is(.roles-title, .assess-title, .about-label)) {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 650;
  letter-spacing: 0.01em;
  color: var(--ink-soft);
}

.peek-section :deep(.assess-tags) {
  padding-top: var(--space-2);
}

/* Nothing to show: heading and answer share one quiet line. */
.peek-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-1) var(--space-3);
}

.peek-inline + .peek-inline {
  margin-top: calc(var(--space-3) - var(--space-6));
}

.peek-rating {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.9375rem;
}

.peek-codes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.peek-list {
  display: grid;
  gap: var(--space-2);
  margin: var(--space-1) 0 0;
  padding: 0;
  list-style: none;
}

.peek-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius-sm);
  background: var(--glass-fill);
  box-shadow: var(--glass-shadow);
  font: inherit;
  font-size: 0.875rem;
  text-align: left;
  color: var(--ink);
  cursor: pointer;
}

.peek-row {
  text-decoration: none;
}

.peek-row:hover {
  background: var(--glass-fill-hover);
}

.peek-row .code {
  flex: none;
  font-weight: 600;
  color: var(--accent);
}

.peek-row-title {
  flex: 1;
  min-width: 0;
}

.peek-route {
  margin-top: var(--space-2);
}

.peek-route summary {
  font-weight: 600;
  cursor: pointer;
}

.peek-route-level {
  margin: var(--space-3) 0 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink-faint);
}

.peek-code-chip {
  cursor: pointer;
  color: var(--accent);
}

.peek-code-chip:hover {
  border-color: var(--accent);
}

.peek-have {
  margin-left: 6px;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.peek-clash {
  border-color: var(--stop);
  color: var(--stop);
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
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

/* Always in reach at the foot of the window, however long the subject's details run. */
.peek-actions {
  position: sticky;
  bottom: 0;
  display: grid;
  gap: var(--space-3);
  margin: 0 calc(-1 * var(--space-5));
  padding: var(--space-4) var(--space-5) var(--space-5);
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.peek-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.peek-btn {
  min-height: 38px;
  padding: 0 14px;
  font-size: 0.875rem;
}

.peek-remove {
  color: var(--bad);
}

.peek-full {
  margin-left: auto;
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

@media (max-width: 480px) {
  .peek-full {
    margin-left: 0;
  }
}
</style>

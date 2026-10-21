<script setup lang="ts">
import { link } from '@/composables/useView'
import { handbookUrl } from '@/utils/links'
import { computed, onMounted, shallowRef, toRef, useTemplateRef } from 'vue'
import { CalendarRange, CheckCheck, ExternalLink, X } from 'lucide-vue-next'
import { alternativeGroups, periodsFor, prerequisiteRoute, referencedSubjects, simplifyFor, type Subject } from '@/engine'
import AssessmentPanel from '@/components/subject/AssessmentPanel.vue'
import MajorRoles from '@/components/subject/MajorRoles.vue'
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
}>()
const emit = defineEmits<{ close: []; open: [code: string]; swap: [from: string, to: string]; markDone: [mark: number | undefined] }>()
// The plan's subjects carry only the English gist; load the full about (every language, outcomes).
const { subject: detailed, ready: detailReady } = useSubjectDetail(toRef(props, 'code'))
const doneMark = shallowRef<number | ''>('')
function markDone(): void {
  const m = doneMark.value === '' ? undefined : Math.max(0, Math.min(100, Number(doneMark.value)))
  emit('markDone', m)
  dialog.value?.close()
}
const { t } = useI18n()
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
        <div>
          <p class="code peek-code">{{ code }}</p>
          <h2 class="peek-title">{{ subject?.title ?? t('plan.notInDataset') }}</h2>
        </div>
        <button class="peek-close" type="button" :aria-label="t('subject.close')" @click="dialog?.close()">
          <X :size="18" aria-hidden="true" />
        </button>
      </header>

      <!-- Finished it: record it in My record, in this semester, with an optional mark. -->
      <form v-if="doneTerm" class="peek-done" @submit.prevent="markDone">
        <p class="peek-done-title">{{ t('plan.doneAsk', { term: doneTerm }) }}</p>
        <div class="peek-done-row">
          <label v-if="!passFail">
            <span class="visually-hidden">{{ t('record.markFor', { code }) }}</span>
            <input v-model="doneMark" class="input peek-done-mark" type="number" min="0" max="100" :placeholder="t('record.markShort')" />
          </label>
          <button class="button button-accent" type="submit"><CheckCheck :size="16" aria-hidden="true" /> {{ t('plan.doneButton') }}</button>
        </div>
      </form>

      <template v-if="subject">
        <p class="peek-facts">
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

        <SubjectAbout v-if="detailReady && detailed" class="peek-section" :subject="detailed" />

        <MajorRoles class="peek-section" :code="code" />

        <section class="peek-section">
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

        <section class="peek-section">
          <h3 class="peek-label">{{ t('subject.unlocks') }}</h3>
          <p v-if="leadsTo.length === 0" class="muted">{{ t('subject.unlocksNone') }}</p>
          <p v-else class="peek-codes">
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

        <section class="peek-section">
          <h3 class="peek-label">{{ t('subject.ratingsTitle') }}</h3>
          <p v-if="ratings.length === 0" class="muted">{{ t('subject.noRatings') }}</p>
          <template v-else>
            <p v-for="r in ratings" :key="r.key" class="peek-rating">
              <span>{{ t(r.key) }}</span><strong>{{ r.value }}/5</strong>
            </p>
            <p class="muted">{{ t('subject.reviews', { n: subject.signals?.reviews ?? 0 }) }}</p>
          </template>
        </section>
      </template>

      <footer class="peek-actions">
        <a class="button button-accent" :href="link(`subject/${code}`)">
          {{ t('subject.fullPage') }} <ExternalLink :size="15" aria-hidden="true" />
        </a>
        <button class="button button-quiet" type="button" @click="dialog?.close()">{{ t('subject.close') }}</button>
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
  gap: 16px;
  padding: 22px;
}

.peek-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.peek-code {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--accent);
}

.peek-title {
  margin-top: 2px;
  font-size: 1.35rem;
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
  gap: 6px;
}

.peek-section {
  display: grid;
  gap: 6px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.peek-label {
  font-size: 0.9375rem;
  font-weight: 650;
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
  gap: 6px;
}

.peek-list {
  display: grid;
  gap: 4px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.peek-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
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
  margin-top: 10px;
}

.peek-route summary {
  font-weight: 600;
  cursor: pointer;
}

.peek-route-level {
  margin: 10px 0 0;
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

.peek-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.peek-done {
  display: grid;
  gap: 8px;
  margin: 4px 0 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--good-soft);
}

.peek-done-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.peek-done-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.peek-done-mark {
  width: 96px;
}
</style>

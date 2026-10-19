<script setup lang="ts">
import { link } from '@/composables/useView'
import { computed, nextTick, shallowRef } from 'vue'
import { ArrowLeft, CalendarRange, ChartNoAxesColumn, Check, ExternalLink, Plus, Star } from 'lucide-vue-next'
import RatingForm from '@/components/rating/RatingForm.vue'
import AssessmentPanel from '@/components/subject/AssessmentPanel.vue'
import MajorRoles from '@/components/subject/MajorRoles.vue'
import SubjectAbout from '@/components/subject/SubjectAbout.vue'
import DiscussionSummary from '@/components/subject/DiscussionSummary.vue'
import SubjectFaq from '@/components/subject/SubjectFaq.vue'
import { PASS_MARK, RANK_SLUGS, isFail, listPlace, periodsFor, prerequisiteRoute, referencedSubjects, simplifyFor, termKey, type Period } from '@/engine'
import SubjectLinks from '@/components/majors/SubjectLinks.vue'
import { useDataset, useSubjectDetail } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useRated } from '@/composables/useRated'
import { useI18n } from '@/i18n'
import { categoryLabel, describeReq, requirementList, termLabel } from '@/i18n/format'
import { discussionLinks } from '@/utils/links'
import { localTitle } from '@/i18n/localized'
import { subjectGist } from '@/i18n/gist'
import { termsBetween } from '@/utils/pastTerms'

const props = defineProps<{ code: string }>()
const { name, data, course: listCourse } = useDataset()
const plan = usePlan()
const { profile } = useProfile()
const { rated, markRated } = useRated()
const { t, locale } = useI18n()

const code = computed(() => props.code.toUpperCase())
// With its long text (about, discussion) once that has loaded; the rest shows straight away.
const { subject, ready: detailReady } = useSubjectDetail(code)
const year = computed(() => plan.terms.value[0]?.year ?? new Date().getFullYear())
// Near the top of the easy or hard list for the student's degree (or the default one): ranked
// once per degree and year, then a lookup.
const onList = computed(() => {
  const place = listPlace(data.value.subjects, code.value, listCourse.value, year.value)
  return place && { ...place, href: link(`subjects/${RANK_SLUGS[place.direction]}/`) + `?course=${encodeURIComponent(listCourse.value)}` }
})
const periods = computed(() => (subject.value ? periodsFor(subject.value, year.value) : []))
const offeringsKnown = computed(() => subject.value?.offerings !== 'unknown')
const gone = computed(() => subject.value?.discontinuedFrom !== undefined && year.value >= subject.value.discontinuedFrom)
// What it leads to, the ones in the student's plan first, then by level and code.
const unlocks = computed(() =>
  Object.values(data.value.subjects)
    .filter((s) => referencedSubjects(s.prerequisites).includes(code.value))
    .sort((a, b) => Number(have.value.has(b.code)) - Number(have.value.has(a.code)) || a.level - b.level || a.code.localeCompare(b.code))
    .map((s) => s.code),
)
// The subjects to link: only those in the requirement as this course's students meet it.
const needs = computed(() => (subject.value ? simplifyFor(subject.value.prerequisites, plan.setup.value.course) : 'unknown'))
const needCodes = computed(() => referencedSubjects(needs.value))
const needsList = computed(() => requirementList(t.value, needs.value))
// Every subject needed before this one, back to first year (folded away under the direct ones).
const have = computed(() => new Set([...plan.plannedCodes.value, ...plan.plan.value.completed]))
const route = computed(() => prerequisiteRoute(code.value, data.value.subjects, plan.setup.value.course, have.value))
const routeMissing = computed(() => route.value.filter((c) => !have.value.has(c)).length)
const coreq = computed(() => {
  const co = subject.value?.corequisites
  return co && co !== 'none' && co !== 'unknown' ? describeReq(t.value, co, plan.setup.value.course) : ''
})
const blocks = computed(() => (subject.value && subject.value.nonAllowed !== 'unknown' ? subject.value.nonAllowed : []))
const closedForYou = computed(() => data.value.courses.some((c) => c.code === plan.setup.value.course && c.closed.includes(subject.value?.code ?? '')))
const category = computed(() => (closedForYou.value ? t.value('browse.closedForYou') : categoryLabel(t.value, subject.value?.categories[plan.setup.value.course])))
const inPlan = computed(() => plan.plannedCodes.value.includes(code.value))
const taken = computed(() => profile.value.results.some((r) => r.code === code.value))
// Already passed (from My page): nothing to add; a fail can be planned again as a retake.
const passed = computed(() => profile.value.results.find((r) => r.code === code.value && !isFail(r)))
const rating = shallowRef(false)
const thanks = shallowRef(false)

function openRating(): void {
  rating.value = true
  // The form opens in the ratings panel further down; take the student there.
  void nextTick(() => document.getElementById('ratings')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function onRated(sent: boolean): void {
  rating.value = false
  if (!sent) return
  markRated(code.value)
  thanks.value = true
}

/**
 * Where "Add to my plan" can put it: every term it runs in from the start of study to the plan's
 * last semester (at least three years on), summer and winter included. The student picks; the
 * first planned semester it runs in is the default.
 */
const termChoices = computed(() => {
  const s = subject.value
  if (!s) return []
  const start = { year: plan.setup.value.startYear, period: plan.setup.value.startPeriod }
  const last = plan.terms.value.at(-1)
  const floor = { year: start.year + 2, period: 'semester-2' as Period }
  const end = last && termKey(last.year, last.period) > termKey(floor.year, floor.period) ? last : floor
  return termsBetween(start, end).filter((x) => periodsFor(s, x.year).includes(x.period))
})
const chosenTerm = shallowRef('')
const target = computed(() => {
  const all = termChoices.value
  if (!all.length) return null
  const picked = all.find((x) => `${x.year}|${x.period}` === chosenTerm.value)
  if (picked) return picked
  const firstPlanned = plan.terms.value[0]
  return all.find((x) => !firstPlanned || termKey(x.year, x.period) >= termKey(firstPlanned.year, firstPlanned.period)) ?? all[0]!
})

const addedAt = shallowRef<{ year: number; period: Period } | null>(null)
// Worked out when shown, so it follows a language switch.
const added = computed(() => (addedAt.value ? termLabel(t.value, addedAt.value) : ''))
function addToPlan(): void {
  const where = target.value
  if (!where) return
  plan.addSubjectAt(where.year, where.period, code.value)
  addedAt.value = { year: where.year, period: where.period }
}

const meters = computed(() => {
  const s = subject.value?.signals
  if (!s) return []
  const meters = [
    { key: 'rating.overall', value: s.overall, low: 'rating.teachLow', high: 'rating.teachHigh' },
    { key: 'rating.difficulty', value: s.difficulty, low: 'rating.diffLow', high: 'rating.diffHigh' },
    { key: 'rating.examDifficulty', value: s.examDifficulty, low: 'rating.diffLow', high: 'rating.diffHigh' },
    { key: 'rating.workload', value: s.workload, low: 'rating.loadLow', high: 'rating.loadHigh' },
    { key: 'rating.generosity', value: s.grading, low: 'rating.genLow', high: 'rating.genHigh' },
    { key: 'rating.usefulness', value: s.usefulness, low: 'rating.useLow', high: 'rating.useHigh' },
    { key: 'rating.interest', value: s.interest, low: 'rating.intLow', high: 'rating.intHigh' },
    { key: 'rating.teaching', value: s.teaching, low: 'rating.teachLow', high: 'rating.teachHigh' },
  ]
  // Optional questions only show once enough students answered them.
  return meters.filter((m): m is (typeof meters)[number] & { value: number } => m.value !== undefined)
})
const links = computed(() => (name.value === 'real' ? discussionLinks(code.value, locale.value) : []))
const gist = computed(() => (subject.value ? subjectGist(t.value, subject.value) : []))
</script>

<template>
  <div class="subject">
    <a class="back" :href="link('')"><ArrowLeft :size="16" aria-hidden="true" /> {{ t('subject.back') }}</a>

    <template v-if="subject">
      <header class="head">
        <p class="code head-code">{{ subject.code }}</p>
        <h1 class="page-title">
          {{ subject.title }}<span v-if="localTitle(subject, locale)" class="title-local" :lang="locale">{{ localTitle(subject, locale) }}</span>
        </h1>
        <div class="facts">
          <span class="chip">{{ t('subject.level', { level: subject.level }) }}</span>
          <span class="chip">{{ t('subject.points', { points: subject.points }) }}</span>
          <span v-if="category" class="chip">{{ category }}</span>
          <span class="chip chip-when">
            <CalendarRange :size="14" aria-hidden="true" />
            <template v-if="gone">{{ t('subject.discontinued', { year: subject.discontinuedFrom ?? '' }) }}</template>
            <template v-else-if="!offeringsKnown">{{ t('subject.runsUnknown') }}</template>
            <template v-else-if="periods.length === 0">{{ t('subject.notRunning') }}</template>
            <template v-else>{{ periods.map((p) => t(`period.${p}`)).join(' · ') }}</template>
          </span>
          <a v-if="onList" class="chip chip-list" :href="onList.href">
            <ChartNoAxesColumn :size="14" aria-hidden="true" />
            {{ t(`rank.onList.${onList.direction}`, { n: onList.place }) }}
          </a>
          <!-- What students ask first, in their words: exam share, class hours, group work. -->
          <span v-for="g in gist" :key="g" class="chip chip-gist">{{ g }}</span>
        </div>
        <p v-if="gone && subject.replacedBy.length" class="instead">
          {{ t('subject.insteadTake') }}
          <a v-for="c in subject.replacedBy" :key="c" class="chip code" :href="link(`subject/${c}`)">{{ c }}</a>
        </p>
        <div class="actions">
          <span v-if="passed" class="button button-quiet done-badge" role="status">
            <Check :size="18" aria-hidden="true" />
            {{ passed.mark === undefined ? t('subject.passed') : t('subject.passedMark', { mark: passed.mark }) }}
          </span>
          <a v-else-if="!plan.setupChosen.value" class="button button-accent" :href="link('plan')">
            <Plus :size="18" aria-hidden="true" /> {{ t('subject.chooseDegreeFirst') }}
          </a>
          <span v-else-if="inPlan" class="button button-quiet done-badge" role="status">
            <Check :size="18" aria-hidden="true" /> {{ t('subject.inPlan') }}
          </span>
          <template v-else-if="target">
            <!-- The student picks the semester; it lists only terms the subject runs in. -->
            <label class="add-term">
              <span class="visually-hidden">{{ t('subject.addWhen') }}</span>
              <select class="select-glass" :value="`${target.year}|${target.period}`" @change="chosenTerm = ($event.target as HTMLSelectElement).value">
                <option v-for="x in termChoices" :key="`${x.year}|${x.period}`" :value="`${x.year}|${x.period}`">{{ termLabel(t, x) }}</option>
              </select>
            </label>
            <button class="button button-accent" type="button" @click="addToPlan">
              <Plus :size="18" aria-hidden="true" /> {{ t('subject.addToPlan') }}
            </button>
          </template>
          <!-- Taken it and not rated yet: the way to rate sits up here, not only at the bottom. -->
          <button v-if="taken && !rated.has(subject.code) && !thanks && !rating" class="button button-quiet" type="button" @click="openRating">
            <Star :size="18" aria-hidden="true" /> {{ t('rating.rate') }}
          </button>
          <a v-if="subject.handbook" class="button button-quiet" :href="subject.handbook" target="_blank" rel="noopener">
            {{ t('subject.handbook') }} <ExternalLink :size="15" aria-hidden="true" />
          </a>
        </div>
        <p v-if="added" class="added" role="status">{{ t('subject.added', { term: added }) }}</p>
      </header>

      <div class="grid">
        <SubjectAbout v-if="detailReady" class="panel surface panel-wide" :subject="subject" />

        <AssessmentPanel class="panel surface panel-wide" :subject="subject" :year="year" />

        <section class="panel surface">
          <h2 class="panel-title">{{ t('subject.needs') }}</h2>
          <p v-if="needs === 'none'" class="panel-text">{{ t('subject.needsNone') }}</p>
          <p v-else-if="needs === 'unknown'" class="panel-text muted">{{ t('subject.notRecorded') }}</p>
          <template v-else-if="needsList">
            <p v-if="needsList.items.length > 1 || needsList.manual.length" class="panel-text">
              {{ needsList.kind === 'any' ? t('expr.anyOf') : t('expr.allOf') }}
            </p>
            <ol v-if="needsList.items.length > 1" class="needs-list">
              <li v-for="(x, i) in needsList.items" :key="i">{{ x }}</li>
            </ol>
            <p v-else-if="needsList.items.length === 1" class="panel-text">{{ needsList.items[0] }}</p>
            <details v-if="needsList.manual.length" class="needs-manual">
              <summary>{{ t('expr.manualTitle', { n: needsList.manual.length }) }}</summary>
              <p v-for="(m, i) in needsList.manual" :key="i">“{{ m }}”</p>
            </details>
          </template>
          <SubjectLinks v-if="needCodes.length" class="panel-links" :codes="needCodes" :year="year" />
          <details v-if="route.length > needCodes.length" class="route">
            <summary>{{ t('subject.routeTitle', { n: route.length, missing: routeMissing }) }}</summary>
            <SubjectLinks :codes="route" :year="year" />
          </details>
          <template v-if="subject.recommended.length">
            <h3 class="panel-subtitle">{{ t('subject.recommendedFirst') }}</h3>
            <SubjectLinks class="panel-links" :codes="subject.recommended" :year="year" :limit="3" />
          </template>
          <template v-if="coreq">
            <h3 class="panel-subtitle">{{ t('subject.coreqTitle') }}</h3>
            <p class="panel-text">{{ coreq }}</p>
          </template>
        </section>

        <section class="panel surface">
          <h2 class="panel-title">{{ t('subject.unlocks') }}</h2>
          <p v-if="unlocks.length === 0" class="panel-text muted">{{ t('subject.unlocksNone') }}</p>
          <SubjectLinks v-else class="panel-links" :codes="unlocks" :year="year" :limit="4" />
          <template v-if="blocks.length">
            <h2 class="panel-title panel-title-gap">{{ t('subject.blocks') }}</h2>
            <SubjectLinks class="panel-links" :codes="blocks" :year="year" />
          </template>
        </section>

        <DiscussionSummary v-if="detailReady && subject.discussions?.length" class="panel surface panel-wide" :discussions="subject.discussions" />

        <section id="ratings" class="panel surface panel-wide">
          <h2 class="panel-title">{{ t('subject.ratingsTitle') }}</h2>
          <template v-if="meters.length || subject.signals?.hours || subject.signals?.recommend !== undefined">
            <p class="panel-text muted">{{ t('subject.reviews', { n: subject.signals?.reviews ?? 0 }) }}</p>
            <p v-if="subject.signals?.hours" class="panel-text">{{ t('subject.hoursWeek', { n: subject.signals.hours }) }}</p>
            <p v-if="subject.signals?.recommend !== undefined" class="panel-text">
              {{ t('subject.recommendShare', { pct: Math.round(subject.signals.recommend * 100) }) }}
            </p>
            <div v-if="meters.length" class="meters">
              <div v-for="m in meters" :key="m.key" class="meter">
                <span class="meter-label">{{ t(m.key) }}</span>
                <span class="meter-track" aria-hidden="true"><span class="meter-fill" :style="{ width: `${(m.value / 5) * 100}%` }" /></span>
                <span class="meter-value">{{ m.value }}/5</span>
                <span class="meter-ends">{{ t(m.low) }} · {{ t(m.high) }}</span>
              </div>
            </div>
          </template>
          <p v-else class="panel-text muted">{{ t('subject.noRatings') }}</p>
          <p v-if="thanks" class="added" role="status">{{ t('rating.sent') }}</p>
          <p v-else-if="rated.has(subject.code)" class="panel-text muted">{{ t('rating.rated') }}</p>
          <button
            v-else-if="!rating"
            class="button button-quiet rate-ask"
            :class="{ 'rate-ask-strong': taken }"
            type="button"
            @click="rating = true"
          >
            <Star :size="16" aria-hidden="true" /> {{ t('subject.rateAsk') }}
          </button>
          <RatingForm v-if="rating" :code="subject.code" @done="onRated" />
        </section>

        <MajorRoles class="panel surface panel-wide" :code="code" />

        <SubjectFaq class="panel surface panel-wide" :subject="subject" :year="year" :course="plan.setup.value.course" :unlocks="unlocks" />

        <section v-if="links.length" class="panel surface panel-wide">
          <h2 class="panel-title">{{ t('subject.discuss') }}</h2>
          <!-- The two most used in the reader's language first; the rest one tap away. -->
          <p class="links-inline links-grid">
            <a v-for="l in links.slice(0, 2)" :key="l.label" class="chip" :href="l.href" target="_blank" rel="noopener" :lang="l.lang">
              {{ l.label }} <ExternalLink :size="13" aria-hidden="true" />
            </a>
          </p>
          <details v-if="links.length > 2" class="links-more">
            <summary>{{ t('subject.discussMore', { n: links.length - 2 }) }}</summary>
            <p class="links-inline links-grid">
              <a v-for="l in links.slice(2)" :key="l.label" class="chip" :href="l.href" target="_blank" rel="noopener" :lang="l.lang">
                {{ l.label }} <ExternalLink :size="13" aria-hidden="true" />
              </a>
            </p>
          </details>
        </section>
      </div>

      <p class="verified">
        {{ t('subject.source', { year: subject.sourceYear }) }} ·
        {{ subject.verifiedOn ? t('subject.verified', { date: subject.verifiedOn }) : t('subject.unverified') }}
        · <a :href="link(`feedback?topic=data&subject=${subject.code}`)">{{ t('suggest.report') }}</a>
      </p>
    </template>

    <section v-else class="missing surface">
      <h1 class="page-title">{{ code ? t('subject.notFound', { code }) : t('subject.searchFirst') }}</h1>
      <p class="page-lede">{{ t('subject.notFoundText') }}</p>
      <a class="button button-accent" :href="link('contribute')">{{ t('subject.addIt') }}</a>
    </section>

  </div>
</template>

<style scoped>
.title-local {
  display: block;
  margin-top: 4px;
  font-size: 0.6em;
  font-weight: 500;
  color: var(--ink-soft);
}

.needs-list {
  margin: 4px 0 0;
  padding-left: 20px;
  display: grid;
  gap: 4px;
  font-size: 0.9375rem;
}

.needs-manual {
  margin-top: 6px;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.needs-manual summary {
  cursor: pointer;
}

.done-badge {
  color: var(--good);
  cursor: default;
}

.panel-links {
  margin-top: 10px;
}

.route {
  margin-top: 12px;
}

.route summary {
  font-weight: 600;
  cursor: pointer;
}

.subject {
  display: grid;
  gap: 24px;
  padding-top: 28px;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--ink-soft);
  text-decoration: none;
}

.back:hover {
  color: var(--ink);
}

.head {
  display: grid;
  gap: 12px;
}

.head-code {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--accent);
}

.facts,
.actions,
.links-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.actions {
  margin-top: 6px;
}

.chip-list {
  gap: 6px;
  color: var(--accent);
  background: var(--accent-soft);
  text-decoration: none;
}

.chip-list:hover {
  text-decoration: underline;
}

.chip-list:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.chip-when {
  color: var(--ink);
}

.links-inline .chip {
  text-decoration: none;
  color: var(--ink);
}

.links-inline a.chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.added {
  color: var(--good);
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;
  gap: 16px;
}

.panel {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 22px;
}

.panel-wide {
  grid-column: 1 / -1;
}

.panel-title {
  font-size: 0.9375rem;
  font-weight: 650;
}

.panel-title-gap {
  margin-top: 10px;
}

.rate-ask {
  justify-self: start;
}

.rate-ask-strong {
  border-color: var(--accent);
  color: var(--accent);
}

.panel-text {
  font-size: 1.05rem;
}

.muted {
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.meters {
  display: grid;
  gap: 14px;
}

.meter {
  display: grid;
  grid-template-columns: 180px 1fr 48px;
  align-items: center;
  gap: 4px 14px;
}

.meter-track {
  height: 10px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}

.meter-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}

.meter-value {
  font-family: var(--font-code);
  font-weight: 500;
}

.meter-ends {
  grid-column: 2;
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.verified {
  font-size: 0.875rem;
  color: var(--ink-faint);
}

.missing {
  display: grid;
  justify-items: start;
  gap: 14px;
  padding: 32px;
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .meter {
    grid-template-columns: 1fr 44px;
  }

  .meter-track {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .meter-ends {
    grid-column: 1 / -1;
  }

  /* Outside links as a two-column list of full-height rows, not a wrapping cloud of small chips. */
  .links-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .links-grid .chip {
    justify-content: space-between;
    min-height: 44px;
  }
}

.instead {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 0.9375rem;
  color: var(--bad);
}

.panel-subtitle {
  margin-top: 14px;
  font-size: 0.875rem;
  font-weight: 650;
}
.chip-gist {
  font-weight: 600;
  color: var(--ink);
}

.links-more {
  margin-top: 10px;
}

.links-more summary {
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.links-more .links-inline {
  margin-top: 8px;
}
</style>

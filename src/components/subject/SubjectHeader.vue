<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { ArrowLeft, BookOpen, ChartNoAxesColumn, Check, Link2, MapPin, Plus, Share2, Star } from 'lucide-vue-next'
import { isFail, isQuotaSubject, knownNotRunning, listPlace, periodsFor, prereqStatus, simplifyFor, standingOf, RANK_SLUGS, type Period, type Subject } from '@/engine'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useRated } from '@/composables/useRated'
import { useI18n } from '@/i18n'
import { categoryLabel, categoryTag, termLabel } from '@/i18n/format'
import { localTitle } from '@/i18n/localized'
import { finalExamShare, prereqGist, subjectGist } from '@/i18n/gist'
import { addTermChoices, defaultAddTerm } from '@/utils/pastTerms'
import { useDataYear } from '@/composables/useDataYear'
import FactsYearNote from './FactsYearNote.vue'
import InfoTip from '@/components/InfoTip.vue'
import ShortlistToggle from '@/components/shortlist/ShortlistToggle.vue'

/**
 * The top of a subject's page, a glass hero: code and title, what the student can do with it
 * (add it to the plan, see it there, save it, read the Handbook, share, rate), then the facts
 * checked first as a row (level, points, when it runs, final exam, prerequisites) and the
 * rest as chips. The data is the hero; there's no illustration.
 */
const props = defineProps<{ subject: Subject; year: number; rateHidden: boolean }>()
const emit = defineEmits<{ rate: [] }>()

const { data, course: listCourse } = useDataset()
const plan = usePlan()
const { profile } = useProfile()
const { rated } = useRated()
const { t, locale } = useI18n()

const code = computed(() => props.subject.code)
const local = computed(() => localTitle(props.subject, locale.value))
const periods = computed(() => periodsFor(props.subject, props.year))
// The Handbook year the facts come from; a line says so when a newer one is out but not entered yet.
const { facts, handbookFor } = useDataYear()
const factsFrom = computed(() => facts(props.subject, props.year))
const gone = computed(() => props.subject.discontinuedFrom !== undefined && props.year >= props.subject.discontinuedFrom)
const closedForYou = computed(() => data.value.courses.some((c) => c.code === plan.setup.value.course && c.closed.includes(code.value)))
const category = computed(() => (closedForYou.value ? t.value('browse.closedForYou') : categoryTag(t.value, props.subject.categories[plan.setup.value.course])))
const runs = computed(() => {
  if (gone.value) return t.value('subject.discontinued', { year: props.subject.discontinuedFrom ?? '' })
  if (props.subject.offerings === 'unknown') return t.value('subject.runsUnknown')
  // "Not running" only when that year's data says so; a year not entered yet is just unknown.
  if (periods.value.length === 0) return knownNotRunning(props.subject, props.year) ? t.value('subject.notRunning') : t.value('subject.runsUnknown')
  if (props.subject.yearLong) return t.value('plan.yearLongRuns')
  return periods.value.map((p) => t.value(`period.${p}`)).join(' · ')
})
// Near the top of the easy or hard list for the student's degree (or the default one).
const onList = computed(() => {
  const place = listPlace(data.value.subjects, code.value, listCourse.value, props.year)
  return place && { ...place, href: link(`subjects/${RANK_SLUGS[place.direction]}/`) + `?course=${encodeURIComponent(listCourse.value)}` }
})
// What students ask first, in their words: class hours, group work (the exam share has its own fact).
const quota = computed(() => isQuotaSubject(props.subject))
const gist = computed(() => subjectGist(t.value, props.subject, { exam: false }))
const exam = computed(() => {
  const n = finalExamShare(props.subject)
  return n === null ? t.value('subject.factUnknown') : n === 0 ? t.value('subject.factNone') : `${n}%`
})

// Prerequisites in a word or two; the full rule is under "Where it fits" (#route), which it links to.
const needs = computed(() => simplifyFor(props.subject.prerequisites, plan.setup.value.course))
const prereq = computed(() => prereqGist(t.value, needs.value))
// Met by what the student has done or planned (or a condition they said they meet), checked as
// suggestions and Find subjects check it: said only when it's certain.
const prereqMet = computed(() => {
  const n = needs.value
  if (n === 'none' || n === 'unknown') return false
  const standing = standingOf(profile.value, data.value, plan.plannedCodes.value)
  if (standing.completed.size === 0 && standing.confirmed.length === 0) return false
  return prereqStatus(props.subject, standing, { subjects: data.value.subjects, course: plan.setup.value.course }).status === 'ok'
})

const taken = computed(() => profile.value.results.some((r) => r.code === code.value))
const passed = computed(() => profile.value.results.find((r) => r.code === code.value && !isFail(r)))
const plannedAt = computed(() => plan.terms.value.find((x) => x.subjects.includes(code.value)))

// Where "Add to my plan" can put it: any semester of the plan, past ones too; terms it doesn't run in are flagged.
// A subject that stops running offers only the years before it stops; none left, no add button.
const termChoices = computed(() =>
  addTermChoices(props.subject, { year: plan.setup.value.startYear, period: plan.setup.value.startPeriod }, plan.terms.value).filter(
    (x) => props.subject.discontinuedFrom === undefined || x.year < props.subject.discontinuedFrom,
  ),
)
const canAdd = computed(() => !gone.value || termChoices.value.some((x) => x.offered))
const chosenTerm = shallowRef('')
const target = computed(() => {
  const all = termChoices.value
  if (!all.length) return null
  const picked = all.find((x) => `${x.year}|${x.period}` === chosenTerm.value)
  if (picked) return picked
  // Never a term that has already started, unless the student picks one.
  return defaultAddTerm(all, plan.terms.value[0]) ?? all[0]!
})
const addedAt = shallowRef<{ year: number; period: Period } | null>(null)
function addToPlan(): void {
  const where = target.value
  if (!where) return
  plan.addSubjectAt(where.year, where.period, code.value)
  addedAt.value = { year: where.year, period: where.period }
}

const copied = shallowRef(false)
async function share(): Promise<void> {
  const url = location.href
  const title = `${code.value} ${local.value || props.subject.title}`
  try {
    if (navigator.share) await navigator.share({ title, url })
    else {
      await navigator.clipboard.writeText(url)
      copied.value = true
      setTimeout(() => (copied.value = false), 2400)
    }
  } catch {
    // Cancelled or blocked: nothing to say.
  }
}

// Once the actions scroll out of view, a slim glass bar keeps "add" and "save" in reach (phones:
// above the tab bar; wide screens: at the bottom, centred).
const actionsEl = useTemplateRef<HTMLElement>('actionsEl')
const actionsGone = shallowRef(false)
let io: IntersectionObserver | null = null
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !actionsEl.value) return
  io = new IntersectionObserver(([e]) => {
    actionsGone.value = !!e && !e.isIntersecting && e.boundingClientRect.bottom < 0
  })
  io.observe(actionsEl.value)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <header class="hero surface">
    <a class="hero-back" :href="link('')"><ArrowLeft :size="15" aria-hidden="true" />{{ t('subject.back') }}</a>

    <div class="hero-top">
      <div class="hero-name">
        <p class="code-row">
          <span class="code hero-code">{{ subject.code }}</span>
          <a v-if="onList" class="list-badge" :href="onList.href">
            <ChartNoAxesColumn :size="14" aria-hidden="true" />
            {{ t(`rank.onList.${onList.direction}`, { n: onList.place }) }}
          </a>
        </p>
        <h1 class="hero-title">{{ local || subject.title }}</h1>
        <p v-if="local" class="hero-title-en" lang="en">{{ subject.title }}</p>
      </div>

      <div ref="actionsEl" class="actions">
        <span v-if="passed" class="state state-good" role="status">
          <Check :size="18" aria-hidden="true" />
          {{ passed.mark === undefined ? t('subject.passed') : t('subject.passedMark', { mark: passed.mark }) }}
        </span>
        <a v-else-if="!plan.setupChosen.value && canAdd" class="button button-accent" :href="link(`plan?add=${subject.code}`)">
          <Plus :size="18" aria-hidden="true" /> {{ t('subject.addToPlan') }}
        </a>
        <span v-else-if="plannedAt" class="add">
          <span class="state state-good" role="status"><Check :size="18" aria-hidden="true" /> {{ t('subject.inPlanAt', { term: termLabel(t, plannedAt) }) }}</span>
          <a class="button button-quiet" :href="link('plan')">{{ t('subject.openPlanner') }}</a>
        </span>
        <div v-else-if="target && canAdd" class="add">
          <label>
            <span class="visually-hidden">{{ t('subject.addWhen') }}</span>
            <select class="select-glass" :value="`${target.year}|${target.period}`" @change="chosenTerm = ($event.target as HTMLSelectElement).value">
              <option v-for="x in termChoices" :key="`${x.year}|${x.period}`" :value="`${x.year}|${x.period}`">{{ x.offered ? termLabel(t, x) : t('subject.termNotOffered', { term: termLabel(t, x) }) }}</option>
            </select>
          </label>
          <button class="button button-accent" type="button" @click="addToPlan">
            <Plus :size="18" aria-hidden="true" /> {{ t('subject.addToPlan') }}
          </button>
        </div>
        <span class="actions-quiet">
          <ShortlistToggle :code="subject.code" />
          <button v-if="taken && !rated.has(subject.code) && !rateHidden" class="button button-quiet" type="button" @click="emit('rate')">
            <Star :size="17" aria-hidden="true" /> {{ t('rating.rate') }}
          </button>
          <a class="button button-quiet" :href="handbookFor(subject.code, year)" target="_blank" rel="noopener">
            <BookOpen :size="17" aria-hidden="true" /> {{ t('subject.handbook') }}
          </a>
          <button class="button button-quiet" type="button" @click="share">
            <component :is="copied ? Link2 : Share2" :size="17" aria-hidden="true" /> {{ copied ? t('subject.shareCopied') : t('subject.share') }}
          </button>
        </span>
        <p v-if="target && canAdd && !target.offered && !plannedAt && !passed && plan.setupChosen.value" class="added added-warn" role="status">{{ t('subject.addNotOffered', { year }) }}</p>
        <p v-if="addedAt" class="added" role="status">{{ t('subject.added', { term: termLabel(t, addedAt) }) }}</p>
      </div>
    </div>

    <!-- The facts checked first, each with its name; the rest as chips after them. -->
    <div class="facts-row">
      <dl class="keyfacts">
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
          <dd :class="{ 'kf-bad': gone }">{{ runs }}</dd>
        </div>
        <div class="kf">
          <dt>{{ t('subject.factExam') }}</dt>
          <dd class="kf-num">{{ exam }}</dd>
        </div>
        <div class="kf">
          <dt>{{ t('subject.factPrereq') }}</dt>
          <dd>
            <a class="kf-link" href="#route">{{ prereq }}</a>
            <span v-if="prereqMet" class="kf-met"><Check :size="14" aria-hidden="true" />{{ t('subject.prereqDone') }}</span>
          </dd>
        </div>
      </dl>

      <ul v-if="category || subject.campus || gist.length || quota" class="facts">
        <li v-if="category" class="chip chip-strong">{{ category }}</li>
        <li v-if="subject.campus" class="chip"><MapPin :size="14" aria-hidden="true" />{{ subject.campus }}</li>
        <li v-for="g in gist" :key="g" class="chip">{{ g }}</li>
        <li v-if="quota" class="chip chip-tip">{{ t('subject.quota') }}<InfoTip :text="t('subject.quotaTip')" /></li>
      </ul>
    </div>
    <FactsYearNote v-if="factsFrom.older && !gone" :year="factsFrom.year" />
    <p v-if="gone && subject.replacedBy.length" class="instead">
      {{ t('subject.insteadTake') }}
      <a v-for="c in subject.replacedBy" :key="c" class="chip code" :href="link(`subject/${c}`)">{{ c }}</a>
    </p>

    <Teleport to="body">
      <Transition name="dock">
        <div v-if="actionsGone" class="dock">
          <span class="dock-name"><span class="code dock-code">{{ subject.code }}</span><span class="dock-title">{{ local || subject.title }}</span></span>
          <ShortlistToggle class="dock-save" :code="subject.code" compact />
          <a v-if="!passed && !plannedAt && !plan.setupChosen.value && canAdd" class="button button-accent dock-go" :href="link(`plan?add=${subject.code}`)">
            <Plus :size="18" aria-hidden="true" /> {{ t('subject.addToPlan') }}
          </a>
          <button v-else-if="!passed && !plannedAt && target && canAdd" class="button button-accent dock-go" type="button" @click="addToPlan">
            <Plus :size="18" aria-hidden="true" /> {{ t('subject.addToPlan') }}
          </button>
          <span v-else-if="plannedAt || passed" class="state state-good dock-state"><Check :size="18" aria-hidden="true" /></span>
        </div>
      </Transition>
    </Teleport>
  </header>
</template>

<style scoped>
/* A glass hero like the guide's (GuideHero), with the subject's facts in place of a scene. */
.hero {
  display: grid;
  gap: 20px;
  min-width: 0;
  padding: 18px 36px 24px;
}

.hero-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  min-height: 32px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--accent);
  text-decoration: none;
}

.hero-back:hover {
  text-decoration: underline;
}

/* Name on the left, actions on the right; stacked on narrower screens. */
.hero-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 20px 40px;
  margin-top: -8px;
}

.hero-name {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.code-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.hero-code {
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  color: var(--accent);
}

.list-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: var(--fs-meta);
  font-weight: 600;
  text-decoration: none;
}

.list-badge:hover {
  text-decoration: underline;
}

.hero-title {
  font-size: clamp(1.75rem, 1.35rem + 1.4vw, 2.5rem);
  font-weight: var(--fw-bold);
  line-height: 1.12;
  letter-spacing: var(--track-display);
  text-wrap: balance;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.hero-title-en {
  font-size: var(--fs-body);
  color: var(--ink-soft);
}

.actions {
  display: grid;
  justify-items: end;
  gap: 10px;
  min-width: 0;
}

.add,
.actions-quiet {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-2);
}

.state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 4px;
  font-weight: 650;
}

.state-good {
  color: var(--good);
}

.added {
  font-size: var(--fs-small);
  color: var(--good);
  font-weight: 600;
}

.added-warn {
  color: var(--warn);
}

/* The key facts: name above, value below, hairlines between; numbers in the code face. The
   chips follow on the same line when there's room. */
.facts-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 40px;
  padding-top: 18px;
  border-top: 1px solid var(--divider);
}

.keyfacts {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 0;
  margin: 0;
}

.kf {
  display: grid;
  align-content: start;
  gap: 4px;
  min-width: 0;
  padding: 0 28px;
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
  gap: 4px 10px;
  margin: 0;
  font-size: 1.0625rem;
  font-weight: var(--fw-semibold);
  line-height: 1.35;
  color: var(--ink);
}

.kf dd.kf-num {
  font-family: var(--font-code);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.2;
}

.kf dd.kf-bad {
  color: var(--bad);
}

.kf-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--accent) 45%, transparent);
  text-underline-offset: 4px;
}

.kf-link:hover {
  color: var(--accent);
}

.kf-met {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--fs-small);
  color: var(--good);
}

.facts {
  display: flex;
  flex: 0 1 auto;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip-strong {
  color: var(--ink);
  font-weight: 600;
}

/* A chip with an ⓘ: the opened text goes on its own full-width line under the label. */
.chip-tip {
  flex-wrap: wrap;
}

.chip-tip:has([aria-expanded='true']) {
  border-radius: var(--radius-sm);
}

.chip-tip :deep(.infotip) {
  display: contents;
}

.chip-tip :deep(.infotip-panel) {
  flex-basis: 100%;
}

.instead {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-body);
  color: var(--bad);
}

/* The dock: a slim glass bar once the hero's actions have scrolled away. */
.dock {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(560px, calc(100vw - 48px));
  padding: 8px 8px 8px 20px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-shine), var(--float-fill);
  -webkit-backdrop-filter: var(--float-blur);
  backdrop-filter: var(--float-blur);
  box-shadow: var(--float-rim), var(--float-shadow);
  transform: translateX(-50%);
}

/* Wide screens: centred on the reading column (beside the 232px "On this page" and its 48px gap). */
@media (min-width: 961px) {
  .dock {
    left: calc(50% + 140px);
  }
}

.dock-name {
  display: grid;
  flex: 1;
  min-width: 0;
  line-height: 1.25;
}

.dock-code {
  font-size: 0.75rem;
  font-weight: 650;
  color: var(--ink-soft);
}

.dock-title {
  overflow: hidden;
  font-size: 0.9375rem;
  font-weight: 650;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.dock-save {
  width: 44px;
  height: 44px;
}

.dock-go {
  flex: none;
  min-height: 44px;
}

.dock-state {
  padding-inline: 10px;
}

.dock-enter-active,
.dock-leave-active {
  transition: opacity 0.2s, transform 0.25s var(--ease-spring);
}

.dock-enter-from,
.dock-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

@media (prefers-reduced-motion: reduce) {
  .dock-enter-active,
  .dock-leave-active {
    transition: opacity 0.15s;
  }

  .dock-enter-from,
  .dock-leave-to {
    transform: translateX(-50%);
  }
}

@media (max-width: 1100px) {
  .hero-top {
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
  }

  .actions {
    justify-items: start;
  }

  .add,
  .actions-quiet {
    justify-content: flex-start;
  }
}

/* Phones: above the bottom tab bar, the full width between the gutters. */
@media (max-width: 720px) {
  .dock {
    left: 12px;
    right: 12px;
    bottom: calc(88px + env(safe-area-inset-bottom));
    width: auto;
    padding-left: 16px;
    transform: none;
  }

  .dock-enter-from,
  .dock-leave-to {
    transform: translateY(12px);
  }
}

@media (max-width: 640px) {
  .hero {
    gap: 16px;
    padding: 12px 16px 20px;
    border-radius: 20px;
  }

  .facts-row {
    padding-top: 16px;
  }

  /* A short spec sheet: one fact a row, the names in one column, the values beside them. */
  .keyfacts {
    display: grid;
    flex: 1 1 100%;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 10px 20px;
    align-items: baseline;
  }

  .kf,
  .kf:first-child {
    display: contents;
  }

  .kf dd,
  .kf dd.kf-num {
    font-size: 1rem;
  }

  .facts {
    gap: 6px;
  }

  .facts .chip {
    padding: 3px 9px;
    font-size: 0.8125rem;
  }
}

@media (max-width: 560px) {
  .add,
  .add label,
  .add select,
  .add .button {
    width: 100%;
  }

  .actions,
  .actions-quiet {
    width: 100%;
  }

  /* Grow to share the row, but never break a label: a button that doesn't fit moves down a row. */
  .actions-quiet .button {
    flex: 1 1 auto;
    padding-inline: 10px;
    white-space: nowrap;
  }
}
</style>

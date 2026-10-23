<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { BookOpen, CalendarRange, ChartNoAxesColumn, Check, Link2, MapPin, Plus, Share2, Star } from 'lucide-vue-next'
import { isFail, listPlace, periodsFor, RANK_SLUGS, termKey, type Period, type Subject } from '@/engine'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useRated } from '@/composables/useRated'
import { useI18n } from '@/i18n'
import { categoryLabel, categoryTag, termLabel } from '@/i18n/format'
import { localTitle } from '@/i18n/localized'
import { subjectGist } from '@/i18n/gist'
import { defaultTerm, termsBetween } from '@/utils/pastTerms'
import { handbookUrl } from '@/utils/links'

/**
 * The top of a subject's page: code, title, the facts a student checks first as chips, and what
 * they can do with it (add it to the plan, see it there, read the Handbook, share, rate).
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
const gone = computed(() => props.subject.discontinuedFrom !== undefined && props.year >= props.subject.discontinuedFrom)
const closedForYou = computed(() => data.value.courses.some((c) => c.code === plan.setup.value.course && c.closed.includes(code.value)))
const category = computed(() => (closedForYou.value ? t.value('browse.closedForYou') : categoryTag(t.value, props.subject.categories[plan.setup.value.course])))
const runs = computed(() => {
  if (gone.value) return t.value('subject.discontinued', { year: props.subject.discontinuedFrom ?? '' })
  if (props.subject.offerings === 'unknown') return t.value('subject.runsUnknown')
  if (periods.value.length === 0) return t.value('subject.notRunning')
  if (props.subject.yearLong) return t.value('plan.yearLongRuns')
  return periods.value.map((p) => t.value(`period.${p}`)).join(' · ')
})
// Near the top of the easy or hard list for the student's degree (or the default one).
const onList = computed(() => {
  const place = listPlace(data.value.subjects, code.value, listCourse.value, props.year)
  return place && { ...place, href: link(`subjects/${RANK_SLUGS[place.direction]}/`) + `?course=${encodeURIComponent(listCourse.value)}` }
})
// What students ask first, in their words: exam share, class hours, group work.
const gist = computed(() => subjectGist(t.value, props.subject))

const taken = computed(() => profile.value.results.some((r) => r.code === code.value))
const passed = computed(() => profile.value.results.find((r) => r.code === code.value && !isFail(r)))
const plannedAt = computed(() => plan.terms.value.find((x) => x.subjects.includes(code.value)))

/**
 * Where "Add to my plan" can put it: every term it runs in from the start of study to the plan's
 * last semester (at least three years on). The default is the first one still ahead (see defaultTerm).
 */
const termChoices = computed(() => {
  const s = props.subject
  const start = { year: plan.setup.value.startYear, period: plan.setup.value.startPeriod }
  const last = plan.terms.value.at(-1)
  const floor = { year: start.year + 2, period: 'semester-2' as Period }
  // Reaches into next year too, so a plan that started years ago still has terms ahead to offer.
  const soon = { year: new Date().getFullYear() + 1, period: 'semester-2' as Period }
  const end = [last, floor, soon].reduce((a, b) => (b && termKey(b.year, b.period) > termKey(a!.year, a!.period) ? b : a), floor)!
  return termsBetween(start, end).filter((x) => periodsFor(s, x.year).includes(x.period))
})
const chosenTerm = shallowRef('')
const target = computed(() => {
  const all = termChoices.value
  if (!all.length) return null
  const picked = all.find((x) => `${x.year}|${x.period}` === chosenTerm.value)
  if (picked) return picked
  // Never a term that has already started, unless the student picks one.
  return defaultTerm(all, plan.terms.value[0]) ?? all[0]!
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
</script>

<template>
  <header class="head">
    <p class="head-code-row">
      <span class="code head-code">{{ subject.code }}</span>
      <a v-if="onList" class="list-badge" :href="onList.href">
        <ChartNoAxesColumn :size="14" aria-hidden="true" />
        {{ t(`rank.onList.${onList.direction}`, { n: onList.place }) }}
      </a>
    </p>
    <h1 class="page-title head-title">{{ local || subject.title }}</h1>
    <p v-if="local" class="head-title-en" lang="en">{{ subject.title }}</p>

    <ul class="facts">
      <li class="chip">{{ t('subject.level', { level: subject.level }) }}</li>
      <li class="chip">{{ t('subject.points', { points: subject.points }) }}</li>
      <li v-if="category" class="chip chip-strong">{{ category }}</li>
      <li class="chip" :class="{ 'chip-bad': gone }"><CalendarRange :size="14" aria-hidden="true" />{{ runs }}</li>
      <li v-if="subject.campus" class="chip"><MapPin :size="14" aria-hidden="true" />{{ subject.campus }}</li>
      <li v-for="g in gist" :key="g" class="chip">{{ g }}</li>
    </ul>
    <p v-if="gone && subject.replacedBy.length" class="instead">
      {{ t('subject.insteadTake') }}
      <a v-for="c in subject.replacedBy" :key="c" class="chip code" :href="link(`subject/${c}`)">{{ c }}</a>
    </p>

    <div class="actions">
      <span v-if="passed" class="state state-good" role="status">
        <Check :size="18" aria-hidden="true" />
        {{ passed.mark === undefined ? t('subject.passed') : t('subject.passedMark', { mark: passed.mark }) }}
      </span>
      <a v-else-if="!plan.setupChosen.value" class="button button-accent" :href="link('plan')">
        <Plus :size="18" aria-hidden="true" /> {{ t('subject.chooseDegreeFirst') }}
      </a>
      <template v-else-if="plannedAt">
        <span class="state state-good" role="status"><Check :size="18" aria-hidden="true" /> {{ t('subject.inPlanAt', { term: termLabel(t, plannedAt) }) }}</span>
        <a class="button button-quiet" :href="link('plan')">{{ t('subject.openPlanner') }}</a>
      </template>
      <div v-else-if="target" class="add">
        <label>
          <span class="visually-hidden">{{ t('subject.addWhen') }}</span>
          <select class="select-glass" :value="`${target.year}|${target.period}`" @change="chosenTerm = ($event.target as HTMLSelectElement).value">
            <option v-for="x in termChoices" :key="`${x.year}|${x.period}`" :value="`${x.year}|${x.period}`">{{ termLabel(t, x) }}</option>
          </select>
        </label>
        <button class="button button-accent" type="button" @click="addToPlan">
          <Plus :size="18" aria-hidden="true" /> {{ t('subject.addToPlan') }}
        </button>
      </div>
      <span class="actions-quiet">
        <button v-if="taken && !rated.has(subject.code) && !rateHidden" class="button button-quiet" type="button" @click="emit('rate')">
          <Star :size="17" aria-hidden="true" /> {{ t('rating.rate') }}
        </button>
        <a class="button button-quiet" :href="subject.handbook || handbookUrl(subject.code)" target="_blank" rel="noopener">
          <BookOpen :size="17" aria-hidden="true" /> {{ t('subject.handbook') }}
        </a>
        <button class="button button-quiet" type="button" @click="share">
          <component :is="copied ? Link2 : Share2" :size="17" aria-hidden="true" /> {{ copied ? t('subject.shareCopied') : t('subject.share') }}
        </button>
      </span>
    </div>
    <p v-if="addedAt" class="added" role="status">{{ t('subject.added', { term: termLabel(t, addedAt) }) }}</p>
  </header>
</template>

<style scoped>
.head {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.head-code-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  margin: 0;
}

.head-code {
  font-size: 1rem;
  font-weight: 650;
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

.head-title {
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.head-title-en {
  margin: 0;
  font-size: var(--fs-body);
  color: var(--ink-soft);
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
}

.chip-strong {
  color: var(--ink);
  font-weight: 600;
}

.chip-bad {
  border-color: var(--bad);
  color: var(--bad);
}

.instead {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--fs-body);
  color: var(--bad);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  margin-top: var(--space-4);
}

.add {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.actions-quiet {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 42px;
  padding: 0 4px;
  font-weight: 650;
}

.state-good {
  color: var(--good);
}

.added {
  margin: 0;
  color: var(--good);
  font-weight: 600;
}

@media (max-width: 560px) {
  .add,
  .add label,
  .add select,
  .add .button {
    width: 100%;
  }

  .actions-quiet {
    width: 100%;
  }

  .actions-quiet .button {
    flex: 1 1 0;
    min-width: 0;
    padding-inline: 10px;
  }
}
</style>

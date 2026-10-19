<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { ChevronRight, Info } from 'lucide-vue-next'
import BrowseSwitch from '@/components/browse/BrowseSwitch.vue'
import { forCourse, PERIODS, RANK_SLUGS, rankSubjects, type Period, type RankDirection, type RankReason } from '@/engine'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'

/** /subjects/easy/ and /subjects/hard/: subjects ranked from our own data, each with its reasons. */
const props = defineProps<{ direction: RankDirection }>()

const PAGE = 20
const LEVELS = [1, 2, 3] as const
const { t, locale } = useI18n()
const { all } = useDataset()
const plan = usePlan()

const courses = computed(() => all.courses.filter((c) => c.listed))
const year = computed(() => plan.terms.value[0]?.year ?? new Date().getFullYear())

// Filters live in the address (?course=B-COM&level=1&when=semester-1&breadth=1), so a list can be shared.
const q = new URLSearchParams(location.search)
const startCourse = q.get('course') ?? plan.setup.value.course ?? ''
const course = shallowRef(courses.value.some((c) => c.code === startCourse) ? startCourse : '')
const level = shallowRef<number | null>(LEVELS.includes(Number(q.get('level')) as 1) ? Number(q.get('level')) : null)
const period = shallowRef<Period | null>((PERIODS as readonly string[]).includes(q.get('when') ?? '') ? (q.get('when') as Period) : null)
const breadthOnly = shallowRef(q.get('breadth') === '1')
const shown = shallowRef(PAGE)

watch([course, level, period, breadthOnly], () => {
  shown.value = PAGE
  if (!course.value) breadthOnly.value = false
  const p = new URLSearchParams()
  if (course.value) p.set('course', course.value)
  if (level.value !== null) p.set('level', String(level.value))
  if (period.value) p.set('when', period.value)
  if (breadthOnly.value) p.set('breadth', '1')
  const s = p.toString()
  history.replaceState(null, '', link(`subjects/${RANK_SLUGS[props.direction]}/`) + (s ? `?${s}` : ''))
})

const rows = computed(() => {
  // A breadth subject that limits breadth students to some periods runs only in those for them.
  const data = course.value ? forCourse(all, course.value) : all
  return rankSubjects(Object.values(data.subjects), {
    direction: props.direction,
    course: course.value,
    year: year.value,
    level: level.value,
    period: period.value,
    breadthOnly: breadthOnly.value,
  })
})
const visible = computed(() => rows.value.slice(0, shown.value))
const other = computed<RankDirection>(() => (props.direction === 'easy' ? 'hard' : 'easy'))

function reasonText(r: RankReason): string {
  return t.value(`rank.reason.${r.key}`, r.params)
}
</script>

<template>
  <div class="ranking">
    <header class="head">
      <div class="head-row">
        <h1 class="page-title">{{ t(`rank.title.${direction}`) }}</h1>
        <BrowseSwitch current="subjects" />
      </div>
      <p class="page-lede">{{ t(`rank.lede.${direction}`) }}</p>
      <details class="how">
        <summary><Info :size="16" aria-hidden="true" /> {{ t('rank.howTitle') }}</summary>
        <ul>
          <li>{{ t('rank.how1') }}</li>
          <li>{{ t('rank.how2') }}</li>
          <li>{{ t('rank.how3') }}</li>
          <li>{{ t('rank.how4', { year }) }}</li>
          <li>{{ t('rank.how5') }}</li>
        </ul>
      </details>
    </header>

    <div class="filters" role="group" :aria-label="t('browse.filters')">
      <label class="filter">
        <span>{{ t('rank.degree') }}</span>
        <select v-model="course" class="select-glass">
          <option value="">{{ t('rank.anyDegree') }}</option>
          <option v-for="c in courses" :key="c.code" :value="c.code">{{ c.title }}</option>
        </select>
      </label>
      <label class="filter">
        <span>{{ t('browse.level') }}</span>
        <select v-model="level" class="select-glass">
          <option :value="null">{{ t('browse.any') }}</option>
          <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
        </select>
      </label>
      <label class="filter">
        <span>{{ t('browse.when') }}</span>
        <select v-model="period" class="select-glass">
          <option :value="null">{{ t('browse.any') }}</option>
          <option v-for="p in PERIODS" :key="p" :value="p">{{ t(`period.${p}`) }}</option>
        </select>
      </label>
      <label class="check" :class="{ off: !course }">
        <input v-model="breadthOnly" type="checkbox" :disabled="!course" />
        {{ t('rank.breadthOnly') }}
      </label>
    </div>

    <section class="results">
      <div class="toolbar">
        <p class="count" role="status">{{ t('browse.count', { n: rows.length }) }}</p>
        <a class="other" :href="link(`subjects/${RANK_SLUGS[other]}/`)">{{ t(`rank.other.${direction}`) }}</a>
      </div>

      <ol v-if="rows.length" class="list surface">
        <li v-for="(r, i) in visible" :key="r.subject.code">
          <a class="row" :href="link(`subject/${r.subject.code}`)">
            <span class="rank" aria-hidden="true">{{ i + 1 }}</span>
            <span class="main">
              <span class="code">{{ r.subject.code }}</span>
              <span class="title">{{ localTitle(r.subject, locale) || r.subject.title }}</span>
              <span class="reasons">
                <span v-for="x in r.reasons" :key="x.key" class="pill" :class="{ 'pill-review': x.key.startsWith('reviews') || x.key.startsWith('rated') || x.key.startsWith('grades') || x.key === 'generous' || x.key === 'harsh' }">{{ reasonText(x) }}</span>
                <span v-if="r.reviews === null" class="pill pill-facts">{{ t('rank.factsOnly') }}</span>
              </span>
            </span>
            <ChevronRight :size="18" aria-hidden="true" class="go" />
          </a>
        </li>
      </ol>
      <p v-else class="empty surface">{{ t('rank.empty') }}</p>

      <button v-if="rows.length > shown" type="button" class="button button-quiet more" @click="shown += PAGE">
        {{ t('browse.more', { n: rows.length - shown }) }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.ranking {
  display: grid;
  gap: 20px;
  padding-top: 32px;
  max-width: 820px;
}

.head {
  display: grid;
  gap: 8px;
}

.head-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.how {
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.how summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}

.how ul {
  display: grid;
  gap: 4px;
  margin: 8px 0 0;
  padding-left: 20px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 10px 14px;
}

.filter {
  display: grid;
  gap: 4px;
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.filter select {
  min-width: 0;
  max-width: 100%;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.check.off {
  opacity: 0.5;
}

.results {
  display: grid;
  gap: 12px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.count {
  font-size: 0.9375rem;
  font-weight: 600;
}

.other {
  font-size: 0.875rem;
  font-weight: 600;
}

.list {
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
}

.list > li:last-child .row {
  border-bottom: 0;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid var(--line);
}

.row:hover {
  background: var(--surface-2);
}

.rank {
  flex: none;
  width: 28px;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--ink-faint);
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.main {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.code {
  font-size: 0.875rem;
  font-weight: 650;
  color: var(--accent);
}

.title {
  font-size: 1rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.pill {
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}

.pill-review {
  color: var(--accent);
  background: var(--accent-soft);
}

.pill-facts {
  color: var(--ink-faint);
  background: none;
  border: 1px dashed var(--line);
}

.go {
  flex: none;
  color: var(--ink-faint);
}

.empty {
  padding: 20px;
  color: var(--ink-soft);
}

.more {
  justify-self: center;
}

@media (max-width: 720px) {
  .ranking {
    gap: 16px;
  }

  .filter {
    flex: 1 1 140px;
  }

  /* Degree names are long: give the degree its own line. */
  .filter:first-child {
    flex-basis: 100%;
  }

  .filter select {
    width: 100%;
  }

  .row {
    padding: 12px 14px;
    gap: 10px;
  }

  .rank {
    width: 22px;
    font-size: 1rem;
  }
}
</style>

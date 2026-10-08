<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ArrowLeft, ExternalLink, Route } from 'lucide-vue-next'
import SubjectLinks from './SubjectLinks.vue'
import { majorOverview, sharedSubjects } from '@/engine'
import { go, link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'

const props = defineProps<{ id: string }>()
const { data } = useDataset()
const plan = usePlan()
const { t } = useI18n()

const major = computed(() => data.value.components.find((c) => c.id === props.id))
const overview = computed(() => (major.value ? majorOverview(data.value, major.value.id, major.value.course) : null))
const year = computed(() => plan.terms.value[0]?.year ?? new Date().getFullYear())
const courseTitle = computed(() => data.value.courses.find((c) => c.code === major.value?.course)?.title ?? major.value?.course ?? '')

/** Earlier subjects, split by level, each noting which level-3 subject it leads to. */
const pathwayByLevel = computed(() => {
  const o = overview.value
  if (!o) return []
  return [1, 2]
    .map((level) => {
      const items = o.pathway.filter((p) => data.value.subjects[p.code]?.level === level)
      return { level, codes: items.map((p) => p.code), notes: Object.fromEntries(items.map((p) => [p.code, t.value('majors.leadsTo', { code: p.via })])) }
    })
    .filter((g) => g.codes.length > 0)
})
/** "One of these" routes, grouped by the subject they lead to. */
const routeGroups = computed(() => {
  const o = overview.value
  if (!o) return []
  const by = new Map<string, string[]>()
  for (const r of o.routes) by.set(r.via, [...(by.get(r.via) ?? []), r.code])
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([via, codes]) => ({ via, codes }))
})

// Comparing with another major: what the two share.
const otherId = shallowRef('')
const others = computed(() =>
  data.value.components
    .filter((c) => c.course === major.value?.course && c.kind === 'major' && c.id !== props.id)
    .sort((a, b) => a.title.localeCompare(b.title)),
)
const shared = computed(() => {
  const o = overview.value
  const other = otherId.value ? majorOverview(data.value, otherId.value, major.value?.course ?? '') : null
  return o && other ? sharedSubjects(o, other) : null
})

function planWithIt(): void {
  const m = major.value
  if (!m) return
  plan.updateSetup({ ...plan.setup.value, course: m.course, major: m.id, specialisation: '' })
  plan.generate()
  go('plan')
}
</script>

<template>
  <div v-if="major" class="detail">
    <a class="back" :href="link('majors')"><ArrowLeft :size="16" aria-hidden="true" /> {{ t('majors.all') }}</a>

    <header class="head">
      <p class="eyebrow-line">{{ courseTitle }} · {{ t('majors.points', { n: major.points }) }}</p>
      <h1 class="page-title">{{ major.title }}</h1>
      <div class="actions">
        <button class="button button-accent" type="button" @click="planWithIt">
          <Route :size="16" aria-hidden="true" /> {{ t('majors.planIt') }}
        </button>
        <a v-if="major.handbook" class="button button-quiet" :href="major.handbook" target="_blank" rel="noopener">
          {{ t('majors.handbook') }} <ExternalLink :size="15" aria-hidden="true" />
        </a>
      </div>
    </header>

    <p v-if="!overview" class="note surface">{{ t('majors.notCurated') }}</p>

    <template v-else>
      <section v-if="overview.core.length" class="block">
        <h2 class="block-title">{{ t('majors.coreTitle') }}</h2>
        <p class="block-hint">{{ t('majors.coreHint') }}</p>
        <SubjectLinks :codes="overview.core" :year="year" />
      </section>

      <section v-for="(c, i) in overview.choices" :key="i" class="block">
        <h2 class="block-title">{{ t('majors.choiceTitle', { n: c.points / 12.5 }) }}</h2>
        <p class="block-hint">{{ t('majors.choiceHint', { points: c.points }) }}</p>
        <SubjectLinks :codes="c.from" :year="year" />
      </section>

      <section class="block">
        <h2 class="block-title">{{ t('majors.pathwayTitle') }}</h2>
        <p class="block-hint">{{ t('majors.pathwayHint') }}</p>
        <template v-if="pathwayByLevel.length">
          <div v-for="g in pathwayByLevel" :key="g.level" class="level">
            <h3 class="level-title">{{ t('majors.level', { n: g.level }) }}</h3>
            <SubjectLinks :codes="g.codes" :year="year" :notes="g.notes" />
          </div>
        </template>
        <p v-else class="note surface">{{ t('majors.noPathway') }}</p>

        <details v-if="routeGroups.length" class="routes">
          <summary>{{ t('majors.routesTitle', { n: routeGroups.length }) }}</summary>
          <div v-for="g in routeGroups" :key="g.via" class="route">
            <p class="route-for">{{ t('majors.routesFor', { code: g.via }) }}</p>
            <p class="chips">
              <a v-for="c in g.codes" :key="c" class="chip code" :href="link(`subject/${c}`)">{{ c }}</a>
            </p>
          </div>
        </details>
      </section>

      <section class="block compare surface">
        <h2 class="block-title">{{ t('majors.compareTitle') }}</h2>
        <label class="compare-pick">
          <span class="visually-hidden">{{ t('majors.comparePick') }}</span>
          <select v-model="otherId" class="select">
            <option value="">{{ t('majors.comparePick') }}</option>
            <option v-for="o in others" :key="o.id" :value="o.id">{{ o.title }}</option>
          </select>
        </label>
        <template v-if="shared">
          <p class="compare-result">
            {{ shared.length ? t('majors.compareShared', { n: shared.length }) : t('majors.compareNone') }}
          </p>
          <p v-if="shared.length" class="chips">
            <a v-for="c in shared" :key="c" class="chip code" :href="link(`subject/${c}`)">{{ c }}</a>
          </p>
          <a class="compare-open" :href="link(`majors/${otherId}`)">{{ t('majors.compareOpen') }}</a>
        </template>
      </section>
    </template>

    <p class="source">{{ t('majors.source') }}</p>
  </div>

  <div v-else class="detail">
    <a class="back" :href="link('majors')"><ArrowLeft :size="16" aria-hidden="true" /> {{ t('majors.all') }}</a>
    <p class="note surface">{{ t('majors.notFound') }}</p>
  </div>
</template>

<style scoped>
.detail {
  display: grid;
  gap: 24px;
  max-width: 760px;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  font-size: 0.9rem;
  color: var(--ink-soft);
  text-decoration: none;
}

.back:hover {
  color: var(--accent);
}

.head {
  display: grid;
  gap: 8px;
}

.eyebrow-line {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.block {
  display: grid;
  gap: 10px;
}

.block-title {
  font-size: 1.15rem;
  font-weight: 650;
}

.block-hint {
  margin-top: -4px;
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.level {
  display: grid;
  gap: 8px;
}

.level + .level {
  margin-top: 8px;
}

.level-title {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.note {
  padding: 14px 16px;
  font-size: 0.92rem;
  color: var(--ink-soft);
}

.routes {
  padding: 4px 0;
}

.routes summary {
  font-weight: 600;
  cursor: pointer;
}

.route {
  display: grid;
  gap: 6px;
  margin-top: 12px;
}

.route-for {
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chips .chip {
  text-decoration: none;
}

.chips .chip:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.compare {
  padding: 18px 20px;
}

.compare-pick .select {
  max-width: 420px;
}

.compare-result {
  font-weight: 600;
}

.compare-open {
  justify-self: start;
  font-size: 0.9rem;
  color: var(--accent);
}

.source {
  font-size: 0.85rem;
  color: var(--ink-faint);
}
</style>

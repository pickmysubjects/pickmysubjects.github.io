<script setup lang="ts">
import { viewYear } from '@/engine/dataYear'
import { computed, shallowRef } from 'vue'
import { ExternalLink, Route } from 'lucide-vue-next'
import MajorCareers from './MajorCareers.vue'
import MajorRoute from './MajorRoute.vue'
import MajorStructure from './MajorStructure.vue'
import DetailHero from '@/components/browse/DetailHero.vue'
import GuideToc from '@/components/guide/GuideToc.vue'
import SubjectSection from '@/components/subject/SubjectSection.vue'
import { componentCareers, componentCourse, heldAsMinor, majorOverview, minorClash, sharedSubjects } from '@/engine'
import { go, link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'

/**
 * One major, minor or specialisation, laid out like a subject page: the hero with what it adds
 * up to and what to do with it, "On this page" on the left, then its structure as a path by
 * level, the prerequisite route, where it leads and a comparison with another.
 */
const props = defineProps<{ id: string }>()
const { data } = useDataset()
const plan = usePlan()
const { t } = useI18n()

const major = computed(() => data.value.components.find((c) => c.id === props.id))
const overview = computed(() => (major.value ? majorOverview(data.value, major.value.id, major.value.course) : null))
const year = computed(() => viewYear(plan.terms.value[0]?.year))
const courseTitle = computed(() => data.value.courses.find((c) => c.code === major.value?.course)?.title ?? major.value?.course ?? '')

const pathwayCount = computed(() => overview.value?.pathway.length ?? 0)
const kind = computed(() => {
  const m = major.value
  if (!m) return ''
  return m.informal ? t.value('majors.informalKind') : m.kind === 'minor' ? t.value('majors.minorKind') : m.kind === 'specialisation' ? t.value('majors.specKind') : t.value('majors.majorKind')
})
// What it adds up to, said once at the top of the structure: compulsory, picks, what comes first.
const structureShort = computed(() => {
  const o = overview.value
  if (!o) return ''
  const sep = t.value('listSep')
  return [
    o.core.length ? t.value('majors.sumCore', { n: o.core.length }) : '',
    ...o.choices.map((c) => t.value('majors.sumPick', { n: c.points / 12.5, of: c.from.length })),
    o.pathway.length ? t.value('majors.sumFirst', { n: o.pathway.length }) : '',
  ]
    .filter(Boolean)
    .join(sep)
})
const hasCareers = computed(() => !!componentCareers(data.value.careers, props.id))
const tocArt = () => import('@/components/browse/art/MiniMajor.vue')
const heroArt = () => import('@/components/browse/art/ArtMajor.vue')
/** "One of these" routes, grouped by the subject they lead to. */
const routeGroups = computed(() => {
  const o = overview.value
  if (!o) return []
  const by = new Map<string, string[]>()
  for (const r of o.routes) by.set(r.via, [...(by.get(r.via) ?? []), r.code])
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([via, codes]) => ({ via, codes }))
})

// Comparing with another major: what the two share.
const hasRoute = computed(() => !!overview.value && (overview.value.core.length > 0 || overview.value.choices.length > 0))
const otherId = shallowRef('')
const others = computed(() =>
  data.value.components
    .filter((c) => c.course === major.value?.course && c.kind === major.value?.kind && c.informal === major.value?.informal && c.id !== props.id)
    .sort((a, b) => a.title.localeCompare(b.title)),
)
const shared = computed(() => {
  const o = overview.value
  const other = otherId.value ? majorOverview(data.value, otherId.value, major.value?.course ?? '') : null
  return o && other ? sharedSubjects(o, other) : null
})

// The page's sections in order, for "On this page" (ids are anchors other pages link to).
const sections = computed(() =>
  [
    { id: 'm-core', title: t.value('majors.structureTitle'), show: !!overview.value },
    { id: 'm-route', title: t.value('majors.routeTitle'), show: hasRoute.value },
    { id: 'm-careers', title: t.value('careers.title'), show: hasCareers.value },
    { id: 'm-compare', title: t.value('majors.compareTitle'), show: !!overview.value && others.value.length > 0 },
  ]
    .filter((x) => x.show)
    .map(({ id, title }) => ({ id, title, sub: false })),
)

function planWithIt(): void {
  const m = major.value
  if (!m) return
  // A course based on this one (B-SCIEXTD on B-SCI) keeps its own degree.
  const own = componentCourse(data.value, plan.setup.value.course) === m.course
  const course = own ? plan.setup.value.course : m.course
  // A minor joins the plan's own major (same degree), unless it's that major's own discipline.
  if (heldAsMinor(m)) {
    const setup = plan.setup.value
    const sameCourse = own
    const major = sameCourse && !minorClash(data.value, setup.major, m.id) ? setup.major : ''
    const major2 = major && setup.major2 && !minorClash(data.value, setup.major2, m.id) ? setup.major2 : ''
    const next = sameCourse ? { ...setup, major, major2, minors: [m.id] } : { ...setup, course, major: '', major2: '', specialisation: '', field: '', minors: [m.id] }
    if (!plan.updateSetup(next)) plan.generate()
    go('plan')
    return
  }
  // A specialisation goes with a major that allows it: the plan's own major when it does,
  // else the first one that does.
  if (m.kind === 'specialisation') {
    const setup = plan.setup.value
    const keep = own && (m.requiresMajor.length === 0 || m.requiresMajor.includes(setup.major))
    const major = keep ? setup.major : (m.requiresMajor[0] ?? '')
    const next = { ...setup, course, major, major2: keep ? setup.major2 : '', specialisation: m.id, minors: keep ? setup.minors : [] }
    if (!plan.updateSetup(next)) plan.generate()
    go('plan')
    return
  }
  if (!plan.updateSetup({ ...plan.setup.value, course, major: m.id, major2: '', specialisation: '', minors: [] })) plan.generate()
  go('plan')
}
</script>

<template>
  <div v-if="major" class="detail">
    <DetailHero :back="{ href: link('majors'), label: t('majors.all') }" :eyebrow="`${courseTitle} · ${kind}`" :title="major.title" :art="heroArt">
      <dl class="facts">
        <div class="fact">
          <dt>{{ t('majors.factTotal') }}</dt>
          <dd>{{ major.points }}</dd>
        </div>
        <template v-if="overview">
          <div v-if="overview.core.length" class="fact">
            <dt>{{ t('majors.tagCore') }}</dt>
            <dd>{{ t('majors.statCount', { n: overview.core.length }) }}</dd>
          </div>
          <div v-for="(c, i) in overview.choices" :key="i" class="fact">
            <dt>{{ overview.choices.length > 1 ? t('majors.factPickN', { g: String.fromCharCode(65 + i) }) : t('majors.factPick') }}</dt>
            <dd>{{ t('majors.statPick', { n: c.points / 12.5, of: c.from.length }) }}</dd>
          </div>
          <div v-if="pathwayCount" class="fact">
            <dt>{{ t('majors.tagFirst') }}</dt>
            <dd>{{ t('majors.statCount', { n: pathwayCount }) }}</dd>
          </div>
        </template>
      </dl>
      <div class="actions">
        <button class="button button-accent" type="button" @click="planWithIt">
          <Route :size="16" aria-hidden="true" /> {{ major.informal || major.kind === 'specialisation' ? t('majors.planInformal') : major.kind === 'minor' ? t('majors.planMinor') : t('majors.planIt') }}
        </button>
        <a v-if="major.handbook" class="button button-quiet" :href="major.handbook" target="_blank" rel="noopener">
          {{ t('subject.handbook') }} <ExternalLink :size="15" aria-hidden="true" />
        </a>
      </div>
    </DetailHero>

    <div class="article" :class="{ 'no-toc': sections.length < 2 }">
      <div v-if="sections.length >= 2" class="article-toc">
        <GuideToc :items="sections" :art="tocArt" />
      </div>

      <div class="body">
        <p v-if="!overview" class="note surface">{{ t('majors.notCurated') }}</p>

        <template v-else>
          <SubjectSection id="m-core" :title="t('majors.structureTitle')" :short="structureShort">
            <span id="m-pathway" class="anchor" aria-hidden="true" />
            <!-- Entry points (a language major): the first is shown; the plan follows the student's. -->
            <p v-if="overview.entryRoutes.length" class="note-line">
              {{ t('majors.entryRoutes', { n: overview.entryRoutes.length, first: overview.entryRoutes[0]?.title ?? '' }) }}
              <span class="route-names">{{ overview.entryRoutes.map((r) => r.title).join(' · ') }}</span>
            </p>
            <MajorStructure :overview="overview" :year="year" />
            <p v-if="!overview.pathway.length" class="note-line">{{ t('majors.noPathway') }}</p>
            <details v-if="routeGroups.length" class="routes">
              <summary>{{ t('majors.routesTitle', { n: routeGroups.length }) }}</summary>
              <div v-for="g in routeGroups" :key="g.via" class="route">
                <p class="route-for">{{ t('majors.routesFor', { code: g.via }) }}</p>
                <p class="chips">
                  <a v-for="c in g.codes" :key="c" class="chip code" :href="link(`subject/${c}`)">{{ c }}</a>
                </p>
              </div>
            </details>
          </SubjectSection>

          <div v-if="hasRoute" id="m-route" class="card surface">
            <MajorRoute :overview="overview" :course="major.course" />
          </div>
        </template>

        <div v-if="hasCareers" id="m-careers" class="card surface">
          <MajorCareers :id="major.id" :course="major.course" :title="major.title" />
        </div>

        <SubjectSection v-if="overview && others.length" id="m-compare" :title="t('majors.compareTitle')">
          <label class="compare-pick">
            <span class="visually-hidden">{{ t('majors.comparePick') }}</span>
            <select v-model="otherId" class="select-glass">
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
        </SubjectSection>

        <p class="foot">{{ t('majors.source') }}</p>
      </div>
    </div>
  </div>

  <div v-else class="detail">
    <DetailHero :back="{ href: link('majors'), label: t('majors.all') }" :title="t('majors.notFound')" :art="heroArt" />
  </div>
</template>

<style scoped>
/* The subject page's measures: frostier cards, the hero and the article sharing their edges. */
.detail {
  --card-fill: var(--peek-fill);

  display: grid;
  gap: 24px;
  min-width: 0;
}

/* The hero's key numbers: a row of small labelled facts. */
.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  margin: 6px 0 0;
}

.fact dt {
  font-size: var(--fs-caption);
  color: var(--ink-soft);
}

.fact dd {
  margin: 2px 0 0;
  font-size: 1.0625rem;
  font-weight: var(--fw-bold);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.article {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  gap: 48px;
  align-items: start;
}

.article.no-toc {
  grid-template-columns: minmax(0, 1fr);
}

.article-toc {
  align-self: stretch;
}

.body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  min-width: 0;
}

/* Parts that bring their own heading (the route, where it leads) sit in the same glass card. */
.card {
  min-width: 0;
  padding: 28px 32px 32px;
  scroll-margin-top: 96px;
}

.card :deep(.block-title) {
  padding-bottom: 12px;
  font-size: var(--fs-section);
  font-weight: var(--fw-bold);
}

/* Lists that come as their own card fold into the section: never a box in a box. */
.card :deep(.jobs.surface) {
  padding-inline: 0;
  border: 0;
  background: none;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

.anchor {
  display: block;
  scroll-margin-top: 96px;
}

.note {
  margin: 0;
  padding: 20px 24px;
  border-radius: 20px;
  color: var(--ink-soft);
}

.note-line {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.route-names {
  display: block;
  margin-top: 4px;
  font-size: var(--fs-meta);
}

.routes summary {
  font-weight: var(--fw-semibold);
  cursor: pointer;
}

.route {
  display: grid;
  gap: 6px;
  margin-top: 12px;
}

.route-for {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
}

.chips .chip {
  text-decoration: none;
}

.chips .chip:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.compare-pick .select-glass {
  width: min(100%, 420px);
}

.compare-result {
  margin: 0;
  font-weight: var(--fw-semibold);
}

.compare-open {
  justify-self: start;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--accent);
}

/* Where the facts come from: one frosted strip at the end, never straight on the colour field. */
.foot {
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: 10px 16px;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  border: 1px solid var(--card-edge);
  border-radius: 14px;
  background: var(--card-fill);
}

@media (max-width: 960px) {
  .article {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
}

@media (max-width: 640px) {
  .detail,
  .body {
    gap: 14px;
  }

  .card {
    padding: 20px 16px;
  }

  .foot {
    margin-bottom: 16px;
  }
}
</style>

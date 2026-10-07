<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ArrowLeft, CalendarRange, Check, ExternalLink, Plus, Star } from 'lucide-vue-next'
import DataNotice from '@/components/DataNotice.vue'
import { periodsFor, referencedSubjects } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { categoryLabel, describeReq, termLabel } from '@/i18n/format'
import { discussionLinks } from '@/utils/links'

const props = defineProps<{ code: string }>()
const { name, data } = useDataset()
const plan = usePlan()
const { profile } = useProfile()
const { t } = useI18n()

const code = computed(() => props.code.toUpperCase())
const subject = computed(() => data.value.subjects[code.value])
const year = computed(() => plan.terms.value[0]?.year ?? new Date().getFullYear())
const periods = computed(() => (subject.value ? periodsFor(subject.value, year.value) : []))
const offeringsKnown = computed(() => subject.value?.offerings !== 'unknown')
const unlocks = computed(() =>
  Object.values(data.value.subjects)
    .filter((s) => referencedSubjects(s.prerequisites).includes(code.value))
    .map((s) => s.code),
)
const blocks = computed(() => (subject.value && subject.value.nonAllowed !== 'unknown' ? subject.value.nonAllowed : []))
const category = computed(() => categoryLabel(t.value, subject.value?.categories[plan.setup.value.course]))
const inPlan = computed(() => plan.plannedCodes.value.includes(code.value))
const taken = computed(() => profile.value.results.some((r) => r.code === code.value))
const added = shallowRef<string | null>(null)

/** First planned term the subject runs in, so "Add to my plan" lands somewhere sensible. */
const targetTerm = computed(() =>
  plan.terms.value.findIndex((term) => !subject.value || periodsFor(subject.value, term.year).includes(term.period)),
)

function addToPlan(): void {
  const i = targetTerm.value
  const term = plan.terms.value[i]
  if (i < 0 || !term) return
  plan.addSubject(i, code.value)
  added.value = termLabel(t.value, term)
}

const meters = computed(() => {
  const s = subject.value?.signals
  if (!s) return []
  return [
    { key: 'rating.difficulty', value: s.difficulty, low: 'rating.diffLow', high: 'rating.diffHigh' },
    { key: 'rating.workload', value: s.workload, low: 'rating.loadLow', high: 'rating.loadHigh' },
    { key: 'rating.generosity', value: s.grading, low: 'rating.genLow', high: 'rating.genHigh' },
  ]
})
const links = computed(() => (name.value === 'real' ? discussionLinks(code.value) : []))
</script>

<template>
  <div class="subject">
    <a class="back" href="#/"><ArrowLeft :size="16" aria-hidden="true" /> {{ t('subject.back') }}</a>

    <template v-if="subject">
      <header class="head">
        <p class="code head-code">{{ subject.code }}</p>
        <h1 class="page-title">{{ subject.title }}</h1>
        <div class="facts">
          <span class="chip">{{ t('subject.level', { level: subject.level }) }}</span>
          <span class="chip">{{ t('subject.points', { points: subject.points }) }}</span>
          <span v-if="category" class="chip">{{ category }}</span>
          <span class="chip chip-when">
            <CalendarRange :size="14" aria-hidden="true" />
            <template v-if="!offeringsKnown">{{ t('subject.runsUnknown') }}</template>
            <template v-else-if="periods.length === 0">{{ t('subject.notRunning') }}</template>
            <template v-else>{{ periods.map((p) => t(`period.${p}`)).join(' · ') }}</template>
          </span>
        </div>
        <div class="actions">
          <button class="button button-accent" type="button" :disabled="inPlan || targetTerm < 0" @click="addToPlan">
            <component :is="inPlan ? Check : Plus" :size="18" aria-hidden="true" />
            {{ inPlan ? t('subject.inPlan') : t('subject.addToPlan') }}
          </button>
          <a v-if="taken" class="button button-quiet" href="#/record">
            <Star :size="18" aria-hidden="true" /> {{ t('subject.rateIt') }}
          </a>
          <a v-if="subject.handbook" class="button button-quiet" :href="subject.handbook" target="_blank" rel="noopener">
            {{ t('subject.handbook') }} <ExternalLink :size="15" aria-hidden="true" />
          </a>
        </div>
        <p v-if="added" class="added" role="status">{{ t('subject.added', { term: added }) }}</p>
      </header>

      <div class="grid">
        <section class="panel surface">
          <h2 class="panel-title">{{ t('subject.needs') }}</h2>
          <p v-if="subject.prerequisites === 'none'" class="panel-text">{{ t('subject.needsNone') }}</p>
          <p v-else-if="subject.prerequisites === 'unknown'" class="panel-text muted">{{ t('subject.notRecorded') }}</p>
          <p v-else class="panel-text">{{ describeReq(t, subject.prerequisites) }}</p>
          <p v-if="subject.prerequisites !== 'none' && subject.prerequisites !== 'unknown'" class="links-inline">
            <a v-for="c in referencedSubjects(subject.prerequisites)" :key="c" class="chip code" :href="`#/subject/${c}`">{{ c }}</a>
          </p>
        </section>

        <section class="panel surface">
          <h2 class="panel-title">{{ t('subject.unlocks') }}</h2>
          <p v-if="unlocks.length === 0" class="panel-text muted">{{ t('subject.unlocksNone') }}</p>
          <p v-else class="links-inline">
            <a v-for="c in unlocks" :key="c" class="chip code" :href="`#/subject/${c}`">{{ c }}</a>
          </p>
          <template v-if="blocks.length">
            <h2 class="panel-title panel-title-gap">{{ t('subject.blocks') }}</h2>
            <p class="links-inline">
              <a v-for="c in blocks" :key="c" class="chip code" :href="`#/subject/${c}`">{{ c }}</a>
            </p>
          </template>
        </section>

        <section class="panel surface panel-wide">
          <h2 class="panel-title">{{ t('subject.ratingsTitle') }}</h2>
          <template v-if="meters.length">
            <p class="panel-text muted">{{ t('subject.reviews', { n: subject.signals?.reviews ?? 0 }) }}</p>
            <div class="meters">
              <div v-for="m in meters" :key="m.key" class="meter">
                <span class="meter-label">{{ t(m.key) }}</span>
                <span class="meter-track" aria-hidden="true"><span class="meter-fill" :style="{ width: `${(m.value / 5) * 100}%` }" /></span>
                <span class="meter-value">{{ m.value }}/5</span>
                <span class="meter-ends">{{ t(m.low) }} · {{ t(m.high) }}</span>
              </div>
            </div>
          </template>
          <p v-else class="panel-text muted">{{ t('subject.noRatings') }}</p>
        </section>

        <section v-if="links.length" class="panel surface panel-wide">
          <h2 class="panel-title">{{ t('subject.discuss') }}</h2>
          <p class="links-inline">
            <a v-for="l in links" :key="l.label" class="chip" :href="l.href" target="_blank" rel="noopener" :lang="l.lang">
              {{ l.label }} <ExternalLink :size="13" aria-hidden="true" />
            </a>
          </p>
        </section>
      </div>

      <p class="verified">
        {{ subject.verifiedOn ? t('subject.verified', { date: subject.verifiedOn }) : t('subject.unverified') }}
        · <a :href="`#/feedback?topic=data&subject=${subject.code}`">{{ t('suggest.report') }}</a>
      </p>
    </template>

    <section v-else class="missing surface">
      <h1 class="page-title">{{ code ? t('subject.notFound', { code }) : t('subject.searchFirst') }}</h1>
      <p class="page-lede">{{ t('subject.notFoundText') }}</p>
      <a class="button button-accent" href="#/contribute">{{ t('subject.addIt') }}</a>
    </section>

    <DataNotice />
  </div>
</template>

<style scoped>
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
  font-size: 0.9rem;
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
  font-size: 0.95rem;
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
  font-size: 0.95rem;
  font-weight: 650;
}

.panel-title-gap {
  margin-top: 10px;
}

.panel-text {
  font-size: 1.05rem;
}

.muted {
  font-size: 0.95rem;
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
  font-size: 0.78rem;
  color: var(--ink-faint);
}

.verified {
  font-size: 0.85rem;
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
}
</style>

<script setup lang="ts">
import { viewYear } from '@/engine/dataYear'
import InfoTip from '@/components/InfoTip.vue'
import { computed, shallowRef, watch } from 'vue'
import { ArrowLeft, BadgeCheck, ExternalLink, GraduationCap } from 'lucide-vue-next'
import CareerTiers from './CareerTiers.vue'
import { careerTarget, easierIn, majorForCareer, majorsForCareer, careerText, TIERS } from '@/engine'
import { careerLabel } from '@/utils/careersHtml'
import { link, replaceAddress, useView } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'

// "I want to be ___": the majors that lead there, then one major's subjects sorted for the job.
const props = defineProps<{ id: string }>()
const { data } = useDataset()
const plan = usePlan()
const { query } = useView()
const { t, locale } = useI18n()

const target = computed(() => careerTarget(data.value, props.id))
const majors = computed(() => majorsForCareer(data.value, props.id))
const courseTitle = (code: string) => data.value.courses.find((c) => c.code === code)?.title ?? code
const year = computed(() => viewYear(plan.terms.value[0]?.year))

// The chosen major: from the address (?major=), else the plan's own major when it leads here, else the first.
const picked = shallowRef(query.value.get('major') ?? '')
// Back/forward (or a link to another major of the same job) changes ?major= without a remount.
watch(() => query.value.get('major'), (m) => (picked.value = m ?? ''))
const chosen = computed(() => {
  const ids = majors.value.map((m) => m.component)
  const own = plan.setup.value.major
  return ids.includes(picked.value) ? picked.value : ids.includes(own) ? own : (ids[0] ?? '')
})
function pick(component: string): void {
  picked.value = component
  replaceAddress(`careers/${props.id}?major=${encodeURIComponent(component)}`)
}

const result = computed(() => {
  const m = majors.value.find((x) => x.component === chosen.value)
  return m ? majorForCareer(data.value, props.id, m.component, easierIn(data.value, m.course)) : null
})
const counts = computed(() => (result.value ? Object.fromEntries(TIERS.map((x) => [x, result.value!.subjects[x].length])) : {}))
const hasBreadth = computed(() => !!result.value?.breadth && TIERS.some((x) => result.value!.breadth![x].length))
</script>

<template>
  <div v-if="target" class="detail">
    <a class="back" :href="link('careers')"><ArrowLeft :size="16" aria-hidden="true" /> {{ t('careerPath.back') }}</a>

    <header class="head">
      <h1 class="page-title">{{ t('careerPath.heading', { job: careerLabel(target.names, locale) }) }}</h1>
      <p v-if="majors.length > 1 || !target.graduate" class="page-lede">{{ t('careerPath.summary', { n: majors.length }) }}</p>
      <p v-if="target.occupation?.skills.length" class="skills">{{ t('careers.skills', { list: target.occupation.skills.join(' · ') }) }}</p>
      <a v-if="target.occupation" class="official" :href="target.occupation.url" target="_blank" rel="noopener">
        {{ t('careers.official') }} · {{ target.occupation.name }} <ExternalLink :size="13" aria-hidden="true" />
      </a>
    </header>

    <section v-if="target.graduate" class="block route surface" aria-labelledby="route-title">
      <h2 id="route-title" class="block-title route-title">
        <GraduationCap :size="18" aria-hidden="true" class="acc-icon" />
        {{ t('careerPath.graduateTitle', { course: `${target.graduate.title} (${target.graduate.course})` }) }}
      </h2>
      <p class="block-hint">{{ t('careerPath.graduateAny') }}</p>
      <details class="route-more">
        <summary>{{ t('careerPath.graduateEntry') }}<template v-if="target.graduate.prerequisites"> · {{ t('careerPath.graduatePrereq') }}</template></summary>
        <p>{{ careerText(target.graduate.entry, locale) }}</p>
        <p v-if="target.graduate.prerequisites">
          <strong>{{ t('careerPath.graduatePrereq') }}:</strong> {{ careerText(target.graduate.prerequisites, locale) }}
        </p>
        <p v-if="target.graduate.prerequisites && !target.graduate.required.length" class="block-hint">{{ t('careerPath.graduateNoCodes') }}</p>
      </details>
      <a class="official" :href="target.graduate.source" target="_blank" rel="noopener">
        {{ t('careerPath.graduateSource') }} · {{ target.graduate.checked }} <ExternalLink :size="13" aria-hidden="true" />
      </a>
    </section>

    <section v-if="majors.length" class="block" aria-labelledby="majors-title">
      <h2 id="majors-title" class="block-title">{{ t('careerPath.majorsTitle') }}</h2>
      <div class="majors" role="group" :aria-label="t('careerPath.majorsTitle')">
        <button
          v-for="m in majors"
          :key="m.component"
          type="button"
          class="major surface tile"
          :aria-pressed="m.component === chosen"
          @click="pick(m.component)"
        >
          <span class="major-title">{{ m.title }}</span>
          <span class="major-meta">{{ courseTitle(m.course) }}</span>
          <span class="major-tags">
            <span class="tag">{{ t(`careerPath.how.${m.how}`) }}<template v-if="m.via && !m.route">: {{ careerText(m.via, locale) }}</template></span>
            <span v-if="m.accreditation" class="acc-chip"><BadgeCheck :size="13" aria-hidden="true" /> {{ t('majors.accChip') }}</span>
          </span>
        </button>
      </div>
    </section>

    <section v-if="result" class="block chosen" aria-labelledby="subjects-title">
      <h2 id="subjects-title" class="block-title">{{ t('careerPath.subjectsTitle', { major: result.major.title }) }}</h2>
      <p class="counts">{{ t('careerPath.counts', counts) }}</p>
      <p v-if="result.major.accreditation" class="acc surface">
        <BadgeCheck :size="16" aria-hidden="true" class="acc-icon" />
        <span><strong>{{ result.major.accreditation.body }}</strong> · {{ careerText(result.major.accreditation.summary, locale) }}</span>
      </p>
      <CareerTiers v-if="TIERS.some((x) => result!.subjects[x].length)" :tiers="result.subjects" :year="year" />
      <p v-else class="note flat">{{ t('careerPath.nothingHere') }}</p>
      <p v-if="result.needs.generic.length" class="generic">{{ t('careerPath.generic', { list: result.needs.generic.join(', ') }) }}</p>
      <a class="more-link" :href="link(`majors/${result.major.component}`)">{{ t('majors.title') }} · {{ result.major.title }}</a>

      <div class="breadth">
        <h2 class="block-title">{{ t('careerPath.breadthTitle') }}</h2>
        <template v-if="hasBreadth">
          <p class="block-hint">{{ t('careerPath.breadthHintShort') }}<InfoTip :text="t('careerPath.breadthHint')" /></p>
          <CareerTiers :tiers="result.breadth!" :year="year" />
          <a class="more-link" :href="link('subjects/breadth')">{{ t('careerPath.breadthAll') }}</a>
        </template>
        <p v-else class="note flat">{{ t('careerPath.breadthNone') }}</p>
      </div>
    </section>

    <p class="source">{{ t('careerPath.noteShort') }}<InfoTip :text="t('careerPath.note')" /></p>
  </div>

  <div v-else class="detail">
    <a class="back" :href="link('careers')"><ArrowLeft :size="16" aria-hidden="true" /> {{ t('careerPath.back') }}</a>
    <p class="note flat">{{ t('careerPath.noMatch') }}</p>
  </div>
</template>

<style scoped>
.detail {
  display: grid;
  gap: 28px;
  min-width: 0;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  font-size: 0.9375rem;
  color: var(--ink-soft);
  text-decoration: none;
}

.back:hover {
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

.head {
  display: grid;
  gap: 8px;
}

.page-title {
  overflow-wrap: anywhere;
}

.skills {
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.official {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  justify-self: start;
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

.block {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.block-title {
  font-size: 1.15rem;
  font-weight: 650;
}

.block-hint {
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.majors {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: 10px;
}

.major {
  display: grid;
  gap: 4px;
  justify-items: start;
  padding: 14px 16px;
  text-align: left;
  color: var(--ink);
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s;
}

.major:hover {
  border-color: var(--accent);
}

.major[aria-pressed='true'] {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.major-title {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.major-meta,
.tag {
  font-size: 0.8125rem;
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}

.major-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
}

.acc-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
}

.route {
  padding: 16px 18px;
  border-radius: 16px;
  font-size: 0.9375rem;
}

.route p {
  margin: 0;
  overflow-wrap: anywhere;
}

.route-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.route {
  gap: 10px;
}

.route-more summary {
  cursor: pointer;
  font-weight: 600;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

.route-more[open] summary {
  margin-bottom: 8px;
}

.route-more {
  display: grid;
  gap: 8px;
}

.route-more > p + p {
  margin-top: 8px;
}

.counts {
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.acc {
  display: flex;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 0.9375rem;
}

.acc-icon {
  flex-shrink: 0;
  margin-top: 3px;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

.generic {
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.more-link {
  justify-self: start;
  font-size: 0.9375rem;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

.breadth {
  display: grid;
  gap: 12px;
  margin-top: 20px;
  padding-top: 24px;
  border-top: 1px solid var(--line, color-mix(in srgb, var(--ink) 12%, transparent));
}

.skills {
  line-height: 1.6;
}

@media (max-width: 600px) {
  .detail {
    gap: 22px;
  }

  .majors {
    gap: 8px;
  }

  .major {
    padding: 10px 14px;
    gap: 2px;
  }

  .route {
    padding: 14px;
  }
}

.note {
  padding: 14px 16px;
}

.note.flat {
  padding: var(--space-3) 0 0;
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.source {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}
</style>

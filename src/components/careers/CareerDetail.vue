<script setup lang="ts">
import { viewYear } from '@/engine/dataYear'
import InfoTip from '@/components/InfoTip.vue'
import { computed, shallowRef, watch } from 'vue'
import { BadgeCheck, Check, ExternalLink, GraduationCap, Target } from 'lucide-vue-next'
import CareerTiers from './CareerTiers.vue'
import DetailHero from '@/components/browse/DetailHero.vue'
import GuideToc from '@/components/guide/GuideToc.vue'
import SubjectSection from '@/components/subject/SubjectSection.vue'
import { useProfile } from '@/composables/useProfile'
import { careerTarget, easierIn, majorForCareer, majorsForCareer, careerText, TIERS } from '@/engine'
import { careerLabel } from '@/utils/careersHtml'
import { link, replaceAddress, useView } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'

/**
 * One career, laid out like a subject page: the hero (the job, how many majors lead there, the
 * official job page, "make it my goal"), "On this page" on the left, then a graduate route when
 * there is one, the majors that lead there, one major's subjects sorted for the job, breadth
 * ideas and what employers ask for. Only what the data has; where it comes from is said.
 */
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

const { profile, setCareer } = useProfile()
const isGoal = computed(() => profile.value.career === props.id)
const label = computed(() => (target.value ? careerLabel(target.value.names, locale.value) : ''))
const skills = computed(() => target.value?.occupation?.skills ?? [])
const heroArt = () => import('@/components/browse/art/ArtCareer.vue')
const tocArt = () => import('@/components/browse/art/MiniCareer.vue')
// The page's sections in order, for "On this page".
const sections = computed(() =>
  [
    { id: 'c-graduate', title: t.value('careerPath.graduateNav'), show: !!target.value?.graduate },
    { id: 'c-majors', title: t.value('careerPath.majorsTitle'), show: majors.value.length > 0 },
    { id: 'c-subjects', title: t.value('careerPath.subjectsNav'), show: !!result.value },
    { id: 'c-breadth', title: t.value('careerPath.breadthTitle'), show: !!result.value },
    { id: 'c-skills', title: t.value('careerPath.skillsTitle'), show: skills.value.length > 0 },
  ]
    .filter((x) => x.show)
    .map(({ id, title }) => ({ id, title, sub: false })),
)
</script>

<template>
  <div v-if="target" class="detail">
    <DetailHero :back="{ href: link('careers'), label: t('careerPath.back') }" :eyebrow="t('careerPath.title')" :title="label" :art="heroArt">
      <p v-if="majors.length" class="hero-line">{{ t('careerPath.majorsLead', { n: majors.length }) }}</p>
      <div class="actions">
        <button type="button" class="button" :class="isGoal ? 'button-quiet' : 'button-accent'" :aria-pressed="isGoal" @click="setCareer(isGoal ? undefined : id)">
          <component :is="isGoal ? Check : Target" :size="16" aria-hidden="true" />{{ isGoal ? t('careerPath.isGoal') : t('careerPath.setGoal') }}
        </button>
        <a v-if="target.occupation" class="button button-quiet" :href="target.occupation.url" target="_blank" rel="noopener">
          {{ t('careers.official') }} <ExternalLink :size="15" aria-hidden="true" />
        </a>
      </div>
    </DetailHero>

    <div class="article" :class="{ 'no-toc': sections.length < 2 }">
      <div v-if="sections.length >= 2" class="article-toc">
        <GuideToc :items="sections" :art="tocArt" />
      </div>

      <div class="body">
        <SubjectSection v-if="target.graduate" id="c-graduate" :title="t('careerPath.graduateTitle', { course: `${target.graduate.title} (${target.graduate.course})` })" :short="t('careerPath.graduateAny')">
          <details class="route-more">
            <summary>{{ t('careerPath.graduateEntry') }}<template v-if="target.graduate.prerequisites"> · {{ t('careerPath.graduatePrereq') }}</template></summary>
            <p>{{ careerText(target.graduate.entry, locale) }}</p>
            <p v-if="target.graduate.prerequisites">
              <strong>{{ t('careerPath.graduatePrereq') }}:</strong> {{ careerText(target.graduate.prerequisites, locale) }}
            </p>
            <p v-if="target.graduate.prerequisites && !target.graduate.required.length" class="hint">{{ t('careerPath.graduateNoCodes') }}</p>
          </details>
          <a class="official" :href="target.graduate.source" target="_blank" rel="noopener">
            <GraduationCap :size="15" aria-hidden="true" />{{ t('careerPath.graduateSource') }} · {{ target.graduate.checked }} <ExternalLink :size="13" aria-hidden="true" />
          </a>
        </SubjectSection>

        <SubjectSection v-if="majors.length" id="c-majors" :title="t('careerPath.majorsTitle')" :short="majors.length > 1 ? t('careerPath.pickMajor') : undefined">
          <div class="majors" role="group" :aria-label="t('careerPath.majorsTitle')">
            <button
              v-for="m in majors"
              :key="m.component"
              type="button"
              class="major"
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
        </SubjectSection>

        <SubjectSection v-if="result" id="c-subjects" :title="t('careerPath.subjectsTitle', { major: result.major.title })" :short="t('careerPath.counts', counts)">
          <p v-if="result.major.accreditation" class="acc">
            <BadgeCheck :size="16" aria-hidden="true" class="acc-icon" />
            <span><strong>{{ result.major.accreditation.body }}</strong> · {{ careerText(result.major.accreditation.summary, locale) }}</span>
          </p>
          <CareerTiers v-if="TIERS.some((x) => result!.subjects[x].length)" :tiers="result.subjects" :year="year" />
          <p v-else class="hint">{{ t('careerPath.nothingHere') }}</p>
          <p v-if="result.needs.generic.length" class="hint">{{ t('careerPath.generic', { list: result.needs.generic.join(', ') }) }}</p>
          <a class="more-link" :href="link(`majors/${result.major.component}`)">{{ t('majors.title') }} · {{ result.major.title }}</a>
        </SubjectSection>

        <SubjectSection v-if="result" id="c-breadth" :title="t('careerPath.breadthTitle')" :short="hasBreadth ? t('careerPath.breadthHintShort') : t('careerPath.breadthNone')">
          <template v-if="hasBreadth">
            <CareerTiers :tiers="result.breadth!" :year="year" />
            <a class="more-link" :href="link('subjects/breadth')">{{ t('careerPath.breadthAll') }}</a>
          </template>
        </SubjectSection>

        <SubjectSection v-if="skills.length" id="c-skills" :title="t('careerPath.skillsTitle')" :short="t('careerPath.skillsShort')">
          <ul class="skill-list">
            <li v-for="x in skills" :key="x" class="chip">{{ x }}</li>
          </ul>
          <a v-if="target.occupation" class="official" :href="target.occupation.url" target="_blank" rel="noopener">
            {{ t('careers.official') }} · {{ target.occupation.name }} <ExternalLink :size="13" aria-hidden="true" />
          </a>
        </SubjectSection>

        <p class="foot">{{ t('careerPath.noteShort') }}<InfoTip :text="t('careerPath.note')" /></p>
      </div>
    </div>
  </div>

  <div v-else class="detail">
    <DetailHero :back="{ href: link('careers'), label: t('careerPath.back') }" :title="t('careerPath.noMatch')" :art="heroArt" />
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

.hero-line {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
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

/* Lists that come as their own card fold into the section: never a box in a box. */
.body :deep(.sec .surface) {
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

.hint {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.official {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  justify-self: start;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--accent);
}

.route-more summary {
  font-weight: var(--fw-semibold);
  cursor: pointer;
}

.route-more > p {
  margin: 10px 0 0;
  max-width: 78ch;
}

/* The majors that lead there: tiles to pick from; the chosen one ringed in pink. */
.majors {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
  gap: 10px;
}

.major {
  display: grid;
  gap: 4px;
  justify-items: start;
  padding: 14px 16px;
  font: inherit;
  color: var(--ink);
  text-align: start;
  border: 1px solid var(--card-edge);
  border-radius: 16px;
  background: var(--inset-fill);
  cursor: pointer;
  transition: border-color 0.15s;
}

.major:hover {
  border-color: var(--accent);
}

.major:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.major[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.major-title {
  font-weight: var(--fw-semibold);
  overflow-wrap: anywhere;
}

.major-meta,
.tag {
  font-size: var(--fs-meta);
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
  font-size: var(--fs-caption);
  font-weight: 600;
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 999px;
}

.acc {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 12px 14px;
  font-size: var(--fs-small);
  border-radius: 14px;
  background: var(--inset-fill);
}

.acc-icon {
  flex: none;
  margin-top: 2px;
  color: var(--accent);
}

.more-link {
  justify-self: start;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--accent);
}

.skill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.skill-list .chip {
  color: var(--ink);
}

/* Where it comes from: one frosted strip at the end, never straight on the colour field. */
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

  .foot {
    margin-bottom: 16px;
  }
}
</style>

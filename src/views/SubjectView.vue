<script setup lang="ts">
import { viewYear } from '@/engine/dataYear'
import { link } from '@/composables/useView'
import { computed, nextTick, shallowRef } from 'vue'
import { Calculator } from 'lucide-vue-next'
import AssessmentPanel from '@/components/subject/AssessmentPanel.vue'
import MajorRoles from '@/components/subject/MajorRoles.vue'
import SubjectCareers from '@/components/subject/SubjectCareers.vue'
import OutsideLinks from '@/components/subject/OutsideLinks.vue'
import SubjectAbout from '@/components/subject/SubjectAbout.vue'
import SubjectFitCard from '@/components/subject/SubjectFitCard.vue'
import SubjectSection from '@/components/subject/SubjectSection.vue'
import GuideToc from '@/components/guide/GuideToc.vue'
import InfoTip from '@/components/InfoTip.vue'
import SubjectHeader from '@/components/subject/SubjectHeader.vue'
import SubjectRoute from '@/components/subject/SubjectRoute.vue'
import SubjectVerdict from '@/components/subject/SubjectVerdict.vue'
import RelatedSubjects from '@/components/subject/RelatedSubjects.vue'
import SubjectLinks from '@/components/majors/SubjectLinks.vue'
import { prerequisiteRoute, referencedSubjects, relatedSubjects, simplifyFor } from '@/engine'
import { useDataset, useSubjectDetail } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useRated } from '@/composables/useRated'
import { useSimilar } from '@/composables/useSimilar'
import { useI18n } from '@/i18n'
import { discussionLinks } from '@/utils/links'
import { pickLocalized } from '@/i18n/localized'

const props = defineProps<{ code: string }>()
const { name, data } = useDataset()
const plan = usePlan()
const { profile } = useProfile()
const { markRated } = useRated()
const { t, locale } = useI18n()

const code = computed(() => props.code.toUpperCase())
// With its long text (about, discussion) once that has loaded; the rest shows straight away.
const { subject, ready: detailReady, takenWith } = useSubjectDetail(code)
const year = computed(() => viewYear(plan.terms.value[0]?.year))
const have = computed(() => new Set([...plan.plannedCodes.value, ...plan.plan.value.completed]))
// What it leads to, the ones in the student's plan first, then by level and code.
const unlocks = computed(() =>
  Object.values(data.value.subjects)
    .filter((s) => referencedSubjects(s.prerequisites).includes(code.value))
    .sort((a, b) => Number(have.value.has(b.code)) - Number(have.value.has(a.code)) || a.level - b.level || a.code.localeCompare(b.code))
    .map((s) => s.code),
)
const taken = computed(() => profile.value.results.some((r) => r.code === code.value))
const similar = useSimilar(subject, year)
// Subject links the page already has, so the related block doesn't repeat them.
const shown = computed(() => {
  const s = subject.value
  if (!s) return []
  const course = plan.setup.value.course
  const needs = referencedSubjects(simplifyFor(s.prerequisites, course))
  const route = prerequisiteRoute(s.code, data.value.subjects, course, have.value)
  return [...unlocks.value, ...similar.value, ...s.recommended, ...(s.nonAllowed === 'unknown' ? [] : s.nonAllowed), ...(route.length > needs.length ? route : [])]
})
const related = computed(() =>
  subject.value
    ? relatedSubjects(subject.value, data.value.subjects, { leadsTo: { [code.value]: unlocks.value }, takenWith: { [code.value]: takenWith.value } }, shown.value)
    : { leadsTo: [], takenWith: [], before: [] },
)
const hasRelated = computed(() => Object.values(related.value).some((l) => l.length > 0))
const links = computed(() => (name.value === 'real' ? discussionLinks(code.value, locale.value) : []))

const rating = shallowRef(false)
const thanks = shallowRef(false)
function openRating(): void {
  rating.value = true
  // The form opens in the ratings section; take the student there.
  void nextTick(() => document.getElementById('ratings')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
function onRated(sent: boolean): void {
  rating.value = false
  if (!sent) return
  markRated(code.value)
  thanks.value = true
}

// Summary lines. Ratings: how many and the hours; none yet, said there unless reviews from
// elsewhere fill the section. What you learn: its one paragraph.
const ratingsShort = computed(() => {
  const g = subject.value?.signals
  if (g?.reviews) return [g.reviews === 1 ? t.value('subject.reviewsOne') : t.value('subject.reviews', { n: g.reviews }), g.hours ? t.value('subject.hoursWeek', { n: g.hours }) : ''].filter(Boolean).join(' · ')
  return detailReady.value && subject.value?.discussions?.length ? undefined : t.value('subject.noRatings')
})
const about = computed(() => (detailReady.value ? subject.value?.about : undefined))
const learnShort = computed(() => (about.value ? pickLocalized(about.value.learn, locale.value) : ''))

// The small illustration at the foot of "On this page" (shown only when the panel has room).
const tocArt = () => import('@/components/subject/art/MiniSubject.vue')

// The page's sections in reading order, for "On this page" (ids are anchors other pages link to).
const sections = computed(() => {
  const s = subject.value
  if (!s) return []
  return [
    { id: 'fit', title: t.value('fit.title'), show: true },
    { id: 'ratings', title: t.value('subject.ratingsTitle'), show: true },
    { id: 'learn', title: t.value('subject.aboutLearn'), show: !!about.value },
    { id: 'assessment', title: t.value('assess.title'), show: true },
    { id: 'route', title: t.value('subject.fitsTitle'), show: true },
    { id: 'related', title: t.value('subject.relatedTitle'), show: hasRelated.value },
    { id: 'discuss', title: t.value('subject.discuss'), show: links.value.length > 0 },
    { id: 'similar', title: t.value('subject.similar'), show: similar.value.length > 0 },
  ]
    .filter((x) => x.show)
    .map(({ id, title }) => ({ id, title, sub: false }))
})
</script>

<template>
  <div class="subject">
    <template v-if="subject">
      <SubjectHeader :subject="subject" :year="year" :rate-hidden="rating || thanks" @rate="openRating" />

      <!-- "On this page" on the left, the sections on the right, as on the guide's pages. -->
      <div class="article">
        <div class="article-toc">
          <GuideToc :items="sections" :art="tocArt" />
        </div>

        <div class="body">
          <SubjectSection id="fit" :title="t('fit.title')">
            <SubjectFitCard :subject="subject" :year="year" />
          </SubjectSection>

          <SubjectSection id="ratings" :title="t('subject.ratingsTitle')" :short="ratingsShort">
            <SubjectVerdict v-model:form-open="rating" :subject="subject" :taken="taken" :thanks="thanks" :detail-ready="detailReady" @rated="onRated" />
          </SubjectSection>

          <SubjectSection v-if="about" id="learn" :title="t('subject.aboutLearn')" :short="learnShort">
            <div class="outcomes">
              <h3 class="sub-title">{{ t('subject.aboutOutcomes') }}</h3>
              <ul class="about-list">
                <li v-for="(o, i) in about.outcomes" :key="i">{{ pickLocalized(o, locale) }}</li>
              </ul>
            </div>
          </SubjectSection>

          <SubjectSection id="assessment" :title="t('assess.title')">
            <template v-if="!subject.passFail" #aside>
              <a class="aside-link" :href="link(`tools/final/?subject=${subject.code}`)"><Calculator :size="15" aria-hidden="true" /> {{ t('calc.open') }}</a>
            </template>
            <AssessmentPanel :subject="subject" :year="year" :titled="false" />
          </SubjectSection>

          <SubjectSection id="route" :title="t('subject.fitsTitle')">
            <SubjectRoute :subject="subject" :year="year" :unlocks="unlocks" />
            <MajorRoles class="part" :code="code" />
            <SubjectCareers class="part" :code="code" />
          </SubjectSection>

          <!-- The lower sections fold on phones, so the page isn't a mile long. -->
          <SubjectSection v-if="hasRelated" id="related" :title="t('subject.relatedTitle')" fold>
            <template #aside><InfoTip :text="t('subject.relatedTip')" /></template>
            <RelatedSubjects :related="related" :year="year" />
          </SubjectSection>

          <SubjectSection v-if="links.length" id="discuss" :title="t('subject.discuss')" fold>
            <OutsideLinks :links="links" />
          </SubjectSection>

          <SubjectSection v-if="similar.length" id="similar" :title="t('subject.similar')" fold>
            <SubjectLinks :codes="similar" :year="year" />
          </SubjectSection>

          <p class="foot">
            <span>{{ t('subject.source', { year: subject.sourceYear }) }}</span>
            <span>{{ subject.verifiedOn ? t('subject.verified', { date: subject.verifiedOn }) : t('subject.unverified') }}</span>
            <a :href="link(`feedback?topic=data&subject=${subject.code}`)">{{ t('suggest.report') }}</a>
          </p>
        </div>
      </div>
    </template>

    <section v-else class="missing surface">
      <h1 class="page-title">{{ code ? t('subject.notFound', { code }) : t('subject.searchFirst') }}</h1>
      <p class="page-lede">{{ t('subject.notFoundText') }}</p>
      <a class="button button-accent" :href="link('contribute')">{{ t('subject.addIt') }}</a>
    </section>
  </div>
</template>

<style scoped>
/* The guide's measures (GuideView, InfoPage): frostier cards, the hero and the article sharing
   their edges, so the colour field stays calm under text. */
.subject {
  --card-fill: var(--peek-fill);

  display: grid;
  gap: 24px;
  padding-top: 20px;
  min-width: 0;
}

.article {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  gap: 48px;
  align-items: start;
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

/* Prose keeps a readable line length; rows and tiles still use the full column. */
.body :deep(:is(p:not(.basis), .about-list > li, .discussion-points > li)) {
  max-width: 78ch;
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

.body :deep(.links .row) {
  padding-inline: 0;
}

.sub-title,
.body :deep(.roles-title) {
  margin: 0;
  font-size: 1rem;
  font-weight: 650;
  color: var(--ink);
}

.outcomes {
  display: grid;
  gap: 10px;
}

.about-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
  font-size: 1rem;
  line-height: 1.55;
}

/* A part of "Where it fits" after the chain: majors, then careers. */
.part {
  padding-top: 20px;
  border-top: 1px solid var(--divider);
}

.aside-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  min-height: 32px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
}

/* Where the facts come from: one frosted strip at the end, never straight on the colour field. */
.foot {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
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

.missing {
  display: grid;
  justify-items: start;
  gap: 14px;
  padding: 32px;
}

@media (max-width: 960px) {
  .article {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
}

@media (max-width: 640px) {
  .subject {
    gap: 14px;
    padding-top: 12px;
  }

  .body {
    gap: 14px;
  }

  /* Room under the last section for the action bar above the tab bar. */
  .foot {
    margin-bottom: 64px;
  }
}
</style>

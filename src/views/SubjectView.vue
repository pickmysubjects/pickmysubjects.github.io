<script setup lang="ts">
import { viewYear } from '@/engine/dataYear'
import { link } from '@/composables/useView'
import { computed, nextTick, shallowRef } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import AssessmentPanel from '@/components/subject/AssessmentPanel.vue'
import MajorRoles from '@/components/subject/MajorRoles.vue'
import SubjectCareers from '@/components/subject/SubjectCareers.vue'
import OutsideLinks from '@/components/subject/OutsideLinks.vue'
import SubjectAbout from '@/components/subject/SubjectAbout.vue'
import FoldSection from '@/components/subject/FoldSection.vue'
import SubjectFitCard from '@/components/subject/SubjectFitCard.vue'
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
import { usePhone } from '@/composables/usePhone'
import { useI18n } from '@/i18n'
import { discussionLinks } from '@/utils/links'

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
const phone = usePhone()
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

// The page's sections in reading order, for the side index on wide screens.
const sections = computed(() => {
  const s = subject.value
  if (!s) return []
  return [
    { id: 'fit', label: t.value('fit.title'), show: true },
    { id: 'ratings', label: t.value('subject.ratingsTitle'), show: true },
    { id: 'learn', label: t.value('subject.aboutLearn'), show: detailReady.value && !!s.about },
    { id: 'assessment', label: t.value('assess.title'), show: true },
    { id: 'route', label: t.value('subject.fitsTitle'), show: true },
    { id: 'related', label: t.value('subject.relatedTitle'), show: hasRelated.value },
    { id: 'discuss', label: t.value('subject.discuss'), show: links.value.length > 0 },
    { id: 'similar', label: t.value('subject.similar'), show: similar.value.length > 0 },
  ].filter((x) => x.show)
})
</script>

<template>
  <div class="subject">
    <a class="back" :href="link('')"><ArrowLeft :size="16" aria-hidden="true" /> {{ t('subject.back') }}</a>

    <template v-if="subject">
      <SubjectHeader :subject="subject" :year="year" :rate-hidden="rating || thanks" @rate="openRating" />

      <div class="layout">
        <div class="main">
          <SubjectFitCard id="fit" class="sec-fit" :subject="subject" :year="year" />

          <section id="ratings" class="sec flat">
            <h2 class="sec-title">{{ t('subject.ratingsTitle') }}</h2>
            <SubjectVerdict v-model:form-open="rating" :subject="subject" :taken="taken" :thanks="thanks" :detail-ready="detailReady" @rated="onRated" />
          </section>

          <section v-if="detailReady && subject.about" id="learn" class="sec sec-about flat">
            <SubjectAbout :subject="subject" />
          </section>

          <section id="assessment" class="sec flat">
            <AssessmentPanel :subject="subject" :year="year" />
          </section>

          <section id="route" class="sec flat">
            <h2 class="sec-title">{{ t('subject.fitsTitle') }}</h2>
            <SubjectRoute :subject="subject" :year="year" :unlocks="unlocks" />
            <MajorRoles class="sec-roles" :code="code" />
            <SubjectCareers class="sec-roles" :code="code" />
          </section>

          <!-- The long lower sections fold on phones (FoldSection), so the page isn't a mile long. -->

          <section v-if="hasRelated" id="related" class="sec flat">
            <RelatedSubjects :related="related" :year="year" />
          </section>

          <section v-if="links.length" id="discuss" class="sec flat">
            <FoldSection :title="t('subject.discuss')">
              <OutsideLinks :links="links" />
            </FoldSection>
          </section>

          <section v-if="similar.length" id="similar" class="sec flat">
            <FoldSection :title="t('subject.similar')">
              <SubjectLinks :codes="similar" :year="year" />
            </FoldSection>
          </section>
        </div>

        <aside class="side">
          <nav class="toc side-card surface" :aria-label="t('subject.onPage')">
            <h2 class="side-title">{{ t('subject.onPage') }}</h2>
            <a v-for="s in sections" :key="s.id" class="toc-link" :href="`#${s.id}`">{{ s.label }}</a>
          </nav>
          <section class="side-card surface" aria-labelledby="side-source">
            <h2 id="side-source" class="side-title">{{ t('subject.sourceTitle') }}</h2>
            <p class="verified">
              {{ t('subject.source', { year: subject.sourceYear }) }}<br />
              {{ subject.verifiedOn ? t('subject.verified', { date: subject.verifiedOn }) : t('subject.unverified') }}
            </p>
            <a class="report" :href="link(`feedback?topic=data&subject=${subject.code}`)">{{ t('suggest.report') }}</a>
          </section>
        </aside>
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
.subject {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--page-top);
  min-width: 0;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  font-size: var(--fs-small);
  font-weight: 500;
  color: var(--ink-soft);
  text-decoration: none;
}

.back:hover {
  color: var(--ink);
}

/* Same frame as My record: a column of cards and a 320px side column of cards. */
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 320px);
  gap: var(--space-5) var(--space-6);
  align-items: start;
}

.main {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

/* Prose keeps a readable line length on the wide page; rows and tiles still use the full column. */
.main :deep(:is(p, .about-list > li, .discussion-points > li)) {
  max-width: 78ch;
}

/* One card per section, one heading style (the same as My record's). */
.sec {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-5);
  scroll-margin-top: 80px;
}

.sec.flat {
  padding: var(--space-5) 0 0;
}

@media (max-width: 640px) {
  .sec {
    padding: var(--space-4);
  }

  .sec.flat {
    padding: var(--space-4) 0 0;
  }
}

.sec-fit {
  scroll-margin-top: 80px;
}

.sec > :deep(*) {
  min-width: 0;
}

/* Lists that come as their own card fold into the section: never a box in a box. */
.sec :deep(.surface) {
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

.sec :deep(.links .row) {
  padding-inline: 0;
}

.sec-title,
.sec :deep(:is(.sec-title, .assess-title)),
.sec-about :deep(.about-row:first-child .about-label) {
  margin: 0;
  font-size: var(--fs-section);
  font-weight: 700;
  line-height: 1.3;
  color: var(--ink);
}

/* What you learn reads top to bottom: the paragraph, then what you can do after it. */
.sec-about :deep(.about) {
  grid-template-columns: minmax(0, 1fr);
  row-gap: var(--space-3);
}

.sec-about :deep(.about-row + .about-row .about-label) {
  margin-top: var(--space-3);
  font-size: 1rem;
  font-weight: 650;
  color: var(--ink);
}

.sec-about :deep(.about-list) {
  font-size: 1rem;
  gap: 6px;
}

.sec-roles {
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}

.sec :deep(.roles-title) {
  margin: 0;
  font-size: 1rem;
  font-weight: 650;
}

.side {
  position: sticky;
  top: 88px;
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.side-card {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-5);
}

.side-title {
  margin: 0 0 var(--space-1);
  font-size: 1rem;
  font-weight: 650;
  line-height: 1.3;
}

.toc {
  gap: 0;
}

.toc-link {
  padding: var(--space-2) 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  text-decoration: none;
}

.toc-link + .toc-link {
  border-top: 1px solid var(--line);
}

.toc-link:hover {
  color: var(--accent);
}

.verified {
  margin: 0;
  font-size: var(--fs-small);
  line-height: 1.6;
  color: var(--ink-soft);
}

.report {
  width: fit-content;
  font-size: var(--fs-small);
}

.missing {
  display: grid;
  justify-items: start;
  gap: 14px;
  padding: 32px;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .side {
    position: static;
  }

  .toc {
    display: none;
  }
}

@media (max-width: 560px) {
  .sec,
  .side-card {
    padding: var(--space-4);
  }

  .sec-title,
  .sec :deep(:is(.sec-title, .assess-title)),
  .sec-about :deep(.about-row:first-child .about-label) {
    font-size: var(--fs-section);
  }
}
</style>

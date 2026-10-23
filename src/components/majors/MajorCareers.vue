<script setup lang="ts">
import { computed } from 'vue'
import { BadgeCheck, ExternalLink } from 'lucide-vue-next'
import { careerText, componentCareers } from '@/engine'
import { careerLabel } from '@/utils/careersHtml'
import { careerPhrase } from '@/utils/careerPathText'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'

// "Where it can lead": what the major's Handbook page says comes after it.
const props = defineProps<{ id: string; course: string; title: string }>()
const { data } = useDataset()
const { t, locale } = useI18n()

const careers = computed(() => data.value.careers)
const entry = computed(() => componentCareers(careers.value, props.id))

const label = (names: Parameters<typeof careerLabel>[0]) => careerLabel(names, locale.value)

const jobs = computed(() =>
  (entry.value?.careers ?? []).flatMap((c) => {
    const job = careers.value?.jobs[c.job]
    if (!job) return []
    const occ = job.occupation ? careers.value?.occupations[job.occupation] : undefined
    const qualifier = c.qualifier === 'direct' ? '' : t.value(`careers.qualifier.${c.qualifier}`) + (c.via ? `: ${careerText(c.via, locale.value)}` : '')
    return [{ id: c.job, name: label(job.names), short: careerPhrase(job.names, locale.value), qualifier, occ }]
  }),
)
const related = computed(() => (entry.value?.relatedFields ?? []).flatMap((id) => careers.value?.occupations[id] ?? []).map((o) => ({ ...o, label: label(o.names) })))
const acc = computed(() => entry.value?.accreditation)
const withOneOf = computed(() => (acc.value?.withOneOf ?? []).map((id) => ({ id, title: data.value.components.find((c) => c.id === id)?.title ?? id })))
const courseStudy = computed(() => {
  const s = careers.value?.courses[props.course]?.summary
  const title = data.value.courses.find((c) => c.code === props.course)?.title ?? props.course
  return s ? t.value('careers.courseStudy', { course: title, summary: careerText(s, locale.value) }) : ''
})
const hasText = computed(() => entry.value?.careerText === true)
</script>

<template>
  <section v-if="entry" class="careers" aria-labelledby="careers-title">
    <h2 id="careers-title" class="block-title">{{ t('careers.title') }}</h2>

    <template v-if="hasText">
      <p class="block-hint">{{ t('careers.lede', { title }) }}</p>
      <ul v-if="jobs.length" class="jobs surface">
        <li v-for="j in jobs" :key="j.id" class="job">
          <span class="job-main">
            <span class="job-name">{{ j.name }}</span>
            <span v-if="j.qualifier" class="tag">{{ j.qualifier }}</span>
          </span>
          <span v-if="j.occ?.skills.length" class="skills">{{ t('careers.skills', { list: j.occ.skills.slice(0, 4).join(', ') }) }}</span>
          <a class="reverse" :href="link(`careers/${j.id}?major=${id}`)">{{ t('careerPath.fromMajor', { job: j.short }) }}</a>
          <a v-if="j.occ" class="official" :href="j.occ.url" target="_blank" rel="noopener">
            {{ t('careers.official') }} · {{ j.occ.name }} <ExternalLink :size="13" aria-hidden="true" />
          </a>
        </li>
      </ul>
    </template>
    <template v-else>
      <p class="note surface">{{ t('careers.none') }}<template v-if="courseStudy"> {{ courseStudy }}</template></p>
    </template>

    <div v-if="related.length" class="part">
      <h3 class="part-title">{{ t('careers.relatedTitle') }}</h3>
      <p class="part-hint">{{ t('careers.relatedHint') }}</p>
      <p class="chips">
        <a v-for="o in related" :key="`in-${o.id}`" class="chip" :href="link(`careers/${o.id}?major=${id}`)">{{ t('careerPath.fromMajor', { job: careerPhrase(o.names, locale) }) }}</a>
        <a v-for="o in related" :key="o.id" class="chip" :href="o.url" target="_blank" rel="noopener">{{ o.label }} <ExternalLink :size="12" aria-hidden="true" /></a>
      </p>
    </div>

    <div v-if="hasText && entry.industries.length" class="part">
      <h3 class="part-title">{{ t('careers.industries') }}</h3>
      <p class="chips"><span v-for="i in entry.industries" :key="i.en" class="chip">{{ careerText(i, locale) }}</span></p>
    </div>

    <div v-if="hasText && (entry.furtherStudy.length || courseStudy)" class="part">
      <h3 class="part-title">{{ t('careers.furtherStudy') }}</h3>
      <ul class="plain">
        <li v-for="f in entry.furtherStudy" :key="f.en">{{ careerText(f, locale) }}</li>
        <li v-if="!entry.furtherStudy.length">{{ courseStudy }}</li>
      </ul>
    </div>

    <div v-if="acc" class="acc surface">
      <h3 class="part-title acc-title"><BadgeCheck :size="17" aria-hidden="true" /> {{ t('careers.accTitle') }}</h3>
      <p class="acc-body">{{ acc.body }}</p>
      <p>{{ careerText(acc.summary, locale) }}</p>
      <div v-if="acc.required.length" class="acc-group">
        <p class="acc-label">{{ t('careers.accRequired') }}</p>
        <p class="chips">
          <span v-for="(r, i) in acc.required" :key="i" class="alt">
            <template v-for="(c, k) in [r].flat()" :key="c"><span v-if="k" class="or">{{ t('careers.or') }}</span><a class="chip code" :href="link(`subject/${c}`)">{{ c }}</a></template>
          </span>
        </p>
      </div>
      <div v-if="acc.requiredBreadth.length" class="acc-group">
        <p class="acc-label">{{ t('careers.accBreadth') }}</p>
        <p class="chips"><a v-for="c in acc.requiredBreadth" :key="c" class="chip code breadth" :href="link(`subject/${c}`)">{{ c }}</a></p>
      </div>
      <div v-if="acc.recommended.length" class="acc-group">
        <p class="acc-label">{{ t('careers.accRecommended') }}</p>
        <p class="chips"><a v-for="c in acc.recommended" :key="c" class="chip code" :href="link(`subject/${c}`)">{{ c }}</a></p>
      </div>
      <div v-if="withOneOf.length" class="acc-group">
        <p class="acc-label">{{ t('careers.accWithOne') }}</p>
        <p class="chips"><a v-for="c in withOneOf" :key="c.id" class="chip" :href="link(`majors/${c.id}`)">{{ c.title }}</a></p>
      </div>
    </div>

    <div v-if="entry.helpfulSubjects" class="part">
      <h3 class="part-title">{{ t('careers.helpful') }}</h3>
      <p class="part-hint">{{ careerText(entry.helpfulSubjects.note, locale) }}</p>
      <p class="chips"><a v-for="c in entry.helpfulSubjects.codes" :key="c" class="chip code" :href="link(`subject/${c}`)">{{ c }}</a></p>
    </div>

    <p class="source">
      <a :href="entry.source" target="_blank" rel="noopener">{{ t('careers.source') }} <ExternalLink :size="12" aria-hidden="true" /></a>
      · {{ t('careers.checked', { date: entry.checked }) }}
    </p>
  </section>
</template>

<style scoped>
.careers {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.block-title {
  font-size: 1.15rem;
  font-weight: 650;
}

.block-hint,
.part-hint {
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.jobs {
  list-style: none;
  margin: 0;
  padding: 4px 16px;
  border-radius: 16px;
}

.job {
  display: grid;
  gap: 4px;
  padding: 12px 0;
}

.job + .job {
  border-top: 1px solid var(--glass-edge);
}

.job-main {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
}

.job-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.tag {
  font-size: 0.8125rem;
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}

.skills {
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.reverse {
  justify-self: start;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
}

.official {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  justify-self: start;
  font-size: 0.8125rem;
  color: var(--accent);
}

.part {
  display: grid;
  gap: 6px;
}

.part-title {
  font-size: 0.9375rem;
  font-weight: 650;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chips .chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.chips a.chip:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.chip.breadth {
  border-style: dashed;
}

.alt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.or {
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.plain {
  margin: 0;
  padding-left: 18px;
  font-size: 0.9375rem;
}

.acc {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 16px;
  font-size: 0.9375rem;
}

.acc-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
}

.acc-body {
  font-weight: 600;
}

.acc-group {
  display: grid;
  gap: 4px;
}

.acc-label {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.note {
  padding: 14px 16px;
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.source {
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.source a {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: inherit;
}
</style>

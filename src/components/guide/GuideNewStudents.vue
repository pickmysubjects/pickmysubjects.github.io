<script setup lang="ts">
import { computed } from 'vue'
import GuideItem from './GuideItem.vue'
import GuideLinks from './GuideLinks.vue'
import FirstYearPreview from './FirstYearPreview.vue'
import { ADMISSION_STEPS, ADMISSION_YEAR, ATAR_GUARANTEES_URL, UNIMELB_VTAC_URL, VTAC_DATES_SOURCE } from '@/content/admissions'
import { KEY_DATES, KEY_DATES_SOURCE, melbourneToday } from '@/utils/keyDates'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'

// The "new students" page of the basics guide: from ATAR results to the first day of semester.
const { t, locale } = useI18n()
const today = melbourneToday()

const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale.value, { weekday: 'short', day: 'numeric', month: 'long' })
const time = (hhmm: string) => new Date(`2000-01-01T${hhmm}:00`).toLocaleTimeString(locale.value, { hour: 'numeric', minute: '2-digit' })

// VTAC's dates, then the University's own: Orientation and the first day of Semester 1.
const ownDate = (kind: string) => KEY_DATES.find((d) => d.kind === kind && d.term === 'semester-1' && d.year === ADMISSION_YEAR)
const steps = computed(() => {
  const vtac = ADMISSION_STEPS.map((s) => ({
    id: s.id,
    when: s.end ? `${day(s.date)} – ${day(s.end)}` : `${day(s.date)}${s.time ? ` · ${time(s.time)}` : ''}`,
    past: (s.end ?? s.date) < today,
  }))
  const orientation = ownDate('orientation')
  const teaching = ownDate('teaching')
  return [
    ...vtac,
    { id: 'enrol', when: '', past: false },
    ...(orientation ? [{ id: 'orientation', when: `${day(orientation.start)} – ${day(orientation.end)}`, past: orientation.end < today }] : []),
    ...(teaching ? [{ id: 'teaching', when: day(teaching.start), past: teaching.start < today }] : []),
  ]
})
</script>

<template>
  <GuideItem id="after-atar" :title="t('guide.ns.timelineTitle')" :short="t('guide.ns.timelineShort')">
    <ol class="steps">
      <li v-for="s in steps" :key="s.id" :class="{ past: s.past }">
        <strong>{{ t(`guide.ns.step.${s.id}`) }}</strong>
        <span v-if="s.when" class="when"> · {{ s.when }}</span>
        <br />
        <span class="note">{{ t(`guide.ns.stepText.${s.id}`) }}</span>
      </li>
    </ol>
    <GuideLinks
      :links="[
        { href: VTAC_DATES_SOURCE, label: t('guide.ns.vtacDates') },
        { href: KEY_DATES_SOURCE, label: t('guide.ns.uniDates') },
      ]"
    />
  </GuideItem>

  <GuideItem id="atar-offers" :title="t('guide.ns.offersTitle')" :short="t('guide.ns.offersShort')">
    <ul class="plain">
      <li>{{ t('guide.ns.offerGuaranteed') }}</li>
      <li>{{ t('guide.ns.offerLsr') }}</li>
      <li>{{ t('guide.ns.offerChange') }}</li>
      <li>{{ t('guide.ns.offerAccept') }}</li>
    </ul>
    <GuideLinks
      :links="[
        { href: ATAR_GUARANTEES_URL, label: t('guide.ns.atarLink') },
        { href: UNIMELB_VTAC_URL, label: t('guide.ns.vtacInfoLink') },
      ]"
    />
  </GuideItem>

  <GuideItem id="first-year" :title="t('guide.ns.firstYearTitle')" :short="t('guide.ns.firstYearShort')">
    <FirstYearPreview />
  </GuideItem>

  <GuideItem id="first-tips" :title="t('guide.ns.tipsTitle')" :short="t('guide.ns.tipsShort')">
    <ul class="plain">
      <li>{{ t('guide.ns.tipBreadth') }}</li>
      <li>{{ t('guide.ns.tipLoad') }}</li>
      <li>{{ t('guide.ns.tipMajor') }}</li>
      <li>{{ t('guide.ns.tipClubs') }}</li>
    </ul>
    <p class="actions">
      <a class="button button-quiet" :href="link('guide/basics/')">{{ t('guide.cat.basics.nav') }}</a>
      <a class="button button-quiet" :href="link('subjects/breadth/')">{{ t('tools.breadth') }}</a>
      <a class="button button-quiet" :href="link('majors/')">{{ t('browse.switchMajors') }}</a>
      <a class="button button-quiet" :href="link('clubs/')">{{ t('clubsPage.title') }}</a>
    </p>
  </GuideItem>
</template>

<style scoped>
.when {
  color: var(--accent);
  font-weight: 600;
}

/* A step already behind us stays readable, just quieter. */
.past {
  opacity: 0.55;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0 0;
}
</style>

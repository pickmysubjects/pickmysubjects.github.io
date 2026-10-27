<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { ArrowRight, CalendarClock, GraduationCap } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import { summariseAssessment } from '@/utils/assessment'
import { KEY_DATES, melbourneToday, type KeyDate } from '@/utils/keyDates'
import { examWindow, myTerm, upcomingDates, type StripItem } from '@/utils/whatsNext'

/**
 * A compact strip near the top of home: the next 1–3 key dates (Melbourne time, from the
 * device clock), the student's own term when they have subjects in it, and during SWOT Vac and
 * exams a card of their subjects' exam weights and hurdles. Shows nothing when nothing is near.
 */
const { t, locale } = useI18n()
const { data } = useDataset()
const { profile } = useProfile()
const plan = usePlan()

// Only in the browser (the prerendered page would freeze the build day), and a dev-only
// ?today=YYYY-MM-DD to look at any day.
const today = shallowRef('')
onMounted(() => {
  const fake = import.meta.env.DEV ? new URLSearchParams(location.search).get('today') : null
  today.value = fake && /^\d{4}-\d{2}-\d{2}$/.test(fake) ? fake : melbourneToday()
})

const items = computed(() => (today.value ? upcomingDates(KEY_DATES, today.value) : []))
const mine = computed(() => (today.value ? myTerm(KEY_DATES, today.value, plan.terms.value, profile.value.results) : null))
const exam = computed(() => (today.value ? examWindow(KEY_DATES, today.value) : null))

const fmt = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' }))
const day = (d: string) => fmt.value.format(new Date(`${d}T00:00:00Z`))
const range = (d: KeyDate) => (d.start === d.end ? day(d.start) : fmt.value.formatRange(new Date(`${d.start}T00:00:00Z`), new Date(`${d.end}T00:00:00Z`)))
const termName = (year: number, term: string) => `${t.value(`period.${term}`)} ${year}`

function when(i: StripItem): string {
  if (i.running) return t.value('next.until', { date: day(i.date.end) })
  if (i.days === 0) return t.value('next.today')
  if (i.days === 1) return t.value('next.tomorrow')
  return t.value('next.inDays', { n: i.days })
}

const mineLine = computed(() => {
  const m = mine.value
  return m?.exams ? t.value('next.mine', { n: m.subjects.length, range: range(m.exams) }) : ''
})

// Exam mode: the student's subjects in the term whose exams are on, with what's recorded.
const examSubjects = computed(() => {
  const w = exam.value
  if (!w || !mine.value || mine.value.year !== w.year || mine.value.term !== w.term) return []
  return mine.value.subjects.flatMap((code) => {
    const s = data.value.subjects[code]
    if (!s) return []
    const a = summariseAssessment(s.assessment)
    return [{ code, title: localTitle(s, locale.value) || s.title, assessment: a }]
  })
})
</script>

<template>
  <section v-if="exam && examSubjects.length" class="next glass next-exam" aria-labelledby="next-title">
    <h2 id="next-title" class="next-head">
      <GraduationCap :size="18" aria-hidden="true" />{{ t('next.examTitle', { term: termName(exam.year, exam.term) }) }}
      <span class="next-sub">{{ t('next.examsOn', { range: range(exam.exams) }) }}</span>
    </h2>
    <ul class="exam-list">
      <li v-for="s in examSubjects" :key="s.code" class="exam-row">
        <span class="exam-name"><span class="exam-code">{{ s.code }}</span> {{ s.title }}</span>
        <span class="exam-facts">
          <template v-if="!s.assessment">{{ t('next.notRecorded') }}</template>
          <template v-else-if="s.assessment.exam > 0">
            {{ t('next.examLine', { n: s.assessment.exam }) }}<span v-if="s.assessment.examHurdle" class="exam-hurdle">{{ t('next.hurdle') }}</span>
          </template>
          <template v-else>{{ t('next.noExam') }}</template>
        </span>
        <a class="exam-link" :href="link(`subject/${s.code}#assessment`)">{{ t('next.assess') }}<ArrowRight :size="14" aria-hidden="true" /></a>
      </li>
    </ul>
  </section>
  <section v-else-if="items.length || mineLine" class="next glass" aria-labelledby="next-title">
    <h2 id="next-title" class="next-head">
      <CalendarClock :size="18" aria-hidden="true" />{{ t('next.title') }}
      <InfoTip :text="t('guide.kd.note')" />
    </h2>
    <ul class="next-list">
      <li v-if="mineLine" class="next-item next-mine">{{ mineLine }}</li>
      <li v-for="i in items" :key="i.date.id" class="next-item">
        <span class="next-what">{{ t(`guide.kd.kind.${i.date.kind}`) }}</span>
        <span class="next-when">{{ when(i) }}</span>
        <span v-if="i.date.kind === 'census'" class="next-why">{{ t('next.censusWhy') }}</span>
      </li>
    </ul>
    <a class="next-all" :href="link('guide/key-dates/')">{{ t('next.all') }}<ArrowRight :size="14" aria-hidden="true" /></a>
  </section>
</template>

<style scoped>
.next {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
  padding: 12px 18px;
  border-radius: var(--radius, 16px);
}

.next-head {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--fs-small);
  font-weight: 700;
}

.next-sub {
  font-weight: 500;
  color: var(--ink-soft);
}

.next-list {
  display: flex;
  flex: 1 1 320px;
  flex-wrap: wrap;
  gap: 6px 20px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-small);
}

.next-item {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0 6px;
  min-width: 0;
}

.next-what {
  font-weight: 650;
}

.next-when {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.next-why {
  color: var(--ink-soft);
}

.next-mine {
  font-weight: 650;
}

.next-all,
.exam-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-small);
  white-space: nowrap;
}

.next-exam {
  display: grid;
}

.exam-list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-small);
}

.exam-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 4px 16px;
  padding: 6px 0;
  border-top: 1px solid var(--line);
}

.exam-row:first-child {
  border-top: 0;
}

.exam-name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.exam-code {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.exam-facts {
  font-variant-numeric: tabular-nums;
}

.exam-hurdle {
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-soft, var(--line));
  font-size: 0.8125rem;
}

@media (max-width: 520px) {
  .exam-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .exam-name {
    grid-column: 1 / -1;
  }
}
</style>

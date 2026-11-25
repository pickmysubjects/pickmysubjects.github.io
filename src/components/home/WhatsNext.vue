<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from 'lucide-vue-next'
import WeekStrip from '@/components/semester/WeekStrip.vue'
import { link } from '@/composables/useView'
import { useSemester } from '@/composables/useSemester'
import { useI18n } from '@/i18n'
import { NEWS } from '@/content/news'
import { KEY_DATES } from '@/utils/keyDates'
import { examWindow } from '@/utils/whatsNext'
import { nextKeyDates } from '@/utils/semester'

/**
 * The home page's one "now" card, a preview of /this-semester/ in at most four short lines: which
 * week it is, a slim strip of the semester's weeks, the single next thing (during SWOT Vac and
 * exams: the student's own exams, with the revision planner beside them), and the latest news.
 * Drawn after mounting only (the prerendered page would freeze the build day).
 */
const { t, locale } = useI18n()
const { today, now, subjects, day, range, when, termName, status, dateLabel } = useSemester()

const news = NEWS[0]
const name = computed(() => (now.value ? termName(now.value.sem.year, now.value.sem.term) : ''))
const next = computed(() => (today.value ? (nextKeyDates(KEY_DATES, today.value, 1)[0] ?? null) : null))

// SWOT Vac and exams with the student's subjects in that term: their exams are the next thing.
const exam = computed(() => {
  const w = today.value ? examWindow(KEY_DATES, today.value) : null
  const n = now.value
  if (!w || !n || n.sem.year !== w.year || n.sem.term !== w.term || !subjects.value.length) return null
  return t.value(subjects.value.length === 1 ? 'next.mineOne' : 'next.mine', { n: subjects.value.length, range: range(w.exams) })
})

const nextLine = computed(() => {
  const i = next.value
  if (!i) return null
  const whenText = i.running ? t.value('next.until', { date: day(i.date.end) }) : when(i.days, i.date.start)
  return { what: dateLabel(i.date), when: whenText, soon: !i.running && i.days <= 2, census: i.date.kind === 'census' }
})
</script>

<template>
  <section v-if="today && (now || nextLine)" class="next glass" aria-labelledby="next-title">
    <div class="next-top">
      <h2 id="next-title" class="next-head">{{ status || t('next.title') }}</h2>
      <a class="next-open" :href="link('this-semester/')">{{ t('sem.open') }}<ArrowRight :size="14" aria-hidden="true" /></a>
    </div>
    <WeekStrip v-if="now" class="next-strip" :sem="now.sem" :today="today" :name="name" slim />
    <p v-if="exam" class="next-line">
      <span class="next-label">{{ t('sem.nextLabel') }}</span>
      <span class="next-what">{{ exam }}</span>
      <a class="next-act" :href="link('tools/revision/')">{{ t('next.revision') }}<ArrowRight :size="14" aria-hidden="true" /></a>
    </p>
    <p v-else-if="nextLine" class="next-line">
      <span class="next-label">{{ t('sem.nextLabel') }}</span>
      <span class="next-what">{{ nextLine.what }}</span>
      <span class="next-when" :class="{ soon: nextLine.soon }">{{ nextLine.when }}</span>
      <span v-if="nextLine.census" class="next-why">{{ t('next.censusWhy') }}</span>
    </p>
    <a v-if="news" id="news" class="next-news" :href="link('news')">
      <span class="next-label">{{ t('news.title') }}</span>
      <span class="news-title">{{ news.title[locale] }}</span>
      <span class="news-read">{{ t('news.more') }}<ArrowRight :size="14" aria-hidden="true" /></span>
    </a>
  </section>
</template>

<style scoped>
.next {
  display: grid;
  gap: 8px;
  padding: 12px 18px;
  border-radius: var(--radius, 16px);
}

.next-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 2px 16px;
}

.next-head {
  margin: 0;
  font-size: var(--fs-small);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.next-open,
.next-act {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
  text-decoration: none;
}

.next-act {
  margin-inline-start: auto;
}

.next-strip {
  margin: 2px 0;
}

.next-line,
.next-news {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 10px;
  margin: 0;
  font-size: var(--fs-small);
}

.next-label {
  font-weight: 650;
}

.next-what {
  min-width: 0;
}

.next-when {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.next-when.soon {
  color: var(--bad);
}

.next-why {
  color: var(--ink-soft);
}

/* The news row: under the rest, a hairline above; the whole row is the link. */
.next-news {
  padding-top: 8px;
  border-top: 1px solid var(--line);
  color: var(--ink);
  text-decoration: none;
}

.news-title {
  flex: 1 1 200px;
  min-width: 0;
  color: var(--ink-soft);
}

.news-read {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  white-space: nowrap;
}

.next-news:hover .news-title {
  color: var(--ink);
}
</style>

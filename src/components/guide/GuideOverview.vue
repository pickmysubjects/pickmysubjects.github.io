<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, CalendarDays } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { termFullLabel } from '@/i18n/format'
import { KEY_DATES, melbourneToday } from '@/utils/keyDates'
import { upcomingDates, type StripItem } from '@/utils/whatsNext'
import GuidePageCard from './GuidePageCard.vue'
import { GUIDE_PAGE_CARDS, GUIDE_START } from './guidePages'

/**
 * /guide/: an index of the guide. Each page is a card with its small illustration, its short name
 * (the 墨大入门 menu's; a page's long title is only its own heading) and direct links to the
 * places students look for most. The three pages a new student starts with come first, larger.
 * Key dates is the panel of the next few dates at the end.
 */
const { t, locale } = useI18n()
const start = GUIDE_PAGE_CARDS.filter((p) => GUIDE_START.includes(p.slug))
const rest = GUIDE_PAGE_CARDS.filter((p) => !GUIDE_START.includes(p.slug))

// The next dates within about four months (a running exam period or re-enrolment shows "until …").
const dates = computed(() => upcomingDates(KEY_DATES, melbourneToday(), 4, 120))
const fmt = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'UTC' }))
const day = (d: string) => fmt.value.format(new Date(`${d}T00:00:00Z`))
function when(i: StripItem): string {
  if (i.running) return t.value('next.until', { date: day(i.date.end) })
  if (i.days === 0) return t.value('next.today')
  if (i.days === 1) return t.value('next.tomorrow')
  return t.value('next.inDays', { n: i.days })
}
</script>

<template>
  <ul class="cards cards-start">
    <GuidePageCard v-for="p in start" :key="p.slug" :page="p" big />
  </ul>

  <ul class="cards cards-rest">
    <GuidePageCard v-for="p in rest" :key="p.slug" :page="p" />
  </ul>

  <section class="upcoming surface" aria-labelledby="upcoming-title">
    <header class="up-head">
      <h2 id="upcoming-title" class="up-title"><CalendarDays :size="18" aria-hidden="true" />{{ dates.length ? t('guide.kd.upcoming') : t('guide.datesTitle') }}</h2>
      <a class="up-all" :href="link('guide/key-dates/')">{{ t('next.all') }}<ArrowRight :size="15" aria-hidden="true" /></a>
    </header>
    <ol v-if="dates.length" class="up-list">
      <li v-for="i in dates" :key="i.date.id" class="up-item">
        <span class="up-when">{{ when(i) }}</span>
        <span class="up-what">{{ t(`guide.kd.kind.${i.date.kind}`) }}</span>
        <span class="up-meta">{{ day(i.date.start) }} · {{ termFullLabel(t, { year: i.date.year, period: i.date.term }) }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.cards {
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cards-start {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cards-rest {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.upcoming {
  display: grid;
  gap: 16px;
  padding: 22px 28px 24px;
}

.up-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}

.up-title {
  display: inline-flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-section);
  font-weight: var(--fw-bold);
}

.up-title svg {
  color: var(--accent);
}

.up-all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: var(--fw-semibold);
  text-decoration: none;
}

.up-all:hover {
  text-decoration: underline;
}

.up-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.up-item {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--inset-fill);
}

.up-when {
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--accent);
}

.up-what {
  font-weight: var(--fw-semibold);
  line-height: 1.35;
}

.up-meta {
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

@media (max-width: 1100px) {
  .cards-start {
    grid-template-columns: 1fr;
  }

  .cards-rest,
  .up-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .cards {
    gap: 12px;
  }

  .cards-rest,
  .up-list {
    grid-template-columns: 1fr;
  }

  .upcoming {
    padding: 18px 14px;
    border-radius: 18px;
  }

  .up-item {
    padding: 12px 14px;
  }
}
</style>

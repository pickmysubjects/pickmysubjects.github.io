<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, CalendarDays } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { termFullLabel } from '@/i18n/format'
import { MENUS } from '@/components/layout/nav'
import { KEY_DATES, melbourneToday } from '@/utils/keyDates'
import { upcomingDates, type StripItem } from '@/utils/whatsNext'

/**
 * /guide/: one glass card per section (the same icons and one-liners as the 墨大入门 menu), then
 * the next few key dates.
 */
const { t, locale } = useI18n()
const SECTIONS = MENUS.find((m) => m.area === 'guide')!.items.filter((i) => i.to !== 'guide/')
const title = (to: string) => {
  const slug = to.split('/')[1]!
  return slug === 'key-dates' ? t.value('guide.kd.title') : t.value(`guide.cat.${slug}.title`)
}

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
  <ul class="cards">
    <li v-for="s in SECTIONS" :key="s.to">
      <a class="card surface" :href="link(s.to)">
        <span class="card-icon"><component :is="s.icon" :size="20" aria-hidden="true" /></span>
        <span class="card-title">{{ title(s.to) }}</span>
        <span class="card-desc">{{ t(s.desc) }}</span>
        <ArrowRight :size="16" aria-hidden="true" class="card-go" />
      </a>
    </li>
  </ul>

  <section v-if="dates.length" class="upcoming surface" aria-labelledby="upcoming-title">
    <header class="up-head">
      <h2 id="upcoming-title" class="up-title"><CalendarDays :size="18" aria-hidden="true" />{{ t('guide.kd.upcoming') }}</h2>
      <a class="up-all" :href="link('guide/key-dates/')">{{ t('next.all') }}<ArrowRight :size="15" aria-hidden="true" /></a>
    </header>
    <ol class="up-list">
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  position: relative;
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 8px;
  height: 100%;
  padding: 22px 22px 24px;
  color: inherit;
  text-decoration: none;
  transition: transform 0.2s var(--ease-spring), box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
}

.card-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-bottom: 8px;
  color: var(--accent);
  border-radius: 14px;
  background: var(--accent-soft);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 50%);
}

.card-title {
  padding-right: 20px;
  font-size: 1.0625rem;
  font-weight: var(--fw-bold);
  line-height: 1.35;
  text-wrap: balance;
  transition: color 0.15s;
}

.card:hover .card-title {
  color: var(--accent);
}

.card-desc {
  font-size: var(--fs-small);
  line-height: 1.5;
  color: var(--ink-soft);
}

.card-go {
  position: absolute;
  top: 24px;
  right: 20px;
  color: var(--ink-faint);
  transition: transform 0.2s, color 0.2s;
}

.card:hover .card-go {
  color: var(--accent);
  transform: translateX(3px);
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
  justify-content: space-between;
  gap: 8px 16px;
}

.up-title {
  display: inline-flex;
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
  color: var(--ink-faint);
}

@media (max-width: 1100px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .up-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Phones: each section a compact row, icon on the left. */
@media (max-width: 640px) {
  .cards {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .card {
    grid-template-columns: 40px minmax(0, 1fr);
    grid-template-rows: auto auto;
    column-gap: 14px;
    row-gap: 2px;
    padding: 14px 40px 14px 14px;
    border-radius: 18px;
  }

  .card-icon {
    grid-row: 1 / 3;
    width: 40px;
    height: 40px;
    margin: 0;
    border-radius: 12px;
  }

  .card-title {
    padding-right: 0;
    font-size: 1rem;
  }

  .card-go {
    top: 50%;
    margin-top: -8px;
    right: 14px;
  }

  .upcoming {
    padding: 20px 16px;
    border-radius: 20px;
  }

  .up-list {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .up-item {
    padding: 12px 14px;
  }
}
</style>

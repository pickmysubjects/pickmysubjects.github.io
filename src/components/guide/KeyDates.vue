<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { computed } from 'vue'
import { CalendarPlus, ExternalLink } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { termFullLabel } from '@/i18n/format'
import { URLS } from '@/utils/guideLinks'
import { buildIcs, downloadIcs, groupKeyDates, KEY_DATES, melbourneToday, type KeyDate, type KeyDateGroup } from '@/utils/keyDates'
import GuideItem from './GuideItem.vue'
import GuideCallout from './GuideCallout.vue'
import GuideLinks from './GuideLinks.vue'

/** The University's key dates as one timeline per term, still-to-come first, with a calendar download. */
const { t, locale } = useI18n()
const today = melbourneToday()
const groups = computed(() => groupKeyDates(KEY_DATES, today))
const all = computed(() => [...groups.value.upcoming, ...groups.value.past])
// The very next date on the page gets a "coming up" marker.
const nextId = computed(() => groups.value.upcoming.flatMap((g) => g.items).find((i) => !i.past)?.id ?? null)

const fmtDay = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' }))
const fmtWeekday = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' }))
const at = (d: string) => new Date(`${d}T00:00:00Z`)
const day = (d: string) => fmtDay.value.format(at(d))
const weekday = (d: string) => fmtWeekday.value.format(at(d))
const groupName = (g: KeyDateGroup) => termFullLabel(t.value, { year: g.year, period: g.term })
const groupId = (g: KeyDateGroup) => `term-${g.year}-${g.term}`
const label = (d: KeyDate) => `${t.value(`guide.kd.kind.${d.kind}`)} · ${termFullLabel(t.value, { year: d.year, period: d.term })}`
const isPast = (g: KeyDateGroup) => groups.value.past.includes(g)

function download(): void {
  const items = groups.value.upcoming.flatMap((g) => g.items.filter((i) => !i.past))
  downloadIcs(buildIcs(items, label), 'unimelb-key-dates.ics')
}
</script>

<template>
  <div class="kd-actions surface">
    <button type="button" class="button button-accent" @click="download">
      <CalendarPlus :size="16" aria-hidden="true" />{{ t('guide.kd.add') }}
    </button>
    <!-- What the file holds and where the dates come from, behind one ⓘ. -->
    <InfoTip :text="[t('guide.kd.addHint'), t('guide.kd.notYet'), t('guide.kd.yearRound')].join(' ')" />
  </div>

  <section
    v-for="g in all"
    :id="groupId(g)"
    :key="groupId(g)"
    class="kd-group surface"
    :class="{ 'kd-done': isPast(g) }"
    :data-toc="groupName(g)"
  >
    <h2 class="kd-term">
      {{ groupName(g) }}
      <span v-if="isPast(g)" class="kd-past-tag">{{ t('guide.kd.past') }}</span>
    </h2>
    <ol class="kd-list">
      <li v-for="i in g.items" :key="i.id" class="kd-item" :class="[i.kind, { past: i.past, next: i.id === nextId }]">
        <time class="kd-date" :datetime="i.start">
          <span class="kd-day">{{ day(i.start) }}<template v-if="i.end !== i.start"> – {{ day(i.end) }}</template></span>
          <span class="kd-weekday">{{ weekday(i.start) }}<template v-if="i.end !== i.start"> – {{ weekday(i.end) }}</template></span>
        </time>
        <span class="kd-dot" aria-hidden="true" />
        <span class="kd-what">
          <a v-if="i.url !== URLS.KEY_DATES" :href="i.url" target="_blank" rel="noopener">{{ t(`guide.kd.kind.${i.kind}`) }}<ExternalLink :size="13" aria-hidden="true" /></a>
          <template v-else>{{ t(`guide.kd.kind.${i.kind}`) }}</template>
          <span v-if="i.id === nextId" class="kd-next">{{ t('next.title') }}</span>
        </span>
      </li>
    </ol>
  </section>

  <!-- The usual dates in words (moved here from Help, so all the dates live on one page). -->
  <GuideItem id="dates" :title="t('guide.datesTitle')" :short="t('guide.datesShort')">
    <ul class="plain">
      <li>{{ t('guide.datesStart') }}</li>
      <li>{{ t('guide.datesS1') }}</li>
      <li>{{ t('guide.datesS2') }}</li>
      <li>{{ t('guide.datesOther') }}</li>
    </ul>
    <GuideCallout kind="pull">{{ t('guide.kd.note') }}</GuideCallout>
    <p>{{ t('guide.kd.employabilityText') }}</p>
    <GuideLinks
      :links="[
        { href: URLS.KEY_DATES, label: t('guide.kd.official') },
        { href: URLS.EMPLOYABILITY, label: t('guide.kd.employabilityLink') },
        { href: URLS.CENSUS, label: t('guide.censusLink') },
      ]"
    />
  </GuideItem>
</template>

<style scoped>
.kd-actions {
  display: flex;
  width: fit-content;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  padding: 16px 20px;
}

.kd-actions .button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.kd-actions-note {
  font-family: var(--font-code);
  font-size: var(--fs-meta);
  color: var(--ink-faint);
}

.kd-group {
  padding: 24px 32px 20px;
  scroll-margin-top: 96px;
}

.kd-term {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  margin-bottom: 12px;
  font-size: var(--fs-section);
  font-weight: var(--fw-bold);
  line-height: var(--lh-heading);
}

.kd-past-tag {
  font-size: var(--fs-meta);
  font-weight: var(--fw-medium);
  color: var(--ink-faint);
}

/* A timeline: date | dot on a line | what. */
.kd-list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.kd-item {
  --dot: var(--ink-faint);
  position: relative;
  display: grid;
  grid-template-columns: 10.5rem 14px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  padding: 10px 0;
}

/* The line through the dots. */
.kd-item::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(10.5rem + 14px + 6px);
  width: 2px;
  background: var(--divider);
}

.kd-item:first-child::before {
  top: 50%;
}

.kd-item:last-child::before {
  bottom: 50%;
}

.kd-date {
  display: grid;
  gap: 1px;
  font-variant-numeric: tabular-nums;
}

.kd-day {
  font-weight: var(--fw-semibold);
}

.kd-weekday {
  font-size: var(--fs-meta);
  color: var(--ink-faint);
}

.kd-dot {
  position: relative;
  width: 12px;
  height: 12px;
  margin-top: 0.45em;
  margin-left: 1px;
  border: 2px solid var(--dot);
  border-radius: 50%;
  background: var(--surface);
}

.kd-what {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  padding-top: 0.05em;
}

.kd-what a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* The dates that cost money or marks if missed stand out. */
.census {
  --dot: var(--warn);
}

.withdraw {
  --dot: var(--bad);
}

.exams,
.swotvac {
  --dot: var(--accent-fill);
}

.results {
  --dot: var(--good);
}

.census .kd-what,
.withdraw .kd-what,
.exams .kd-what {
  font-weight: var(--fw-semibold);
}

.census .kd-dot,
.withdraw .kd-dot,
.exams .kd-dot,
.results .kd-dot {
  background: var(--dot);
}

.next .kd-dot {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-fill) 22%, transparent);
}

.kd-next {
  padding: 1px 8px;
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
  color: var(--accent-fill-ink);
  border-radius: 999px;
  background: var(--accent-fill);
}

/* Dates that have passed: quieter, but every line still easy to read (no see-through text). */
.past :is(.kd-day, .kd-what) {
  font-weight: var(--fw-regular);
  color: var(--ink-soft);
}

.past .kd-dot {
  opacity: 0.5;
}

@media (max-width: 640px) {
  .kd-group {
    padding: 20px 16px 14px;
    border-radius: 20px;
  }

  /* Phones: the dot on the left, the date above what it is. */
  .kd-item {
    grid-template-columns: 14px minmax(0, 1fr);
    grid-template-areas: 'dot date' 'dot what';
    gap: 2px 12px;
    padding: 8px 0;
  }

  .kd-date {
    grid-area: date;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 8px;
  }

  .kd-dot {
    grid-area: dot;
    margin-top: 0.4em;
  }

  .kd-what {
    grid-area: what;
  }

  .kd-item::before {
    left: 6px;
  }

  .kd-actions {
    padding: 14px 16px;
  }
}
</style>

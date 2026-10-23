<script setup lang="ts">
import { computed } from 'vue'
import { CalendarPlus, ExternalLink } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { URLS } from '@/utils/guideLinks'
import { buildIcs, groupKeyDates, KEY_DATES, melbourneToday, type KeyDate, type KeyDateGroup } from '@/utils/keyDates'

/** The University's key dates as a timeline, still-to-come first, with a calendar download. */
const { t, locale } = useI18n()
const today = melbourneToday()
const groups = computed(() => groupKeyDates(KEY_DATES, today))

const fmt = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'UTC' }))
const day = (d: string) => fmt.value.format(new Date(`${d}T00:00:00Z`))
const range = (d: KeyDate) => (d.start === d.end ? day(d.start) : `${day(d.start)} – ${day(d.end)}`)
const groupName = (g: KeyDateGroup) => `${t.value(`period.${g.term}`)} ${g.year}`
const label = (d: KeyDate) => `${t.value(`guide.kd.kind.${d.kind}`)} · ${t.value(`period.${d.term}`)} ${d.year}`

function download(): void {
  const items = groups.value.upcoming.flatMap((g) => g.items.filter((i) => !i.past))
  const blob = new Blob([buildIcs(items, label)], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'unimelb-key-dates.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
</script>

<template>
  <div class="kd">
    <div class="kd-actions">
      <button type="button" class="button button-accent" @click="download">
        <CalendarPlus :size="16" aria-hidden="true" />{{ t('guide.kd.add') }}
      </button>
      <span class="note">{{ t('guide.kd.addHint') }}</span>
    </div>
    <p class="note">{{ t('guide.kd.note') }} {{ t('guide.kd.notYet') }}</p>

    <section v-for="g in [...groups.upcoming, ...groups.past]" :key="`${g.year}-${g.term}`" class="kd-group surface" :class="{ 'kd-done': groups.past.includes(g) }">
      <h2 class="kd-term">
        {{ groupName(g) }}
        <span v-if="groups.past.includes(g)" class="kd-past-tag">{{ t('guide.kd.past') }}</span>
      </h2>
      <ol class="kd-list">
        <li v-for="i in g.items" :key="i.id" class="kd-item" :class="{ past: i.past, [i.kind]: true }">
          <span class="kd-date">{{ range(i) }}</span>
          <span class="kd-what">
            <a v-if="i.kind === 'employability'" :href="i.url" target="_blank" rel="noopener">{{ t(`guide.kd.kind.${i.kind}`) }}<ExternalLink :size="13" aria-hidden="true" /></a>
            <template v-else>{{ t(`guide.kd.kind.${i.kind}`) }}</template>
          </span>
        </li>
      </ol>
    </section>

    <p class="note">{{ t('guide.kd.employabilityText') }}</p>
    <ul class="links">
      <li><a :href="URLS.KEY_DATES" target="_blank" rel="noopener">{{ t('guide.kd.official') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
      <li><a :href="URLS.EMPLOYABILITY" target="_blank" rel="noopener">{{ t('guide.kd.employabilityLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
      <li><a :href="URLS.CENSUS" target="_blank" rel="noopener">{{ t('guide.censusLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
    </ul>
  </div>
</template>

<style scoped>
.kd {
  display: grid;
  gap: 14px;
}

.kd-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.kd-actions .button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.kd-group {
  padding: 14px 20px;
}

.kd-term {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 1.05rem;
  font-weight: 700;
}

.kd-past-tag {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ink-faint);
}

.kd-list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.kd-item {
  display: grid;
  grid-template-columns: minmax(0, 13em) minmax(0, 1fr);
  gap: 12px;
  padding: 7px 0;
  border-top: 1px solid var(--line);
}

.kd-item:first-child {
  border-top: 0;
}

.kd-date {
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
}

.kd-what a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.census .kd-what,
.withdraw .kd-what,
.exams .kd-what {
  font-weight: 650;
}

.past,
.kd-done {
  opacity: 0.55;
}

.kd-done .past {
  opacity: 1;
}

@media (max-width: 520px) {
  .kd-item {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, CalendarDays } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { termFullLabel } from '@/i18n/format'
import { KEY_DATES, melbourneToday, type KeyDateKind } from '@/utils/keyDates'
import { nextOfKinds, type StripItem } from '@/utils/whatsNext'

/**
 * The next date of each kind a guide passage talks about ("census date: Mon 30 Mar · in 138
 * days"), each a link to that date on the key dates page. Only dates we have from the official
 * page; a kind with nothing published ahead shows nothing.
 */
const props = defineProps<{ kinds: KeyDateKind[] }>()
const { t, locale } = useI18n()
const items = computed(() => nextOfKinds(KEY_DATES, melbourneToday(), props.kinds))
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
  <ul v-if="items.length" class="next-dates">
    <li v-for="i in items" :key="i.date.id">
      <a class="next-date" :href="link(`guide/key-dates/#${i.date.id}`)">
        <CalendarDays :size="16" aria-hidden="true" class="next-icon" />
        <span class="next-text">
          <strong>{{ t(`guide.kd.kind.${i.date.kind}`) }}</strong>
          <span class="next-meta">{{ day(i.date.start) }} · {{ termFullLabel(t, { year: i.date.year, period: i.date.term }) }}</span>
        </span>
        <span class="next-when">{{ when(i) }}</span>
        <ArrowRight :size="15" aria-hidden="true" class="next-go" />
      </a>
    </li>
  </ul>
</template>

<style scoped>
.next-dates {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.next-date {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--inset-fill);
  color: var(--ink);
  text-decoration: none;
}

.next-date:hover .next-go {
  transform: translateX(3px);
}

.next-icon,
.next-go {
  color: var(--accent);
}

.next-go {
  transition: transform 0.2s;
}

.next-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.next-meta {
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.next-when {
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--accent);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .next-go {
    transition: none;
  }
}
</style>

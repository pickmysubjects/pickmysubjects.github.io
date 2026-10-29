<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import InfoTip from '@/components/InfoTip.vue'
import SharePanel from '@/components/planner/SharePanel.vue'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { termFullLabel } from '@/i18n/format'
import { buildIcs, datesForTerms, downloadIcs, KEY_DATES, melbourneToday, type KeyDate } from '@/utils/keyDates'

/**
 * The plan's share and save actions, in the hero: "Share" (a panel with the link to copy or send),
 * and a Save menu with an image, print / PDF and the key dates as a calendar file. Text buttons,
 * the same on phones. #share and #calendar land here (the menu opens on #calendar).
 */
defineProps<{ imaging: boolean }>()
const emit = defineEmits<{ saveImage: []; print: [] }>()
const { t } = useI18n()
const plan = usePlan()
const { profile } = useProfile()
const menu = useTemplateRef<HTMLDetailsElement>('menu')

// Census, exam and results dates for the plan's and the record's terms still ahead. Made on the
// device; nothing is sent anywhere.
const dates = computed(() => {
  const today = melbourneToday()
  const terms = [
    ...plan.terms.value.filter((x) => x.subjects.length),
    ...profile.value.results.flatMap((r) => (r.year && r.period ? [{ year: r.year, period: r.period }] : [])),
  ]
  return datesForTerms(KEY_DATES, terms).filter((d) => d.end >= today)
})
const label = (d: KeyDate) => t.value(`cal.event.${d.kind}`, { term: termFullLabel(t.value, { year: d.year, period: d.term }) })

function pick(what: 'saveImage' | 'print' | 'calendar'): void {
  if (what === 'calendar') downloadIcs(buildIcs(dates.value, label), 'my-unimelb-dates.ics')
  else if (what === 'saveImage') emit('saveImage')
  else emit('print')
  if (menu.value) menu.value.open = false
}

// A click outside closes the menu.
function outside(e: PointerEvent): void {
  if (menu.value?.open && !menu.value.contains(e.target as Node)) menu.value.open = false
}
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
</script>

<template>
  <div id="share" class="pact">
    <SharePanel />
    <details ref="menu" class="pact-more">
      <summary class="button button-quiet pact-btn">{{ t('plan.saveMenu') }}</summary>
      <div class="pact-menu" role="menu">
        <button class="pact-item" role="menuitem" type="button" :disabled="imaging" @click="pick('saveImage')">{{ t('plan.saveImage') }}</button>
        <button class="pact-item" role="menuitem" type="button" @click="pick('print')">{{ t('plan.print') }}</button>
        <span class="pact-row">
          <button id="calendar" class="pact-item" role="menuitem" type="button" :disabled="!dates.length" @click="pick('calendar')">{{ t('plan.addCalendar') }}</button>
          <InfoTip :text="dates.length ? t('cal.info', { n: dates.length }) : t('menu.miss.noDates')" />
        </span>
      </div>
    </details>
  </div>
</template>

<style scoped>
.pact {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
}

.pact :deep(.pact-btn) {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 14px;
  font-size: 0.875rem;
  white-space: nowrap;
}

.pact-more {
  position: relative;
}

.pact-more > summary {
  list-style: none;
  cursor: pointer;
}

.pact-more > summary::-webkit-details-marker {
  display: none;
}

.pact-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  display: grid;
  min-width: 200px;
  padding: 6px;
  border: 1px solid var(--card-edge);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--card-shadow);
}

.pact-row {
  display: flex;
  align-items: center;
}

.pact-item {
  display: flex;
  flex: 1;
  align-items: center;
  min-height: 40px;
  padding: 0 10px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--ink);
  font: inherit;
  font-size: 0.875rem;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.pact-item:hover:not(:disabled),
.pact-item:focus-visible {
  background: var(--glass-fill-hover);
}

.pact-item:disabled {
  color: var(--ink-soft);
  cursor: default;
}

@media (max-width: 640px) {
  .pact :deep(.pact-btn) {
    min-height: 44px;
    padding: 0 12px;
  }
}
</style>

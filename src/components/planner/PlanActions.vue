<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { CalendarPlus, Ellipsis, ImageDown, Printer, Share2 } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { termFullLabel } from '@/i18n/format'
import { buildIcs, datesForTerms, downloadIcs, KEY_DATES, melbourneToday, type KeyDate } from '@/utils/keyDates'

/**
 * The plan's share and save actions, in the hero: "Share" (copies a link), and a Save menu with
 * an image, print / PDF and the key dates as a calendar file. On phones it's one ⋯ button.
 * #share and #calendar land here (the menu opens on #calendar).
 */
defineProps<{ copied: boolean; imaging: boolean }>()
const emit = defineEmits<{ share: []; saveImage: []; print: [] }>()
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

function pick(what: 'share' | 'saveImage' | 'print' | 'calendar'): void {
  if (what === 'calendar') downloadIcs(buildIcs(dates.value, label), 'my-unimelb-dates.ics')
  else if (what === 'share') emit('share')
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
    <button class="button button-quiet pact-btn pact-wide" type="button" @click="pick('share')">
      <Share2 :size="16" aria-hidden="true" />
      <span class="swap-label"><span :class="{ 'swap-off': copied }">{{ t('plan.share') }}</span><span :class="{ 'swap-off': !copied }" aria-hidden="true">{{ t('plan.copied') }}</span></span>
    </button>
    <span class="visually-hidden" role="status">{{ copied ? t('plan.copied') : '' }}</span>
    <details ref="menu" class="pact-more">
      <summary class="button button-quiet pact-btn" :aria-label="`${t('plan.share')} · ${t('plan.saveMenu')}`">
        <!-- Phones: a share icon, so it isn't a second ⋯ beside the plan switcher's. -->
        <Ellipsis :size="18" aria-hidden="true" class="pact-wide" /><Share2 :size="18" aria-hidden="true" class="pact-narrow-icon" /><span class="pact-wide">{{ t('plan.saveMenu') }}</span>
      </summary>
      <div class="pact-menu" role="menu">
        <button class="pact-item pact-narrow" role="menuitem" type="button" @click="pick('share')"><Share2 :size="16" aria-hidden="true" />{{ copied ? t('plan.copied') : t('plan.share') }}</button>
        <button class="pact-item" role="menuitem" type="button" :disabled="imaging" @click="pick('saveImage')"><ImageDown :size="16" aria-hidden="true" />{{ t('plan.saveImage') }}</button>
        <button class="pact-item" role="menuitem" type="button" @click="pick('print')"><Printer :size="16" aria-hidden="true" />{{ t('plan.print') }}</button>
        <span class="pact-row">
          <button id="calendar" class="pact-item" role="menuitem" type="button" :disabled="!dates.length" @click="pick('calendar')"><CalendarPlus :size="16" aria-hidden="true" />{{ t('plan.addCalendar') }}</button>
          <InfoTip :text="dates.length ? t('cal.info', { n: dates.length }) : t('menu.miss.noDates')" />
        </span>
      </div>
    </details>
  </div>
</template>

<style scoped>
.pact {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.pact-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 14px;
  font-size: 0.875rem;
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
  left: 0;
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
  gap: 8px;
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

.pact-narrow,
.pact-narrow-icon {
  display: none;
}

/* Two labels in one cell, one shown: the button is as wide as the longer and never resizes. */
.swap-label {
  display: inline-grid;
  justify-items: start;
}

.swap-label > span {
  grid-area: 1 / 1;
}

.swap-label > .swap-off {
  visibility: hidden;
}

/* Phones: one ⋯ button, share inside the menu. */
@media (max-width: 640px) {
  .pact-wide {
    display: none;
  }

  .pact-narrow {
    display: flex;
  }

  .pact-narrow-icon {
    display: block;
  }

  .pact-btn {
    min-height: 44px;
    padding: 0 12px;
  }

  .pact-menu {
    right: 0;
    left: auto;
  }
}
</style>

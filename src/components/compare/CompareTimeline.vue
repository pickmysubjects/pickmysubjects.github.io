<script setup lang="ts">
import { computed } from 'vue'
import type { Subject, Timeline, TimelineRow } from '@/engine'
import { localTitle } from '@/i18n/localized'
import { useI18n } from '@/i18n'
import { termLabel } from '@/i18n/format'
import { link } from '@/composables/useView'

/**
 * The plans' subjects semester by semester, every semester on one row across all plans, so
 * nothing drifts. A subject only one plan has is outlined with a +; one that sits in another
 * semester elsewhere says where from; shared ones are quiet. With "Only differences" on,
 * semesters that are the same everywhere fold into one line.
 */
const props = defineProps<{ timeline: Timeline; names: string[]; diff: boolean; subjects: Record<string, Subject>; phone: boolean }>()
const { t, locale } = useI18n()

/** The columns shown (two on a phone). */
const n = computed(() => props.names.length)
const count = computed(() => {
  const { differ, moved } = props.timeline
  if (!differ && !moved) return t.value('cmp.noDiff')
  return [differ ? t.value('cmp.differ', { n: differ }) : '', moved ? t.value('cmp.moved', { n: moved }) : ''].filter(Boolean).join(t.value('listSep'))
})
const folded = (r: TimelineRow) => props.diff && r.cells.slice(0, n.value).every((c) => c) && sameShown(r)
// On a phone only the two shown plans count for "the same".
function sameShown(r: TimelineRow): boolean {
  const sets = r.cells.slice(0, n.value).map((c) => (c ? c.chips.map((x) => x.code).sort().join() : ''))
  return sets.every((s) => s !== '' && s === sets[0])
}
const title = (code: string) => {
  const s = props.subjects[code]
  return s ? localTitle(s, locale.value) || s.title : ''
}
const pts = (p: number) => t.value('plans.points', { n: Math.round(p * 10) / 10 })
</script>

<template>
  <section id="cmp-timeline" class="tl surface" aria-labelledby="cmp-tl-title" :style="{ '--n': n }">
    <header class="tl-head">
      <h2 id="cmp-tl-title" class="tl-title">{{ t('cmp.timelineTitle') }}</h2>
      <p class="tl-count">{{ count }}</p>
      <p class="tl-legend">
        <span class="chip-demo chip-only" aria-hidden="true">+</span>{{ t('cmp.onlyHere') }}
      </p>
    </header>

    <div v-if="!phone" class="tl-cols" aria-hidden="true">
      <span />
      <span v-for="(name, i) in names.slice(0, n)" :key="i" class="tl-col">{{ name }}</span>
    </div>

    <ol class="tl-rows">
      <li v-for="r in timeline.rows" :key="`${r.year}${r.period}`" class="tl-row" :class="{ 'tl-folded': folded(r) }">
        <template v-if="folded(r)">
          <p class="tl-same">{{ t('cmp.sameTerm', { term: termLabel(t, r), n: r.cells[0]?.chips.length ?? 0 }) }}</p>
        </template>
        <template v-else>
          <h3 class="tl-term">{{ termLabel(t, r) }}</h3>
          <div v-for="(cell, i) in r.cells.slice(0, n)" :key="i" class="tl-cell">
            <p v-if="phone" class="tl-plan">{{ names[i] }}</p>
            <template v-if="cell">
              <p class="tl-points">{{ pts(cell.points) }}</p>
              <ul class="chips">
                <li v-for="c in cell.chips" :key="c.code" class="chip-s" :class="`chip-${c.state}`">
                  <a class="chip-code code" :href="link(`subject/${c.code}`)">
                    <span v-if="c.state === 'only'" class="chip-plus" aria-hidden="true">+</span>{{ c.code }}
                  </a>
                  <span class="chip-title">{{ title(c.code) }}</span>
                  <span v-if="c.state === 'only'" class="visually-hidden">{{ t('cmp.onlyHere') }}</span>
                  <span v-if="c.state === 'moved' && c.from" class="chip-moved">{{ t('cmp.movedFrom', { term: termLabel(t, c.from) }) }}</span>
                </li>
              </ul>
            </template>
            <p v-else class="tl-none">—<span class="visually-hidden">{{ t('cmp.nothing') }}</span></p>
          </div>
        </template>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.tl {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 24px 24px 20px;
  scroll-margin-top: 96px;
}

.tl-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 16px;
}

.tl-title {
  font-size: var(--fs-section);
  font-weight: var(--fw-bold);
}

.tl-count {
  margin: 0;
  font-size: 1rem;
  font-weight: var(--fw-semibold);
}

.tl-legend {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 0 auto;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.tl-cols,
.tl-row {
  display: grid;
  grid-template-columns: 120px repeat(var(--n), minmax(0, 1fr));
  gap: 0 16px;
}

.tl-col {
  font-size: var(--fs-small);
  font-weight: var(--fw-bold);
}

.tl-rows {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tl-row {
  align-items: start;
  padding-block: 12px;
  border-top: 1px solid var(--divider);
}

.tl-folded {
  grid-template-columns: minmax(0, 1fr);
  padding-block: 8px;
}

.tl-same {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.tl-term {
  font-size: 0.9375rem;
  font-weight: var(--fw-bold);
}

.tl-cell {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.tl-points,
.tl-plan,
.tl-none {
  margin: 0;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.tl-plan {
  font-weight: var(--fw-semibold);
}

.chips {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip-s {
  display: grid;
  gap: 1px;
  padding: 6px 10px;
  border: 1px solid var(--card-edge);
  border-radius: 10px;
  background: var(--card-fill);
  font-size: var(--fs-small);
}

.chip-code {
  width: fit-content;
  font-weight: var(--fw-semibold);
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
}

.chip-code:hover {
  color: var(--accent);
}

.chip-title {
  overflow: hidden;
  color: var(--ink-soft);
  font-size: var(--fs-meta);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Shared, same semester: quiet. */
.chip-same {
  border-color: transparent;
  background: color-mix(in srgb, var(--ink) 4%, transparent);
}

/* Only in this plan: the accent outline and a +. */
.chip-only {
  border: 1.5px solid color-mix(in srgb, var(--accent) 70%, transparent);
  background: color-mix(in srgb, var(--accent) 8%, var(--card-fill));
}

.chip-plus {
  margin-right: 3px;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
}

.chip-moved {
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: color-mix(in srgb, var(--warn) 75%, var(--ink));
}

.chip-demo {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  font-weight: var(--fw-bold);
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
}

@media (max-width: 640px) {
  .tl {
    padding: 18px 12px;
    border-radius: 18px;
  }

  .tl-legend {
    margin-left: 0;
  }

  .tl-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 6px 10px;
  }

  .tl-term {
    grid-column: 1 / -1;
  }

  .tl-folded {
    grid-template-columns: minmax(0, 1fr);
  }

  .chip-title {
    white-space: normal;
  }
}
</style>

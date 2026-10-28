<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Info, Search, SearchX, X } from 'lucide-vue-next'
import BrowseHero from '@/components/browse/BrowseHero.vue'
import PresetCards from '@/components/browse/PresetCards.vue'
import BrowseFilters from '@/components/browse/BrowseFilters.vue'
import BrowseToolbar from '@/components/browse/BrowseToolbar.vue'
import BrowseRow from '@/components/browse/BrowseRow.vue'
import DegreePick from '@/components/browse/DegreePick.vue'
import GoalPicker from '@/components/profile/GoalPicker.vue'
import Interp from '@/components/Interp.vue'
import { clearFilters, EASY_CUTS, leadReasons, SHOWN_AS_FACTS, type FoundRow } from '@/engine'
import { link } from '@/composables/useView'
import { useBrowse } from '@/composables/useBrowse'
import { useDataset } from '@/composables/useDataset'
import { useLearnLines } from '@/composables/useLearnLines'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'
import { reasonText } from '@/i18n/format'

/**
 * Find subjects: the hero (title, search, the subjects/majors/careers switch), the order chips
 * (fits me, easiest, hardest), then the filters beside the results. Filters, lists and the order all live in
 * the address (useBrowse), so every list can be shared and every old address still opens.
 */
const PAGE = 20

const { t } = useI18n()
const { subjectList } = useDataset()
const plan = usePlan()
const { filters, course, year, rows, facets, active, choice, order, hasProfile, hasRecord, index, set, choose, setOrder } = useBrowse()
const aboutOf = useLearnLines()

const shown = shallowRef(PAGE)
watch(filters, () => (shown.value = PAGE))
const visible = computed(() => rows.value.slice(0, shown.value))
const anyRated = computed(() => subjectList.value.some((s) => (s.signals?.reviews ?? 0) >= 3))
// No degree yet: breadth depends on it, so that list asks for it rather than guessing.
const askDegree = computed(() => !plan.courseChosen.value && filters.value.category.includes('breadth'))
const breadthCount = computed(() => subjectList.value.filter((s) => s.categories[course.value] === 'breadth').length)
const sheetOpen = shallowRef(false)

// Reasons the card's own facts already say (exam share, class hours) aren't repeated.
// Why a row is where it is: the list's reasons, or the first few reasons it suits the student.
const trim = (x: string) => x.replace(/[。.]\s*$/, '')
function reasons(r: FoundRow): string[] {
  // "Fits me": at most two short reasons beside the match score.
  if (r.rec) return leadReasons(r.rec, 2).map((n) => trim(reasonText(t.value, n)))
  if (r.ranked) {
    const own = r.ranked.reasons.filter((x) => !SHOWN_AS_FACTS.has(x.key)).map((x) => t.value(`rank.reason.${x.key}`, x.params))
    return [...own, ...(r.ranked.reviews === null ? [t.value('rank.factsOnly')] : [])]
  }
  return []
}

// "Clear all": every filter and the search text; the list chosen and the order stay.
function clearAll(): void {
  filters.value = { ...clearFilters(filters.value), text: '' }
}
const searching = computed(() => filters.value.text.trim() !== '')
</script>

<template>
  <div class="browse">
    <BrowseHero :title="choice === 'all' ? t('browse.title') : t(`browse.heading.${choice}`)">
      <label class="search">
        <Search :size="18" aria-hidden="true" class="search-icon" />
        <span class="visually-hidden">{{ t('browse.searchLabel') }}</span>
        <input
          class="search-input"
          type="search"
          :value="filters.text"
          :placeholder="t('browse.searchPlaceholder')"
          @input="set('text', ($event.target as HTMLInputElement).value)"
        />
        <button v-if="searching" type="button" class="search-clear" :aria-label="t('browse.clearSearch')" @click="set('text', '')"><X :size="16" aria-hidden="true" /></button>
      </label>
    </BrowseHero>

    <PresetCards :order="order" @order="setOrder" />

    <div class="layout">
      <BrowseFilters v-model="filters" v-model:open="sheetOpen" :index="index" :facets="facets" :count="rows.length" :has-record="hasRecord" class="side" />

      <section class="results" :aria-label="t('browse.results')">
        <!-- A degree-dependent list (breadth) waits for the degree rather than guessing one;
             other lists don't need it, so they don't ask. -->
        <DegreePick v-if="askDegree" />
        <template v-else>
          <BrowseToolbar v-model="filters" :count="rows.length" :course="course" :active="active" :any-rated="anyRated" @open-filters="sheetOpen = true" @clear="clearAll" />

          <div v-if="filters.mine" class="mine-bar">
            <GoalPicker compact />
            <p v-if="!hasProfile" class="nudge">
              <Interp :text="t('browse.forMeNudge')">
                <template #link><a :href="link('record')">{{ t('record.title') }}</a></template>
              </Interp>
            </p>
          </div>

          <details v-if="filters.rank && !filters.mine" class="how">
            <summary><Info :size="16" aria-hidden="true" /> {{ t(`rank.lede.${filters.rank}`) }}</summary>
            <ul>
              <li>{{ t('rank.how1') }}</li>
              <li>{{ t('rank.how2') }}</li>
              <li>{{ t('rank.how3') }}</li>
              <li>{{ t('rank.how4', { year }) }}</li>
              <li>{{ t('rank.how5') }}</li>
            </ul>
          </details>

          <p v-if="choice === 'easy' || choice === 'breadth'" class="cut-link">
            <a :href="link(`subjects/${EASY_CUTS.level3Breadth.slug}/`)">{{ t('rank.l3Breadth') }}</a>
          </p>

          <ul v-if="rows.length" class="grid">
            <li v-for="r in visible" :key="r.subject.code" class="cell">
              <BrowseRow :row="r" :course="course" :about="aboutOf(r.subject)" :reasons="reasons(r)" :rec="r.rec" :fit="hasProfile" :has-record="hasRecord" />
            </li>
          </ul>
          <!-- Nothing left: say what to do next. -->
          <div v-else class="empty surface">
            <SearchX :size="28" aria-hidden="true" class="empty-icon" />
            <p class="empty-title">{{ searching ? t('browse.emptySearch', { q: filters.text.trim() }) : t('browse.emptyFiltered') }}</p>
            <p class="empty-hint">{{ searching ? t('browse.emptySearchHint') : t('browse.emptyHint') }}</p>
            <div class="empty-actions">
              <button v-if="searching" type="button" class="button button-quiet" @click="set('text', '')">{{ t('browse.clearSearch') }}</button>
              <button v-if="active" type="button" class="button button-accent" @click="clearAll">{{ t('browse.clear') }}</button>
              <button v-if="choice !== 'all' || filters.mine" type="button" class="button button-quiet" @click="choose('all')">{{ t('browse.allSubjects') }}</button>
            </div>
          </div>

          <button v-if="rows.length > shown" type="button" class="button button-quiet more" @click="shown += PAGE">
            {{ t('browse.more', { n: rows.length - shown }) }}
          </button>

          <p class="coverage">{{ t('browse.coverage', { n: subjectList.length, breadth: breadthCount }) }}</p>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.browse {
  display: grid;
  gap: 20px;
  padding-top: 20px;
}

/* The big search, inside the hero. */
.search {
  position: relative;
  display: block;
  max-width: 600px;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 18px;
  color: var(--ink-faint);
  transform: translateY(-50%);
}

.search-input {
  width: 100%;
  min-height: 52px;
  padding: 12px 48px;
  font-size: 1rem;
  background: var(--glass-shine), var(--peek-fill);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-1);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.search-input::-webkit-search-cancel-button {
  display: none;
}

.search-clear {
  position: absolute;
  top: 50%;
  right: 8px;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-radius: 999px;
  transform: translateY(-50%);
  cursor: pointer;
}

.search-clear:hover {
  color: var(--ink);
  background: var(--inset-fill);
}

/* Filters on the left, results on the right; one column on phones (filters in a sheet). */
.layout {
  display: grid;
  grid-template-columns: 264px minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}

.side {
  align-self: stretch;
}

.results {
  display: grid;
  gap: 14px;
  min-width: 0;
}

/* Results: two cards a row when there's room for both to breathe, one otherwise. */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cell {
  display: grid;
  container: results / inline-size;
}

.mine-bar {
  display: grid;
  gap: 6px;
}

.nudge {
  margin: 0;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

/* Lines straight on the page sit on their own frosted strip, never on the colour field. */
.how,
.cut-link,
.coverage {
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: 8px 14px;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
  border: 1px solid var(--card-edge);
  border-radius: 14px;
  background: var(--card-fill);
}

.how summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.how ul {
  display: grid;
  gap: 4px;
  margin: 8px 0 0;
  padding-left: 20px;
}

.cut-link a {
  font-weight: var(--fw-semibold);
  color: var(--accent);
}

.empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 40px 20px;
  text-align: center;
  border-radius: 22px;
}

.empty-icon {
  color: var(--accent);
}

.empty-title {
  margin: 0;
  max-width: 34ch;
  font-size: 1rem;
  font-weight: var(--fw-semibold);
  color: var(--ink);
}

.empty-hint {
  margin: 0;
  max-width: 44ch;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}

.more {
  justify-self: center;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 232px minmax(0, 1fr);
    gap: 20px;
  }
}

@media (max-width: 720px) {
  .browse {
    gap: 14px;
    padding-top: 12px;
  }

  .layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .search-input {
    min-height: 48px;
  }

  .grid {
    gap: 10px;
  }
}
</style>

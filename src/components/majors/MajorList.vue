<script setup lang="ts">
import BrowseSwitch from '@/components/browse/BrowseSwitch.vue'
import DegreeBadge from '@/components/browse/DegreeBadge.vue'
import { computed, shallowRef } from 'vue'
import { ChevronDown, ChevronRight, Search } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'
import { groupMajors } from '@/utils/majorGroups'

const { data } = useDataset()
const plan = usePlan()
const { t } = useI18n()
const query = shallowRef('')

// A course based on another (B-SCIEXTD) lists that course's majors, with a line saying so.
const planned = computed(() => plan.setup.value.course || 'B-SCI')
const course = computed(() => data.value.courses.find((c) => c.code === planned.value)?.basedOn ?? planned.value)
const basedNote = computed(() => {
  if (course.value === planned.value) return ''
  const title = (code: string) => data.value.courses.find((c) => c.code === code)?.title ?? code
  const note = data.value.courses.find((c) => c.code === planned.value)?.entryNote
  return [t.value('majors.basedOn', { course: title(planned.value), base: title(course.value) }), note ? t.value(`entry.${note}`) : ''].filter(Boolean).join(' ')
})
// Majors closed to new students aren't listed (their pages still open from an existing plan).
const majors = computed(() =>
  data.value.components.filter((c) => c.course === course.value && c.kind === 'major' && (c.closedFrom === undefined || new Date().getFullYear() < c.closedFrom)),
)
// The course's minors (a smaller, optional study area), listed under the majors.
const minors = computed(() =>
  data.value.components
    .filter((c) => c.course === course.value && c.kind === 'minor' && (c.closedFrom === undefined || new Date().getFullYear() < c.closedFrom))
    .filter((c) => !query.value.trim() || c.title.toLowerCase().includes(query.value.trim().toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title)),
)
// Its informal specialisations (B-DES), listed the same way under their own heading.
const informals = computed(() =>
  data.value.components
    .filter((c) => c.course === course.value && c.informal && (c.closedFrom === undefined || new Date().getFullYear() < c.closedFrom))
    .filter((c) => !query.value.trim() || c.title.toLowerCase().includes(query.value.trim().toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title)),
)
// Its formal specialisations (taken with a major that allows them), likewise.
const specs = computed(() =>
  data.value.components
    .filter((c) => c.course === course.value && c.kind === 'specialisation' && !c.informal && (c.closedFrom === undefined || new Date().getFullYear() < c.closedFrom))
    .filter((c) => !query.value.trim() || c.title.toLowerCase().includes(query.value.trim().toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title)),
)
const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  return groupMajors(majors.value)
    .map((g) => {
      const label = t.value(`majorGroup.${g.id}`).toLowerCase()
      return { ...g, majors: !q || label.includes(q) ? g.majors : g.majors.filter((m) => m.title.toLowerCase().includes(q)) }
    })
    .filter((g) => g.majors.length > 0)
})
const courseTitle = computed(() => data.value.courses.find((c) => c.code === course.value)?.title ?? course.value)
</script>

<template>
  <div class="list">
    <header>
      <div class="head-row">
        <h1 class="page-title">{{ t('majors.title') }}</h1>
        <BrowseSwitch current="majors" />
      </div>
      <p class="page-lede">{{ t('majors.lede', { course: courseTitle }) }}</p>
      <DegreeBadge :course="course" />
      <p v-if="basedNote" class="page-lede">{{ basedNote }}</p>
    </header>

    <label class="search">
      <Search :size="18" aria-hidden="true" class="search-icon" />
      <input v-model="query" class="search-input" type="search" :placeholder="t('majors.search')" :aria-label="t('majors.search')" />
    </label>

    <p v-if="groups.length === 0 && minors.length === 0 && informals.length === 0 && specs.length === 0" class="empty">{{ t('wizard.noMajorMatch') }}</p>

    <!-- Grouped and folded: the first group is open; a search opens every group it matches. -->
    <details v-for="(g, i) in groups" :key="g.id" class="group" :open="i === 0 || query.trim() !== '' || undefined">
      <summary class="group-title">
        <!-- The count rides inline, so it stays next to the last word when the name wraps. -->
        <span class="group-name">{{ t(`majorGroup.${g.id}`) }} <span class="group-count">{{ g.majors.length }}</span></span>
        <ChevronDown :size="18" aria-hidden="true" class="group-chevron" />
      </summary>
      <div class="cards">
        <a v-for="m in g.majors" :key="m.id" class="card surface" :href="link(`majors/${m.id}`)">
          <span class="card-title">{{ m.title }}</span>
          <ChevronRight :size="18" aria-hidden="true" class="go" />
        </a>
      </div>
    </details>

    <section v-if="minors.length" class="minors" aria-labelledby="minors-title">
      <h2 id="minors-title" class="minors-title">{{ t('majors.minorsTitle') }} <span class="group-count">{{ minors.length }}</span></h2>
      <p class="minors-hint">{{ t('majors.minorsHint') }}</p>
      <div class="cards">
        <a v-for="m in minors" :key="m.id" class="card surface" :href="link(`majors/${m.id}`)">
          <span class="card-title">{{ m.title }}</span>
          <ChevronRight :size="18" aria-hidden="true" class="go" />
        </a>
      </div>
    </section>

    <section v-if="specs.length" class="minors" aria-labelledby="specs-title">
      <h2 id="specs-title" class="minors-title">{{ t('majors.specsTitle') }} <span class="group-count">{{ specs.length }}</span></h2>
      <p class="minors-hint">{{ t('majors.specsHint') }}</p>
      <div class="cards">
        <a v-for="m in specs" :key="m.id" class="card surface" :href="link(`majors/${m.id}`)">
          <span class="card-title">{{ m.title }}</span>
          <ChevronRight :size="18" aria-hidden="true" class="go" />
        </a>
      </div>
    </section>

    <section v-if="informals.length" class="minors" aria-labelledby="informals-title">
      <h2 id="informals-title" class="minors-title">{{ t('majors.informalsTitle') }} <span class="group-count">{{ informals.length }}</span></h2>
      <p class="minors-hint">{{ t('majors.informalsHint') }}</p>
      <div class="cards">
        <a v-for="m in informals" :key="m.id" class="card surface" :href="link(`majors/${m.id}`)">
          <span class="card-title">{{ m.title }}</span>
          <ChevronRight :size="18" aria-hidden="true" class="go" />
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 24px;
}

.list > header {
  display: grid;
  gap: 10px;
  justify-items: start;
}

.head-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  justify-self: stretch;
}

.search {
  position: relative;
  display: block;
  max-width: 560px;
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
  padding: 13px 18px 13px 48px;
  font-size: 1rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-1);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.empty {
  color: var(--ink-soft);
}

.group {
  display: grid;
  gap: 10px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 4px;
  font-size: 1.05rem;
  font-weight: 650;
  color: var(--ink);
  border-bottom: 1px solid var(--glass-edge);
  cursor: pointer;
  list-style: none;
}

.group-title::-webkit-details-marker {
  display: none;
}

.group-name {
  min-width: 0;
}

.group-count {
  margin-left: var(--space-1);
  padding: 1px 9px;
  border-radius: 999px;
  background: var(--accent-soft);
  font-size: 0.8125rem;
  color: var(--accent);
}

.group-chevron {
  margin-left: auto;
  color: var(--ink-faint);
  transition: transform 0.15s;
}

.group[open] .group-chevron {
  transform: rotate(180deg);
}

.group[open] .cards {
  margin-top: 10px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  color: var(--ink);
  text-decoration: none;
  transition: border-color 0.15s;
}

.card:hover {
  border-color: var(--accent);
}

.card-title {
  flex: 1;
  font-weight: 600;
}

.minors {
  display: grid;
  gap: 10px;
}

.minors-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0 0;
  font-size: 1.15rem;
  font-weight: 650;
}

.minors-hint {
  margin: 0;
  color: var(--ink-soft);
}

.go {
  flex: none;
  color: var(--ink-faint);
}
</style>

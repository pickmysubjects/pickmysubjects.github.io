<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronRight, Search } from 'lucide-vue-next'
import { careerGroups, careerMatchRank, careerSearchTerms, careerTargets, majorsForCareer } from '@/engine'
import { careerLabel } from '@/utils/careersHtml'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'

const { data } = useDataset()
const { t, locale } = useI18n()
const query = shallowRef('')

const all = computed(() =>
  careerTargets(data.value).map((c) => ({
    ...c,
    label: careerLabel(c.names, locale.value),
    majors: majorsForCareer(data.value, c.id).length,
    // Search finds a job by its name in any language or an everyday name (会计, 程序员, IT).
    terms: careerSearchTerms(c),
  })),
)
const shown = computed(() => all.value.filter((c) => (c.majors > 0 || c.graduate) && careerMatchRank(c.terms, query.value) >= 0))
const groups = computed(() =>
  careerGroups(shown.value).map((g) => ({
    ...g,
    title: t.value(g.id === 'jobs' ? 'careerPath.jobsTitle' : 'careerPath.fieldsTitle'),
    hint: g.id === 'jobs' ? '' : t.value('careerPath.fieldsHint'),
  })),
)
</script>

<template>
  <div class="list">
    <header>
      <div class="head-row">
        <h1 class="page-title">{{ t('careerPath.title') }}</h1>
      </div>
      <p class="page-lede">{{ t('careerPath.lede') }}</p>
    </header>

    <label class="search">
      <Search :size="18" aria-hidden="true" class="search-icon" />
      <input v-model="query" class="search-input" type="search" :placeholder="t('careerPath.search')" :aria-label="t('careerPath.search')" />
    </label>

    <p v-if="groups.length === 0" class="empty">{{ t('careerPath.noMatch') }}</p>

    <section v-for="g in groups" :key="g.id" class="group" :aria-labelledby="`careers-${g.id}`">
      <h2 :id="`careers-${g.id}`" class="group-title">{{ g.title }} <span class="group-count">{{ g.items.length }}</span></h2>
      <p v-if="g.hint" class="group-hint">{{ g.hint }}</p>
      <div class="cards">
        <a v-for="c in g.items" :key="c.id" class="card surface" :href="link(`careers/${c.id}`)">
          <span class="card-main">
            <span class="card-title">{{ c.label }}</span>
            <span class="card-meta">{{ c.graduate ? t('careerPath.graduateMeta', { course: c.graduate.title }) : t('careerPath.majorCount', { n: c.majors }) }}</span>
          </span>
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
}

.head-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
  font-size: 1.05rem;
  font-weight: 650;
}

.group-count {
  padding: 1px 9px;
  border-radius: 999px;
  background: var(--accent-soft);
  font-size: 0.8125rem;
  color: var(--accent);
}

.group-hint {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
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

.card-main {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.card-title {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.card-meta {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.go {
  flex-shrink: 0;
  color: var(--ink-faint);
}
</style>

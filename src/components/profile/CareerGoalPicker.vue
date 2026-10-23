<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { CAREER_LANGS, careerTargets } from '@/engine'
import { careerLabel } from '@/utils/careersHtml'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/**
 * The open plan's career goal (optional): search a job by its name in any language, pick one,
 * clear it. Suggestions favour subjects the career page puts under Required or Helps.
 */
const SHOWN = 6
const { data } = useDataset()
const { profile, setCareer } = useProfile()
const { t, locale } = useI18n()
const query = shallowRef('')

const all = computed(() =>
  careerTargets(data.value).map((c) => ({
    id: c.id,
    label: careerLabel(c.names, locale.value),
    haystack: CAREER_LANGS.map((l) => c.names[l]).join(' ').toLowerCase(),
  })),
)
const chosen = computed(() => all.value.find((c) => c.id === profile.value.career) ?? null)
const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? all.value.filter((c) => c.haystack.includes(q)).slice(0, SHOWN) : []
})

function pick(id: string | undefined): void {
  setCareer(id)
  query.value = ''
}
</script>

<template>
  <div class="career">
    <h3 id="career-goal-title" class="career-label">{{ t('careerGoal.title') }}</h3>
    <p class="career-hint">{{ t('careerGoal.hint') }}</p>
    <div v-if="chosen" class="chosen">
      <a class="chosen-name" :href="link(`careers/${chosen.id}`)" :title="t('careerGoal.see')">{{ chosen.label }}</a>
      <button class="button button-quiet clear" type="button" @click="pick(undefined)">
        <X :size="16" aria-hidden="true" /> {{ t('careerGoal.clear') }}
      </button>
    </div>
    <template v-else>
      <label class="search">
        <Search :size="16" aria-hidden="true" class="search-icon" />
        <input v-model="query" class="search-input" type="search" :placeholder="t('careerGoal.search')" aria-labelledby="career-goal-title" />
      </label>
      <ul v-if="matches.length" class="matches">
        <li v-for="c in matches" :key="c.id">
          <button class="match" type="button" @click="pick(c.id)">{{ c.label }}</button>
        </li>
      </ul>
      <p v-else-if="query.trim()" class="career-hint">{{ t('careerGoal.noMatch') }}</p>
    </template>
  </div>
</template>

<style scoped>
.career {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.career-label {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.career-hint {
  margin: 0;
  max-width: 60ch;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ink-soft);
}

.chosen {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  min-width: 0;
}

.chosen-name {
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--ink);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.search {
  position: relative;
  display: block;
  max-width: 420px;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  color: var(--ink-faint);
  transform: translateY(-50%);
}

.search-input {
  width: 100%;
  padding: 10px 14px 10px 40px;
  font-size: 1rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.matches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.match {
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 0.875rem;
  text-align: start;
  overflow-wrap: anywhere;
  cursor: pointer;
}

.match:hover,
.match:focus-visible {
  border-color: var(--accent);
}
</style>

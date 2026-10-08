<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Check, Search } from 'lucide-vue-next'
import type { Component } from '@/engine'
import { useI18n } from '@/i18n'

/** Pick a major from a long list: grouped by field, with a search box that also matches the field name. */
const props = defineProps<{ majors: Component[] }>()
const major = defineModel<string>({ required: true })
const { t } = useI18n()
const query = shallowRef('')

// Field of each major, by its id. Anything new lands in "other" until it's added here.
const GROUPS: { id: string; match: RegExp }[] = [
  { id: 'computing', match: /^(computing|data-science|informatics|mathematics)/ },
  { id: 'biomed', match: /^(biochemistry|cell-and|genetics|human-|immunology|infection|microbiology|neuroscience|pathology|pharmacology|physiology|biotechnology)/ },
  { id: 'chemphys', match: /^(chemistry|physics)/ },
  { id: 'psych', match: /^psychology/ },
  { id: 'eco', match: /^(ecology|ecosystem|environmental-science|geography|geology|geoscience|climate|marine|plant|zoology)/ },
  { id: 'eng', match: /systems$/ },
  { id: 'agri', match: /^(animal|food|veterinary)/ },
]
const groupOf = (id: string) => GROUPS.find((g) => g.match.test(id))?.id ?? 'other'

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  const out: { id: string; majors: Component[] }[] = []
  for (const id of [...GROUPS.map((g) => g.id), 'other']) {
    const label = t.value(`majorGroup.${id}`).toLowerCase()
    const inGroup = props.majors.filter((m) => groupOf(m.id) === id)
    const hits = q === '' || label.includes(q) ? inGroup : inGroup.filter((m) => m.title.toLowerCase().includes(q))
    if (hits.length) out.push({ id, majors: [...hits].sort((a, b) => a.title.localeCompare(b.title)) })
  }
  return out
})
const chosen = computed(() => props.majors.find((m) => m.id === major.value))
</script>

<template>
  <div class="picker">
    <label class="search">
      <Search :size="18" aria-hidden="true" class="search-icon" />
      <input v-model="query" class="search-input" type="search" :placeholder="t('wizard.majorSearch')" :aria-label="t('wizard.majorSearch')" />
    </label>

    <p v-if="chosen" class="chosen"><Check :size="16" aria-hidden="true" /> {{ chosen.title }}</p>

    <button type="button" class="option option-unsure" :aria-pressed="major === ''" @click="major = ''">
      <span>{{ t('wizard.notSure') }}</span>
      <Check v-if="major === ''" :size="18" aria-hidden="true" />
    </button>

    <p v-if="groups.length === 0" class="empty">{{ t('wizard.noMajorMatch') }}</p>
    <section v-for="g in groups" :key="g.id" class="group">
      <h3 class="group-name">{{ t(`majorGroup.${g.id}`) }}</h3>
      <div class="group-list">
        <button
          v-for="m in g.majors"
          :key="m.id"
          type="button"
          class="option"
          :aria-pressed="major === m.id"
          @click="major = m.id"
        >
          <span>{{ m.title }}</span>
          <Check v-if="major === m.id" :size="18" aria-hidden="true" />
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.picker {
  display: grid;
  gap: 14px;
}

.search {
  position: relative;
  display: block;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  color: var(--ink-faint);
}

.search-input {
  width: 100%;
  padding: 12px 14px 12px 42px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  font: inherit;
  color: var(--ink);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.chosen {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--accent);
}

.group {
  display: grid;
  gap: 8px;
}

.group-name {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.group-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
  gap: 8px;
}

.option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 8px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  font: inherit;
  font-size: 0.93rem;
  text-align: left;
  color: var(--ink);
  cursor: pointer;
}

.option:hover {
  border-color: var(--ink-faint);
}

.option[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.option-unsure {
  justify-self: start;
  min-height: 40px;
}

.empty {
  color: var(--ink-soft);
}
</style>

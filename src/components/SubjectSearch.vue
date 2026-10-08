<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import { Search } from 'lucide-vue-next'
import { useDataset } from '@/composables/useDataset'
import { go, link } from '@/composables/useView'
import { useI18n } from '@/i18n'

const props = defineProps<{ compact?: boolean }>()
const { subjectList } = useDataset()
const { t } = useI18n()

const listId = useId()
const query = shallowRef('')
const open = shallowRef(false)
const active = shallowRef(0)

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return subjectList.value
    .filter((s) => s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
    .slice(0, props.compact ? 6 : 8)
})

function pick(code: string): void {
  query.value = ''
  open.value = false
  go(`subject/${code}`)
}

function onEnter(): void {
  const hit = results.value[active.value]
  if (hit) pick(hit.code)
  else if (/^[A-Za-z]{4}\d{5}$/.test(query.value.trim())) pick(query.value.trim().toUpperCase())
}

// Sends a missing subject to the feedback form, with the code filled in when it looks like one.
const missingHref = computed(() => {
  const q = query.value.trim().toUpperCase()
  return /^[A-Z]{4}\d{5}$/.test(q) ? `feedback?topic=data&subject=${q}` : 'feedback?topic=data'
})

function reportMissing(): void {
  const href = missingHref.value
  query.value = ''
  open.value = false
  go(href)
}

// Typing again after a pick (focus never left the box) should reopen the list.
function onInput(): void {
  active.value = 0
  open.value = true
}

function move(delta: number): void {
  if (results.value.length) active.value = (active.value + delta + results.value.length) % results.value.length
}
</script>

<template>
  <div class="search" :class="{ 'search-compact': compact }">
    <Search class="search-icon" :size="compact ? 16 : 20" aria-hidden="true" />
    <input
      v-model="query"
      class="search-input"
      type="search"
      role="combobox"
      autocomplete="off"
      :aria-expanded="open && results.length > 0"
      :aria-controls="listId"
      :aria-label="t('home.searchLabel')"
      :placeholder="compact ? t('home.searchShort') : t('home.search')"
      @focus="open = true"
      @blur="open = false"
      :aria-activedescendant="open && results[active] ? `${listId}-${active}` : undefined"
      @input="onInput"
      @keydown.enter.prevent="onEnter"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
    />
    <ul v-if="open && query.trim()" :id="listId" class="results" role="listbox">
      <li
        v-for="(s, i) in results"
        :id="`${listId}-${i}`"
        :key="s.code"
        class="result"
        role="option"
        :aria-selected="i === active"
        @mousedown.prevent="pick(s.code)"
        @mouseenter="active = i"
      >
        <span class="code result-code">{{ s.code }}</span>
        <span class="result-title">{{ s.title }}</span>
      </li>
      <li v-if="results.length === 0" class="result result-empty">
        {{ t('home.noResults', { q: query.trim() }) }}
        <a class="result-missing" :href="link(missingHref)" @mousedown.prevent="reportMissing">{{ t('home.missing') }}</a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.search {
  position: relative;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 20px;
  transform: translateY(-50%);
  color: var(--ink-faint);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 60px;
  padding: 0 20px 0 54px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  box-shadow: var(--shadow-2);
  font-size: 1.05rem;
  color: var(--ink);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 5px var(--accent-soft), var(--shadow-2);
}

.search-compact .search-icon {
  left: 13px;
}

.search-compact .search-input {
  height: 38px;
  padding-left: 36px;
  box-shadow: none;
  font-size: 0.88rem;
}

.results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 40;
  margin: 0;
  padding: 6px;
  list-style: none;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-2);
}

.result {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
}

.result[aria-selected='true'] {
  background: var(--surface-2);
}

.result-code {
  font-weight: 500;
  color: var(--accent);
}

.result-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-missing {
  font-weight: 600;
  white-space: nowrap;
}

.result-empty {
  flex-wrap: wrap;
  gap: 4px 10px;
  color: var(--ink-soft);
  cursor: default;
}
</style>

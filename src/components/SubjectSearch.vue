<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { ArrowRight, Search } from 'lucide-vue-next'
import { useDataset } from '@/composables/useDataset'
import { go, link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import { latestDataYear } from '@/engine'
import { searchSubjects } from '@/utils/subjectSearch'

// `select`: hand the picked code to the parent (a picker) instead of opening its page.
// `hero`: the home page's big capsule, with a round go button instead of the search icon.
const props = defineProps<{ compact?: boolean; select?: boolean; hero?: boolean; placeholder?: string }>()
const emit = defineEmits<{ pick: [code: string] }>()
const { subjectList, data } = useDataset()
const { t, locale } = useI18n()

const listId = useId()
const input = useTemplateRef<HTMLInputElement>('input')
const query = shallowRef('')
const open = shallowRef(false)
const active = shallowRef(0)

// Chinese titles match in every language (students often search in Chinese whatever the page
// language); topics match by their name in the page's language; running subjects come first.
const year = computed(() => latestDataYear(data.value.subjects))
const results = computed(() =>
  searchSubjects(subjectList.value, query.value, {
    topicNames: (id) => [t.value(`topic.${id}`), id.replace(/-/g, ' ')],
    groupNames: (id) => [t.value(`topicGroup.${id}`)],
    year: year.value,
    limit: props.compact ? 6 : 8,
  }),
)
// In Chinese the Chinese title leads, the English one after it.
const localFirst = computed(() => locale.value === 'zh-CN' || locale.value === 'zh-TW')

function pick(code: string): void {
  query.value = ''
  open.value = false
  if (props.select) emit('pick', code)
  else go(`subject/${code}`)
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

// The go button: the highlighted result, or back to the box when there is nothing to open.
function submit(): void {
  if (query.value.trim() && (results.value.length || /^[A-Za-z]{4}\d{5}$/.test(query.value.trim()))) onEnter()
  else input.value?.focus()
}

function move(delta: number): void {
  if (results.value.length) active.value = (active.value + delta + results.value.length) % results.value.length
}
</script>

<template>
  <div class="search" :class="{ 'search-compact': compact, 'search-hero': hero }">
    <Search v-if="!hero" class="search-icon" :size="compact ? 16 : 20" aria-hidden="true" />
    <input
      ref="input"
      v-model="query"
      class="search-input"
      type="search"
      role="combobox"
      autocomplete="off"
      :aria-expanded="open && results.length > 0"
      :aria-controls="listId"
      :aria-label="t('home.searchLabel')"
      :placeholder="placeholder ?? (compact ? t('home.searchShort') : t('home.search'))"
      @focus="open = true"
      @blur="open = false"
      :aria-activedescendant="open && results[active] ? `${listId}-${active}` : undefined"
      @input="onInput"
      @keydown.enter.prevent="onEnter"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
    />
    <button v-if="hero" class="search-go" type="button" :aria-label="t('home.searchLabel')" @mousedown.prevent @click="submit">
      <ArrowRight :size="22" :stroke-width="2.4" aria-hidden="true" />
    </button>
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
        <span v-if="localFirst && localTitle(s, locale)" class="result-title">{{ localTitle(s, locale) }}<span class="result-en" lang="en"> · {{ s.title }}</span></span>
        <span v-else class="result-title">{{ s.title }}<template v-if="localTitle(s, locale)"> · {{ localTitle(s, locale) }}</template></span>
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
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-shine), var(--glass-fill);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow), var(--shadow-2);
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
  box-shadow: var(--glass-shadow);
  font-size: 0.875rem;
}

/* The home capsule: taller, a bright top edge, and a round pink go button inside its right end. */
.search-hero .search-input {
  height: 64px;
  padding: 0 64px 0 24px;
  font-size: 1.0625rem;
  box-shadow: var(--glass-shadow), 0 22px 44px -22px rgb(91 42 107 / 45%);
}

.search-hero .search-input::placeholder {
  color: var(--ink-faint);
}

.search-go {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  color: #fff;
  background: radial-gradient(120% 90% at 30% 15%, #f17ab8 0%, var(--accent-fill) 55%, #a81866 100%);
  border: 0;
  border-radius: 50%;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 45%), 0 8px 18px -6px rgb(194 34 122 / 60%);
  cursor: pointer;
  transition: transform 0.15s;
}

.search-go:active {
  transform: scale(var(--press-scale));
}

.search-go:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .search-hero .search-input {
    height: 58px;
    padding-left: 20px;
    padding-right: 58px;
  }

  .search-go {
    top: 7px;
    right: 7px;
    width: 44px;
    height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-go {
    transition: none;
  }
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
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius);
  /* Near-opaque: inside a glass card (the home hero) its own blur can't reach the page behind,
     so a see-through list would show the hero's text through it. */
  background: var(--glass-shine), color-mix(in srgb, var(--sheet-fill) 20%, var(--bg));
  -webkit-backdrop-filter: var(--glass-blur-strong);
  backdrop-filter: var(--glass-blur-strong);
  box-shadow: var(--glass-shadow), var(--shadow-2);
}

.result {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
}

.result[aria-selected='true'] {
  background: var(--inset-fill);
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

.result-en {
  color: var(--ink-soft);
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

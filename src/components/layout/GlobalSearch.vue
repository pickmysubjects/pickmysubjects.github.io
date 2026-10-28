<script setup lang="ts">
import { useImeGuard } from '@/utils/ime'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { ArrowLeft, BookOpen, CornerDownLeft, Search, X } from 'lucide-vue-next'
import { go, link, useView } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { en } from '@/i18n/messages/en'
import { localTitle } from '@/i18n/localized'
import { latestDataYear } from '@/engine'
import { searchSubjects } from '@/utils/subjectSearch'
import { MENUS } from './nav'
import { searchFeatures, type FeatureGroup } from './featureIndex'
import { registerSiteSearch, searchShortcut } from '@/composables/useSiteSearch'

/**
 * The site search: a field-like button in the header (an icon when the bar is tight, and on
 * phones) and ⌘K / Ctrl+K open one dialog that finds features, guide topics and subjects.
 * A native modal <dialog>: focus stays inside, Esc closes. Nothing typed here leaves the browser.
 */
const { t, locale } = useI18n()
const { subjectList, data } = useDataset()
const { view, param } = useView()
const listId = useId()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const input = useTemplateRef<HTMLInputElement>('input')
const query = shallowRef('')
const active = shallowRef(0)
const isOpen = shallowRef(false)

const shortcut = searchShortcut

function lookup(messages: unknown, key: string): string | undefined {
  let node: unknown = messages
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}
// The page's language first, then English: English words (WAM, census, hurdle) work in every language.
const texts = (key: string): string[] => {
  const here = t.value(key)
  const english = lookup(en, key)
  return english && english !== here ? [here, english] : [here]
}

type Group = FeatureGroup | 'subject'
interface Row {
  key: string
  group: Group
  href: string
  to: string
  name: string
  line?: string
  code?: string
  icon?: unknown
}

const year = computed(() => latestDataYear(data.value.subjects))
const localFirst = computed(() => locale.value === 'zh-CN' || locale.value === 'zh-TW')

const rows = computed<Row[]>(() => {
  const q = query.value.trim()
  if (!q) {
    // Nothing typed yet: the six areas, as a start.
    const sep = t.value('listSep')
    return MENUS.map((m) => ({
      key: `area:${m.area}`,
      group: 'feature' as const,
      to: m.to,
      href: link(m.to),
      name: t.value(m.key),
      line: m.items.slice(0, 3).map((i) => t.value(i.key)).join(sep),
      icon: m.icon,
    }))
  }
  const hits = searchFeatures(q, texts)
  const take = (g: FeatureGroup, n: number): Row[] =>
    hits
      .filter((h) => h.entry.group === g)
      .slice(0, n)
      .map(({ entry: e }) => ({ key: e.id, group: g, to: e.to, href: link(e.to), name: t.value(e.title), line: e.desc ? t.value(e.desc) : undefined, icon: e.icon }))
  const subjects = searchSubjects(subjectList.value, q, {
    topicNames: (id) => [t.value(`topic.${id}`), id.replace(/-/g, ' ')],
    groupNames: (id) => [t.value(`topicGroup.${id}`)],
    year: year.value,
    limit: 6,
  }).map((s): Row => {
    const local = localTitle(s, locale.value)
    return {
      key: `subject:${s.code}`,
      group: 'subject',
      to: `subject/${s.code}`,
      href: link(`subject/${s.code}`),
      code: s.code,
      name: localFirst.value && local ? local : s.title,
      line: localFirst.value && local ? s.title : local || undefined,
    }
  })
  return [...take('feature', 5), ...take('guide', 5), ...subjects]
})

const GROUP_TITLES: Record<Group, string> = { feature: 'search.features', guide: 'guide.nav', subject: 'search.subjects' }
const groups = computed(() =>
  (['feature', 'guide', 'subject'] as Group[])
    .map((g) => ({ group: g, title: GROUP_TITLES[g], rows: rows.value.filter((r) => r.group === g) }))
    .filter((g) => g.rows.length),
)
const indexOf = (r: Row) => rows.value.indexOf(r)
const optionId = (i: number) => `${listId}-${i}`

watch(query, () => (active.value = 0))

function open(): void {
  const d = dialog.value
  if (!d || d.open) return
  query.value = ''
  active.value = 0
  if (typeof d.showModal === 'function') d.showModal()
  else d.setAttribute('open', '')
  isOpen.value = true
  void nextTick(() => input.value?.focus())
}
function close(): void {
  dialog.value?.close()
}
function onClose(): void {
  isOpen.value = false
}
// A click on the dimmed page around the panel closes it.
function onDialogClick(e: MouseEvent): void {
  if (e.target === dialog.value) close()
}

function move(delta: number): void {
  const n = rows.value.length
  if (!n) return
  active.value = (active.value + delta + n) % n
  void nextTick(() => document.getElementById(optionId(active.value))?.scrollIntoView({ block: 'nearest' }))
}
function openRow(r: Row | undefined): void {
  const q = query.value.trim()
  if (r) {
    close()
    go(r.to)
  } else if (/^[A-Za-z]{4}\d{5}$/.test(q)) {
    close()
    go(`subject/${q.toUpperCase()}`)
  }
}

// Enter that confirms an input method's word (Chinese, Japanese…) isn't a pick.
const ime = useImeGuard()
function onKey(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    move(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    move(-1)
  } else if (e.key === 'Enter' && !ime.isImeEnter(e)) {
    e.preventDefault()
    openRow(rows.value[active.value])
  }
}

// ⌘K / Ctrl+K from anywhere on the page.
function onDocKey(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    if (dialog.value?.open) input.value?.select()
    else open()
  }
}
// Other places (the home page) open this same dialog through useSiteSearch.
let unregister: (() => void) | undefined
onMounted(() => {
  document.addEventListener('keydown', onDocKey)
  unregister = registerSiteSearch(open)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocKey)
  unregister?.()
})
watch(() => [view.value, param.value], close)

defineExpose({ open })
</script>

<template>
  <button
    class="search-trigger"
    type="button"
    aria-haspopup="dialog"
    :aria-expanded="isOpen"
    :aria-label="t('search.label')"
    :title="`${t('search.label')} (${shortcut})`"
    @click="open"
  >
    <Search :size="17" aria-hidden="true" />
    <span class="trigger-text">{{ t('search.open') }}</span>
    <kbd class="trigger-kbd" aria-hidden="true">{{ shortcut }}</kbd>
  </button>
  <dialog ref="dialog" class="search-dialog" :aria-label="t('search.label')" @click="onDialogClick" @close="onClose">
    <div class="panel">
      <div class="field">
        <button class="field-back" type="button" :aria-label="t('menu.close')" @click="close">
          <ArrowLeft :size="20" aria-hidden="true" />
        </button>
        <Search class="field-icon" :size="20" aria-hidden="true" />
        <input
          ref="input"
          v-model="query"
          class="field-input"
          type="search"
          role="combobox"
          autocomplete="off"
          spellcheck="false"
          enterkeyhint="go"
          aria-autocomplete="list"
          :aria-expanded="rows.length > 0"
          :aria-controls="listId"
          :aria-activedescendant="rows[active] ? optionId(active) : undefined"
          :aria-label="t('search.label')"
          :placeholder="t('search.placeholder')"
          @keydown="onKey"
          @compositionstart="ime.onCompositionstart"
          @compositionend="ime.onCompositionend"
        />
        <button class="field-close" type="button" :aria-label="t('menu.close')" @click="close">
          <X :size="18" aria-hidden="true" />
        </button>
      </div>
      <div :id="listId" class="results" role="listbox" :aria-label="t('search.label')">
        <p v-if="!query.trim()" class="hint">{{ t('search.hint') }}</p>
        <div v-for="g in groups" :key="g.group" class="group" role="group" :aria-labelledby="`${listId}-${g.group}`">
          <p :id="`${listId}-${g.group}`" class="group-title">{{ t(g.title) }}</p>
          <a
            v-for="r in g.rows"
            :id="optionId(indexOf(r))"
            :key="r.key"
            class="row"
            :href="r.href"
            role="option"
            tabindex="-1"
            :aria-selected="indexOf(r) === active"
            @click="close"
            @mousemove="active = indexOf(r)"
          >
            <span v-if="r.code" class="row-code code">{{ r.code }}</span>
            <span v-else class="row-icon"><component :is="r.icon ?? BookOpen" :size="16" aria-hidden="true" /></span>
            <span class="row-text">
              <span class="row-name">{{ r.name }}</span>
              <span v-if="r.line" class="row-line">{{ r.line }}</span>
            </span>
            <CornerDownLeft v-if="indexOf(r) === active" class="row-enter" :size="15" aria-hidden="true" />
          </a>
        </div>
        <p v-if="query.trim() && !rows.length" class="empty">{{ t('search.empty', { q: query.trim() }) }}</p>
      </div>
      <p class="keys" aria-hidden="true">{{ t('search.keys') }}</p>
    </div>
  </dialog>
</template>

<style scoped>
/* The header button: looks like a search field, opens the dialog. */
.search-trigger {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  height: 36px;
  min-width: 150px;
  padding: 0 8px 0 12px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  box-shadow: var(--glass-shadow);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ink-soft);
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.search-trigger:hover {
  color: var(--ink);
  background: var(--glass-fill-hover);
}

.search-trigger:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.trigger-text {
  flex: 1;
  text-align: left;
}

/* A touch tablet has no keyboard to press it with: no shortcut hint there. */
@media (hover: none) and (pointer: coarse) {
  .trigger-kbd {
    display: none;
  }
}

.trigger-kbd {
  padding: 1px 6px;
  border: 1px solid var(--divider);
  border-radius: 6px;
  font: inherit;
  font-size: 0.75rem;
  color: var(--ink-faint);
}

/* The dialog: a glass panel near the top of the screen; full screen on phones. */
.search-dialog {
  display: none;
}

.search-dialog[open] {
  display: block;
  width: min(640px, calc(100vw - 32px));
  max-width: none;
  max-height: none;
  margin: 10vh auto auto;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  overflow: visible;
}

.search-dialog::backdrop {
  background: rgb(20 8 28 / 30%);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}

.panel {
  display: flex;
  flex-direction: column;
  max-height: min(70vh, 640px);
  border: 1px solid var(--chrome-edge);
  border-radius: 24px;
  /* Opaque tinted glass, like the header menus: the page's text must never show through. */
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent-fill) 6%, var(--surface)), var(--surface) 70%);
  box-shadow: var(--float-rim), 0 24px 60px -16px rgb(0 0 0 / 35%), 0 4px 12px -4px rgb(0 0 0 / 12%);
  overflow: hidden;
  animation: search-in 0.18s var(--ease-spring);
}

.field {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
  padding: 12px 12px 12px 18px;
  border-bottom: 1px solid var(--divider);
}

.field-icon {
  flex: none;
  color: var(--accent);
}

.field-input {
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 1.0625rem;
  color: var(--ink);
}

.field-input:focus {
  outline: none;
}

.field-input::-webkit-search-cancel-button {
  display: none;
}

.field-back {
  display: none;
}

.field-close,
.field-back {
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  color: var(--ink-soft);
  cursor: pointer;
}

.field-close {
  display: inline-grid;
}

.results {
  flex: 1;
  min-height: 0;
  padding: 6px 8px 10px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.hint,
.empty {
  margin: 8px 12px 4px;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.group + .group {
  margin-top: 6px;
}

.group-title {
  margin: 10px 12px 4px;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  color: var(--ink-faint);
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 8px 12px;
  border-radius: 14px;
  color: var(--ink);
  text-decoration: none;
  scroll-margin: 8px;
}

.row[aria-selected='true'] {
  background: color-mix(in srgb, var(--accent-fill) 11%, var(--glass-fill));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent);
}

.row-icon {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-fill) 12%, transparent);
  color: var(--accent);
}

.row-code {
  flex: none;
  min-width: 6.2em;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--accent);
}

.row-text {
  display: grid;
  flex: 1;
  gap: 1px;
  min-width: 0;
}

.row-name {
  overflow: hidden;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-line {
  overflow: hidden;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--ink-soft);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-enter {
  flex: none;
  color: var(--ink-faint);
}

.keys {
  flex: none;
  margin: 0;
  padding: 8px 18px 10px;
  border-top: 1px solid var(--divider);
  font-size: var(--fs-meta);
  color: var(--ink-faint);
}

@keyframes search-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel {
    animation: none;
  }
}

/* Phones: a round icon in the top bar, and the search takes the whole screen. */
@media (max-width: 720px) {
  .search-trigger {
    justify-content: center;
    width: 36px;
    min-width: 0;
    padding: 0;
  }

  .trigger-text,
  .trigger-kbd {
    display: none;
  }

  .search-dialog[open] {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
  }

  .panel {
    height: 100%;
    max-height: none;
    border: 0;
    border-radius: 0;
    animation: none;
  }

  .field {
    padding: calc(10px + env(safe-area-inset-top)) 12px 10px;
  }

  .field-back {
    display: inline-grid;
  }

  .field-icon,
  .field-close {
    display: none;
  }

  .field-input {
    height: 44px;
    padding: 0 16px;
    border: 1px solid var(--glass-edge);
    border-radius: 999px;
    background: var(--glass-fill);
    font-size: 1rem;
  }

  .field-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .results {
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }

  .keys {
    display: none;
  }
}
</style>

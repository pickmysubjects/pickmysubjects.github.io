<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ArrowLeft, Check, ChevronRight, Search } from 'lucide-vue-next'
import type { Component } from '@/engine'
import { useI18n } from '@/i18n'
import { MAJOR_GROUPS, majorGroupOf } from '@/utils/majorGroups'

/**
 * Pick a major in two short steps: a field first ("Agriculture, food and animals"), then a major in
 * it. Typing searches every field at once.
 */
const props = defineProps<{ majors: Component[] }>()
const major = defineModel<string>({ required: true })
/** A field chosen without a major yet ("biomedicine, not sure which"); '' for none. */
const openField = defineModel<string>('field', { default: '' })
const { t } = useI18n()
const query = shallowRef('')

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  const out: { id: string; majors: Component[] }[] = []
  for (const id of [...MAJOR_GROUPS.map((g) => g.id), 'other']) {
    const label = t.value(`majorGroup.${id}`).toLowerCase()
    const inGroup = props.majors.filter((m) => majorGroupOf(m.id) === id)
    const hits = q === '' || label.includes(q) ? inGroup : inGroup.filter((m) => m.title.toLowerCase().includes(q))
    if (hits.length) out.push({ id, majors: [...hits].sort((a, b) => a.title.localeCompare(b.title)) })
  }
  return out
})
const chosen = computed(() => props.majors.find((m) => m.id === major.value))
// The open field; a major already chosen opens its own.
const field = shallowRef<string | null>(chosen.value ? majorGroupOf(chosen.value.id) : openField.value || null)
const searching = computed(() => query.value.trim() !== '')
const fields = computed(() =>
  [...MAJOR_GROUPS.map((g) => g.id), 'other']
    .map((id) => ({ id, count: props.majors.filter((m) => majorGroupOf(m.id) === id).length }))
    .filter((f) => f.count > 0),
)
function pick(id: string): void {
  major.value = id
  openField.value = ''
}
function pickUnsure(f: string): void {
  major.value = ''
  openField.value = f
}
const shown = computed(() => (searching.value ? groups.value : groups.value.filter((g) => g.id === field.value)))
</script>

<template>
  <div class="picker">
    <label class="search">
      <Search :size="18" aria-hidden="true" class="search-icon" />
      <input v-model="query" class="search-input" type="search" :placeholder="t('wizard.majorSearch')" :aria-label="t('wizard.majorSearch')" />
    </label>

    <p v-if="chosen" class="chosen"><Check :size="16" aria-hidden="true" /> {{ chosen.title }}</p>

    <button type="button" class="option option-unsure" :aria-pressed="major === '' && !openField" @click="pickUnsure('')">
      <span>{{ t('wizard.notSure') }}</span>
      <Check v-if="major === ''" :size="18" aria-hidden="true" />
    </button>

    <p v-if="searching && groups.length === 0" class="empty">{{ t('wizard.noMajorMatch') }}</p>

    <div v-if="!searching && field === null" class="fields">
      <button
        v-for="f in fields"
        :key="f.id"
        type="button"
        class="option field"
        :aria-pressed="chosen !== undefined && majorGroupOf(chosen.id) === f.id"
        @click="field = f.id"
      >
        <span>{{ t(`majorGroup.${f.id}`) }}</span>
        <span class="field-count">{{ f.count }} <ChevronRight :size="16" aria-hidden="true" /></span>
      </button>
    </div>

    <template v-else>
      <button v-if="!searching" type="button" class="back" @click="field = null">
        <ArrowLeft :size="16" aria-hidden="true" /> {{ t('wizard.allFields') }}
      </button>
      <button
        v-if="!searching && field"
        type="button"
        class="option option-unsure"
        :aria-pressed="major === '' && openField === field"
        @click="pickUnsure(field)"
      >
        <span>{{ t('wizard.fieldOnly') }}</span>
        <Check v-if="major === '' && openField === field" :size="18" aria-hidden="true" />
      </button>
      <section v-for="g in shown" :key="g.id" class="group">
        <h3 class="group-name">{{ t(`majorGroup.${g.id}`) }}</h3>
        <div class="group-list">
          <button
            v-for="m in g.majors"
            :key="m.id"
            type="button"
            class="option"
            :aria-pressed="major === m.id"
            @click="pick(m.id)"
          >
            <span>{{ m.title }}</span>
            <Check v-if="major === m.id" :size="18" aria-hidden="true" />
          </button>
        </div>
      </section>
    </template>
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
  border-radius: var(--radius);
  border: 1px solid var(--glass-edge);
  background: var(--glass-fill);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
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
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--accent);
}

.group {
  display: grid;
  gap: 8px;
}

.group-name {
  font-size: 0.8125rem;
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
  font-size: 0.9375rem;
  text-align: left;
  color: var(--ink);
  cursor: pointer;
}

.option:hover {
  background: var(--glass-fill-hover);
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

.fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: 8px;
}

.field {
  min-height: 52px;
  font-weight: 600;
}

.field-count {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-weight: 500;
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.back {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.875rem;
  color: var(--accent);
  cursor: pointer;
}
</style>

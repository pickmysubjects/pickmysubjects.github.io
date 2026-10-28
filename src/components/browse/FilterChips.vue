<script setup lang="ts" generic="T extends string | number">
import { computed, shallowRef } from 'vue'
import { Check, Search } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { fold } from '@/components/layout/featureIndex'

/**
 * A group's options, any number of them on (they are alternatives: level 1 or level 2). Each
 * shows how many subjects it would list. `list`: one option per line, for longer names; past
 * nine options a search box filters them and only the first few show until "Show all".
 */
export interface FilterOption<V> {
  value: V
  label: string
  count: number
}
const props = withDefaults(defineProps<{ options: FilterOption<T>[]; label: string; list?: boolean }>(), { list: false })
const model = defineModel<readonly T[]>({ required: true })
const { t } = useI18n()

const LONG = 9
const FIRST = 6
const searchable = computed(() => props.options.length > LONG)
const query = shallowRef('')
const all = shallowRef(false)
const shown = computed(() => {
  const q = fold(query.value)
  if (q) return props.options.filter((o) => fold(o.label).includes(q) || fold(String(o.value)).includes(q))
  if (!searchable.value || all.value) return props.options
  // The chosen ones always show, even when they're further down.
  return props.options.filter((o, i) => i < FIRST || model.value.includes(o.value))
})
const hidden = computed(() => props.options.length - shown.value.length)

function toggle(v: T): void {
  model.value = model.value.includes(v) ? model.value.filter((x) => x !== v) : [...model.value, v]
}
</script>

<template>
  <div class="fchips">
    <label v-if="searchable" class="fsearch">
      <Search :size="15" aria-hidden="true" />
      <input v-model="query" type="search" :placeholder="t('browse.findOption')" :aria-label="t('browse.findIn', { x: label })" />
    </label>
    <ul class="fopts" :class="{ 'fopts-list': list }" :aria-label="label">
      <li v-for="o in shown" :key="String(o.value)">
        <button
          type="button"
          class="fopt"
          :aria-pressed="model.includes(o.value)"
          :aria-label="t('browse.optionCount', { x: o.label, n: o.count })"
          :disabled="o.count === 0 && !model.includes(o.value)"
          @click="toggle(o.value)"
        >
          <span class="fbox" aria-hidden="true"><Check :size="12" :stroke-width="3" /></span>
          <span class="flabel">{{ o.label }}</span>
          <span class="fcount" aria-hidden="true">{{ o.count }}</span>
        </button>
      </li>
    </ul>
    <p v-if="query && !shown.length" class="fnone">{{ t('browse.noOption') }}</p>
    <button v-if="searchable && !query && (hidden > 0 || all)" type="button" class="fmore" @click="all = !all">
      {{ all ? t('browse.showFewer') : t('browse.showAll', { n: options.length }) }}
    </button>
  </div>
</template>

<style scoped>
.fchips {
  display: grid;
  gap: 8px;
}

.fsearch {
  position: relative;
  display: block;
}

.fsearch svg {
  position: absolute;
  top: 50%;
  left: 11px;
  color: var(--ink-faint);
  transform: translateY(-50%);
}

.fsearch input {
  width: 100%;
  min-height: 36px;
  padding: 6px 10px 6px 32px;
  font-size: var(--fs-meta);
  background: var(--inset-fill);
  border: 1px solid var(--line);
  border-radius: 10px;
}

.fsearch input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.fopts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.fopts-list {
  display: grid;
  gap: 2px;
}

/* An option: a small check box, the name and its count, all in one rounded chip. */
.fopt {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 5px 10px 5px 8px;
  font-size: var(--fs-meta);
  color: var(--ink);
  text-align: start;
  background: color-mix(in srgb, var(--ink) 4%, transparent);
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.fopts-list .fopt {
  width: 100%;
  background: none;
}

.fopt:hover:not(:disabled) {
  background: var(--inset-fill);
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
}

.fopt:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.fopt[aria-pressed='true'] {
  font-weight: var(--fw-semibold);
  color: var(--accent);
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}

.fopt:disabled {
  color: var(--ink-faint);
  cursor: default;
  opacity: 0.55;
}

.fbox {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 16px;
  height: 16px;
  color: transparent;
  border: 1.5px solid color-mix(in srgb, var(--ink) 30%, transparent);
  border-radius: 5px;
}

[aria-pressed='true'] .fbox {
  color: var(--accent-fill-ink);
  background: var(--accent-fill);
  border-color: var(--accent-fill);
}

.flabel {
  flex: 1;
  min-width: 0;
}

.fcount {
  font-variant-numeric: tabular-nums;
  font-size: var(--fs-caption);
  font-weight: var(--fw-medium);
  color: var(--ink-soft);
}

[aria-pressed='true'] .fcount {
  color: var(--accent);
}

.fnone {
  margin: 0;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.fmore {
  justify-self: start;
  min-height: 32px;
  padding: 0 4px;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--accent);
  background: none;
  border: 0;
  cursor: pointer;
}

.fmore:hover {
  text-decoration: underline;
}

@media (pointer: coarse) {
  .fopt {
    min-height: 44px;
  }
}
</style>

<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { computed, shallowRef, useId } from 'vue'
import { GraduationCap, Plus, Trash2 } from 'lucide-vue-next'
import { CREDIT_MAX_POINTS, isFail, type Credit, type Profile } from '@/engine'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'

/**
 * Credit (advanced standing) for study elsewhere: points at a level with no subject named
 * (unspecified credit), or a named UniMelb subject (specified credit, a record row with no mark).
 * Closed until asked for: most students have none.
 */
const credit = defineModel<Credit[]>('credit', { default: () => [] })
const results = defineModel<Profile['results']>('results', { required: true })
defineProps<{ options: { code: string; title: string }[] }>()

const { t } = useI18n()
const listId = useId()
const { course } = usePlan()
// The course's own subject categories ("science", "breadth"); none before a degree is chosen.
const categories = computed(() => (course.value?.categories ?? []).filter((c) => c !== 'core'))

const open = shallowRef(false)
const kind = shallowRef<'points' | 'named'>('points')
const points = shallowRef(50)
const level = shallowRef<1 | 2 | 3>(1)
const category = shallowRef('')
const label = shallowRef('')
const code = shallowRef('')
const error = shallowRef('')
const POINTS = Array.from({ length: CREDIT_MAX_POINTS / 12.5 }, (_, i) => (i + 1) * 12.5)

function add(): void {
  if (kind.value === 'named') {
    const c = code.value.trim().split(/\s/)[0]?.toUpperCase() ?? ''
    if (!/^[A-Z]{4}\d{5}$/.test(c)) {
      error.value = t.value('record.badCode')
      return
    }
    if (results.value.some((r) => r.code === c && !isFail(r))) {
      error.value = t.value('record.duplicate', { code: c })
      return
    }
    results.value = [...results.value, { code: c, credit: true }]
    code.value = ''
  } else {
    const line: Credit = { points: points.value, level: level.value, ...(category.value ? { category: category.value } : {}), ...(label.value.trim() ? { label: label.value.trim().slice(0, 60) } : {}) }
    credit.value = [...credit.value, line]
    label.value = ''
  }
  error.value = ''
  open.value = false
}

function remove(i: number): void {
  credit.value = credit.value.filter((_, j) => j !== i)
}

const lineText = (c: Credit) =>
  c.category && categories.value.includes(c.category)
    ? t.value('record.creditLineCat', { points: c.points, level: c.level, category: t.value(`category.${c.category}`) })
    : t.value('record.creditLine', { points: c.points, level: c.level })
</script>

<template>
  <div class="credit">
    <ul v-if="credit.length" class="lines" :aria-label="t('record.creditTitle')">
      <li v-for="(c, i) in credit" :key="i" class="line">
        <GraduationCap :size="16" aria-hidden="true" class="line-icon" />
        <span class="line-name">{{ c.label || t('record.creditTitle') }}</span>
        <span class="line-what">{{ lineText(c) }}</span>
        <button class="act-remove" type="button" :aria-label="t('record.creditRemove', { name: c.label || t('record.creditTitle') })" :title="t('record.remove')" @click="remove(i)">
          <Trash2 :size="15" aria-hidden="true" />
        </button>
      </li>
    </ul>

    <p class="hint">
      <button v-if="!open" class="add-link" type="button" data-testid="credit-open" @click="open = true"><Plus :size="15" aria-hidden="true" /> {{ t('record.creditAdd') }}</button>
      <span>{{ t('record.creditShort') }}</span><InfoTip :text="t('record.creditHint')" />
    </p>

    <form v-if="open" class="form" data-testid="credit-form" @submit.prevent="add">
      <div class="seg" role="group" :aria-label="t('record.creditAdd')">
        <button type="button" :aria-pressed="kind === 'points'" @click="kind = 'points'">{{ t('record.creditPointsOnly') }}</button>
        <button type="button" :aria-pressed="kind === 'named'" @click="kind = 'named'">{{ t('record.creditNamed') }}</button>
      </div>
      <div v-if="kind === 'points'" class="fields">
        <label class="field">
          <span class="field-label">{{ t('record.creditPoints') }}</span>
          <select v-model.number="points" class="input">
            <option v-for="p in POINTS" :key="p" :value="p">{{ p }}</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">{{ t('record.creditLevel') }}</span>
          <select v-model.number="level" class="input">
            <option v-for="n in [1, 2, 3]" :key="n" :value="n">{{ t('record.creditLevelN', { n }) }}</option>
          </select>
        </label>
        <label v-if="categories.length" class="field">
          <span class="field-label">{{ t('record.creditCategory') }}</span>
          <select v-model="category" class="input">
            <option value="">{{ t('record.creditCategoryUnknown') }}</option>
            <option v-for="c in categories" :key="c" :value="c">{{ t(`category.${c}`) }}</option>
          </select>
        </label>
        <label class="field field-wide">
          <span class="field-label">{{ t('record.creditLabel') }}</span>
          <input v-model="label" class="input" maxlength="60" :placeholder="t('record.creditLabelPlaceholder')" />
        </label>
      </div>
      <label v-else class="field field-wide">
        <span class="field-label">{{ t('record.subject') }}</span>
        <input v-model="code" class="input" :list="listId" :placeholder="t('record.subjectPlaceholder')" />
        <datalist :id="listId">
          <option v-for="o in options" :key="o.code" :value="`${o.code} ${o.title}`" />
        </datalist>
      </label>
      <div class="actions">
        <button class="button button-quiet" type="button" @click="open = false; error = ''">{{ t('rating.cancel') }}</button>
        <button class="button button-accent" type="submit"><Plus :size="16" aria-hidden="true" /> {{ t('record.add') }}</button>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.credit {
  margin-top: 12px;
}

.lines {
  display: grid;
  gap: 6px;
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
}

.line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  padding: 10px 12px;
  border: 1px solid var(--glass-edge);
  border-radius: 14px;
  background: var(--glass-fill);
}

.line-icon {
  color: var(--accent);
}

.line-name {
  font-weight: 600;
}

.line-what {
  flex: 1 1 auto;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.act-remove {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 8px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--ink-faint);
  cursor: pointer;
}

.act-remove:hover {
  color: var(--bad);
  background: var(--bad-soft);
}

.hint {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin: 0;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.add-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: var(--accent-soft);
  font: inherit;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}

.form {
  display: grid;
  gap: 10px;
  margin-top: 10px;
  padding: 12px;
  border: 1px solid var(--glass-edge);
  border-radius: 14px;
  background: var(--glass-fill);
}

.seg {
  display: inline-flex;
  justify-self: start;
  gap: 2px;
  padding: 3px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}

.seg button {
  min-height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  font: inherit;
  font-size: 0.8125rem;
  color: var(--ink-soft);
  cursor: pointer;
}

.seg button[aria-pressed='true'] {
  font-weight: 650;
  color: var(--ink);
  background: var(--glass-fill-hover);
  box-shadow: var(--glass-shadow);
}

.fields {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field {
  display: grid;
  gap: 4px;
  flex: 0 1 120px;
  min-width: 0;
}

.field-wide {
  flex: 1 1 200px;
}

.field-label {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.field .input {
  width: 100%;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.error {
  margin: 0;
  color: var(--stop);
  font-size: 0.875rem;
}

@media (pointer: coarse) {
  .add-link,
  .act-remove {
    min-height: 40px;
  }
}
</style>

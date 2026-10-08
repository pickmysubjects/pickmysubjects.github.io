<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import { CircleCheck, TriangleAlert } from 'lucide-vue-next'
import { previewAdd } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'
import { issueText, termLabel } from '@/i18n/format'

const props = defineProps<{ options: { code: string; title: string }[]; termIndex: number }>()
const emit = defineEmits<{ pick: [code: string] }>()

const listId = useId()
const { t } = useI18n()
const { data } = useDataset()
const plan = usePlan()
const text = shallowRef('')

const code = computed(() => {
  const c = text.value.trim().split(/\s/)[0]?.toUpperCase() ?? ''
  return /^[A-Z]{4}\d{5}$/.test(c) ? c : null
})

/** Before adding: already planned? Would it run, have its prerequisites and avoid clashes here? */
const check = computed(() => {
  const c = code.value
  if (!c) return null
  const title = data.value.subjects[c]?.title ?? t.value('plan.notInDataset')
  const at = plan.terms.value.find((term) => term.subjects.includes(c))
  if (at) return { title, planned: termLabel(t.value, at), problems: [] as string[] }
  const issues = previewAdd(plan.plan.value, data.value, props.termIndex, c, plan.course.value?.standardLoad)
  return { title, planned: null, problems: issues.map((i) => issueText(t.value, i, [], [], data.value.subjects, plan.setup.value.course)) }
})

function submit(): void {
  if (!code.value || check.value?.planned) return
  emit('pick', code.value)
  text.value = ''
}
</script>

<template>
  <form class="picker" @submit.prevent="submit">
    <input
      v-model="text"
      class="input picker-input"
      :list="listId"
      :placeholder="t('plan.addSubject')"
      :aria-label="t('plan.addSubjectLabel')"
      :aria-describedby="check ? `${listId}-check` : undefined"
    />
    <datalist :id="listId">
      <option v-for="o in options" :key="o.code" :value="`${o.code} ${o.title}`" />
    </datalist>
    <div v-if="check" :id="`${listId}-check`" class="check" aria-live="polite">
      <p class="check-title"><span class="code">{{ code }}</span> {{ check.title }}</p>
      <p v-if="check.planned" class="check-line">{{ t('plan.alreadyPlanned', { term: check.planned }) }}</p>
      <template v-else>
        <p v-if="check.problems.length === 0" class="check-line check-ok">
          <CircleCheck :size="14" aria-hidden="true" /> {{ t('plan.fitsHere') }}
        </p>
        <p v-for="(p, i) in check.problems" :key="i" class="check-line check-bad">
          <TriangleAlert :size="14" aria-hidden="true" /> {{ p }}
        </p>
        <button class="check-add" type="submit">
          {{ check.problems.length ? t('plan.addAnyway') : t('plan.addHere') }}
        </button>
      </template>
    </div>
  </form>
</template>

<style scoped>
.picker {
  display: grid;
  gap: 6px;
}

.picker-input {
  padding: 5px 8px;
  border-style: dashed;
  background: transparent;
  font-size: 0.82rem;
}

.check {
  display: grid;
  gap: 4px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: 0.8rem;
}

.check-title {
  font-weight: 600;
}

.check-title .code {
  color: var(--accent);
}

.check-line {
  display: flex;
  gap: 5px;
  align-items: flex-start;
  color: var(--ink-soft);
}

.check-line svg {
  flex: none;
  margin-top: 2px;
}

.check-ok {
  color: var(--good);
}

.check-bad {
  color: var(--ink);
}

.check-bad svg {
  color: var(--stop);
}

.check-add {
  justify-self: start;
  padding: 3px 10px;
  border: 1px solid var(--accent);
  border-radius: 999px;
  background: none;
  font: inherit;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}
</style>

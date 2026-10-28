<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import type { ComparedPlan } from '@/composables/usePlanCompare'
import type { SummaryLine } from '@/engine'
import { useI18n } from '@/i18n'
import type { Group } from './compareRows'

/**
 * The plain facts that differ, at the top: first what makes the plans different (majors, jobs,
 * subjects), then degree rules, last semester, heaviest semester and predicted WAM, each plan's
 * value side by side (or one line for the whole set) and a link down to its row. No verdict.
 */
const props = defineProps<{ lines: SummaryLine[]; plans: ComparedPlan[]; names: string[]; groups: Group[] }>()
const emit = defineEmits<{ reveal: [rowId: string] }>()
const { t } = useI18n()

const ROW: Record<SummaryLine['kind'], string> = {
  majors: 'majors',
  careers: 'careers',
  subjects: 'timeline',
  rules: 'rules',
  finish: 'finish',
  heaviest: 'heaviest',
  wam: 'wam',
}
const LABEL: Record<SummaryLine['kind'], string> = {
  majors: 'cmp.rowMajors',
  careers: 'cmp.rowCareers',
  subjects: 'cmp.sumSubjects',
  rules: 'cmp.sumRules',
  finish: 'cmp.sumFinish',
  heaviest: 'cmp.sumHeaviest',
  wam: 'cmp.sumWam',
}

const items = computed(() =>
  props.lines.map((line) => {
    const rowId = ROW[line.kind]
    const label = t.value(LABEL[line.kind])
    // One line for the whole set: how many jobs or subjects differ.
    if (line.kind === 'careers') return { kind: line.kind, rowId, label, values: [], text: t.value('cmp.careersDiffer', { n: line.n }), note: '' }
    if (line.kind === 'subjects') {
      const text = [line.differ ? t.value('cmp.differ', { n: line.differ }) : '', line.moved ? t.value('cmp.moved', { n: line.moved }) : ''].filter(Boolean).join(t.value('listSep'))
      return { kind: line.kind, rowId, label, values: [], text, note: '' }
    }
    const cells = props.groups.flatMap((g) => g.rows).find((r) => r.id === rowId)?.cells ?? []
    const values = props.plans.map((p, i) => {
      let value: string
      if (line.kind === 'rules') value = p.facts.rules.failed ? t.value('cmp.notMet', { n: p.facts.rules.failed }) : t.value('cmp.allMet')
      else if (line.kind === 'wam') value = `${cells[i]?.text ?? ''} (${cells[i]?.sub?.[0] ?? ''})`
      else if (line.kind === 'majors') value = [cells[i]?.text ?? '', ...(cells[i]?.sub ?? [])].join(' · ')
      else value = cells[i]?.tag ? `${cells[i]?.text} (${cells[i]?.tag})` : (cells[i]?.text ?? '')
      return { name: props.names[i] ?? '', value }
    })
    const note = line.kind === 'wam' ? t.value(line.aboutSame ? 'cmp.wamSame' : 'cmp.wamApart') : ''
    return { kind: line.kind, rowId, label, values, text: '', note }
  }),
)
</script>

<template>
  <section id="cmp-summary" class="sum surface" :aria-labelledby="'cmp-summary-title'">
    <h2 id="cmp-summary-title" class="sum-title">{{ t('cmp.summaryTitle') }}</h2>
    <ul v-if="items.length" class="sum-list">
      <li v-for="item in items" :key="item.kind" class="sum-item">
        <a class="sum-label" :href="`#cmp-${item.rowId}`" @click="emit('reveal', item.rowId)">
          {{ item.label }}<ArrowDown :size="14" aria-hidden="true" />
        </a>
        <p v-if="item.text" class="sum-values">{{ item.text }}</p>
        <p v-else class="sum-values">
          <span v-for="(v, i) in item.values" :key="i" class="sum-value"><strong>{{ v.name }}</strong> {{ v.value }}</span>
        </p>
        <p v-if="item.note" class="sum-note">
          {{ item.note }}<InfoTip v-if="item.kind === 'wam'" :text="t('cmp.wamInfo')" />
        </p>
      </li>
    </ul>
    <p v-else class="sum-none">{{ t('cmp.summaryNone') }}</p>
  </section>
</template>

<style scoped>
.sum {
  display: grid;
  gap: 14px;
  padding: 22px 28px 24px;
}

.sum-title {
  font-size: var(--fs-section);
  font-weight: var(--fw-bold);
  line-height: var(--lh-heading);
}

.sum-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Each fact on its own frosted tile, so the text never sits on the colour field. */
.sum-item {
  display: grid;
  align-content: start;
  gap: 6px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--card-edge);
  border-radius: 16px;
  background: var(--card-fill);
}

.sum-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  min-height: 24px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
  text-decoration: none;
}

.sum-label:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.sum-values {
  display: grid;
  gap: 2px;
  margin: 0;
  font-size: 1rem;
  overflow-wrap: anywhere;
}

.sum-value strong {
  font-weight: var(--fw-semibold);
}

.sum-note,
.sum-none {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

@media (max-width: 640px) {
  .sum {
    padding: 18px 14px;
    border-radius: 18px;
  }

  .sum-label {
    min-height: 44px;
  }
}
</style>

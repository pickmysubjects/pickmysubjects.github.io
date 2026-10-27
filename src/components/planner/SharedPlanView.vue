<script setup lang="ts">
import { computed } from 'vue'
import type { PlanTerm } from '@/engine'
import type { PlanSetup } from '@/composables/usePlan'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { termLabel } from '@/i18n/format'
import { localTitle } from '@/i18n/localized'

/**
 * A plan from a shared link, shown as it is before the student decides to use it: the degree,
 * the major and every semester's subjects. Read-only; nothing here changes the student's plan.
 */
const props = defineProps<{ setup: PlanSetup; terms: PlanTerm[] }>()

const { data } = useDataset()
const { t, locale } = useI18n()

const course = computed(() => data.value.courses.find((c) => c.code === props.setup.course)?.title ?? props.setup.course)
const title = (id: string | undefined) => (id ? data.value.components.find((c) => c.id === id)?.title : undefined)
const major = computed(() => {
  const main = [title(props.setup.major), title(props.setup.major2), title(props.setup.specialisation)].filter(Boolean).join(' + ')
  const minors = (props.setup.minors ?? []).map(title).filter(Boolean).join(' + ')
  const diploma = props.setup.diploma ? data.value.courses.find((c) => c.code === props.setup.diploma)?.title : undefined
  return [main || (props.setup.field ? t.value('wizard.fieldUndecided', { field: t.value(`majorGroup.${props.setup.field}`) }) : t.value('wizard.notSure')), minors ? t.value('plans.minorLine', { title: minors }) : '', diploma ? t.value('plans.diplomaLine', { title: diploma }) : '']
    .filter(Boolean)
    .join(' · ')
})
const terms = computed(() =>
  props.terms
    .filter((term) => term.subjects.length > 0)
    .map((term) => ({
      key: `${term.year}|${term.period}`,
      label: termLabel(t.value, term),
      subjects: term.subjects.map((code) => {
        const s = data.value.subjects[code]
        return { code, title: s ? localTitle(s, locale.value) || s.title : '' }
      }),
    })),
)
</script>

<template>
  <div class="shared-plan">
    <p class="shared-plan-line">
      <strong>{{ course }}</strong> · {{ major }}
    </p>
    <ol class="shared-plan-terms">
      <li v-for="term in terms" :key="term.key" class="shared-plan-term surface">
        <h2 class="shared-plan-label">{{ term.label }}</h2>
        <ul class="shared-plan-list">
          <li v-for="s in term.subjects" :key="s.code">
            <a class="shared-plan-subject" :href="link(`subject/${s.code}`)">
              <span class="code">{{ s.code }}</span>
              <span v-if="s.title" class="shared-plan-title">{{ s.title }}</span>
            </a>
          </li>
        </ul>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.shared-plan {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.shared-plan-line {
  color: var(--ink-soft);
}

.shared-plan-line strong {
  color: var(--ink);
}

.shared-plan-terms {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.shared-plan-term {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 14px 16px;
}

.shared-plan-label {
  font-size: 0.9375rem;
  font-weight: 700;
}

.shared-plan-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.shared-plan-subject {
  display: grid;
  gap: 1px;
  color: inherit;
  text-decoration: none;
}

.shared-plan-subject:hover .shared-plan-title {
  text-decoration: underline;
}

.shared-plan-title {
  font-size: 0.875rem;
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}
</style>

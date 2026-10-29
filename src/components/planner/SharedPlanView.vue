<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import { usePlans } from '@/composables/usePlans'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { termLabel } from '@/i18n/format'
import { localTitle } from '@/i18n/localized'
import { MAX_PLANS } from '@/utils/planBook'
import type { SharedPlan } from '@/utils/sharePlan'

/**
 * A plan from a shared link, read-only: the degree, the major and every semester's subjects.
 * Import asks first, then adds it as a new plan (or fills a blank first plan); nothing the student
 * has is replaced. A link that can't be read says so instead of showing nothing.
 */
const props = defineProps<{ shared: SharedPlan | null }>()
const emit = defineEmits<{ done: [] }>()

const { data } = useDataset()
const { t, locale } = useI18n()
const plans = usePlans()

// A degree this site doesn't know (an edited link, or one dropped since) reads as broken too.
const readable = computed(() => {
  const s = props.shared
  return s && data.value.courses.some((c) => c.code === s.setup.course) ? s : null
})
const count = computed(() => readable.value?.terms.reduce((sum, x) => sum + x.subjects.length, 0) ?? 0)
const room = computed(() => plans.blank.value || plans.canAdd.value)
const asking = shallowRef(false)
const yes = useTemplateRef<HTMLButtonElement>('yes')

async function ask(): Promise<void> {
  asking.value = true
  await nextTick()
  yes.value?.focus()
}
function take(): void {
  if (!readable.value) return
  plans.adopt(readable.value.setup, readable.value.terms, readable.value.name)
  emit('done')
}

const course = computed(() => {
  const code = readable.value?.setup.course ?? ''
  return data.value.courses.find((c) => c.code === code)?.title ?? code
})
const title = (id: string | undefined) => (id ? data.value.components.find((c) => c.id === id)?.title : undefined)
const major = computed(() => {
  const setup = readable.value?.setup
  if (!setup) return ''
  const main = [title(setup.major), title(setup.major2), title(setup.specialisation)].filter(Boolean).join(' + ')
  const minors = (setup.minors ?? []).map(title).filter(Boolean).join(' + ')
  const diploma = setup.diploma ? data.value.courses.find((c) => c.code === setup.diploma)?.title : undefined
  return [main || (setup.field ? t.value('wizard.fieldUndecided', { field: t.value(`majorGroup.${setup.field}`) }) : t.value('wizard.notSure')), minors ? t.value('plans.minorLine', { title: minors }) : '', diploma ? t.value('plans.diplomaLine', { title: diploma }) : '']
    .filter(Boolean)
    .join(' · ')
})
const terms = computed(() =>
  (readable.value?.terms ?? [])
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
  <section v-if="!readable" class="shared surface" role="alert">
    <p class="shared-text">{{ t('plan.shareSheet.broken') }}</p>
    <p class="shared-sub">{{ t('plan.shareSheet.brokenWhy') }}</p>
    <div class="shared-actions">
      <button class="button button-quiet" type="button" @click="emit('done')">{{ t('plan.shareSheet.close') }}</button>
    </div>
  </section>
  <div v-else class="shared-plan">
    <section class="shared surface">
      <p class="shared-text">{{ readable.name ? t('plan.shareSheet.namedText', { name: readable.name, n: count }) : t('plan.sharedText', { n: count }) }}</p>
      <template v-if="asking">
        <p class="shared-sub" role="status">{{ plans.blank.value ? t('plan.shareSheet.askBlank') : t('plan.shareSheet.ask') }}</p>
        <div class="shared-actions">
          <button ref="yes" class="button button-accent" type="button" @click="take">{{ plans.blank.value ? t('plan.sharedImport') : t('plan.shareSheet.addNew') }}</button>
          <button class="button button-quiet" type="button" @click="asking = false">{{ t('plans.cancel') }}</button>
        </div>
      </template>
      <template v-else>
        <p v-if="!room" class="shared-sub">{{ t('plan.shareSheet.full', { n: MAX_PLANS }) }}</p>
        <div class="shared-actions">
          <button v-if="room" class="button button-accent" type="button" @click="ask">{{ t('plan.sharedImport') }}</button>
          <button class="button button-quiet" type="button" @click="emit('done')">{{ t('plan.sharedDismiss') }}</button>
        </div>
      </template>
    </section>
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
.shared {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
}

.shared-text {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.shared-sub {
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.shared-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

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

<script setup lang="ts">
import { computed } from 'vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { useI18n } from '@/i18n'
import { categoryTag } from '@/i18n/format'

/**
 * How a subject counts in the student's degree: the Handbook's category, or another one the
 * degree has, picked by the student (only with faculty approval). A segmented control, so it reads
 * as a choice to change, not a label to look at.
 */
const props = defineProps<{ handbook: string | undefined; choices: readonly string[] }>()
const model = defineModel<string | undefined>()
const { t } = useI18n()

const options = computed(() => [
  { value: '', label: props.handbook ? t.value('countsAs.handbookIs', { cat: categoryTag(t.value, props.handbook) }) : t.value('countsAs.handbook') },
  ...props.choices.filter((c) => c !== props.handbook).map((c) => ({ value: c, label: categoryTag(t.value, c) })),
])
const value = computed({ get: () => model.value ?? '', set: (v: string) => (model.value = v || undefined) })
</script>

<template>
  <div class="counts">
    <p class="counts-title">{{ t('countsAs.title') }} <span class="counts-hint">{{ t('countsAs.tapToChange') }}</span></p>
    <SegmentedControl v-model="value" :options="options" :label="t('countsAs.title')" />
    <p class="counts-help">{{ t('countsAs.help') }}</p>
  </div>
</template>

<style scoped>
.counts {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.counts-title {
  margin: 0;
  font-weight: var(--fw-semibold);
  color: var(--ink);
}

.counts-hint {
  font-weight: var(--fw-regular);
  font-size: var(--fs-small);
  color: var(--accent);
}

.counts-help {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { GraduationCap } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'

// Which degree a list follows (categories, breadth, majors), and a way to change it on My record.
const props = defineProps<{ course: string }>()
const { data } = useDataset()
const plan = usePlan()
const { t } = useI18n()
const title = computed(() => data.value.courses.find((c) => c.code === props.course)?.title ?? props.course)
const chosen = plan.courseChosen
</script>

<template>
  <p class="degree" :class="{ 'degree-default': !chosen }">
    <GraduationCap :size="16" aria-hidden="true" />
    <span>{{ chosen ? t('majors.shownFor', { course: title }) : t('majors.shownDefault', { course: title }) }}</span>
    <a class="degree-change" :href="link('record')">{{ t('majors.change') }}</a>
  </p>
</template>

<style scoped>
.degree {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  margin: 0;
  /* A quiet line, not a pill: in longer languages it wraps, and a wrapped pill looks broken. */
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.degree-default svg {
  color: var(--accent);
}

.degree-change {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--accent-soft);
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
}
</style>

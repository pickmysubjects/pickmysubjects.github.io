<script setup lang="ts">
import { computed } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import { recommend } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/** Shows straight away what the record changes: the top suggestions, live. */
const { data } = useDataset()
const { profile } = useProfile()
const plan = usePlan()
const { t } = useI18n()

const hasInput = computed(
  () => profile.value.results.length > 0 || Object.keys(profile.value.skills).length > 0 || profile.value.interests.length > 0,
)
const top = computed(() =>
  recommend(data.value, profile.value, {
    course: plan.setup.value.course,
    planned: plan.plannedCodes.value,
    limit: 3,
  }),
)
</script>

<template>
  <section class="preview surface" aria-live="polite">
    <h2 class="preview-title"><Sparkles :size="16" aria-hidden="true" /> {{ t('record.previewTitle') }}</h2>
    <p v-if="!hasInput" class="preview-empty">{{ t('record.previewEmpty') }}</p>
    <ol v-else class="preview-list">
      <li v-for="r in top" :key="r.code">
        <a :href="`#/subject/${r.code}`"><span class="code">{{ r.code }}</span> {{ r.title }}</a>
      </li>
    </ol>
    <a class="preview-more" href="#/recommend">{{ t('record.previewMore') }}</a>
  </section>
</template>

<style scoped>
.preview {
  display: grid;
  gap: 8px;
  padding: 16px 18px;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 650;
}

.preview-empty {
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.preview-list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 20px;
}

.preview-list a {
  color: var(--ink);
  text-decoration: none;
}

.preview-list a:hover {
  color: var(--accent);
}

.preview-list .code {
  color: var(--accent);
  font-size: 0.88rem;
}

.preview-more {
  width: fit-content;
  font-size: 0.88rem;
  font-weight: 600;
}
</style>

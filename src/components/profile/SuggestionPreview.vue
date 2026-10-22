<script setup lang="ts">
import { link } from '@/composables/useView'
import { computed } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import { heldMajorIds, recommend, yearLevel } from '@/engine'
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
    // Same list as the For-you page that "see more" opens.
    maxLevel: yearLevel(profile.value.results, data.value),
    programme: {
      courseYear: plan.setup.value.courseYear,
      components: heldMajorIds(plan.plan.value).filter((id): id is string => !!id),
      minors: plan.setup.value.minors ?? [],
    },
    limit: 3,
  }),
)
</script>

<template>
  <section class="preview surface" aria-live="polite">
    <h2 class="preview-title"><Sparkles :size="16" aria-hidden="true" /> {{ t('record.previewTitle') }}</h2>
    <p v-if="!hasInput" class="preview-empty">{{ t('record.previewEmpty') }}</p>
    <ol v-else class="preview-list">
      <li v-for="(r, i) in top" :key="r.code">
        <span class="n" aria-hidden="true">{{ i + 1 }}.</span>
        <a :href="link(`subject/${r.code}`)"><span class="code">{{ r.code }}</span> {{ r.title }}</a>
      </li>
    </ol>
    <a class="preview-more" :href="link('subjects/?mine=1')">{{ t('record.previewMore') }}</a>
  </section>
</template>

<style scoped>
.preview {
  display: grid;
  gap: var(--space-3);
  /* Same padding and title as the other cards beside My record. */
  padding: var(--space-5);
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 650;
}

.preview-empty {
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.preview-list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Numbers written out: Chrome can leave stale list numbers after the list re-renders in place. */
.preview-list li {
  display: flex;
  gap: 6px;
}

.n {
  flex: none;
  min-width: 1.2em;
  color: var(--ink-faint);
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
  font-size: 0.875rem;
}

.preview-more {
  width: fit-content;
  font-size: 0.875rem;
  font-weight: 600;
}
</style>

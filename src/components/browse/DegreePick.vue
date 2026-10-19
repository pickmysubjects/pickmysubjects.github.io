<script setup lang="ts">
import { computed } from 'vue'
import { GraduationCap } from 'lucide-vue-next'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'

/** Asked once, before a list that depends on the degree: saved as the plan's degree. */
const { all } = useDataset()
const plan = usePlan()
const { t } = useI18n()
const courses = computed(() => all.courses.filter((c) => c.listed))
</script>

<template>
  <section class="pick surface" aria-labelledby="pick-title">
    <h2 id="pick-title" class="pick-title"><GraduationCap :size="18" aria-hidden="true" /> {{ t('browse.pickDegree') }}</h2>
    <div class="pick-list">
      <button v-for="c in courses" :key="c.code" type="button" class="pick-btn" @click="plan.chooseCourse(c.code)">
        {{ c.title }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.pick {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border-color: var(--accent);
}

.pick-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 650;
}

.pick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pick-btn {
  min-height: 40px;
  padding: 6px 14px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
  background: var(--glass-fill);
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  cursor: pointer;
}

.pick-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}
</style>

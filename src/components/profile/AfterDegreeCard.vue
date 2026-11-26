<script setup lang="ts">
import { computed } from 'vue'
import { entryAdvice, latestCourse } from '@/engine'
import { useBachelorRecord } from '@/composables/useProfile'
import { useDataset } from '@/composables/useDataset'
import { useStudyLevel } from '@/composables/useStudyLevel'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'

/**
 * The bachelor's side of My record: the coursework master's the site plans, each with what this
 * student's major and WAM point to under the Handbook's entry rules. A hint; the University decides.
 */
const { t } = useI18n()
const { all } = useDataset()
const record = useBachelorRecord()
const { level } = useStudyLevel()

const rows = computed(() => {
  if (!record.value) return []
  return entryAdvice(all, { where: 'unimelb' }, record.value).map((a) => ({
    code: a.course,
    title: (latestCourse(all, a.course)?.title ?? a.course).replace(/\s*\(.*\)$/, ''),
    program: a.course.match(/-(\d+)$/)?.[1],
    reason: t.value(`entryAdvice.${a.reason}`),
  }))
})

function tryIt(): void {
  level.value = 'master'
  location.assign(link('plan/'))
}
</script>

<template>
  <div v-if="rows.length" class="after">
    <ul class="after-list">
      <li v-for="r in rows" :key="r.code" class="after-row">
        <span class="after-name">{{ r.title }}<template v-if="r.program"> · {{ t('afterDegree.program', { n: r.program }) }}</template></span>
        <span class="after-why">{{ r.reason }}</span>
      </li>
    </ul>
    <p class="after-note">{{ t('afterDegree.note') }}</p>
    <button type="button" class="button button-quiet" @click="tryIt">{{ t('afterDegree.try') }}</button>
  </div>
</template>

<style scoped>
.after {
  display: grid;
  gap: 12px;
}

.after-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.after-row {
  display: grid;
  gap: 2px;
}

.after-name {
  font-weight: var(--fw-semibold);
  color: var(--ink);
}

.after-why,
.after-note {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.after .button {
  justify-self: start;
}
</style>

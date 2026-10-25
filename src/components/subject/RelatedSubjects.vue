<script setup lang="ts">
import { computed } from 'vue'
import type { RelatedSubjects } from '@/engine'
import SubjectLinks from '@/components/majors/SubjectLinks.vue'
import InfoTip from '@/components/InfoTip.vue'
import { useI18n } from '@/i18n'

/** Related subjects (see relatedSubjects): what it leads to, what's taken with it, what comes before. */
const props = defineProps<{ related: RelatedSubjects; year: number }>()
const { t } = useI18n()
const rel = computed(() => props.related)
const groups = computed(() =>
  [
    { key: 'subject.relatedLeads', codes: rel.value.leadsTo },
    { key: 'subject.relatedWith', codes: rel.value.takenWith },
    { key: 'subject.relatedBefore', codes: rel.value.before },
  ].filter((g) => g.codes.length),
)
</script>

<template>
  <div v-if="groups.length" class="related">
    <h2 class="sec-title">{{ t('subject.relatedTitle') }} <InfoTip :text="t('subject.relatedTip')" /></h2>
    <div class="cols">
      <section v-for="g in groups" :key="g.key" class="col">
        <h3 class="sub">{{ t(g.key) }}</h3>
        <SubjectLinks :codes="g.codes" :year="year" :limit="6" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.related {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

.cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: var(--space-5) var(--space-6);
}

.col {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  min-width: 0;
}

.sub {
  margin: 0;
  font-size: var(--fs-body);
  font-weight: 650;
}
</style>

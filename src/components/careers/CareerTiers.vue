<script setup lang="ts">
import { computed } from 'vue'
import SubjectLinks from '@/components/majors/SubjectLinks.vue'
import { TIERS, type Tiered } from '@/engine'
import { subjectNote } from '@/utils/careerPathText'
import { useI18n } from '@/i18n'

// One list of subjects split into tiers for a career; 'little' folds away (it's the long tail).
const props = defineProps<{ tiers: Tiered; year: number }>()
const { t } = useI18n()

const blocks = computed(() =>
  TIERS.filter((tier) => props.tiers[tier].length).map((tier) => ({
    tier,
    codes: props.tiers[tier].map((r) => r.code),
    notes: Object.fromEntries(props.tiers[tier].map((r) => [r.code, subjectNote(t.value, r)])),
  })),
)
</script>

<template>
  <div class="tiers">
    <template v-for="b in blocks" :key="b.tier">
      <details v-if="b.tier === 'little'" class="tier">
        <summary class="tier-head">
          <span class="tier-name" :data-tier="b.tier">{{ t(`careerPath.tier.${b.tier}`) }} <span class="count">{{ b.codes.length }}</span></span>
          <span class="tier-hint">{{ t(`careerPath.tierHint.${b.tier}`) }}</span>
        </summary>
        <SubjectLinks :codes="b.codes" :year="year" :notes="b.notes" />
      </details>
      <section v-else class="tier">
        <div class="tier-head">
          <h3 class="tier-name" :data-tier="b.tier">{{ t(`careerPath.tier.${b.tier}`) }} <span class="count">{{ b.codes.length }}</span></h3>
          <p class="tier-hint">{{ t(`careerPath.tierHint.${b.tier}`) }}</p>
        </div>
        <SubjectLinks :codes="b.codes" :year="year" :notes="b.notes" :limit="b.tier === 'required' ? undefined : 6" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.tiers {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.tier {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.tier-head {
  display: grid;
  gap: 2px;
}

details > .tier-head {
  cursor: pointer;
  list-style: none;
}

details > .tier-head::-webkit-details-marker {
  display: none;
}

details[open] > .tier-head {
  margin-bottom: 8px;
}

.tier-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 650;
}

details .tier-name::after {
  content: '▾';
  color: var(--ink-faint);
  font-size: 0.875rem;
}

.tier-name[data-tier='required'] {
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

.count {
  padding: 1px 9px;
  border-radius: 999px;
  background: var(--accent-soft);
  font-size: 0.8125rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

.tier-hint {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ink-soft);
}
</style>

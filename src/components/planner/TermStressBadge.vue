<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { termStress } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { stressText } from '@/i18n/format'

/** How hard this semester's subjects are to carry together; tap for the reasons. */
const props = defineProps<{ codes: string[] }>()
const { data } = useDataset()
const { profile } = useProfile()
const { t } = useI18n()
const open = shallowRef(false)

const stress = computed(() => termStress(props.codes, data.value, profile.value))
const label = computed(() => {
  const level = stress.value.level
  if (level !== 'ok') return t.value(`stress.${level}`)
  return stress.value.reasons.length ? t.value('stress.note') : null
})
const reasons = computed(() => stress.value.reasons.map((r) => stressText(t.value, r)))
</script>

<template>
  <div v-if="label" class="stress" :class="`stress-${stress.level}`">
    <button type="button" class="stress-tag" :aria-expanded="open" @click="open = !open">{{ label }}</button>
    <ul v-if="open" class="stress-reasons">
      <li v-for="(r, i) in reasons" :key="i">{{ r }}</li>
    </ul>
  </div>
</template>

<style scoped>
.stress {
  display: grid;
  gap: 6px;
  grid-column: 1 / -1;
}

.stress-tag {
  justify-self: start;
  padding: 1px 9px;
  font-size: 0.72rem;
  font-weight: 650;
  color: var(--ink-soft);
  background: var(--surface-2);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.stress-heavy .stress-tag {
  color: var(--warn);
  background: var(--warn-soft);
}

.stress-veryHeavy .stress-tag {
  color: var(--bad);
  background: var(--bad-soft);
}

.stress-reasons {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 8px 10px 8px 24px;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
}

@media print {
  .stress {
    display: none;
  }
}
</style>

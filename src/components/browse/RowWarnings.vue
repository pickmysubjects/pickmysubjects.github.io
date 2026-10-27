<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { computed } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import type { Recommendation } from '@/engine'
import { useI18n } from '@/i18n'
import { reasonText } from '@/i18n/format'
import { useProfile } from '@/composables/useProfile'

/** A suggestion's cautions and its same-subject alternatives, under a Find subjects row. */
const props = defineProps<{ rec: Recommendation }>()
const { t } = useI18n()
const { setConfirmed } = useProfile()
const trim = (s: string) => s.replace(/[。.]\s*$/, '')
// A condition only the student can check (a VCE score): a plain line, an "I meet it" button,
// and the Handbook's own words folded away.
const warnings = computed(() =>
  props.rec.warnings.map((n) =>
    n.key === 'eligibilityUnknown'
      ? { manual: true, text: t.value('reason.eligibilityManualShort'), original: String(n.params.needs ?? '') }
      : { manual: false, text: trim(reasonText(t.value, n)), original: '' },
  ),
)
</script>

<template>
  <div v-if="warnings.length || rec.alternatives?.length" class="notes">
    <p v-if="rec.alternatives?.length" class="alt">{{ t('suggest.orInstead', { codes: rec.alternatives.join(t('listSep')) }) }}</p>
    <ul v-if="warnings.length" class="warnings">
      <li v-for="(w, i) in warnings" :key="i">
        <TriangleAlert :size="13" aria-hidden="true" />
        <span class="body">
          <span>{{ w.text }}<InfoTip v-if="w.manual" :text="t('reason.eligibilityManual')" /></span>
          <span v-if="w.manual" class="manual">
            <button type="button" class="meet" @click="setConfirmed(rec.code, true)">{{ t('suggest.iMeetIt') }}</button>
            <details class="original">
              <summary>{{ t('suggest.original') }}</summary>
              <p>{{ w.original }}</p>
            </details>
          </span>
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.notes {
  position: relative;
  z-index: 1;
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-2);
  font-size: 0.8125rem;
  line-height: 1.45;
}

.alt {
  margin: 0;
  color: var(--ink-soft);
}

.warnings {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.warnings li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--warn);
}

.warnings svg {
  flex: none;
  margin-top: 2px;
}

.body {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.manual {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
}

.meet {
  padding: 1px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--glass-shine), var(--sheet-fill);
  font: inherit;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
}

.original summary {
  color: var(--ink-soft);
  cursor: pointer;
}

.original p {
  margin: 4px 0 0;
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}
</style>

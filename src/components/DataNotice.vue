<script setup lang="ts">
import { link } from '@/composables/useView'
import { computed } from 'vue'
import { Info } from 'lucide-vue-next'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'

const { name, data, setDataset } = useDataset()
const { t } = useI18n()
const count = computed(() => Object.keys(data.value.subjects).length)
</script>

<template>
  <aside class="notice" :class="`notice-${name}`">
    <Info class="notice-icon" :size="18" aria-hidden="true" />
    <p v-if="name === 'demo'" class="notice-text">
      <strong>{{ t('data.badgeDemo') }}</strong> — {{ t('data.demoShort') }}
    </p>
    <p v-else class="notice-text">
      <strong>{{ t('data.badgeReal') }}</strong> — {{ t('data.realShort', { n: count }) }}
      <a :href="link('contribute')">{{ t('data.realLink') }}</a>
    </p>
    <button class="notice-switch" type="button" @click="setDataset(name === 'demo' ? 'real' : 'demo')">
      {{ name === 'demo' ? t('data.switchToReal') : t('data.switchToDemo') }}
    </button>
  </aside>
</template>

<style scoped>
.notice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: 0.9rem;
}

.notice-demo {
  border-color: color-mix(in srgb, #7c5cff 30%, var(--line));
  background: color-mix(in srgb, #7c5cff 6%, var(--surface));
}

.notice-icon {
  flex: none;
  color: var(--ink-soft);
}

.notice-text {
  flex: 1 1 260px;
  color: var(--ink-soft);
}

.notice-text strong {
  color: var(--ink);
}

.notice-switch {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--glass-edge);
  background: var(--glass-fill);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.notice-switch:hover {
  border-color: var(--ink-soft);
}
</style>

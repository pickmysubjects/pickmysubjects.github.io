<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import { useI18n } from '@/i18n'

// The official UniMelb pages for one topic, set off at the bottom of its card the same way everywhere.
defineProps<{ links: readonly { href: string; label: string }[] }>()
const { t } = useI18n()
</script>

<template>
  <div class="official">
    <p class="official-label">{{ t('guide.officialPage') }}</p>
    <ul class="official-list">
      <li v-for="l in links" :key="l.href + l.label">
        <a :href="l.href" target="_blank" rel="noopener">{{ l.label }}<ExternalLink :size="13" aria-hidden="true" class="official-icon" /></a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.official {
  display: grid;
  gap: 8px;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px dashed var(--divider);
}

.official-label {
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  color: var(--ink-faint);
}

.official-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.official-list a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 14px;
  font-size: var(--fs-small);
  font-weight: var(--fw-medium);
  line-height: 1.35;
  color: var(--accent);
  text-decoration: none;
  border: 1px solid var(--card-edge);
  border-radius: 999px;
  background: var(--tile-fill);
  transition: background 0.15s;
}

.official-list a:hover {
  background: var(--glass-fill-hover);
  text-decoration: underline;
}

.official-icon {
  flex: none;
  opacity: 0.8;
}
</style>

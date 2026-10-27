<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { topicPath, topicTitleKey } from '@/utils/guideSections'

// A pointer to the one place a topic is explained, instead of repeating it here:
// "See: Dropping a subject →", or the slot's own sentence as the link text.
const props = defineProps<{ to: string }>()
const { t } = useI18n()
</script>

<template>
  <a class="see" :href="link(topicPath(props.to))">
    <span><slot>{{ t('guide.see', { title: t(topicTitleKey(props.to)) }) }}</slot></span>
    <ArrowRight :size="16" aria-hidden="true" class="see-arrow" />
  </a>
</template>

<style scoped>
.see {
  display: inline-flex;
  align-items: flex-start;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  font-weight: var(--fw-semibold);
  color: var(--accent);
  text-decoration: none;
}

.see:hover span {
  text-decoration: underline;
}

.see-arrow {
  flex: none;
  margin-top: 0.3em;
  transition: transform 0.15s;
}

.see:hover .see-arrow {
  transform: translateX(2px);
}
</style>

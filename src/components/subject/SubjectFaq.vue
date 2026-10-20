<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDown, MessageCircleQuestion } from 'lucide-vue-next'
import type { Subject } from '@/engine'
import { useI18n } from '@/i18n'
import { subjectFaq } from '@/i18n/faq'

/** Short answers to what students ask about a subject: the questions show, each answer opens on tap. */
const props = defineProps<{ subject: Subject; year: number; course: string; unlocks: string[] }>()
const { t, locale } = useI18n()

const CJK = new Set(['zh-CN', 'zh-TW', 'ja'])
const items = computed(() => {
  const cjk = CJK.has(locale.value)
  return subjectFaq(t.value, props.subject, {
    year: props.year,
    course: props.course,
    unlocks: props.unlocks,
    listSep: cjk ? '、' : ', ',
    sentenceSep: cjk ? '' : ' ',
    locale: locale.value,
  })
})
</script>

<template>
  <section v-if="items.length" class="faq" :aria-labelledby="`faq-${subject.code}`">
    <h2 :id="`faq-${subject.code}`" class="faq-title"><MessageCircleQuestion :size="18" aria-hidden="true" /> {{ t('faq.title') }}</h2>
    <details v-for="(item, i) in items" :key="i" class="faq-item">
      <summary>
        <span>{{ item.q }}</span>
        <ChevronDown class="faq-chevron" :size="18" aria-hidden="true" />
      </summary>
      <p>{{ item.a }}</p>
    </details>
  </section>
</template>

<style scoped>
.faq-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 650;
}

.faq-item {
  border-top: 1px solid var(--glass-edge);
}

.faq-item summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
}

.faq-item summary::-webkit-details-marker {
  display: none;
}

.faq-item summary:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
  border-radius: 6px;
}

.faq-chevron {
  flex: none;
  color: var(--ink-soft);
  transition: transform 0.2s ease;
}

.faq-item[open] .faq-chevron {
  transform: rotate(180deg);
}

.faq-item p {
  margin: 0 0 12px;
  color: var(--ink-soft);
  line-height: 1.55;
}

@media (prefers-reduced-motion: reduce) {
  .faq-chevron {
    transition: none;
  }
}
</style>

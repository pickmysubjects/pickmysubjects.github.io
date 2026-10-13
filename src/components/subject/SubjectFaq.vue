<script setup lang="ts">
import { computed } from 'vue'
import { MessageCircleQuestion } from 'lucide-vue-next'
import type { Subject } from '@/engine'
import { useI18n } from '@/i18n'
import { subjectFaq } from '@/i18n/faq'

/** Short answers to what students ask about a subject, folded away by default. */
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
  <details v-if="items.length" class="faq">
    <summary class="faq-title"><MessageCircleQuestion :size="18" aria-hidden="true" /> {{ t('faq.title') }}</summary>
    <dl class="faq-list">
      <div v-for="(item, i) in items" :key="i" class="faq-item">
        <dt>{{ item.q }}</dt>
        <dd>{{ item.a }}</dd>
      </div>
    </dl>
  </details>
</template>

<style scoped>
.faq-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9375rem;
  font-weight: 650;
  cursor: pointer;
}

.faq-list {
  display: grid;
  gap: 12px;
  margin: 12px 0 0;
}

.faq-item dt {
  font-weight: 600;
}

.faq-item dd {
  margin: 2px 0 0;
  color: var(--ink-soft);
  line-height: 1.55;
}
</style>

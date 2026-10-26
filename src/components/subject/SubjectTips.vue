<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Lightbulb } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import { FEEDBACK_FORM } from '@/config'
import { MIN_COMMENTS, type StudentComment } from '@/engine/comments'
import { termLabel } from '@/i18n/format'
import { useI18n } from '@/i18n'
import { isFormReady, submitGoogleForm } from '@/utils/googleForm'
import { TIPS_SHOWN as SHOWN } from '@/utils/tipsHtml'

/**
 * "What I wish I knew" tips other students wrote, after the maintainer approved them (only shown
 * once a subject has MIN_COMMENTS). Three first, the rest behind "Show all".
 */
const props = defineProps<{ code: string; comments: StudentComment[] }>()
const { t, locale } = useI18n()
const all = shallowRef(false)
const list = computed(() => (props.comments.length >= MIN_COMMENTS ? props.comments : []))
const visible = computed(() => (all.value ? list.value : list.value.slice(0, SHOWN)))
const canReport = isFormReady(FEEDBACK_FORM)
const reported = shallowRef(new Set<string>())

function term(c: StudentComment): string {
  return c.period ? termLabel(t.value, { year: c.year, period: c.period }) : String(c.year)
}

// Only the comment's id goes, through the Feedback form; it stays up until the maintainer unticks it.
async function report(c: StudentComment): Promise<void> {
  reported.value = new Set([...reported.value, c.id])
  try {
    await submitGoogleForm(FEEDBACK_FORM, { topic: 'comment-report', subject: props.code, message: `comment ${c.id}`, language: locale.value })
  } catch {
    const next = new Set(reported.value)
    next.delete(c.id)
    reported.value = next
  }
}
</script>

<template>
  <section v-if="list.length" class="tips">
    <h2 class="tips-title"><Lightbulb :size="18" aria-hidden="true" /> {{ t('subject.tipsTitle') }} <InfoTip :text="t('subject.tipsNote')" /></h2>
    <ul class="tips-list">
      <li v-for="c in visible" :key="c.id" class="tip" :lang="c.lang">
        <p class="tip-text">{{ c.text }}</p>
        <p class="tip-meta">
          <span>{{ term(c) }}</span>
          <template v-if="canReport">
            ·
            <span v-if="reported.has(c.id)" role="status">{{ t('subject.tipsReported') }}</span>
            <button v-else class="tip-report" type="button" @click="report(c)">{{ t('subject.tipsReport') }}</button>
          </template>
        </p>
      </li>
    </ul>
    <button v-if="!all && list.length > SHOWN" class="button button-quiet tips-more" type="button" @click="all = true">
      {{ t('subject.tipsAll', { n: list.length }) }}
    </button>
  </section>
</template>

<style scoped>
.tips {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.tips-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-body);
  font-weight: 650;
}

.tips-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tip {
  display: grid;
  gap: 4px;
  padding: 10px 14px;
  border-radius: var(--radius);
  background: var(--surface-2);
}

.tip-text {
  margin: 0;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.tip-meta {
  margin: 0;
  font-size: var(--fs-meta);
  color: var(--ink-faint);
}

.tip-report {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.tips-more {
  justify-self: start;
}
</style>

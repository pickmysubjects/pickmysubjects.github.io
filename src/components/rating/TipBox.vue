<script setup lang="ts">
import { MAX_COMMENT_LENGTH } from '@/engine/comments'
import { useI18n } from '@/i18n'

/**
 * "One tip for next year's students?": the free-text answer, with lead-ins the student can tap
 * to start a sentence (exam, assignments, doing well, watch out) and an example as placeholder.
 * Longer tips are never published, so the box stops where the site would.
 */
const props = defineProps<{ code: string }>()
const wish = defineModel<string>({ required: true })
const { t } = useI18n()
const STARTERS = ['exam', 'work', 'study', 'watch'] as const
function starter(k: (typeof STARTERS)[number]): void {
  const lead = t.value(`rating.tipLead.${k}`)
  wish.value = wish.value.trim() ? `${wish.value.trimEnd()} ${lead} ` : `${lead} `
}
const id = `tip-${props.code}`
</script>

<template>
  <div class="tip">
    <label class="rating-label" :for="id">{{ t('rating.tipAsk') }}</label>
    <div class="chips">
      <button v-for="k in STARTERS" :key="k" class="chip chip-add" type="button" @click="starter(k)">{{ t(`rating.tipLead.${k}`) }}</button>
    </div>
    <textarea :id="id" v-model="wish" class="textarea" rows="3" :maxlength="MAX_COMMENT_LENGTH" :placeholder="t('rating.tipPlaceholder')" />
    <div class="tip-foot">
      <span class="rating-note">{{ t('rating.tipNote') }}</span>
      <span class="tip-count" aria-live="polite">{{ wish.length }} / {{ MAX_COMMENT_LENGTH }}</span>
    </div>
  </div>
</template>

<style scoped src="./rating.css"></style>
<style scoped>
.tip {
  display: grid;
  gap: 8px;
}

.textarea {
  resize: vertical;
}

.tip-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.tip-count {
  flex: none;
  color: var(--ink-soft);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
</style>

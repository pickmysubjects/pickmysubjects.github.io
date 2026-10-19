<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { Star } from 'lucide-vue-next'
import RatingForm from './RatingForm.vue'
import { useI18n } from '@/i18n'
import { useRated } from '@/composables/useRated'

/** A one-time offer to rate a subject the student just marked done. Dismissed for good either way. */
const props = defineProps<{ code: string }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const { markRated, markPrompted } = useRated()
const open = shallowRef(false)
const thanks = shallowRef(false)

// Shown once: counted as asked as soon as it appears, so it never comes back for this subject.
onMounted(() => markPrompted(props.code))

function onDone(sent: boolean): void {
  open.value = false
  if (!sent) return emit('close')
  markRated(props.code)
  thanks.value = true
}
</script>

<template>
  <section class="rate-prompt surface" role="status">
    <p v-if="thanks" class="rate-prompt-text">{{ t('rating.sent') }}</p>
    <template v-else-if="!open">
      <p class="rate-prompt-text">{{ t('rating.promptTitle', { code }) }}</p>
      <div class="rate-prompt-actions">
        <button class="button button-accent" type="button" @click="open = true"><Star :size="16" aria-hidden="true" /> {{ t('rating.rate') }}</button>
        <button class="button button-quiet" type="button" @click="emit('close')">{{ t('rating.notNow') }}</button>
      </div>
    </template>
    <RatingForm v-else :code="code" @done="onDone" />
    <button v-if="thanks" class="button button-quiet" type="button" @click="emit('close')">{{ t('subject.close') }}</button>
  </section>
</template>

<style scoped>
.rate-prompt {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
}

.rate-prompt-text {
  margin: 0;
}

.rate-prompt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import RatingForm from './RatingForm.vue'
import QuickRate from './QuickRate.vue'
import { useI18n } from '@/i18n'
import { useRated } from '@/composables/useRated'
import { RATINGS_FORM } from '@/config'
import { isFormReady } from '@/utils/googleForm'

/** A one-time offer to rate a subject the student just marked done. Dismissed for good either way. */
const props = defineProps<{ code: string }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const { markRated, markPrompted } = useRated()
const open = shallowRef(false)
const thanks = shallowRef(false)
const quickDifficulty = shallowRef<number | undefined>()
function more(n: number): void {
  quickDifficulty.value = n
  open.value = true
}

// No form to send to (yet): don't show, and don't use up the one offer for this subject.
const ready = isFormReady(RATINGS_FORM)
// Shown once: counted as asked as soon as it appears, so it never comes back for this subject.
onMounted(() => (ready ? markPrompted(props.code) : emit('close')))

function onDone(sent: boolean): void {
  open.value = false
  if (!sent) return emit('close')
  markRated(props.code)
  thanks.value = true
}
</script>

<template>
  <section v-if="ready" class="rate-prompt surface">
    <p v-if="thanks" class="rate-prompt-text" role="status">{{ t('rating.sent') }}</p>
    <template v-else-if="!open">
      <QuickRate :code="code" @more="more" />
      <div class="rate-prompt-actions">
        <button class="button button-quiet" type="button" @click="emit('close')">{{ t('rating.notNow') }}</button>
      </div>
    </template>
    <RatingForm v-else :code="code" :difficulty-given="quickDifficulty" @done="onDone" />
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

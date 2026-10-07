<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { FEEDBACK } from '@/config'
import { PAIN_POINTS } from '@/painPoints'
import { feedbackText, githubIssueUrl, mailtoUrl, OTHER_TOPICS, type FeedbackDraft } from '@/utils/feedback'
import { useI18n } from '@/i18n'

const draft = defineModel<FeedbackDraft>({ required: true })

const { t, locale } = useI18n()
const copied = shallowRef(false)
const ready = computed(() => draft.value.message.trim().length >= 5)
const isPainPoint = computed(() => PAIN_POINTS.some((p) => p.id === draft.value.topic))
const github = computed(() => githubIssueUrl(draft.value, locale.value))
const mail = computed(() => mailtoUrl(draft.value, locale.value))

function set<K extends keyof FeedbackDraft>(key: K, value: FeedbackDraft[K]): void {
  draft.value = { ...draft.value, [key]: value }
}

async function copy(): Promise<void> {
  const { title, body } = feedbackText(draft.value, locale.value)
  try {
    await navigator.clipboard.writeText(`${title}\n\n${body}`)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}

function value(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value
}
</script>

<template>
  <form class="feedback surface" @submit.prevent>
    <label class="field">
      {{ t('feedback.about') }}
      <select class="select" :value="draft.topic" @change="set('topic', value($event))">
        <optgroup :label="t('feedback.groupProblems')">
          <option v-for="p in PAIN_POINTS" :key="p.id" :value="p.id">{{ t(`pain.${p.id}.q`) }}</option>
        </optgroup>
        <optgroup :label="t('feedback.groupOther')">
          <option v-for="o in OTHER_TOPICS" :key="o" :value="o">{{ t(`feedback.other.${o}`) }}</option>
        </optgroup>
      </select>
    </label>

    <fieldset v-if="isPainPoint" class="rating">
      <legend class="field">{{ t('feedback.rating') }}</legend>
      <label v-for="n in 5" :key="n" class="rating-option">
        <input type="radio" name="rating" :value="n" :checked="draft.rating === n" @change="set('rating', n)" />
        {{ n }}
      </label>
      <span class="rating-ends">{{ t('feedback.ratingEnds') }}</span>
    </fieldset>

    <label class="field">
      {{ t('feedback.subject') }}
      <input class="input code" :value="draft.subject" placeholder="COMP30027" @input="set('subject', value($event).toUpperCase())" />
    </label>

    <label class="field">
      {{ t('feedback.message') }}
      <textarea
        class="textarea"
        rows="6"
        :value="draft.message"
        :placeholder="t('feedback.messagePlaceholder')"
        @input="set('message', value($event))"
      />
    </label>

    <label class="field">
      {{ t('feedback.contact') }}
      <input class="input" :value="draft.contact" :placeholder="t('feedback.contactPlaceholder')" @input="set('contact', value($event))" />
    </label>

    <div class="send">
      <span class="send-label">{{ t('feedback.send') }}</span>
      <a v-if="github && ready" class="button" :href="github" target="_blank" rel="noopener">{{ t('feedback.github') }}</a>
      <a v-if="mail && ready" class="button button-quiet" :href="mail">{{ t('feedback.email') }}</a>
      <a v-if="FEEDBACK.feedbackFormUrl" class="button button-quiet" :href="FEEDBACK.feedbackFormUrl" target="_blank" rel="noopener">
        {{ t('feedback.form') }}
      </a>
      <button class="button button-quiet" type="button" :disabled="!ready" @click="copy">
        {{ copied ? t('feedback.copied') : t('feedback.copy') }}
      </button>
    </div>
    <p class="send-hint">
      {{ t('feedback.hint') }}
      <span v-if="!ready">{{ t('feedback.writeFirst') }}</span>
    </p>
  </form>
</template>

<style scoped>
.feedback {
  display: grid;
  gap: 14px;
  padding: 20px;
}

.rating {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
}

.rating legend {
  margin-bottom: 6px;
}

.rating-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 11px;
  border: 1px solid var(--contour);
  border-radius: 999px;
  cursor: pointer;
}

.rating-option:has(input:checked) {
  border-color: var(--overprint);
  background: var(--overprint-tint);
  color: var(--overprint);
  font-weight: 600;
}

.rating-option input {
  accent-color: var(--overprint);
}

.rating-ends {
  font-size: 0.78rem;
  color: var(--ink-soft);
}

.textarea {
  resize: vertical;
}

.send {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.send .button {
  text-decoration: none;
}

.send-label {
  font-weight: 600;
}

.send-hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
}
</style>

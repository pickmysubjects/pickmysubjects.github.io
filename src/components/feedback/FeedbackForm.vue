<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { FEEDBACK } from '@/config'
import { PAIN_POINTS } from '@/painPoints'
import { feedbackText, githubIssueUrl, mailtoUrl, OTHER_TOPICS, type FeedbackDraft } from '@/utils/feedback'

const draft = defineModel<FeedbackDraft>({ required: true })

const copied = shallowRef(false)
const ready = computed(() => draft.value.message.trim().length >= 5)
const isPainPoint = computed(() => PAIN_POINTS.some((p) => p.id === draft.value.topic))
const github = computed(() => githubIssueUrl(draft.value))
const mail = computed(() => mailtoUrl(draft.value))

function set<K extends keyof FeedbackDraft>(key: K, value: FeedbackDraft[K]): void {
  draft.value = { ...draft.value, [key]: value }
}

async function copy(): Promise<void> {
  const { title, body } = feedbackText(draft.value)
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
      What is it about?
      <select class="select" :value="draft.topic" @change="set('topic', value($event))">
        <optgroup label="The problems we're solving">
          <option v-for="p in PAIN_POINTS" :key="p.id" :value="p.id">{{ p.question }}</option>
        </optgroup>
        <optgroup label="Other">
          <option v-for="t in OTHER_TOPICS" :key="t.id" :value="t.id">{{ t.label }}</option>
        </optgroup>
      </select>
    </label>

    <fieldset v-if="isPainPoint" class="rating">
      <legend class="field">How well does Subject Compass handle this for you?</legend>
      <label v-for="n in 5" :key="n" class="rating-option">
        <input type="radio" name="rating" :value="n" :checked="draft.rating === n" @change="set('rating', n)" />
        {{ n }}
      </label>
      <span class="rating-ends">1 = not at all · 5 = solved it</span>
    </fieldset>

    <label class="field">
      Subject code (if it's about one subject)
      <input class="input code" :value="draft.subject" placeholder="COMP30027" @input="set('subject', value($event).toUpperCase())" />
    </label>

    <label class="field">
      Your suggestion or what went wrong
      <textarea
        class="textarea"
        rows="6"
        :value="draft.message"
        placeholder="e.g. COMP30027 actually runs in Semester 2 too — I took it in 2025. Or: I'd love to compare two majors side by side."
        @input="set('message', value($event))"
      />
    </label>

    <label class="field">
      How to reach you (optional)
      <input class="input" :value="draft.contact" placeholder="Email, WeChat ID, Discord…" @input="set('contact', value($event))" />
    </label>

    <div class="send">
      <span class="send-label">Send it:</span>
      <a v-if="github && ready" class="button" :href="github" target="_blank" rel="noopener">Open a GitHub issue</a>
      <a v-if="mail && ready" class="button button-quiet" :href="mail">Email it</a>
      <a v-if="FEEDBACK.feedbackFormUrl" class="button button-quiet" :href="FEEDBACK.feedbackFormUrl" target="_blank" rel="noopener">
        Use the form (no account)
      </a>
      <button class="button button-quiet" type="button" :disabled="!ready" @click="copy">
        {{ copied ? 'Copied' : 'Copy text' }}
      </button>
    </div>
    <p class="send-hint">
      No GitHub account? Copy the text and paste it to us anywhere — WeChat, Discord, Reddit or email.
      <span v-if="!ready">Write a few words first.</span>
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

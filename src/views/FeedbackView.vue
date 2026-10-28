<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { shallowRef, useTemplateRef, watch } from 'vue'
import PainPointList from '@/components/feedback/PainPointList.vue'
import FeedbackForm from '@/components/feedback/FeedbackForm.vue'
import { useView, link } from '@/composables/useView'
import { OTHER_TOPICS, type FeedbackDraft } from '@/utils/feedback'
import { PAIN_POINTS } from '@/painPoints'
import Interp from '@/components/Interp.vue'
import { PenLine } from 'lucide-vue-next'
import InfoPage from '@/components/about/InfoPage.vue'
import { useI18n } from '@/i18n'

const { query } = useView()
const { t } = useI18n()
const form = useTemplateRef<HTMLElement>('formSection')

const draft = shallowRef<FeedbackDraft>({ topic: 'fit-me', rating: null, message: '', subject: '', contact: '' })

// Links like /feedback?topic=data&subject=COMP30027 prefill the form.
watch(
  query,
  (q) => {
    // Only known topics and real-looking codes: these end up in the form and in issue titles.
    const rawTopic = q.get('topic')
    const topic = rawTopic && [...PAIN_POINTS.map((p) => p.id), ...OTHER_TOPICS].includes(rawTopic) ? rawTopic : null
    const rawSubject = q.get('subject')?.trim().toUpperCase() ?? ''
    const subject = /^[A-Z]{4}\d{5}$/.test(rawSubject) ? rawSubject : null
    if (topic || subject) {
      draft.value = { ...draft.value, topic: topic ?? draft.value.topic, subject: subject ?? draft.value.subject }
    }
  },
  { immediate: true },
)

function choose(id: string): void {
  draft.value = { ...draft.value, topic: id, rating: null }
  // Beside the list (wide screens) the form is already in view; below it, bring it up.
  const top = form.value?.getBoundingClientRect().top ?? 0
  if (top > window.innerHeight * 0.6 || top < 0) form.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <!-- One tool rather than sections to read, so no "On this page": the form stays beside the list. -->
  <InfoPage page="feedback" :title="t('menu.feedback')" :toc="false">
    <div class="fb-body">
      <section class="fb-panel surface" aria-labelledby="fb-problems">
        <div class="fb-head">
          <h2 id="fb-problems" class="fb-h2">{{ t('feedback.groupProblems') }}<InfoTip :text="t('feedback.lede')" /></h2>
          <!-- The form sits below a long status list on narrow screens; this gets there in one tap. -->
          <button class="button button-accent fb-jump" type="button" @click="form?.scrollIntoView({ behavior: 'smooth', block: 'start' })">
            <PenLine :size="16" aria-hidden="true" /> {{ t('feedback.yours') }}
          </button>
        </div>
        <PainPointList :selected="draft.topic" @choose="choose" />
      </section>

      <!-- Wide screens: the form stays in view beside the list, so picking a card fills it in place. -->
      <section ref="formSection" class="fb-form fb-panel surface" aria-labelledby="fb-yours">
        <h2 id="fb-yours" class="fb-h2">{{ t('feedback.yours') }}</h2>
        <FeedbackForm v-model="draft" />
      </section>
    </div>

    <section class="fb-code fb-panel surface" aria-labelledby="fb-code">
      <h2 id="fb-code" class="fb-h2">{{ t('feedback.codeTitle') }}</h2>
      <p>
        <Interp :text="t('feedback.codeText')">
          <template #link>
            <a :href="link('contribute')">{{ t('feedback.codeLink') }}</a>
          </template>
        </Interp>
      </p>
      <p>{{ t('feedback.translations') }}</p>
    </section>
  </InfoPage>
</template>

<style scoped>
.fb-body {
  display: grid;
  gap: 24px;
}

.fb-panel {
  display: grid;
  align-content: start;
  gap: 16px;
  min-width: 0;
  padding: 24px 28px 28px;
}

.fb-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.fb-h2 {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-section);
  font-weight: var(--fw-bold);
  line-height: var(--lh-heading);
}

/* The form is one panel with its heading; its own card edge would double the frame. */
.fb-form :deep(.feedback) {
  padding: 0;
  border: 0;
  background: none;
  box-shadow: none;
}

.fb-form {
  scroll-margin-top: 88px;
}

@media (min-width: 1100px) {
  .fb-body {
    grid-template-columns: minmax(0, 1fr) minmax(380px, 440px);
    align-items: start;
    gap: 24px;
  }

  .fb-form {
    position: sticky;
    top: 88px;
    max-height: calc(100vh - 104px);
    max-height: calc(100dvh - 104px);
    overflow-y: auto;
  }

  /* The form is already beside the list. */
  .fb-jump {
    display: none;
  }
}

.fb-code {
  gap: 8px;
  color: var(--ink-soft);
}

.fb-code .fb-h2 {
  color: var(--ink);
}

.fb-code p {
  margin: 0;
  max-width: 80ch;
}

@media (max-width: 640px) {
  .fb-panel {
    padding: 18px 14px 20px;
    border-radius: 18px;
  }
}
</style>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import PainPointList from '@/components/feedback/PainPointList.vue'
import FeedbackForm from '@/components/feedback/FeedbackForm.vue'
import { useView } from '@/composables/useView'
import { OTHER_TOPICS, type FeedbackDraft } from '@/utils/feedback'
import { PAIN_POINTS } from '@/painPoints'
import Interp from '@/components/Interp.vue'
import { useI18n } from '@/i18n'

const { query } = useView()
const { t } = useI18n()
const form = useTemplateRef<HTMLElement>('formSection')

const draft = shallowRef<FeedbackDraft>({ topic: 'fit-me', rating: null, message: '', subject: '', contact: '' })

// Links like #/feedback?topic=data&subject=COMP30027 prefill the form.
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
  form.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="fb">
    <section>
      <h1 class="fb-title">{{ t('feedback.title') }}</h1>
      <p class="fb-lede">{{ t('feedback.lede') }}</p>
    </section>

    <PainPointList :selected="draft.topic" @choose="choose" />

    <section ref="formSection" class="fb-form">
      <h2 class="fb-form-title">{{ t('feedback.yours') }}</h2>
      <FeedbackForm v-model="draft" />
    </section>

    <section class="fb-code">
      <h2 class="fb-form-title">{{ t('feedback.codeTitle') }}</h2>
      <p>
        <Interp :text="t('feedback.codeText')">
          <template #link>
            <a href="#/contribute">{{ t('feedback.codeLink') }}</a>
          </template>
        </Interp>
      </p>
      <p>{{ t('feedback.translations') }}</p>
    </section>
  </div>
</template>

<style scoped>
.fb {
  padding-top: 32px;
  display: grid;
  gap: 24px;
  max-width: 1100px;
}


.fb-lede {
  max-width: 72ch;
  margin: 8px 0 0;
  color: var(--ink-soft);
}

.fb-form {
  display: grid;
  gap: 12px;
  max-width: 720px;
  scroll-margin-top: 16px;
}

.fb-form-title {
  font-size: 1.2rem;
  font-weight: 700;
}

.fb-code {
  max-width: 72ch;
  color: var(--ink-soft);
}

.fb-code p {
  margin: 6px 0 0;
}
</style>

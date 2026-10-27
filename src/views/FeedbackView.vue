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
  <div class="fb">
    <section>
      <h1 class="fb-title">{{ t('feedback.title') }}</h1>
      <p class="fb-lede">{{ t('feedback.ledeShort') }}<InfoTip :text="t('feedback.lede')" /></p>
      <!-- The form sits below a long status list; this gets there in one tap. -->
      <button class="button button-accent fb-jump" type="button" @click="form?.scrollIntoView({ behavior: 'smooth', block: 'start' })">
        <PenLine :size="16" aria-hidden="true" /> {{ t('feedback.yours') }}
      </button>
    </section>

    <!-- Wide screens: the form stays in view beside the list, so picking a card fills it in place. -->
    <div class="fb-body">
      <PainPointList :selected="draft.topic" @choose="choose" />

      <section ref="formSection" class="fb-form">
        <h2 class="fb-form-title">{{ t('feedback.yours') }}</h2>
        <FeedbackForm v-model="draft" />
      </section>
    </div>

    <section class="fb-code">
      <h2 class="fb-form-title">{{ t('feedback.codeTitle') }}</h2>
      <p>
        <Interp :text="t('feedback.codeText')">
          <template #link>
            <a :href="link('contribute')">{{ t('feedback.codeLink') }}</a>
          </template>
        </Interp>
      </p>
      <p>{{ t('feedback.translations') }}</p>
    </section>
  </div>
</template>

<style scoped>
.fb {
  padding-top: var(--page-top);
  display: grid;
  gap: 24px;
}

.fb-body {
  display: grid;
  gap: 24px;
}

@media (min-width: 1100px) {
  .fb-body {
    grid-template-columns: minmax(0, 1fr) minmax(360px, 420px);
    align-items: start;
    gap: 32px;
  }

  .fb-body .fb-form {
    position: sticky;
    top: 88px;
    max-height: calc(100vh - 104px);
    overflow-y: auto;
  }

  /* The form is already beside the list. */
  .fb-jump {
    display: none;
  }
}


.fb-lede {
  max-width: 72ch;
  margin: var(--space-3) 0 0;
  color: var(--ink-soft);
}

.fb-jump {
  margin-top: 14px;
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

/* Phones: the title a size down, like the guide's, so long languages keep it to two lines. */
@media (max-width: 640px) {
  .fb-title {
    font-size: 1.9rem;
  }
}
</style>

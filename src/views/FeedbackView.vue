<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import PainPointList from '@/components/feedback/PainPointList.vue'
import FeedbackForm from '@/components/feedback/FeedbackForm.vue'
import { useView } from '@/composables/useView'
import type { FeedbackDraft } from '@/utils/feedback'

const { query } = useView()
const form = useTemplateRef<HTMLElement>('formSection')

const draft = shallowRef<FeedbackDraft>({ topic: 'fit-me', rating: null, message: '', subject: '', contact: '' })

// Links like #/feedback?topic=data&subject=COMP30027 prefill the form.
watch(
  query,
  (q) => {
    const topic = q.get('topic')
    const subject = q.get('subject')
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
      <h1 class="fb-title">Help make it better</h1>
      <p class="fb-lede">
        Subject Compass started from the things that make choosing subjects at UniMelb painful. Here's each one and how
        far we've got. Tell us what works, what doesn't, and what's missing — you don't need to write code.
      </p>
    </section>

    <PainPointList :selected="draft.topic" @choose="choose" />

    <section ref="formSection" class="fb-form">
      <h2 class="fb-form-title">Your feedback</h2>
      <FeedbackForm v-model="draft" />
    </section>

    <section class="fb-code">
      <h2 class="fb-form-title">Write code?</h2>
      <p>
        The repo has a contributing guide, issue templates and good-first tasks. The easiest code-free contribution is
        <a href="#/contribute">adding a subject's facts</a>; the easiest code one is a rule or parser fix with a test.
      </p>
    </section>
  </div>
</template>

<style scoped>
.fb {
  display: grid;
  gap: 24px;
  max-width: 1100px;
}

.fb-title {
  font-size: clamp(1.6rem, 3vw, 2.3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
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
  font-weight: 800;
}

.fb-code {
  max-width: 72ch;
  color: var(--ink-soft);
}

.fb-code p {
  margin: 6px 0 0;
}
</style>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Send } from 'lucide-vue-next'
import { parseHandbookPaste, subjectYaml } from '@/engine'
import ParsedPreview from '@/components/contribute/ParsedPreview.vue'
import Interp from '@/components/Interp.vue'
import { FEEDBACK_FORM } from '@/config'
import { useI18n } from '@/i18n'
import { isFormReady, submitGoogleForm } from '@/utils/googleForm'

const { t, locale } = useI18n()
const code = shallowRef('')
const title = shallowRef('')
const level = shallowRef(1)
const points = shallowRef(12.5)
const year = shallowRef(new Date().getFullYear())
const text = shallowRef('')

const cleanCode = computed(() => code.value.trim().toUpperCase())
const codeValid = computed(() => /^[A-Z]{4}\d{5}$/.test(cleanCode.value))
const parsed = computed(() => parseHandbookPaste(text.value))
const yaml = computed(() =>
  subjectYaml(
    { code: cleanCode.value || 'CODE00000', title: title.value || 'Subject title', level: level.value, points: points.value, year: year.value },
    parsed.value,
  ),
)
const handbookUrl = computed(() =>
  codeValid.value
    ? `https://handbook.unimelb.edu.au/${year.value}/subjects/${cleanCode.value.toLowerCase()}/print`
    : 'https://handbook.unimelb.edu.au/',
)

// A pasted print page carries its own code, title, level and points: fill the boxes from it.
watch(parsed, (p) => {
  if (p.code) code.value = p.code
  if (p.title) title.value = p.title
  if (p.level) level.value = p.level
  if (p.points) points.value = p.points
})

// Only the facts (the YAML) go to the feedback form, never the pasted text.
const canSend = isFormReady(FEEDBACK_FORM)
const readSomething = computed(() => parsed.value.offerings !== 'unknown' || parsed.value.prerequisites !== 'unknown')
const sendState = shallowRef<'idle' | 'sending' | 'sent' | 'failed'>('idle')
watch(text, () => (sendState.value = 'idle'))

async function send(): Promise<void> {
  if (!codeValid.value || !readSomething.value) return
  sendState.value = 'sending'
  try {
    await submitGoogleForm(FEEDBACK_FORM, { topic: 'data', subject: cleanCode.value, message: yaml.value, language: locale.value })
    sendState.value = 'sent'
  } catch {
    sendState.value = 'failed'
  }
}

function onCode(): void {
  // Level is the first digit of a UniMelb subject code (9 = graduate).
  const digit = Number(cleanCode.value[4])
  if (codeValid.value && digit >= 1) level.value = digit
}
</script>

<template>
  <div class="contribute">
    <section class="contribute-intro">
      <h1 class="contribute-title">{{ t('contribute.title') }}</h1>
      <p class="contribute-lede">{{ t('contribute.lede') }}</p>
      <ol class="steps">
        <li>
          <Interp :text="t('contribute.step1')">
            <template #handbook>
              <a :href="handbookUrl" target="_blank" rel="noopener">{{ t('contribute.handbookPage') }}</a>
            </template>
          </Interp>
        </li>
        <li>{{ t('contribute.step2') }}</li>
        <li>{{ t('contribute.step3') }}</li>
      </ol>
      <p class="small">{{ t('contribute.onlyFacts') }}</p>
    </section>

    <div class="contribute-body">
      <form class="paste" @submit.prevent>
        <label class="field">
          {{ t('contribute.pasted') }}
          <textarea v-model="text" class="textarea" rows="14" :placeholder="t('contribute.placeholder')" />
        </label>
        <div class="meta">
          <label class="field">
            {{ t('contribute.code') }}
            <input v-model="code" class="input code" placeholder="COMP30027" @change="onCode" />
          </label>
          <label class="field meta-title">
            {{ t('contribute.titleField') }}
            <input v-model="title" class="input" placeholder="Machine Learning" />
          </label>
          <label class="field">
            {{ t('contribute.level') }}
            <input v-model.number="level" class="input" type="number" min="1" max="9" />
          </label>
          <label class="field">
            {{ t('contribute.points') }}
            <input v-model.number="points" class="input" type="number" min="6.25" step="6.25" />
          </label>
          <label class="field">
            {{ t('contribute.year') }}
            <input v-model.number="year" class="input" type="number" min="2017" max="2035" />
          </label>
        </div>
      </form>
      <ParsedPreview :parsed="parsed" :yaml="yaml" />
    </div>

    <section class="send surface">
      <template v-if="canSend">
        <button
          class="button button-accent"
          type="button"
          :disabled="!codeValid || !readSomething || sendState === 'sending' || sendState === 'sent'"
          @click="send"
        >
          <Send :size="16" aria-hidden="true" />
          {{ sendState === 'sending' ? t('contribute.sending') : t('contribute.send') }}
        </button>
        <p v-if="sendState === 'sent'" class="send-ok" role="status">{{ t('contribute.sent') }}</p>
        <p v-else-if="sendState === 'failed'" class="send-bad" role="alert">{{ t('contribute.sendFailed') }}</p>
        <p v-else-if="!codeValid || !readSomething" class="small">{{ t('contribute.needCode') }}</p>
        <p v-else class="small">{{ t('contribute.sendText') }}</p>
      </template>
      <p class="small">
        <Interp :text="t('contribute.thenText')">
          <template #file>
            <code class="code">data/real/subjects/{{ cleanCode || 'CODE' }}.yaml</code>
          </template>
        </Interp>
      </p>
    </section>
  </div>
</template>

<style scoped>
.contribute {
  padding-top: 32px;
  display: grid;
  gap: 20px;
}


.steps {
  display: grid;
  gap: 6px;
  margin: 12px 0 0;
  padding-left: 22px;
  font-size: 1.02rem;
}

.small {
  margin: 10px 0 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.send {
  display: grid;
  justify-items: start;
  gap: 4px;
  padding: 18px 22px;
}

.send .small {
  margin: 4px 0 0;
}

.send-ok {
  font-weight: 600;
  color: var(--good);
}

.send-bad {
  font-weight: 600;
  color: var(--bad);
}

.contribute-lede {
  max-width: 76ch;
  margin: 8px 0 0;
  color: var(--ink-soft);
}

.contribute-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  align-items: start;
}

.paste {
  display: grid;
  gap: 12px;
}

.meta {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}

.meta > .field {
  grid-column: span 2;
}

.meta > .meta-title {
  grid-column: span 4;
}

.textarea {
  font-family: var(--font-code);
  font-size: 0.82rem;
  resize: vertical;
}



@media (max-width: 960px) {
  .meta > .field,
  .meta > .meta-title {
    grid-column: auto;
  }

  .contribute-body,
  .meta {
    grid-template-columns: 1fr;
  }
}
</style>

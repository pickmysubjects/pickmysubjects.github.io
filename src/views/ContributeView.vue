<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { parseHandbookPaste, subjectYaml } from '@/engine'
import ParsedPreview from '@/components/contribute/ParsedPreview.vue'
import Interp from '@/components/Interp.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()
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
    ? `https://handbook.unimelb.edu.au/${year.value}/subjects/${cleanCode.value.toLowerCase()}/eligibility-and-requirements`
    : 'https://handbook.unimelb.edu.au/',
)

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
      <p class="contribute-lede">
        <Interp :text="t('contribute.lede')">
          <template #handbook>
            <a :href="handbookUrl" target="_blank" rel="noopener">{{ t('contribute.handbookPage') }}</a>
          </template>
        </Interp>
      </p>
    </section>

    <div class="contribute-body">
      <form class="paste" @submit.prevent>
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
        <label class="field">
          {{ t('contribute.pasted') }}
          <textarea
            v-model="text"
            class="textarea"
            rows="16"
            placeholder="Prerequisites&#10;All of&#10;COMP10002  Foundations of Algorithms …&#10;OR&#10;Admission into …&#10;Non-allowed subjects&#10;…&#10;Availability&#10;Semester 1 - On Campus"
          />
        </label>
      </form>
      <ParsedPreview :parsed="parsed" :yaml="yaml" />
    </div>

    <section class="next">
      <h2 class="next-title">{{ t('contribute.then') }}</h2>
      <p>
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
  display: grid;
  gap: 20px;
}

.contribute-title {
  font-size: clamp(1.6rem, 3vw, 2.3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
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
  grid-template-columns: 1.1fr 2fr 0.6fr 0.7fr 0.9fr;
  gap: 10px;
}

.textarea {
  font-family: var(--font-code);
  font-size: 0.82rem;
  resize: vertical;
}

.next {
  max-width: 76ch;
  font-size: 0.9rem;
}

.next-title {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

@media (max-width: 960px) {
  .contribute-body,
  .meta {
    grid-template-columns: 1fr;
  }
}
</style>

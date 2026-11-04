<script setup lang="ts">
import { computed } from 'vue'
import { useSubjectDetail } from '@/composables/useDataset'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { pickLocalized } from '@/i18n/localized'

/** Under a two-subject comparison: what each one teaches, in a sentence, side by side. */
const props = defineProps<{ a: string; b: string }>()
const { t, locale } = useI18n()
const one = useSubjectDetail(computed(() => props.a)).subject
const two = useSubjectDetail(computed(() => props.b)).subject
const items = computed(() =>
  [one.value, two.value].flatMap((s) => (s?.about ? [{ code: s.code, title: s.title, learn: pickLocalized(s.about.learn, locale.value) }] : [])),
)
</script>

<template>
  <section v-if="items.length" class="learn surface" :aria-label="t('compare.learn')">
    <h2 class="learn-title">{{ t('compare.learn') }}</h2>
    <div class="learn-cols">
      <div v-for="i in items" :key="i.code" class="learn-col">
        <a class="learn-code" :href="link(`subject/${i.code}`)">{{ i.code }}</a>
        <span class="learn-name">{{ i.title }}</span>
        <p>{{ i.learn }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.learn {
  padding: var(--space-5);
}

.learn-title {
  margin: 0 0 var(--space-3);
  font-size: var(--fs-h3);
}

.learn-cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-4);
}

.learn-code {
  font-family: var(--font-code);
  font-size: var(--fs-small);
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
}

.learn-code:hover {
  color: var(--ink);
}

.learn-name {
  display: block;
  font-weight: 600;
}

.learn-col p {
  margin: 4px 0 0;
  color: var(--ink-soft);
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink } from 'lucide-vue-next'
import { useI18n } from '@/i18n'

/** Where students talk about the subject elsewhere: the two most used in the reader's language first. */
const props = defineProps<{ links: { label: string; href: string; lang?: string }[] }>()
const { t } = useI18n()
const first = computed(() => props.links.slice(0, 2))
const more = computed(() => props.links.slice(2))
</script>

<template>
  <div class="outside">
    <p class="grid">
      <a v-for="l in first" :key="l.label" class="chip" :href="l.href" target="_blank" rel="noopener" :lang="l.lang">
        {{ l.label }} <ExternalLink :size="13" aria-hidden="true" />
      </a>
    </p>
    <details v-if="more.length" class="more">
      <summary>{{ t('subject.discussMore', { n: more.length }) }}</summary>
      <p class="grid">
        <a v-for="l in more" :key="l.label" class="chip" :href="l.href" target="_blank" rel="noopener" :lang="l.lang">
          {{ l.label }} <ExternalLink :size="13" aria-hidden="true" />
        </a>
      </p>
    </details>
  </div>
</template>

<style scoped>
.outside {
  display: grid;
  gap: var(--space-3);
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
}

.chip {
  color: var(--ink);
  text-decoration: none;
}

.chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.more summary {
  font-size: var(--fs-body);
  font-weight: 600;
  color: var(--ink-soft);
  cursor: pointer;
}

.more .grid {
  margin-top: var(--space-2);
}

/* Phones: a two-column list of full-height rows, not a wrapping cloud of small chips. */
@media (max-width: 720px) {
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .chip {
    justify-content: space-between;
    min-height: 44px;
  }
}
</style>

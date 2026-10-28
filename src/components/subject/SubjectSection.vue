<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { usePhone } from '@/composables/usePhone'

/**
 * One section of a subject's page, built like a guide topic (GuideItem): a glass card with its
 * heading and a one-line summary, then the detail. `fold`: on phones it closes to its heading
 * and summary, and opens on tap, so the lower part of the page stays short. The id (an anchor
 * other pages link to) is set by the parent. `aside`: a small link beside the heading.
 */
defineProps<{ title: string; short?: string; fold?: boolean }>()
const phone = usePhone()
</script>

<template>
  <section class="sec surface">
    <details v-if="fold && phone" class="sec-fold">
      <summary class="sec-head sec-summary">
        <span class="sec-line">
          <span class="sec-name">
            <h2 class="sec-title">{{ title }}</h2>
            <!-- Taps on the aside (an ⓘ and its text) don't fold or open the section. -->
            <span v-if="$slots.aside" class="sec-aside" @click.prevent><slot name="aside" /></span>
          </span>
          <ChevronDown :size="18" aria-hidden="true" class="sec-chev" />
        </span>
        <p v-if="short" class="sec-short">{{ short }}</p>
      </summary>
      <div class="sec-body"><slot /></div>
    </details>
    <template v-else>
      <header class="sec-head">
        <div class="sec-line">
          <h2 class="sec-title">{{ title }}</h2>
          <slot name="aside" />
        </div>
        <p v-if="short" class="sec-short">{{ short }}</p>
      </header>
      <div class="sec-body"><slot /></div>
    </template>
  </section>
</template>

<style scoped>
.sec {
  min-width: 0;
  padding: 28px 32px 32px;
  scroll-margin-top: 96px;
}

.sec-head {
  display: grid;
  gap: 8px;
  padding-bottom: 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--divider);
}

.sec-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
}

.sec-title {
  font-size: var(--fs-section);
  font-weight: var(--fw-bold);
  line-height: var(--lh-heading);
  letter-spacing: var(--track-heading);
  text-wrap: balance;
}

/* The summary line: what most readers came for, a step bigger than the body. */
.sec-short {
  max-width: 78ch;
  font-size: 1.0625rem;
  font-weight: var(--fw-medium);
  line-height: 1.55;
  color: var(--ink);
}

.sec-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  min-width: 0;
  line-height: var(--lh-body);
}

.sec-body > :deep(*) {
  min-width: 0;
}

/* Phones: a folded section is its heading (a 44px+ tap target) until opened. */
.sec-summary {
  list-style: none;
  cursor: pointer;
  min-height: 44px;
  align-content: center;
}

.sec-summary::-webkit-details-marker {
  display: none;
}

.sec-summary .sec-line {
  justify-content: space-between;
  flex-wrap: nowrap;
}

.sec-fold:not([open]) .sec-head {
  padding-bottom: 0;
  margin-bottom: 0;
  border-bottom: 0;
}

.sec-name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  min-width: 0;
}

.sec-chev {
  flex: none;
  color: var(--ink-faint);
  transition: transform 0.2s;
}

.sec-fold[open] .sec-chev {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .sec-chev {
    transition: none;
  }
}

@media (max-width: 640px) {
  .sec {
    padding: 20px 14px 22px;
    border-radius: 18px;
  }

  .sec-head {
    padding-bottom: 16px;
    margin-bottom: 16px;
  }

  .sec-short {
    font-size: 1rem;
  }

  .sec-body {
    gap: 16px;
  }
}
</style>

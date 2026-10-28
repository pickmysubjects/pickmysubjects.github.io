<script setup lang="ts">
// One topic of a guide page: a glass card with its heading, the short answer, then the detail.
// The id (an anchor other pages link to) is set by the parent; data-toc puts it in "On this page".
defineProps<{ title: string; short?: string }>()
</script>

<template>
  <section class="topic surface" :data-toc="title">
    <header class="topic-head">
      <h2 class="topic-title">{{ title }}</h2>
      <p v-if="short" class="topic-short">{{ short }}</p>
    </header>
    <div class="topic-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.topic {
  min-width: 0;
  padding: 28px 32px 32px;
  scroll-margin-top: 96px;
}

.topic-head {
  display: grid;
  gap: 8px;
  padding-bottom: 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--divider);
}

.topic-title {
  font-size: var(--fs-section);
  font-weight: var(--fw-bold);
  line-height: var(--lh-heading);
  letter-spacing: var(--track-heading);
  text-wrap: balance;
}

/* The short answer: what most readers came for, a step bigger than the body. */
.topic-short {
  font-size: 1.0625rem;
  font-weight: var(--fw-medium);
  line-height: 1.55;
  color: var(--ink);
}

.topic-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  line-height: var(--lh-body);
}

@media (max-width: 640px) {
  .topic {
    padding: 20px 14px 22px;
    border-radius: 18px;
  }

  .topic-head {
    padding-bottom: 16px;
    margin-bottom: 16px;
  }

  .topic-short {
    font-size: 1rem;
  }
}
</style>

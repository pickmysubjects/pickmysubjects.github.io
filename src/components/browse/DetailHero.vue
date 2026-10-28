<script setup lang="ts">
import { computed, defineAsyncComponent, type Component } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'

/**
 * The top of a major's or a career's page, like the guide's and the subject page's: a glass band
 * with the way back, a line saying what it is, the name, and whatever the page puts under it
 * (key numbers, actions); the page's scene across the right, fading out before the words.
 */
const props = defineProps<{ back: { href: string; label: string }; eyebrow?: string; title: string; art: () => Promise<Component> }>()
const scene = computed(() => defineAsyncComponent(props.art))
</script>

<template>
  <header class="dhero surface">
    <div class="dhero-text">
      <a class="dhero-back" :href="back.href"><ArrowLeft :size="15" aria-hidden="true" />{{ back.label }}</a>
      <p v-if="eyebrow" class="dhero-eyebrow">{{ eyebrow }}</p>
      <h1 class="dhero-title">{{ title }}</h1>
      <slot />
    </div>
    <div class="dhero-art" aria-hidden="true"><component :is="scene" /></div>
  </header>
</template>

<style scoped>
.dhero {
  position: relative;
  display: grid;
  align-items: center;
  min-height: 176px;
  padding: 22px 36px 24px;
  overflow: hidden;
}

.dhero-text {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
  max-width: min(100%, 760px);
}

.dhero-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--accent);
  text-decoration: none;
}

.dhero-back:hover {
  text-decoration: underline;
}

.dhero-eyebrow {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.dhero-title {
  margin: 0;
  font-size: clamp(1.5rem, 1.2rem + 1.1vw, 2.125rem);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: var(--track-display);
  text-wrap: balance;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.dhero-art {
  position: absolute;
  top: 6px;
  right: 20px;
  bottom: 4px;
  width: min(42%, 560px);
  -webkit-mask-image: linear-gradient(to right, transparent, #000 34%);
  mask-image: linear-gradient(to right, transparent, #000 34%);
}

.dhero-art > :deep(*) {
  width: 100%;
  height: 100%;
}

@media (max-width: 1100px) {
  .dhero-art {
    width: 30%;
  }

  .dhero-text {
    max-width: 70%;
  }
}

@media (max-width: 720px) {
  .dhero {
    min-height: 0;
    padding: 16px;
    border-radius: 20px;
  }

  .dhero-text {
    max-width: none;
  }

  .dhero-art {
    display: none;
  }
}
</style>

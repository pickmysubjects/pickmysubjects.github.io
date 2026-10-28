<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

/**
 * The top of Find subjects, Majors and Careers: a glass band with the page's title, whatever the
 * page puts under it (its search), and a low scene across the right that fades out before the
 * words. (The header's Find subjects menu moves between the three.)
 */
defineProps<{ title: string }>()
const Art = defineAsyncComponent(() => import('./art/ArtBrowse.vue'))
</script>

<template>
  <header class="bhero surface">
    <div class="bhero-text">
      <h1 class="bhero-title">{{ title }}</h1>
      <slot />
    </div>
    <div class="bhero-art" aria-hidden="true"><Art /></div>
  </header>
</template>

<style scoped>
/* A low band like the guide's hero: words on the left, the scene across the right. */
.bhero {
  position: relative;
  display: grid;
  align-items: center;
  min-height: 176px;
  padding: 24px 36px;
  overflow: hidden;
}

.bhero-text {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 16px;
  max-width: min(100%, 720px);
}


.bhero-title {
  margin: 0;
  font-size: clamp(1.5rem, 1.2rem + 1.1vw, 2.125rem);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: var(--track-display);
  text-wrap: balance;
  word-break: keep-all;
  overflow-wrap: anywhere;
}


/* The scene keeps its proportions, anchored bottom right; its left end fades to nothing. */
.bhero-art {
  position: absolute;
  top: 6px;
  right: 20px;
  bottom: 4px;
  width: min(46%, 600px);
  -webkit-mask-image: linear-gradient(to right, transparent, #000 34%);
  mask-image: linear-gradient(to right, transparent, #000 34%);
}

.bhero-art > :deep(*) {
  width: 100%;
  height: 100%;
}

@media (max-width: 1100px) {
  .bhero-art {
    width: 34%;
  }

  .bhero-text {
    max-width: 66%;
  }
}

/* Phones: no scene; the search needs the width. */
@media (max-width: 720px) {
  .bhero {
    min-height: 0;
    padding: 16px;
    border-radius: 20px;
  }

  .bhero-text {
    gap: 12px;
    max-width: none;
  }

  .bhero-art {
    display: none;
  }
}
</style>

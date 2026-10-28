<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { ArrowRight, Pencil } from 'lucide-vue-next'
import { useI18n } from '@/i18n'

/**
 * The top of the plan page: a low glass band with the page's name, the plan switcher, the plan's
 * degree and majors (tap to change them), and its key numbers: points, rules met and the one
 * thing to do next. The planner's scene sits across the right and fades out before the words.
 */
defineProps<{
  title: string
  /** The plan's setup in one line ("Bachelor of Science · from 2026 S1 · Data Science"). */
  setup?: string
  facts?: { points: string; rules: string; rulesOk: boolean }
  next?: { label: string; href?: string }
}>()
const emit = defineEmits<{ edit: []; next: [] }>()
const { t } = useI18n()
const scene = defineAsyncComponent(() => import('./art/ArtPlan.vue'))
</script>

<template>
  <header class="phero surface">
    <div class="phero-text">
      <h1 class="phero-title">{{ title }}</h1>
      <slot />
      <button v-if="setup" class="phero-setup" type="button" @click="emit('edit')">
        <span class="phero-setup-text">{{ setup }}</span>
        <span class="phero-edit"><Pencil :size="14" aria-hidden="true" />{{ t('wizard.edit') }}</span>
      </button>
      <dl v-if="facts" class="phero-facts">
        <div class="fact">
          <dt>{{ t('planPage.factPoints') }}</dt>
          <dd>{{ facts.points }}</dd>
        </div>
        <div class="fact">
          <dt>{{ t('planPage.factRules') }}</dt>
          <dd :class="facts.rulesOk ? 'ok' : 'todo'">{{ facts.rules }}</dd>
        </div>
        <div v-if="next" class="fact">
          <dt>{{ t('planPage.factNext') }}</dt>
          <dd>
            <a v-if="next.href" class="phero-next" :href="next.href">{{ next.label }}<ArrowRight :size="15" aria-hidden="true" /></a>
            <button v-else class="phero-next" type="button" @click="emit('next')">{{ next.label }}<ArrowRight :size="15" aria-hidden="true" /></button>
          </dd>
        </div>
      </dl>
    </div>
    <div class="phero-art" aria-hidden="true"><component :is="scene" /></div>
  </header>
</template>

<style scoped>
.phero {
  position: relative;
  display: grid;
  align-items: center;
  min-height: 176px;
  padding: 22px 36px 24px;
  overflow: hidden;
}

.phero-text {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: start;
  gap: 10px;
  max-width: min(100%, 820px);
}

.phero-title {
  margin: 0;
  font-size: clamp(1.5rem, 1.2rem + 1.1vw, 2.125rem);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: var(--track-display);
  text-wrap: balance;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.phero-setup {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
  max-width: 100%;
  min-height: 36px;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.phero-setup-text {
  font-size: 1.0625rem;
  font-weight: var(--fw-semibold);
  overflow-wrap: anywhere;
}

.phero-edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
  white-space: nowrap;
}

.phero-setup:hover .phero-edit,
.phero-setup:focus-visible .phero-edit {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.phero-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 32px;
  margin: 2px 0 0;
}

.fact dt {
  font-size: var(--fs-caption);
  color: var(--ink-soft);
}

.fact dd {
  margin: 2px 0 0;
  font-size: 1.0625rem;
  font-weight: var(--fw-bold);
  font-variant-numeric: tabular-nums;
}

.fact dd.ok {
  color: var(--good);
}

.phero-next {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 0;
  border: 0;
  background: none;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
  font: inherit;
  font-weight: var(--fw-bold);
  text-decoration: none;
  cursor: pointer;
}

.phero-next:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* The scene keeps to the right; its left end fades out, so nothing busy sits behind the words. */
.phero-art {
  position: absolute;
  top: 6px;
  right: 20px;
  bottom: 4px;
  width: min(40%, 540px);
  -webkit-mask-image: linear-gradient(to right, transparent, #000 34%);
  mask-image: linear-gradient(to right, transparent, #000 34%);
}

.phero-art > :deep(*) {
  width: 100%;
  height: 100%;
}

@media (max-width: 1100px) {
  .phero-art {
    width: 28%;
  }

  .phero-text {
    max-width: 72%;
  }
}

@media (max-width: 720px) {
  .phero {
    min-height: 0;
    padding: 16px;
    border-radius: 20px;
  }

  .phero-text {
    max-width: none;
  }

  .phero-art {
    display: none;
  }

  .phero-setup,
  .phero-next {
    min-height: 44px;
  }

  .phero-facts {
    gap: 8px 22px;
  }
}
</style>

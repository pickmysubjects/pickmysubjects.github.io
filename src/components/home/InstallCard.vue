<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useI18n } from '@/i18n'
import { trackEvent } from '@/utils/analytics'
import { useInstall } from '@/utils/install'

/**
 * On a phone, for a student who has been here before: keep the site on the home screen, so it
 * opens like an app instead of being searched for again. Gone once it's there, or once closed.
 */
const props = defineProps<{ returning: boolean }>()
const { t } = useI18n()
const { way, prompt } = useInstall()
const KEY = 'sc:install-hidden'

// Phones and tablets only, worked out in the browser (the prerendered page never has it).
const phone = shallowRef(false)
const hidden = shallowRef(true)
onMounted(() => {
  phone.value = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  try {
    hidden.value = localStorage.getItem(KEY) === '1'
  } catch {
    hidden.value = false
  }
})

const current = computed(() => way())
const shown = computed(() => props.returning && phone.value && !hidden.value && current.value !== 'done')

function hide(): void {
  hidden.value = true
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // Closed for this visit only.
  }
}

async function add(): Promise<void> {
  if (await prompt()) trackEvent('install-accept')
}
</script>

<template>
  <section v-if="shown" class="install" :aria-label="t('home.install.title')">
    <div class="install-text">
      <p class="install-title">{{ t('home.install.title') }}</p>
      <p class="install-how">{{ t(`home.install.${current}`) }}</p>
    </div>
    <div class="install-actions">
      <button v-if="current === 'prompt'" class="button button-accent install-add" type="button" @click="add">{{ t('home.install.add') }}</button>
      <button class="button button-quiet install-close" type="button" @click="hide">{{ t('home.install.close') }}</button>
    </div>
  </section>
</template>

<style scoped>
.install {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  padding: 14px 16px;
  background: var(--glass-shine), var(--glass-fill);
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius-sm);
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.install-text {
  flex: 1 1 16em;
  min-width: 0;
}

.install-title {
  margin: 0;
  font-weight: 650;
}

.install-how {
  margin: 4px 0 0;
  color: var(--ink-soft);
  font-size: var(--fs-small);
  line-height: 1.45;
}

.install-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.install-add,
.install-close {
  min-height: 40px;
  padding: 0 16px;
}
</style>

<script setup lang="ts">
import { ArrowRight, CalendarDays } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { GUIDE_CATEGORIES } from '@/utils/guideSections'

/** /guide/: one card per section, then the key dates page. */
const { t } = useI18n()
</script>

<template>
  <ul class="cats">
    <li v-for="c in GUIDE_CATEGORIES" :key="c">
      <a class="cat surface tile" :href="link(`guide/${c}/`)">
        <span class="cat-title">{{ t(`guide.cat.${c}.title`) }}</span>
        <span class="cat-lede">{{ t(`guide.cat.${c}.lede`) }}</span>
        <ArrowRight :size="16" aria-hidden="true" class="cat-go" />
      </a>
    </li>
    <li>
      <a class="cat surface tile" :href="link('guide/key-dates/')">
        <span class="cat-title"><CalendarDays :size="16" aria-hidden="true" /> {{ t('guide.kd.title') }}</span>
        <span class="cat-lede">{{ t('guide.kd.lede') }}</span>
        <ArrowRight :size="16" aria-hidden="true" class="cat-go" />
      </a>
    </li>
  </ul>
</template>

<style scoped>
.cats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (max-width: 720px) {
  .cats {
    grid-template-columns: 1fr;
  }
}

.cat {
  position: relative;
  display: grid;
  gap: 4px;
  height: 100%;
  padding: 16px 44px 16px 20px;
  color: inherit;
  text-decoration: none;
}

.cat:hover .cat-title {
  color: var(--accent);
}

.cat-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 650;
  transition: color 0.15s;
}

.cat-lede {
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.cat-go {
  position: absolute;
  top: 18px;
  right: 16px;
  color: var(--ink-faint);
}
</style>

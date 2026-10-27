<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import FinalCalc from '@/components/tools/FinalCalc.vue'
import ToolCards from '@/components/tools/ToolCards.vue'
import WamGoal from '@/components/profile/WamGoal.vue'
import { link, useView } from '@/composables/useView'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/** /tools/ (all tools), /tools/final/?subject=CODE (final calculator), /tools/wam/ (WAM calculator). */
const props = defineProps<{ tool: string }>()
const { t } = useI18n()
const { query } = useView()
const { wam } = useProfile()
const page = computed(() => (props.tool === 'final' || props.tool === 'wam' ? props.tool : 'hub'))
// A code in the address, upper-cased: links from anywhere can say ?subject=comp10001.
const code = computed(() => (query.value.get('subject') ?? '').trim().toUpperCase())
</script>

<template>
  <div class="tools">
    <a v-if="page !== 'hub'" class="back" :href="link('tools/')"><ArrowLeft :size="15" aria-hidden="true" /> {{ t('tools.title') }}</a>
    <header class="head">
      <h1 class="page-title">{{ page === 'final' ? t('calc.title') : page === 'wam' ? t('tools.wam') : t('tools.title') }}</h1>
      <p class="lede">{{ page === 'final' ? t('calc.lede') : page === 'wam' ? t('tools.wamLede') : t('tools.lede') }}</p>
    </header>
    <FinalCalc v-if="page === 'final'" :code="code" />
    <section v-else-if="page === 'wam'" class="surface wam">
      <p v-if="wam === null" class="empty">{{ t('tools.wamEmpty') }} <a class="button button-quiet" :href="link('record#sec-results')">{{ t('tools.wamGo') }}</a></p>
      <WamGoal />
    </section>
    <ToolCards v-else />
  </div>
</template>

<style scoped>
.tools {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--space-4);
}

.head {
  display: grid;
  gap: var(--space-2);
}

.lede {
  color: var(--ink-soft);
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.wam {
  padding: var(--space-5);
}

.empty {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  color: var(--ink-soft);
}
</style>

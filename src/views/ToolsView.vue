<script setup lang="ts">
import { computed } from 'vue'
import DetailHero from '@/components/browse/DetailHero.vue'
import FinalCalc from '@/components/tools/FinalCalc.vue'
import ToolCards from '@/components/tools/ToolCards.vue'
import WamCalc from '@/components/tools/WamCalc.vue'
import { link, useView } from '@/composables/useView'
import { useI18n } from '@/i18n'

/**
 * /tools/ (all tools), /tools/final/?subject=CODE (final calculator), /tools/wam/ (WAM calculator).
 * A calculator is the tool and nothing else: the hero says what it is, then the inputs and the answer.
 */
const props = defineProps<{ tool: string }>()
const { t } = useI18n()
const { query } = useView()
const page = computed(() => (props.tool === 'final' || props.tool === 'wam' ? props.tool : 'hub'))
// A code in the address, upper-cased: links from anywhere can say ?subject=comp10001.
const code = computed(() => (query.value.get('subject') ?? '').trim().toUpperCase())
const ARTS = {
  hub: () => import('@/components/tools/art/ArtTools.vue'),
  final: () => import('@/components/tools/art/ArtFinal.vue'),
  wam: () => import('@/components/tools/art/ArtWam.vue'),
}
const title = computed(() => t.value(page.value === 'final' ? 'calc.title' : page.value === 'wam' ? 'tools.wam' : 'tools.title'))
// The hub is its two cards: no line under its title.
const lede = computed(() => (page.value === 'final' ? t.value('calc.lede') : page.value === 'wam' ? t.value('tools.wamLede') : ''))
const back = computed(() => (page.value === 'hub' ? undefined : { href: link('tools/'), label: t.value('tools.title') }))
</script>

<template>
  <div class="tools">
    <DetailHero :key="page" :back="back" :title="title" :art="ARTS[page]">
      <p v-if="lede" class="lede">{{ lede }}</p>
    </DetailHero>
    <FinalCalc v-if="page === 'final'" :code="code" />
    <WamCalc v-else-if="page === 'wam'" />
    <ToolCards v-else />
  </div>
</template>

<style scoped>
.tools {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--space-4);
}

.lede {
  margin: 0;
  color: var(--ink-soft);
}

@media (max-width: 640px) {
  .tools {
    gap: var(--space-4);
    padding-top: var(--space-3);
  }
}
</style>

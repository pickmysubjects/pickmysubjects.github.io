<script setup lang="ts">
import { computed } from 'vue'

/**
 * Renders a translated sentence whose {placeholders} are filled by named slots, so
 * links can sit anywhere in the sentence regardless of each language's word order.
 */
const props = defineProps<{ text: string }>()

const parts = computed(() =>
  props.text
    .split(/(\{\w+\})/)
    .filter(Boolean)
    .map((p) => {
      const m = /^\{(\w+)\}$/.exec(p)
      return m ? { slot: m[1] as string, text: '' } : { slot: '', text: p }
    }),
)
</script>

<template>
  <template v-for="(p, i) in parts" :key="i">
    <slot v-if="p.slot" :name="p.slot" />
    <template v-else>{{ p.text }}</template>
  </template>
</template>

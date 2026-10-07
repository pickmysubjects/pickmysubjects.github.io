<script setup lang="ts">
import { shallowRef, useId } from 'vue'
import { useI18n } from '@/i18n'

defineProps<{ options: { code: string; title: string }[] }>()
const emit = defineEmits<{ pick: [code: string] }>()

const listId = useId()
const { t } = useI18n()
const text = shallowRef('')

function submit(): void {
  const code = text.value.trim().split(/\s/)[0]?.toUpperCase() ?? ''
  if (/^[A-Z]{4}\d{5}$/.test(code)) {
    emit('pick', code)
    text.value = ''
  }
}
</script>

<template>
  <form class="picker" @submit.prevent="submit">
    <input
      v-model="text"
      class="input picker-input"
      :list="listId"
      :placeholder="t('plan.addSubject')"
      :aria-label="t('plan.addSubjectLabel')"
    />
    <datalist :id="listId">
      <option v-for="o in options" :key="o.code" :value="`${o.code} ${o.title}`" />
    </datalist>
  </form>
</template>

<style scoped>
.picker-input {
  padding: 5px 8px;
  border-style: dashed;
  background: transparent;
  font-size: 0.82rem;
}
</style>

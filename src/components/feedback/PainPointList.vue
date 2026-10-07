<script setup lang="ts">
import { PAIN_POINTS, STATUS_LABELS } from '@/painPoints'

defineProps<{ selected: string }>()
const emit = defineEmits<{ choose: [id: string] }>()
</script>

<template>
  <ul class="pains">
    <li v-for="p in PAIN_POINTS" :key="p.id" class="pain surface" :class="{ 'pain-selected': selected === p.id }">
      <span class="status" :class="`status-${p.status}`">{{ STATUS_LABELS[p.status] }}</span>
      <h3 class="pain-question">{{ p.question }}</h3>
      <p class="pain-answer">{{ p.answer }}</p>
      <span class="pain-actions">
        <a v-if="p.view" :href="`#/${p.view}`">Try it</a>
        <button class="pain-feedback" type="button" @click="emit('choose', p.id)">Give feedback on this</button>
      </span>
    </li>
  </ul>
</template>

<style scoped>
.pains {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pain {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 16px;
  border: 1px solid transparent;
}

.pain-selected {
  border-color: var(--overprint);
}

.status {
  justify-self: start;
  padding: 1px 9px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
}

.status-works {
  background: var(--forest-tint);
  color: var(--forest);
}

.status-partly {
  background: var(--open-tint);
  color: var(--open);
}

.status-planned {
  background: var(--paper);
  color: var(--ink-soft);
}

.pain-question {
  font-size: 0.98rem;
  font-weight: 800;
}

.pain-answer {
  margin: 0;
  font-size: 0.86rem;
  color: var(--ink-soft);
}

.pain-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 0.85rem;
}

.pain-feedback {
  padding: 0;
  border: 0;
  background: none;
  color: var(--overprint);
  font-weight: 600;
  cursor: pointer;
}
</style>

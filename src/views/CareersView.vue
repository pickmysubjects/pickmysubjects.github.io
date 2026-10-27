<script setup lang="ts">
import CareerList from '@/components/careers/CareerList.vue'
import CareerDetail from '@/components/careers/CareerDetail.vue'

// /careers lists every career; /careers/<id> shows one ("I want to be ___").
defineProps<{ id: string }>()
</script>

<template>
  <div class="careers-view">
    <CareerDetail v-if="id" :key="id" :id="id" />
    <CareerList v-else />
  </div>
</template>

<style scoped>
.careers-view {
  padding-top: var(--page-top);
}
</style>

<script setup lang="ts">
import CareerList from '@/components/careers/CareerList.vue'
import CareerDetail from '@/components/careers/CareerDetail.vue'

// /careers lists every career; /careers/<id> shows one ("I want to be ___").
defineProps<{ id: string }>()
</script>

<template>
  <div class="careers-view" >
    <CareerDetail v-if="id" :key="id" :id="id" />
    <CareerList v-else />
  </div>
</template>

<style scoped>
/* Both the list and each page open with a glass hero, as close under the header as the guide's. */
.careers-view {
  padding-top: 20px;
}

@media (max-width: 720px) {
  .careers-view {
    padding-top: 12px;
  }
}
</style>

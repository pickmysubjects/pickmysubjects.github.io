<script setup lang="ts">
import ClubList from '@/components/clubs/ClubList.vue'
import ClubDetail from '@/components/clubs/ClubDetail.vue'

// /clubs lists every UMSU club; /clubs/<slug> shows one, with the way to join it on UMSU's site.
defineProps<{ id: string }>()
</script>

<template>
  <div class="clubs-view">
    <ClubDetail v-if="id" :key="id" :slug="id" />
    <ClubList v-else />
  </div>
</template>

<style scoped>
/* Both the list and each club open with a glass hero, as close under the header as Careers'. */
.clubs-view {
  padding-top: 20px;
}

@media (max-width: 720px) {
  .clubs-view {
    padding-top: 12px;
  }
}
</style>

<script setup lang="ts">
import MajorList from '@/components/majors/MajorList.vue'
import MajorDetail from '@/components/majors/MajorDetail.vue'

// /majors lists every major; /majors/<id> shows one.
defineProps<{ id: string }>()
</script>

<template>
  <div class="majors">
    <MajorDetail v-if="id" :key="id" :id="id" />
    <MajorList v-else />
  </div>
</template>

<style scoped>
.majors {
  padding-top: 32px;
}
</style>

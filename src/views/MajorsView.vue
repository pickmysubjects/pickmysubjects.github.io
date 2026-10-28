<script setup lang="ts">
import MajorList from '@/components/majors/MajorList.vue'
import MajorDetail from '@/components/majors/MajorDetail.vue'

// /majors lists every major; /majors/<id> shows one.
defineProps<{ id: string }>()
</script>

<template>
  <div class="majors" >
    <MajorDetail v-if="id" :key="id" :id="id" />
    <MajorList v-else />
  </div>
</template>

<style scoped>
/* Both the list and each page open with a glass hero, as close under the header as the guide's. */
.majors {
  padding-top: 20px;
}

@media (max-width: 720px) {
  .majors {
    padding-top: 12px;
  }
}
</style>

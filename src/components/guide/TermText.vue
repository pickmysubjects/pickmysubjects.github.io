<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { termSegments } from '@/utils/termLinks'
import { GUIDE_PAGE, GUIDE_SECTION } from './termContext'

/**
 * A guide sentence with its terms linked to their own pages (census date → key dates, WAM → how
 * WAM works, a subject code → the subject). Each term links once per section, never to where the
 * reader already is (termLinks.ts).
 */
const props = defineProps<{ text: string }>()
const page = inject(GUIDE_PAGE, ref(''))
const section = inject(GUIDE_SECTION, undefined)
const { data } = useDataset()
const subjects = computed(() => new Set(Object.keys(data.value.subjects)))
// This instance owns the terms it links, so a re-render keeps them.
const owner = {}
const segments = computed(() =>
  termSegments(props.text, {
    page: page.value,
    section: section?.id,
    subjects: subjects.value,
    claim: (id) => (section ? section.claim(id, owner) : true),
  }),
)
</script>

<template>
  <template v-for="(s, i) in segments" :key="i"><a v-if="s.to" class="term-link" :href="link(s.to)">{{ s.text }}</a><template v-else>{{ s.text }}</template></template>
</template>

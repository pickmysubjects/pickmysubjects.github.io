<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import SidePanel from '@/components/SidePanel.vue'
import { useI18n } from '@/i18n'
import { reducedMotion } from '@/utils/motion'
import type { GuidePageSlug } from '@/utils/guideSections'
import { MINI_ART } from './art/minis'
import type { Component } from 'vue'

/**
 * "On this page": the page's topics, the one being read highlighted. Desktop: a sticky list in
 * the left column. Phones: a small fold at the top of the page. A tap scrolls smoothly and
 * keeps the #anchor in the address, so the link can be shared.
 * The panel itself (sticky glass, inner scroll with fades, the small illustration when there's
 * room, the phone fold) is the shared SidePanel.
 */
interface TocItem {
  id: string
  title: string
  sub: boolean
}
// A guide page names its slug; another page (the About group, a subject page) passes its own illustration.
const props = defineProps<{ items: TocItem[]; slug?: GuidePageSlug; art?: () => Promise<Component> }>()
const { t } = useI18n()
const active = shallowRef<string | null>(null)
const open = shallowRef(false)
const activeTitle = computed(() => props.items.find((i) => i.id === active.value)?.title ?? null)
const art = computed(() => props.art ?? (props.slug ? MINI_ART[props.slug] : undefined))
const panel = useTemplateRef<InstanceType<typeof SidePanel>>('panel')

// The topic being read: the last one whose top has passed a line a little below the header.
let frame = 0
function spy(): void {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    let current: string | null = null
    for (const i of props.items) {
      const el = document.getElementById(i.id)
      if (el && el.getBoundingClientRect().top <= 200) current = i.id
    }
    active.value = current
  })
}

function jump(id: string, event: MouseEvent): void {
  const el = document.getElementById(id)
  if (!el) return
  event.preventDefault()
  open.value = false
  history.replaceState(history.state, '', `#${encodeURIComponent(id)}`)
  el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

// Keep the topic being read in view inside the list, without moving the page.
watch(active, (id) => {
  const el = panel.value?.scroller
  const link = id ? el?.querySelector<HTMLElement>(`a[href="#${CSS.escape(id)}"]`) : null
  if (!el || !link || el.scrollHeight <= el.clientHeight) return
  const top = link.offsetTop - el.offsetTop
  const want = top < el.scrollTop + 24 ? top - 24 : top + link.offsetHeight > el.scrollTop + el.clientHeight - 24 ? top + link.offsetHeight - el.clientHeight + 24 : null
  if (want !== null) el.scrollTo({ top: want, behavior: reducedMotion() ? 'auto' : 'smooth' })
})

onMounted(() => {
  window.addEventListener('scroll', spy, { passive: true })
  spy()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', spy)
  cancelAnimationFrame(frame)
})
watch(() => props.items, () => {
  spy()
  nextTick(() => panel.value?.fit())
})
</script>

<template>
  <SidePanel ref="panel" v-model:open="open" tag="nav" class="toc" :label="t('subject.onPage')" :now="activeTitle ?? items[0]?.title" :art="art">
    <ol class="side-list">
      <li v-for="i in items" :key="i.id" :class="{ sub: i.sub }">
        <a :href="`#${i.id}`" :aria-current="active === i.id ? 'location' : undefined" @click="jump(i.id, $event)">{{ i.title }}</a>
      </li>
    </ol>
  </SidePanel>
</template>

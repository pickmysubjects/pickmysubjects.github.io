<script setup lang="ts">
import { useId } from 'vue'

/** The mark: a graduation cap whose tassel ends in a compass star. */
const id = useId()
</script>

<template>
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <linearGradient :id="`${id}-g`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f472b6" />
        <stop offset="1" stop-color="#8b5cf6" />
      </linearGradient>
    </defs>
    <path d="M8.5 14.6v5.3c0 2.3 3.4 4.1 7.5 4.1s7.5-1.8 7.5-4.1v-5.3L16 18.3z" :fill="`url(#${id}-g)`" opacity="0.75" />
    <path d="M16 5 29 11.5 16 18 3 11.5z" :fill="`url(#${id}-g)`" />
    <path d="M27 12.5v7.2" stroke="#c2227a" stroke-width="1.6" stroke-linecap="round" fill="none" />
    <path d="M27 20.2l1.1 2.7 2.7 1.1-2.7 1.1-1.1 2.7-1.1-2.7-2.7-1.1 2.7-1.1z" fill="#c2227a" />
  </svg>
</template>

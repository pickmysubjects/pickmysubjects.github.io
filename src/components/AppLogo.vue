<script setup lang="ts">
import { useId } from 'vue'

/** The mark: a white mortarboard on a pink glass tile. Small sizes drop the tassel and the rim. */
withDefaults(defineProps<{ small?: boolean }>(), { small: false })
const id = useId()
</script>

<template>
  <svg viewBox="0 0 72 72" aria-hidden="true">
    <defs>
      <linearGradient :id="`${id}-glass`" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stop-color="#e2509b" stop-opacity="0.82" />
        <stop offset="1" stop-color="#a81a68" stop-opacity="0.92" />
      </linearGradient>
      <linearGradient :id="`${id}-sheen`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.55" />
        <stop offset="0.45" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
      <linearGradient v-if="!small" :id="`${id}-rim`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.95" />
        <stop offset="0.5" stop-color="#fff" stop-opacity="0.2" />
        <stop offset="1" stop-color="#fff" stop-opacity="0.6" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="68" height="68" rx="20" :fill="`url(#${id}-glass)`" />
    <rect x="2" y="2" width="68" height="68" rx="20" :fill="`url(#${id}-sheen)`" />
    <rect v-if="!small" x="2.75" y="2.75" width="66.5" height="66.5" rx="19.25" fill="none" :stroke="`url(#${id}-rim)`" stroke-width="1.5" />
    <path d="M22 34v9c0 4 6 8 14 8s14-4 14-8v-9" fill="#fff" opacity="0.85" />
    <path d="M36 16l25 11-25 11-25-11z" fill="#fff" />
    <template v-if="!small">
      <path d="M36 27l18 4v12" stroke="#ffd6ea" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <circle cx="54" cy="45" r="3.5" fill="#ffd6ea" />
    </template>
  </svg>
</template>

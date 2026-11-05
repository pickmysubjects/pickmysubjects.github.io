<script setup lang="ts">
/**
 * Helix's happy face, as on its app icon: two "^" eyes, red and blue (its two strands), glowing on
 * a dark rounded tile with a red and a blue edge. Drawn here, not an image, so it stays sharp at
 * any size. It hops once in a while; still when the reader asked for less motion.
 */
defineProps<{ size?: number }>()
</script>

<template>
  <svg class="helix-smile" :width="size ?? 28" :height="size ?? 28" viewBox="0 0 64 64" role="img" aria-label="Helix :)">
    <defs>
      <linearGradient id="hs-tile" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2a2c36" />
        <stop offset="1" stop-color="#14151b" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#hs-tile)" />
    <!-- The red and blue edges of Helix's icon. -->
    <path d="M44 4.6 A16 16 0 0 1 59.4 20" fill="none" stroke="#ff4d6a" stroke-width="2.4" stroke-linecap="round" />
    <path d="M4.6 44 A16 16 0 0 0 20 59.4" fill="none" stroke="#4d7dff" stroke-width="2.4" stroke-linecap="round" />
    <g class="eyes">
      <path class="eye eye-l" d="M17 37 Q23 26 29 37" />
      <path class="eye eye-r" d="M35 37 Q41 26 47 37" />
    </g>
  </svg>
</template>

<style scoped>
.helix-smile {
  flex: none;
  vertical-align: middle;
}

.eye {
  fill: none;
  stroke: #fff;
  stroke-width: 4.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.eye-l {
  filter: drop-shadow(0 0 2.5px #ff4d6a);
}

.eye-r {
  filter: drop-shadow(0 0 2.5px #4d7dff);
}

.eyes {
  transform-box: view-box;
  transform-origin: 32px 32px;
  animation: hop 3.2s ease-in-out infinite;
}

@keyframes hop {
  0%,
  70%,
  100% {
    transform: translateY(0);
  }

  80% {
    transform: translateY(-3px);
  }

  90% {
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .eyes {
    animation: none;
  }
}
</style>

<script setup lang="ts">
import { ArrowRight, Calculator, Columns2, Gauge, Scale, Share2 } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { reducedMotion } from '@/utils/motion'

/**
 * The home page's most-used tools, in the same slim glass card as the three steps beside it: a
 * tinted circle, a short name and one line each, the whole tile a link straight to the tool. The
 * last tile is the tools page, where the rest are.
 */
const { t } = useI18n()
const TOOLS = [
  { name: 'can.tiles.final', line: 'can.tiles.finalLine', to: 'tools/final/', icon: Calculator },
  { name: 'tools.wam', line: 'can.tiles.wamLine', to: 'tools/wam/', icon: Gauge },
  { name: 'can.tiles.easy', line: 'can.tiles.easyLine', to: 'subjects/easy/', icon: Scale },
  { name: 'can.tiles.compare', line: 'can.tiles.compareLine', to: 'plan/compare/', icon: Columns2 },
  { name: 'can.tiles.share', line: 'can.tiles.shareLine', to: 'plan', icon: Share2 },
] as const

// Tiles fade up one after another the first time the card scrolls into view. Only when it starts
// out of view: a card already on screen just stays put, and so does everything under reduced motion.
const armed = shallowRef(false)
const seen = shallowRef(false)
const root = useTemplateRef<HTMLElement>('root')
let io: IntersectionObserver | undefined
onMounted(() => {
  const el = root.value
  if (!el || reducedMotion() || !('IntersectionObserver' in window)) return
  if (el.getBoundingClientRect().top < innerHeight * 0.9) return
  armed.value = true
  io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      seen.value = true
      io?.disconnect()
    },
    { threshold: 0.3 },
  )
  io.observe(el)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <section ref="root" class="home-tools" :class="{ armed, seen }" aria-labelledby="tools-title">
    <h2 id="tools-title" class="tools-title">{{ t('can.title') }}</h2>
    <div class="tools-card surface">
      <ul class="tiles">
        <li v-for="(tool, i) in TOOLS" :key="tool.to + tool.name" :style="{ '--i': i }">
          <a class="tool" :href="link(tool.to)">
            <span class="dot"><component :is="tool.icon" :size="16" :stroke-width="2.25" aria-hidden="true" /></span>
            <span class="words">
              <span class="name">{{ t(tool.name) }}</span>
              <span class="line">{{ t(tool.line) }}</span>
            </span>
          </a>
        </li>
        <li :style="{ '--i': TOOLS.length }">
          <a class="tool" :href="link('tools/')">
            <span class="dot dot-all"><ArrowRight :size="16" :stroke-width="2.25" aria-hidden="true" /></span>
            <span class="words">
              <span class="name">{{ t('menu.allTools') }}</span>
              <span class="line">{{ t('menu.d.allTools') }}</span>
            </span>
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
/* Same measures as StartSteps, so the two cards read as one family. */
.home-tools {
  /* Lays itself out by its own width: one row when wide, three or two columns beside the steps. */
  container: tools / inline-size;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--space-4);
  --dot: 34px;
  --pad: 10px;
  --gap: 12px;
}

.tools-title {
  font-size: 1.375rem;
  font-weight: 700;
}

.tools-card {
  display: grid;
  align-content: center;
  padding: 14px;
}

/* Five tools and "All tools" as the sixth tile: one row, or an even grid of three or two. */
.tiles {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  align-items: stretch;
  gap: var(--gap);
  margin: 0;
  padding: 0;
  list-style: none;
}

.tiles li {
  min-width: 0;
}

/* A tile: circle, then name and one line. The whole tile is the link. */
.tool {
  display: grid;
  align-content: start;
  justify-items: start;
  gap: 8px;
  height: 100%;
  min-height: 44px;
  padding: var(--pad);
  border-radius: 16px;
  color: var(--ink);
  text-decoration: none;
  transition: transform 160ms ease, background-color 160ms ease;
}

.tool:hover {
  background: color-mix(in srgb, var(--glass-fill-hover) 70%, transparent);
  transform: translateY(-2px);
}

.tool:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  transform: translateY(-2px);
}

/* The steps' "done" circle: a soft brand tint with the icon in the accent colour. */
.dot {
  display: inline-grid;
  place-items: center;
  width: var(--dot);
  height: var(--dot);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent-fill) 14%, var(--surface));
  border: 1.5px solid color-mix(in srgb, var(--accent-fill) 30%, transparent);
  border-radius: 50%;
}

.words {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.name {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
}

.line {
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--ink-soft);
  text-wrap: pretty;
}

/* "All tools": the steps' outlined "later" circle, since it isn't a tool itself. */
.dot-all {
  color: var(--ink-soft);
  background: color-mix(in srgb, var(--surface) 94%, var(--accent-fill));
  border-color: color-mix(in srgb, var(--ink-faint) 55%, transparent);
}

/* Entrance: each tile rises a few pixels into place, a beat after the one before. */
.home-tools.armed .tiles li {
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 260ms ease-out,
    transform 260ms cubic-bezier(0.3, 0.7, 0.4, 1);
  transition-delay: calc(var(--i) * 30ms);
}

.home-tools.armed.seen .tiles li {
  opacity: 1;
  transform: none;
}

@container tools (max-width: 899px) {
  .tiles {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container tools (max-width: 520px) {
  .tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Phones: a little tighter. */
@media (max-width: 640px) {
  .home-tools {
    gap: var(--space-3);
    --dot: 30px;
    --pad: 8px;
    --gap: 4px;
  }

  .tools-card {
    padding: 10px 12px 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tool {
    transition: none;
  }

  .tool:hover,
  .tool:focus-visible {
    transform: none;
  }
}
</style>

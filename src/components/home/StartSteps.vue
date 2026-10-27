<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { ArrowRight, Check } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useShortlist } from '@/composables/useShortlist'
import { useI18n } from '@/i18n'
import { reducedMotion } from '@/utils/motion'

/**
 * Three steps for a new student, as one slim stepper: done steps get a tick (and a small fact),
 * the next one is filled pink, later ones are outlined. The track between them fills up to the
 * next step when the card scrolls into view. Every step is a link; one button goes to the next.
 */
const { t } = useI18n()
const { profile } = useProfile()
const plan = usePlan()
const { codes: saved } = useShortlist()

const steps = computed(() => {
  const p = profile.value
  const filled = p.results.length + Object.keys(p.skills).length + p.interests.length
  return [
    {
      title: 'home.step1',
      text: 'home.step1Text',
      href: link('record'),
      done: filled > 0,
      status: filled > 0 ? t.value('home.step1Done', { results: p.results.length, interests: p.interests.length }) : '',
    },
    {
      title: 'home.step2',
      text: 'home.step2Text',
      href: link('plan'),
      done: !plan.isEmpty.value,
      status: plan.isEmpty.value ? '' : t.value('home.step2Done', { n: plan.plannedCodes.value.length }),
    },
    {
      title: 'home.step3',
      text: 'home.step3Text',
      href: link('subjects/?mine=1'),
      // Saving a subject that suits you is the sign this step happened.
      done: saved.value.length > 0,
      status: saved.value.length > 0 ? t.value('home.step3Done', { n: saved.value.length }) : '',
    },
  ]
})

/** The first step not done yet; -1 once all three are. */
const nextIndex = computed(() => steps.value.findIndex((s) => !s.done))
/** How far the track fills: up to the next step, or all the way. */
const reach = computed(() => (nextIndex.value < 0 ? steps.value.length - 1 : nextIndex.value))
const fresh = computed(() => steps.value.every((s) => !s.done))
const state = (i: number) => (steps.value[i]!.done ? 'done' : i === nextIndex.value ? 'next' : 'later')

const go = computed(() => {
  const i = nextIndex.value
  if (i < 0) return { href: link('plan'), label: t.value('home.viewPlan') }
  return { href: steps.value[i]!.href, label: fresh.value ? t.value('home.startStep', { n: 1 }) : t.value('home.continueStep', { n: i + 1 }) }
})

// The fill (and the sweep on a first visit) plays once, when the card first comes into view.
const seen = shallowRef(false)
const root = useTemplateRef<HTMLElement>('root')
let io: IntersectionObserver | undefined
onMounted(() => {
  if (reducedMotion() || !('IntersectionObserver' in window) || !root.value) {
    seen.value = true
    return
  }
  io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      seen.value = true
      io?.disconnect()
    },
    { threshold: 0.4 },
  )
  io.observe(root.value)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <section ref="root" class="start" :class="{ seen, fresh }" aria-labelledby="steps-title">
    <h2 id="steps-title" class="start-title">{{ t('home.stepsTitle') }}</h2>
    <div class="start-card surface">
      <ol class="stepper">
        <li v-for="(s, i) in steps" :key="s.title" :class="`is-${state(i)}`" :style="{ '--i': i }">
          <!-- The track to the next step: filled when the next step is reached. -->
          <span v-if="i < steps.length - 1" class="seg" :class="{ 'seg-on': i < reach }" aria-hidden="true">
            <span class="seg-fill" />
          </span>
          <a class="step" :href="s.href" :aria-current="state(i) === 'next' ? 'step' : undefined">
            <span class="dot">
              <Check v-if="s.done" class="dot-tick" :size="16" :stroke-width="3" :aria-label="t('home.done')" />
              <span v-else>{{ i + 1 }}</span>
            </span>
            <span class="words">
              <span class="name">{{ t(s.title) }}</span>
              <span class="line">{{ t(s.text) }}</span>
              <span v-if="s.done && s.status" class="status">{{ s.status }}</span>
            </span>
          </a>
        </li>
      </ol>
      <a class="button button-accent start-go" :href="go.href">
        {{ go.label }} <ArrowRight :size="18" aria-hidden="true" />
      </a>
    </div>
  </section>
</template>

<style scoped>
.start {
  display: grid;
  gap: var(--space-4);
  /* Circle size and the step's own padding: the track runs between circle centres. */
  --dot: 34px;
  --pad: 10px;
  --gap: 12px;
}

/* The heading style below the hero (CanDoList uses the same). */
.start-title {
  font-size: 1.375rem;
  font-weight: 700;
}

.start-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-5);
  padding: 14px 20px 14px 14px;
}

.stepper {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gap);
  margin: 0;
  padding: 0;
  list-style: none;
}

.stepper li {
  position: relative;
  min-width: 0;
}

/* Track: from this circle's centre to the next one's. */
.seg {
  position: absolute;
  top: calc(var(--pad) + var(--dot) / 2 - 1px);
  left: calc(var(--pad) + var(--dot) / 2);
  width: calc(100% + var(--gap));
  height: 2px;
  overflow: hidden;
  border-radius: 2px;
  background: color-mix(in srgb, var(--ink-faint) 28%, transparent);
}

.seg-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--accent-fill), #f06bb0);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 180ms cubic-bezier(0.3, 0.7, 0.4, 1);
  transition-delay: calc(var(--i) * 180ms);
}

.seen .seg-on .seg-fill {
  transform: none;
}

/* First visit: one soft light runs along the empty track, step by step, then rests. */
.fresh .seg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent-fill) 70%, white), transparent);
  opacity: 0;
  transform: translateX(-100%);
}

.fresh.seen .seg::after {
  animation: start-sweep 240ms ease-in-out both;
  animation-delay: calc(var(--i) * 220ms + 80ms);
}

@keyframes start-sweep {
  from {
    opacity: 1;
    transform: translateX(-100%);
  }

  to {
    opacity: 1;
    transform: translateX(100%);
  }
}

/* A step: circle, then name, one line and (when done) a small fact. The whole step is the link. */
.step {
  position: relative;
  display: grid;
  justify-items: start;
  gap: 8px;
  min-height: 44px;
  padding: var(--pad);
  border-radius: 16px;
  color: var(--ink);
  text-decoration: none;
  transition: transform 160ms ease, background-color 160ms ease;
}

.step:hover {
  background: color-mix(in srgb, var(--glass-fill-hover) 70%, transparent);
  transform: translateY(-2px);
}

.step:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  transform: translateY(-2px);
}

.dot {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: var(--dot);
  height: var(--dot);
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
  /* Opaque, so the track stops at its edge. */
  background: color-mix(in srgb, var(--surface) 94%, var(--accent-fill));
  border: 1.5px solid color-mix(in srgb, var(--ink-faint) 55%, transparent);
  border-radius: 50%;
}

.is-next .dot {
  color: #fff;
  background: var(--accent-fill);
  border-color: var(--accent-fill);
}

/* "You're here": a soft ring that breathes out from the next step's circle. */
.is-next .dot::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-fill) 40%, transparent);
  opacity: 0;
}

.seen .is-next .dot::after {
  animation: start-ring 2.4s ease-out infinite;
  animation-delay: calc(var(--i) * 180ms + 180ms);
}

@keyframes start-ring {
  0% {
    opacity: 0.9;
    transform: scale(1);
  }

  70%,
  100% {
    opacity: 0;
    transform: scale(1.45);
  }
}

.is-done .dot {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent-fill) 14%, var(--surface));
  border-color: color-mix(in srgb, var(--accent-fill) 30%, transparent);
}

/* Ticks pop in one after another as the track fills past them (same pace as the fill). */
.dot-tick {
  opacity: 0;
  transform: scale(0.4);
  transition:
    opacity 160ms ease,
    transform 200ms cubic-bezier(0.3, 1.6, 0.5, 1);
  transition-delay: calc(var(--i) * 180ms);
}

.seen .dot-tick {
  opacity: 1;
  transform: none;
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
}

.status {
  margin-top: 2px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
}

.is-later .name {
  color: var(--ink-soft);
}

.start-go {
  min-height: 44px;
  padding: 0 20px;
  white-space: nowrap;
}

/* Tablets: the button goes under the steps. */
@media (max-width: 1000px) {
  .start-card {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }

  .start-go {
    justify-self: start;
  }
}

/* Phones: a vertical list, the track running down between the circles. */
@media (max-width: 640px) {
  .start {
    gap: var(--space-3);
    --dot: 30px;
    --pad: 8px;
    --gap: 4px;
  }

  .start-card {
    padding: 10px 12px 14px;
  }

  .stepper {
    grid-template-columns: 1fr;
  }

  .seg {
    top: calc(var(--pad) + var(--dot) / 2);
    left: calc(var(--pad) + var(--dot) / 2 - 1px);
    width: 2px;
    height: calc(100% + var(--gap));
  }

  .seg-fill {
    transform: scaleY(0);
    transform-origin: center top;
  }

  .fresh .seg::after {
    background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--accent-fill) 70%, white), transparent);
    transform: translateY(-100%);
  }

  @keyframes start-sweep-down {
    from {
      opacity: 1;
      transform: translateY(-100%);
    }

    to {
      opacity: 1;
      transform: translateY(100%);
    }
  }

  .fresh.seen .seg::after {
    animation-name: start-sweep-down;
  }

  .step {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    column-gap: var(--space-3);
  }

  .start-go {
    justify-self: stretch;
    justify-content: center;
  }
}

/* Reduced motion: the finished state, nothing moving (the site turns transitions off too). */
@media (prefers-reduced-motion: reduce) {
  .seg-fill,
  .dot-tick,
  .step {
    transition: none;
  }

  .fresh .seg::after,
  .is-next .dot::after {
    animation: none;
  }

  .step:hover,
  .step:focus-visible {
    transform: none;
  }
}
</style>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import type { Subject } from '@/engine'
import FitBadge from '@/components/browse/FitBadge.vue'
import RowWarnings from '@/components/browse/RowWarnings.vue'
import { link } from '@/composables/useView'
import { useSubjectFit } from '@/composables/useSubjectFit'
import { useI18n } from '@/i18n'
import { useDataset } from '@/composables/useDataset'
import { describeReq, reasonText } from '@/i18n/format'
import { basisText } from '@/i18n/fitText'
import { fitBasis } from '@/engine'
import { useProfile } from '@/composables/useProfile'

/**
 * "Is it hard? Is it right for me?": the easy/hard lists' verdict for everyone, then, once the
 * open plan has a profile, how it fits as Find subjects' "sort for me" sees it.
 */
const props = defineProps<{ subject: Subject; year: number }>()
const { t } = useI18n()
const { difficulty, hasProfile, fit, course } = useSubjectFit(
  computed(() => props.subject.code),
  toRef(props, 'year'),
)

const LEVELS = ['easier', 'average', 'harder'] as const
const trim = (s: string) => s.replace(/[。.]\s*$/, '')

// Lists name the degree by its title, not its code.
const { data } = useDataset()
const courseTitle = computed(() => data.value.courses.find((c) => c.code === course.value)?.title ?? course.value)
const diffReasons = computed(() => difficulty.value.reasons.map((r) => t.value(`rank.reason.${r.key}`, r.params)))
const diffNote = computed(() => {
  const d = difficulty.value
  if (d.level === 'unknown') return ''
  if (d.place) return t.value(`fit.place.${d.place.direction}`, { n: d.place.place, course: courseTitle.value })
  if (d.unranked) return t.value(`fit.unranked.${d.unranked}`, { year: props.year, course: courseTitle.value })
  return ''
})

const { profile } = useProfile()
// What the fit rests on, and the one thing that would make it surer.
const basis = computed(() => basisText(t.value, fitBasis(profile.value)))
const fitReasons = computed(() => (fit.value?.kind === 'fit' ? fit.value.reasons.map((n) => trim(reasonText(t.value, n))) : []))
const outText = computed(() => {
  const f = fit.value
  if (f?.kind !== 'out') return ''
  const w = f.why
  if (w.key === 'needsFirst') return t.value('fit.out.needsFirst', { needs: trim(describeReq(t.value, props.subject.prerequisites, course.value)) })
  return t.value(`fit.out.${w.key}`, { codes: (w.codes ?? []).join(', '), level: w.level ?? '' })
})
const cautions = computed(() =>
  (fit.value && fit.value.kind !== 'missing' ? fit.value.cautions : []).map((c) =>
    c.key === 'closed' ? t.value('browse.closedForYou') : t.value('fit.notThisYear', { year: c.year }),
  ),
)
</script>

<template>
  <section class="fitcard surface" aria-labelledby="fit-title">
    <h2 id="fit-title" class="fit-title">{{ t('fit.title') }}</h2>

    <div class="cols">
      <div class="col">
        <h3 class="col-title">{{ t('fit.diffTitle') }}</h3>
        <template v-if="difficulty.level !== 'unknown'">
          <div class="scale" role="img" :aria-label="t(`fit.level.${difficulty.level}`)">
            <span v-for="l in LEVELS" :key="l" class="step" :class="[`step-${l}`, { on: l === difficulty.level }]">{{ t(`fit.level.${l}`) }}</span>
          </div>
          <p v-if="diffNote" class="note">{{ diffNote }}</p>
          <ul v-if="diffReasons.length" class="reasons">
            <li v-for="r in diffReasons" :key="r">{{ r }}</li>
          </ul>
          <p v-if="difficulty.factsOnly" class="faint">{{ t('rank.factsOnly') }}</p>
          <p v-else-if="difficulty.reviews > 0" class="faint">{{ t('fit.fromReviews', { n: difficulty.reviews }) }}</p>
        </template>
        <p v-else class="note">{{ t('fit.level.unknown') }}</p>
      </div>

      <div class="col">
        <h3 class="col-title">{{ t('fit.youTitle') }}</h3>
        <template v-if="!hasProfile">
          <p class="note">
            <a :href="link('record')">{{ t('fit.noProfile') }}</a>
          </p>
        </template>
        <template v-else-if="fit?.kind === 'fit'">
          <FitBadge :rec="fit.rec" />
          <!-- A weak match leads with what holds it back (the engine's own cautions). -->
          <RowWarnings v-if="fit.band === 'low'" :rec="fit.rec" />
          <ul v-if="fitReasons.length" class="reasons">
            <li v-for="r in fitReasons" :key="r">{{ r }}</li>
          </ul>
          <RowWarnings v-if="fit.band !== 'low'" :rec="fit.rec" />
        </template>
        <p v-else-if="fit?.kind === 'out'" class="out">{{ outText }}</p>
        <p v-if="fit?.kind === 'fit'" class="faint">{{ basis }}</p>
        <ul v-if="cautions.length" class="cautions">
          <li v-for="c in cautions" :key="c"><TriangleAlert :size="13" aria-hidden="true" />{{ c }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fitcard {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  min-width: 0;
}

.fit-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--ink);
}

.cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
}

.col {
  display: grid;
  align-content: start;
  justify-items: start;
  gap: var(--space-2);
  min-width: 0;
}

.col + .col {
  padding-left: var(--space-5);
  border-left: 1px solid var(--line);
}

.col-title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  color: var(--ink-soft);
}

/* Three steps, the verdict's one filled: easier and harder read at a glance. */
.scale {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 3px;
  width: 100%;
  max-width: 360px;
}

.step {
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  color: var(--ink-faint);
  background: color-mix(in srgb, var(--ink) 5%, transparent);
  overflow-wrap: anywhere;
}

.step.on {
  color: var(--surface);
}

.step-easier.on {
  background: var(--good);
}

.step-average.on {
  background: var(--ink-soft);
}

.step-harder.on {
  background: var(--warn);
}

.note,
.out {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--ink);
}

.out {
  font-weight: 600;
}

.faint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.reasons {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 1.1em;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--ink-soft);
}

.cautions {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.8125rem;
  color: var(--warn);
}

.cautions li {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
}

.cautions svg {
  flex: none;
  margin-top: 2px;
}

@media (max-width: 700px) {
  .cols {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
  }

  .col + .col {
    padding: var(--space-4) 0 0;
    border-left: 0;
    border-top: 1px solid var(--line);
  }
}

@media (max-width: 560px) {
  .fitcard {
    padding: var(--space-4);
  }

  .fit-title {
    font-size: 1.125rem;
  }
}
</style>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { ArrowRight, Check, CircleMinus, Info, Minus, Plus, ThumbsUp, TriangleAlert } from 'lucide-vue-next'
import { fitBasis, whyNotFit, type Subject } from '@/engine'
import InfoTip from '@/components/InfoTip.vue'
import RowWarnings from '@/components/browse/RowWarnings.vue'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useSubjectFit } from '@/composables/useSubjectFit'
import { useI18n } from '@/i18n'
import { describeReq, reasonText } from '@/i18n/format'
import { basisText, rankReasonText, whyText } from '@/i18n/fitText'

/**
 * "Is it hard? Is it right for me?": two plain answers first (difficulty from the easy/hard
 * lists, fit from Find subjects' "sort for me"), then what pushes each way, then what it rests on.
 */
const props = defineProps<{ subject: Subject; year: number }>()
const { t } = useI18n()
const { data } = useDataset()
const { profile } = useProfile()
const { difficulty, hasProfile, fit, course, ahead, graduate } = useSubjectFit(
  computed(() => props.subject.code),
  toRef(props, 'year'),
)

type Tone = 'good' | 'neutral' | 'warn'
// Reasons that give the likely-mark range: an ⓘ says what the range means.
const RANGE_KEYS = new Set(['predictedRange', 'predictedWam'])
const trim = (s: string) => s.replace(/[。.]\s*$/, '')
const courseTitle = computed(() => data.value.courses.find((c) => c.code === course.value)?.title ?? course.value)

// ---- difficulty ----
const DOTS = { easier: 1, average: 2, harder: 3, unknown: 0 } as const
const diffTone = computed<Tone>(() => (difficulty.value.level === 'easier' ? 'good' : difficulty.value.level === 'harder' ? 'warn' : 'neutral'))
const diffNote = computed(() => {
  const d = difficulty.value
  if (d.level === 'unknown') return ''
  if (d.place) return t.value(`fit.place.${d.place.direction}`, { n: d.place.place, course: courseTitle.value })
  if (d.unranked) return t.value(`fit.unranked.${d.unranked}`, { year: props.year, course: courseTitle.value })
  return t.value('fit.forCourse', { course: courseTitle.value })
})
// Everything behind the verdict, each way, with its numbers.
const easierItems = computed(() => difficulty.value.factors.easier.map((r) => rankReasonText(t.value, r)))
const harderItems = computed(() => difficulty.value.factors.harder.map((r) => rankReasonText(t.value, r)))
// The facts any student checks: how it's marked, and what it needs first.
const facts = computed(() => {
  const s = props.subject
  const out: string[] = []
  if (s.assessment?.length) {
    const byKind = new Map<string, number>()
    for (const task of s.assessment) byKind.set(task.kind, (byKind.get(task.kind) ?? 0) + task.weight)
    out.push(t.value('fit.markedBy', { parts: [...byKind].map(([k, w]) => `${t.value(`assess.kind.${k}`)} ${Math.round(w)}%`).join(t.value('fit.basis.sep')) }))
  }
  if (s.prerequisites !== 'none' && s.prerequisites !== 'unknown') out.push(t.value('fit.needs', { req: trim(describeReq(t.value, s.prerequisites, course.value)) }))
  return out
})

// ---- fit ----
const fitTone = computed<Tone>(() => {
  const f = fit.value
  if (f?.kind !== 'fit') return 'neutral'
  return f.band === 'great' || f.band === 'good' ? 'good' : f.band === 'low' ? 'warn' : 'neutral'
})
const fitHeadline = computed(() => {
  const f = fit.value
  if (!hasProfile.value || !f || f.kind === 'missing') return ''
  if (f.kind === 'fit') return t.value(`suggest.band.${f.band}`)
  const w = f.why
  if (w.key === 'needsFirst') return t.value('fit.out.needsFirst', { needs: trim(describeReq(t.value, props.subject.prerequisites, course.value)) })
  return t.value(`fit.out.${w.key}`, { codes: (w.codes ?? []).join(t.value('listSep')), level: w.level ?? '' })
})
const suitsItems = computed(() => (fit.value?.kind === 'fit' ? fit.value.reasons.map((n) => ({ text: trim(reasonText(t.value, n)), range: RANGE_KEYS.has(n.key) })) : []))
const cautions = computed(() =>
  (fit.value && fit.value.kind !== 'missing' ? fit.value.cautions : []).map((c) =>
    c.key === 'closed' ? t.value('browse.closedForYou') : t.value('fit.notThisYear', { year: c.year }),
  ),
)
// A weak or middling fit says what holds it back, from the score's own parts.
const weak = computed(() => fit.value?.kind === 'fit' && (fit.value.band === 'low' || fit.value.band === 'ok'))
const whyNotItems = computed(() => {
  const f = fit.value
  if (!weak.value || f?.kind !== 'fit') return []
  return whyNotFit(f.rec, profile.value, props.subject, data.value).map((x) => whyText(t.value, x))
})
const fitRec = computed(() => (fit.value?.kind === 'fit' ? fit.value.rec : null))
// Watch out, without what "why it's not a strong match" already says about weak skills.
const SAID_IN_WHY = new Set(['weakSkills', 'struggleSkills'])
const watchRec = computed(() => {
  const r = fitRec.value
  if (!r) return null
  return whyNotItems.value.length ? { ...r, warnings: r.warnings.filter((w) => !SAID_IN_WHY.has(w.key)) } : r
})
const hasWatch = computed(() => !!watchRec.value?.warnings.length || !!watchRec.value?.alternatives?.length || cautions.value.length > 0)

// ---- what both rest on: one quiet line ----
const source = computed(() => {
  const d = difficulty.value
  if (d.level === 'unknown') return ''
  return d.factsOnly ? t.value('rank.factsOnly') : d.reviews > 0 ? t.value('fit.fromReviews', { n: d.reviews }) : ''
})
const basis = computed(() => (fit.value?.kind === 'fit' ? basisText(t.value, fitBasis(profile.value)) : ''))
// No marks yet: the likely-mark part can't be worked out, so say what unlocks it.
const noMarks = computed(() => !profile.value.results.some((r) => r.mark !== undefined))
const marksLink = link('record') + '#sec-results'
const hasLists = computed(() => easierItems.value.length + harderItems.value.length + suitsItems.value.length + whyNotItems.value.length > 0 || hasWatch.value)
</script>

<template>
  <section class="fitcard surface" aria-labelledby="fit-title">
    <h2 id="fit-title" class="fit-title">{{ t('fit.title') }}</h2>

    <!-- The two answers, side by side (stacked on phones). -->
    <div class="answers">
      <div class="answer" :class="`tone-${diffTone}`">
        <span class="label">{{ t('fit.diffTitle') }}</span>
        <template v-if="difficulty.level !== 'unknown'">
          <span class="verdict">
            <span class="dots" aria-hidden="true">
              <i v-for="n in 3" :key="n" :class="{ on: n === DOTS[difficulty.level] }" />
            </span>
            {{ t(`fit.level.${difficulty.level}`) }}
          </span>
          <span v-if="diffNote" class="sub">{{ diffNote }}</span>
        </template>
        <span v-else class="verdict verdict-quiet">{{ t('fit.level.unknown') }}</span>
      </div>

      <div class="answer" :class="`tone-${fitTone}`">
        <span class="label">{{ t('fit.youTitle') }}</span>
        <template v-if="!hasProfile">
          <span class="sub">{{ t('fit.teaser') }}</span>
          <a class="button button-quiet teaser-go" :href="marksLink">{{ t('fit.teaserGo') }} <ArrowRight :size="15" aria-hidden="true" /></a>
        </template>
        <template v-else-if="fitHeadline">
          <span class="verdict" :class="{ 'verdict-quiet': fit?.kind === 'out' }">
            <ThumbsUp v-if="fitTone === 'good'" :size="18" aria-hidden="true" />
            <CircleMinus v-else-if="fitTone === 'warn'" :size="18" aria-hidden="true" />
            <Info v-else :size="18" aria-hidden="true" />
            {{ fitHeadline }}
          </span>
          <span v-if="fitRec" class="sub">
            {{ t('fit.betterThan', { n: fitRec.betterThan }) }}<template v-if="fitRec.confidence === 'low'"> · {{ t('suggest.thinData') }}</template>
          </span>
          <span v-if="graduate && fitRec" class="sub">{{ t('fit.aheadGraduate') }}</span>
          <span v-else-if="ahead && fitRec" class="sub">{{ t('fit.ahead', { level: ahead }) }}</span>
        </template>
      </div>
    </div>

    <!-- Some profile but no marks: the mark estimate is one step away. -->
    <p v-if="hasProfile && noMarks" class="teaser">
      <span>{{ t('fit.teaser') }}</span>
      <a class="button button-quiet teaser-go" :href="marksLink">{{ t('fit.teaserGo') }} <ArrowRight :size="15" aria-hidden="true" /></a>
    </p>

    <!-- What pushes each way: only the groups that have something. -->
    <div v-if="hasLists" class="lists">
      <div class="side">
        <div v-if="easierItems.length" class="group">
          <h3 class="group-title">{{ t('fit.easierGroup') }}</h3>
          <ul class="items">
            <li v-for="r in easierItems" :key="r" class="item item-good"><Plus :size="14" aria-hidden="true" />{{ r }}</li>
          </ul>
        </div>
        <div v-if="harderItems.length" class="group">
          <h3 class="group-title">{{ t('fit.harderGroup') }}</h3>
          <ul class="items">
            <li v-for="r in harderItems" :key="r" class="item item-warn"><Minus :size="14" aria-hidden="true" />{{ r }}</li>
          </ul>
        </div>
        <p v-if="difficulty.level === 'average' && easierItems.length && harderItems.length" class="note">{{ t('fit.balanced') }}</p>
      </div>
      <div class="side">
        <div v-if="whyNotItems.length" class="group">
          <h3 class="group-title">{{ fit?.kind === 'fit' && fit.band === 'low' ? t('fit.whyNotGroup') : t('fit.holdsBackGroup') }}</h3>
          <ul class="items">
            <li v-for="r in whyNotItems" :key="r" class="item item-warn"><CircleMinus :size="14" aria-hidden="true" />{{ r }}</li>
          </ul>
        </div>
        <div v-if="suitsItems.length" class="group">
          <h3 class="group-title">{{ weak ? t('fit.worksGroup') : t('fit.suitsGroup') }}</h3>
          <ul class="items">
            <li v-for="r in suitsItems" :key="r.text" class="item item-good">
              <Check :size="14" aria-hidden="true" /><span>{{ r.text }}<InfoTip v-if="r.range" :text="t('fit.rangeInfo')" /></span>
            </li>
          </ul>
        </div>
        <div v-if="hasWatch" class="group">
          <h3 class="group-title">{{ t('fit.watchGroup') }}</h3>
          <RowWarnings v-if="watchRec" class="watch" :rec="watchRec" />
          <ul v-if="cautions.length" class="items">
            <li v-for="c in cautions" :key="c" class="item item-warn"><TriangleAlert :size="13" aria-hidden="true" />{{ c }}</li>
          </ul>
        </div>
      </div>
    </div>

    <ul v-if="facts.length" class="facts">
      <li v-for="f in facts" :key="f">{{ f }}</li>
    </ul>

    <p v-if="source || basis" class="basis">
      <Info :size="13" aria-hidden="true" />
      <span>{{ [source, basis].filter(Boolean).join(' · ') }}</span>
    </p>
  </section>
</template>

<style scoped>
.teaser {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-3);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  color: var(--ink);
}

.teaser-go {
  justify-self: start;
  min-height: 34px;
  padding: 0 12px;
  font-size: 0.875rem;
}

.fitcard {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-5);
  min-width: 0;
}

.fit-title {
  margin: 0;
  font-size: var(--fs-section);
  font-weight: 700;
  line-height: 1.3;
  color: var(--ink);
}

.answers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

/* Each answer: a tinted tile whose colour carries the verdict (green / neutral / amber). */
.answer {
  --tone: var(--ink-soft);
  --tone-bg: color-mix(in srgb, var(--ink) 4%, transparent);
  display: grid;
  align-content: start;
  gap: var(--space-1);
  min-width: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius);
  background: var(--tone-bg);
  border: 1px solid color-mix(in srgb, var(--tone) 18%, transparent);
}

.tone-good {
  --tone: var(--good);
  --tone-bg: var(--good-soft);
}

.tone-warn {
  --tone: var(--warn);
  --tone-bg: var(--warn-soft);
}

.label {
  font-size: var(--fs-meta);
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.verdict {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.375rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--tone);
  overflow-wrap: anywhere;
}

.verdict svg {
  flex: none;
}

.verdict-quiet {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
}

/* A small, static three-dot scale: easier · average · harder. */
.dots {
  display: inline-flex;
  gap: 3px;
  flex: none;
}

.dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ink) 15%, transparent);
}

.dots i.on {
  background: var(--tone);
}

.sub {
  font-size: var(--fs-small);
  line-height: 1.5;
  color: var(--ink-soft);
}

.lists {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3) var(--space-5);
}

.side {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  min-width: 0;
}

.group {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.group-title {
  margin: 0;
  font-size: var(--fs-small);
  font-weight: 650;
  color: var(--ink);
}

.items {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--ink);
}

.item svg {
  flex: none;
  margin-top: 4px;
}

.item-good svg {
  color: var(--good);
}

.item-warn svg {
  color: var(--warn);
}

.watch {
  margin-top: 0;
  font-size: var(--fs-body);
}

.note {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.facts {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-small);
  line-height: 1.55;
  color: var(--ink-soft);
}

.basis {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
  font-size: var(--fs-small);
  line-height: 1.55;
  color: var(--ink-soft);
}

.basis svg {
  flex: none;
  margin-top: 2px;
}

@media (max-width: 700px) {
  .answers,
  .lists {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 560px) {
  .fitcard {
    padding: var(--space-4);
  }

  .fit-title {
    font-size: var(--fs-section);
  }

  .verdict {
    font-size: var(--fs-section);
  }
}
</style>

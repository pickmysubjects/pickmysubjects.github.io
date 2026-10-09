<script setup lang="ts">
import { link } from '@/composables/useView'
import { computed, shallowRef, useId, type Component } from 'vue'
import { ArrowUpRight, GraduationCap, Heart, Plus, Sparkles, ThumbsUp, TrendingUp, TriangleAlert } from 'lucide-vue-next'
import { periodsFor, type Recommendation, type Subject } from '@/engine'
import { useI18n } from '@/i18n'
import { reasonText } from '@/i18n/format'
import { summariseAssessment } from '@/utils/assessment'
import { useProfile } from '@/composables/useProfile'

/**
 * One suggested subject, read top to bottom: what it is, how well it fits (a number and a
 * word), why (one tinted line per reason), then the plain facts and what to check.
 */
const props = defineProps<{
  rec: Recommendation
  subject?: Subject
  addLabel: string | null
  year: number
}>()
const emit = defineEmits<{ add: [] }>()
const { t } = useI18n()
// What the number means: opens on tap (a title tooltip never shows on phones, and slowly elsewhere).
const explainOpen = shallowRef(false)
const explainId = useId()

const ICONS: Record<string, Component> = {
  interests: Heart,
  majorCore: GraduationCap,
  majorOption: GraduationCap,
  strengths: Sparkles,
  goodAt: Sparkles,
  averagedHigh: TrendingUp,
  unlocks: ArrowUpRight,
  opensMany: ArrowUpRight,
  approachable: ThumbsUp,
  reviewsEasy: ThumbsUp,
  generous: ThumbsUp,
}
// Full stops dropped: these read as labels, not sentences.
const trim = (s: string) => s.replace(/[。.]\s*$/, '')
const reasons = computed(() =>
  props.rec.reasons.map((n) => ({ key: n.key, icon: ICONS[n.key] ?? Sparkles, text: trim(reasonText(t.value, n)) })),
)
// A condition only the student can check (a VCE score) gets a plain line, an "I meet it"
// button, and the Handbook's own words folded away.
const warnings = computed(() =>
  props.rec.warnings.map((n) =>
    n.key === 'eligibilityUnknown'
      ? { manual: true, text: t.value('reason.eligibilityManual'), original: String(n.params.needs ?? '') }
      : { manual: false, text: trim(reasonText(t.value, n)), original: '' },
  ),
)
const { setConfirmed } = useProfile()

// Bands set on real lists: a match on interest and strengths lands around 55–70; unrelated subjects under 40.
const band = computed(() => (props.rec.score >= 65 ? 'great' : props.rec.score >= 50 ? 'good' : 'ok'))
// The ring: the score as a share of a full circle.
const ring = computed(() => `conic-gradient(var(--accent) ${props.rec.score * 3.6}deg, color-mix(in srgb, var(--ink) 10%, transparent) 0)`)

const facts = computed(() => {
  const s = props.subject
  if (!s) return []
  const out: string[] = []
  const a = summariseAssessment(s.assessment)
  if (a) out.push(a.exam === 0 ? t.value('assess.noExam') : t.value('assess.examShare', { n: a.exam }))
  if (a && a.group > 0) out.push(t.value('assess.group', { n: a.group }))
  // The long version of an unmet condition is in the warning above; here just where it stands.
  out.push(
    s.prerequisites === 'none'
      ? t.value('suggest.prereqNone')
      : props.rec.eligibility === 'ok'
        ? t.value('suggest.prereqOk')
        : t.value('suggest.prereqCheck'),
  )
  return out
})
const where = computed(() => {
  const s = props.subject
  if (!s) return ''
  const periods = periodsFor(s, props.year).map((p) => t.value(`period.${p}`))
  return [t.value('subject.level', { level: s.level }), t.value('subject.points', { points: s.points }), ...periods].join(' · ')
})
</script>

<template>
  <article class="rec surface">
    <header class="rec-head">
      <div class="rec-name">
        <p class="rec-where"><span class="code rec-code">{{ rec.code }}</span> · {{ where }}</p>
        <h3 class="rec-title"><a class="rec-link" :href="link(`subject/${rec.code}`)">{{ rec.title }}</a></h3>
      </div>
      <div class="rec-score-wrap" @focusout="explainOpen = false">
        <button
          type="button"
          class="rec-score"
          :aria-expanded="explainOpen"
          :aria-controls="explainId"
          :aria-label="t('suggest.fit', { score: rec.score, confidence: t(`suggest.band.${band}`) })"
          @click="explainOpen = !explainOpen"
        >
          <span class="rec-ring" :style="{ background: ring }" aria-hidden="true">
            <span class="rec-ring-num">{{ rec.score }}</span>
          </span>
          <span class="rec-band">{{ t(`suggest.band.${band}`) }}</span>
          <span v-if="rec.confidence === 'low'" class="rec-thin">{{ t('suggest.thinData') }}</span>
        </button>
        <p v-if="explainOpen" :id="explainId" class="rec-explain" role="note">{{ t('suggest.fitHint') }}</p>
      </div>
    </header>

    <ul v-if="reasons.length" class="rec-reasons">
      <li v-for="(r, i) in reasons" :key="i" class="rec-reason" :class="`rec-reason-${r.key}`">
        <component :is="r.icon" :size="15" aria-hidden="true" />
        <span>{{ r.text }}</span>
      </li>
    </ul>
    <p v-else class="rec-neutral">{{ t('suggest.neutral') }}</p>

    <ul v-if="warnings.length" class="rec-warnings">
      <li v-for="(w, i) in warnings" :key="i">
        <TriangleAlert :size="14" aria-hidden="true" />
        <div class="rec-warning-body">
          <span>{{ w.text }}</span>
          <div v-if="w.manual" class="rec-manual">
            <button type="button" class="rec-meet" @click="setConfirmed(rec.code, true)">{{ t('suggest.iMeetIt') }}</button>
            <details class="rec-original">
              <summary>{{ t('suggest.original') }}</summary>
              <p>{{ w.original }}</p>
            </details>
          </div>
        </div>
      </li>
    </ul>

    <footer class="rec-foot">
      <p class="rec-facts">{{ facts.join(' · ') }}</p>
      <button v-if="addLabel" class="button button-quiet rec-add" type="button" @click="emit('add')">
        <Plus :size="15" aria-hidden="true" /> {{ t('suggest.add', { term: addLabel }) }}
      </button>
    </footer>
  </article>
</template>

<style scoped>
.rec {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 20px 22px;
  border-radius: 20px;
}

.rec-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.rec-name {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.rec-where {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.rec-code {
  font-weight: 650;
  color: var(--accent);
}

.rec-title {
  font-size: 1.2rem;
  font-weight: 650;
  line-height: 1.3;
}

.rec-link {
  color: inherit;
  text-decoration: none;
}

.rec-link:hover {
  color: var(--accent);
}

.rec-score-wrap {
  position: relative;
  flex: none;
}

.rec-score {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 4px;
  border: 0;
  border-radius: 12px;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.rec-score:hover .rec-band {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.rec-explain {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 5;
  width: min(300px, 80vw);
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--glass-edge);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-2);
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--ink);
}

.rec-ring {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
}

.rec-ring-num {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--surface);
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.rec-band {
  font-size: 0.8125rem;
  font-weight: 650;
  color: var(--accent);
}

.rec-thin {
  font-size: 0.75rem;
  color: var(--ink-faint);
}

.rec-reasons,
.rec-warnings {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rec-reason {
  --tone: var(--accent);
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 7px 11px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--tone) 11%, var(--surface));
  font-size: 0.9375rem;
  line-height: 1.45;
  color: var(--ink);
}

.rec-reason svg {
  flex: none;
  margin-top: 3px;
  color: var(--tone);
}

.rec-reason-strengths,
.rec-reason-goodAt,
.rec-reason-averagedHigh {
  --tone: var(--good);
}

.rec-reason-unlocks,
.rec-reason-opensMany {
  --tone: #6d5bd0;
}

.rec-reason-approachable,
.rec-reason-reviewsEasy,
.rec-reason-generous {
  --tone: #2f7fc1;
}

.rec-warnings li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--warn);
}

.rec-warnings svg {
  flex: none;
  margin-top: 2px;
}

.rec-warning-body {
  display: grid;
  gap: 6px;
}

.rec-manual {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 12px;
}

.rec-meet {
  padding: 3px 11px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill-hover);
  box-shadow: var(--glass-shadow);
  font: inherit;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
}

.rec-original summary {
  color: var(--ink-soft);
  cursor: pointer;
}

.rec-original p {
  margin: 4px 0 0;
  color: var(--ink-soft);
}

.rec-neutral {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.rec-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px 16px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--glass-edge);
}

.rec-facts {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.rec-add {
  min-height: 36px;
  padding: 0 14px;
  font-size: 0.875rem;
}
</style>

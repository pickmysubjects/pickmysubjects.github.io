<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, MessageSquareText } from 'lucide-vue-next'
import { discussionVerdict, type Subject } from '@/engine'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { discussionLabels } from '@/i18n/discussion'
import { subjectGist } from '@/i18n/gist'
import { localTitle } from '@/i18n/localized'
import { summariseAssessment } from '@/utils/assessment'

/**
 * A real subject page in miniature: the facts every subject page leads with (title, the
 * exam share and class hours, the assessment split, what reviewers say). Opens that page.
 */
const props = defineProps<{ subject: Subject; caption?: string }>()
const { t, locale } = useI18n()

const local = computed(() => localTitle(props.subject, locale.value))
const gist = computed(() => subjectGist(t.value, props.subject))
const parts = computed(() => summariseAssessment(props.subject.assessment)?.parts ?? [])
const barLabel = computed(() => parts.value.map((p) => `${t.value(`assess.kind.${p.kind}`)} ${p.weight}%`).join(t.value('listSep')))
// What reviewers say about the work and the difficulty, in the easy/hard lists' words.
const said = computed(() => {
  const out: string[] = []
  const list = props.subject.discussions
  const diff = discussionVerdict(list, 'difficulty')
  if (diff?.value === 'easy') out.push(t.value('rank.reason.reviewsEasy', { n: diff.n }))
  if (diff?.value === 'hard') out.push(t.value('rank.reason.reviewsHard', { n: diff.n }))
  const work = discussionVerdict(list, 'workload')
  if (work?.value === 'light') out.push(t.value('rank.reason.reviewsLight'))
  if (work?.value === 'heavy') out.push(t.value('rank.reason.reviewsHeavy'))
  return out
})
const source = computed(() => {
  const d = props.subject.discussions?.[0]
  return d ? discussionLabels(t.value, d).source : ''
})
</script>

<template>
  <a class="demo surface" :href="link(`subject/${subject.code}`)">
    <span v-if="caption" class="caption">{{ caption }}</span>
    <span class="top">
      <span class="code">{{ subject.code }}</span>
      <span class="meta">{{ t('subject.level', { level: subject.level }) }} · {{ t('subject.points', { points: subject.points }) }}</span>
    </span>
    <span class="title">{{ local || subject.title }}</span>
    <span v-if="local" class="title-en" lang="en">{{ subject.title }}</span>

    <span v-if="gist.length" class="chips">
      <span v-for="g in gist" :key="g" class="chip">{{ g }}</span>
    </span>

    <span v-if="parts.length" class="assess">
      <span class="bar" role="img" :aria-label="barLabel">
        <span v-for="p in parts" :key="p.kind" class="seg" :class="`k-${p.kind}`" :style="{ flexGrow: p.weight }" />
      </span>
      <span class="legend">
        <span v-for="p in parts" :key="p.kind" class="legend-item">
          <span class="dot" :class="`k-${p.kind}`" aria-hidden="true" />{{ t(`assess.kind.${p.kind}`) }} <strong>{{ p.weight }}%</strong>
        </span>
      </span>
    </span>

    <span v-if="said.length" class="said">
      <span v-for="s in said" :key="s" class="said-line"><MessageSquareText :size="15" aria-hidden="true" />{{ s }}</span>
      <span v-if="source" class="source">{{ source }}</span>
    </span>

    <span class="go">{{ t('home.demoOpen') }} <ArrowRight :size="16" aria-hidden="true" /></span>
  </a>
</template>

<style scoped>
/* What the example shows, as the card's own header line. */
.caption {
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-1);
  border-bottom: 1px solid var(--line);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.demo {
  display: grid;
  align-content: start;
  gap: 10px;
  height: 100%;
  padding: 20px 22px;
  color: var(--ink);
  text-decoration: none;
  transition: box-shadow 0.2s;
}

.demo:hover {
  box-shadow: var(--shadow-2);
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
}

.code {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--accent);
}

.meta,
.title-en,
.source {
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.title {
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.title-en {
  margin-top: -6px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chips .chip {
  font-size: 0.8125rem;
  padding: 3px 10px;
}

.assess {
  display: grid;
  gap: 8px;
}

.bar {
  display: flex;
  gap: 3px;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
}

.seg {
  min-width: 6px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend strong {
  color: var(--ink);
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 3px;
}

.said {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: var(--radius);
  background: var(--surface-2);
}

.said-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 600;
}

.said-line svg {
  flex: none;
  margin-top: 2px;
  color: var(--accent);
}

.go {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
}

@media (prefers-reduced-motion: reduce) {
  .demo {
    transition: none;
  }
}
</style>

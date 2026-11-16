<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { MessagesSquare } from 'lucide-vue-next'
import { DISCUSSION_SECTIONS, emphasisParts, summaryAspects, type DiscussionSection, type DiscussionSummary, type DiscussionTag, type ReviewAspect } from '@/engine'
import { discussionLabels } from '@/i18n/discussion'
import { pickLocalized } from '@/i18n/localized'
import { useI18n } from '@/i18n'

/**
 * What students say in public places: one short block per source, labelled, never scored, always
 * linked. On top, what the reviews conclude (hard/easy, heavy/light: coloured) and the topics they
 * talk about; tapping a topic lights up the sentences about it, as review sites do.
 */
const props = defineProps<{ discussions: DiscussionSummary[] }>()
const { t, locale } = useI18n()
// Group work and hurdles come from the Handbook's assessment on this page, so only the other tags show here.
const SHOWN_TAGS: readonly DiscussionTag[] = ['mcq-exam', 'practice-repeats', 'no-calculator', 'scaled', 'avoid-summer']
const tagsOf = (d: DiscussionSummary) => SHOWN_TAGS.filter((k) => d.tags?.includes(k))
const blocks = computed(() => props.discussions.filter((d) => d.points.length).map((d) => ({ d, ...discussionLabels(t.value, d), aspects: summaryAspects(d) })))

type Tone = 'warn' | 'good' | 'neutral'
const verdicts = (d: DiscussionSummary): { text: string; tone: Tone }[] => [
  ...(d.difficulty ? [{ text: t.value(`subject.discussVerdict.difficulty.${d.difficulty}`), tone: (d.difficulty === 'hard' ? 'warn' : d.difficulty === 'easy' ? 'good' : 'neutral') as Tone }] : []),
  ...(d.workload ? [{ text: t.value(`subject.discussVerdict.workload.${d.workload}`), tone: (d.workload === 'heavy' ? 'warn' : d.workload === 'light' ? 'good' : 'neutral') as Tone }] : []),
]

// One topic picked at a time, per source block; tapping it again clears it.
const active = shallowRef<{ source: string; aspect: ReviewAspect } | null>(null)
function toggle(source: string, aspect: ReviewAspect): void {
  active.value = active.value?.source === source && active.value.aspect === aspect ? null : { source, aspect }
}
const isOn = (source: string, aspect: ReviewAspect) => active.value?.source === source && active.value.aspect === aspect
// Whether a sentence is about the picked topic: 'hit', 'dim' (another topic is picked) or ''.
function mark(b: (typeof blocks.value)[number], part: DiscussionSection | 'points', index: number): string {
  if (active.value?.source !== b.d.source) return ''
  const refs = b.aspects.find((a) => a.aspect === active.value!.aspect)?.refs ?? []
  return refs.some((r) => r.part === part && r.index === index) ? 'hit' : 'dim'
}
</script>

<template>
  <section v-if="blocks.length" class="discussion">
    <!-- Inside "What students say": each source's own line is the heading, no second title. -->
    <div v-for="b in blocks" :key="b.d.source" class="discussion-block">
      <h3 class="discussion-source"><MessagesSquare :size="16" aria-hidden="true" /> {{ b.source }}</h3>
      <ul v-if="verdicts(b.d).length || tagsOf(b.d).length" class="discussion-tags">
        <li v-for="v in verdicts(b.d)" :key="v.text" :class="`tone-${v.tone}`">{{ v.text }}</li>
        <li v-for="k in tagsOf(b.d)" :key="k">{{ t(`subject.discussTag.${k}`) }}</li>
      </ul>
      <div v-if="b.aspects.length > 1" class="discussion-aspects" role="group" :aria-label="t('subject.discussAspectHint')">
        <button
          v-for="a in b.aspects"
          :key="a.aspect"
          type="button"
          class="aspect"
          :class="{ on: isOn(b.d.source, a.aspect) }"
          :aria-pressed="isOn(b.d.source, a.aspect)"
          @click="toggle(b.d.source, a.aspect)"
        >
          {{ t(`subject.discussAspect.${a.aspect}`) }} <span class="aspect-n">{{ a.refs.length }}</span>
        </button>
      </div>
      <template v-if="b.d.sections">
        <template v-for="k in DISCUSSION_SECTIONS" :key="k">
          <div v-if="b.d.sections[k]" class="discussion-part">
            <h4 class="discussion-part-label">{{ t(`subject.discussPart.${k}`) }}</h4>
            <ul class="discussion-points">
              <li v-for="(p, i) in b.d.sections[k]" :key="i" :class="mark(b, k, i)">
                <template v-for="(s, j) in emphasisParts(pickLocalized(p, locale))" :key="j"><strong v-if="s.strong">{{ s.text }}</strong><template v-else>{{ s.text }}</template></template>
              </li>
            </ul>
          </div>
        </template>
      </template>
      <ul v-else class="discussion-points">
        <li v-for="(p, i) in b.d.points" :key="i" :class="mark(b, 'points', i)">
          <template v-for="(s, j) in emphasisParts(pickLocalized(p, locale))" :key="j"><strong v-if="s.strong">{{ s.text }}</strong><template v-else>{{ s.text }}</template></template>
        </li>
      </ul>
      <a class="discussion-link" :href="b.d.url" target="_blank" rel="noopener nofollow">{{ b.read }}</a>
    </div>
    <p class="discussion-note">{{ t('subject.discussNote') }}</p>
  </section>
</template>

<style scoped>
.discussion {
  display: grid;
  gap: 10px;
}

.discussion-note {
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.discussion-points {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
  line-height: 1.55;
}

.discussion-points li {
  border-radius: 6px;
  transition:
    opacity 0.15s,
    background-color 0.15s;
}

/* The sentences about the picked topic stand out; the rest step back but stay readable. */
.discussion-points li.hit {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 12%, transparent);
}

.discussion-points li.dim {
  opacity: 0.5;
}

.discussion-points strong {
  font-weight: 650;
  color: var(--ink);
}

.discussion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 2px 0 4px;
  padding: 0;
  list-style: none;
}

.discussion-tags li {
  padding: 2px 10px;
  font-size: var(--fs-small);
  border: 1px solid var(--line);
  border-radius: 999px;
}

.discussion-tags li.tone-warn {
  border-color: color-mix(in srgb, var(--warn) 45%, transparent);
  color: var(--warn);
}

.discussion-tags li.tone-good {
  border-color: color-mix(in srgb, var(--good) 45%, transparent);
  color: var(--good);
}

.discussion-aspects {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.aspect {
  padding: 3px 10px;
  font: inherit;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  background: transparent;
  border: 1px dashed var(--line);
  border-radius: 999px;
  cursor: pointer;
}

.aspect:hover,
.aspect:focus-visible {
  color: var(--ink);
  border-style: solid;
}

.aspect.on {
  color: var(--ink);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent);
}

.aspect-n {
  margin-left: 2px;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}

@media (prefers-reduced-motion: reduce) {
  .discussion-points li {
    transition: none;
  }
}

.discussion-part {
  display: grid;
  gap: 4px;
}

.discussion-part-label {
  margin: 4px 0 0;
  font-size: var(--fs-small);
  font-weight: 600;
}

.discussion-block {
  display: grid;
  gap: 6px;
}

.discussion-block + .discussion-block {
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.discussion-source {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-meta);
  font-weight: 600;
  color: var(--ink-soft);
}

.discussion-link {
  justify-self: start;
  font-size: var(--fs-small);
}
</style>

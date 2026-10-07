<script setup lang="ts">
import { computed } from 'vue'
import type { Recommendation, Subject } from '@/engine'
import { describeField } from '@/engine'
import { discussionLinks } from '@/utils/links'

const props = defineProps<{
  rec: Recommendation
  subject?: Subject
  showLinks: boolean
  addLabel: string | null
}>()
const emit = defineEmits<{ add: [] }>()

const links = computed(() => (props.showLinks ? discussionLinks(props.rec.code) : []))
const width = computed(() => `${props.rec.score}%`)
const confidenceText = { low: 'Low confidence', medium: 'Medium confidence', high: 'High confidence' } as const
</script>

<template>
  <article class="rec surface">
    <header class="rec-head">
      <div class="rec-name">
        <span class="code rec-code">{{ rec.code }}</span>
        <h3 class="rec-title">{{ rec.title }}</h3>
      </div>
      <div class="rec-score" :aria-label="`Fit ${rec.score} out of 100, ${confidenceText[rec.confidence].toLowerCase()}`">
        <span class="rec-score-num">{{ rec.score }}</span>
        <span class="rec-score-bar" aria-hidden="true"><span class="rec-score-fill" :style="{ width }" /></span>
        <span class="rec-confidence">{{ confidenceText[rec.confidence] }}</span>
      </div>
    </header>
    <ul class="rec-points">
      <li v-for="(r, i) in rec.reasons" :key="`r${i}`" class="rec-reason">{{ r }}</li>
      <li v-for="(w, i) in rec.warnings" :key="`w${i}`" class="rec-warning">{{ w }}</li>
      <li v-if="rec.reasons.length === 0 && rec.warnings.length === 0" class="rec-neutral">
        Nothing stands out for you yet — add results, skills and interests in My record to sharpen this.
      </li>
    </ul>
    <footer class="rec-foot">
      <span v-if="subject" class="rec-meta">
        L{{ subject.level }} · {{ subject.points }} pts · Prerequisites: {{ describeField(subject.prerequisites) }}
      </span>
      <span class="rec-actions">
        <a v-if="showLinks && subject?.handbook" :href="subject.handbook" target="_blank" rel="noopener">Handbook</a>
        <a v-for="l in links" :key="l.label" :href="l.href" target="_blank" rel="noopener" :lang="l.lang">{{ l.label }}</a>
        <a :href="`#/feedback?topic=data&subject=${rec.code}`">Report wrong data</a>
        <button v-if="addLabel" class="button button-quiet rec-add" type="button" @click="emit('add')">
          Add to {{ addLabel }}
        </button>
      </span>
    </footer>
  </article>
</template>

<style scoped>
.rec {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
}

.rec-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.rec-code {
  font-size: 0.82rem;
  color: var(--overprint);
  font-weight: 600;
}

.rec-title {
  font-size: 1.1rem;
  font-weight: 800;
}

.rec-score {
  display: grid;
  grid-template-columns: auto 90px;
  align-items: center;
  gap: 2px 8px;
  flex: none;
}

.rec-score-num {
  font-family: var(--font-code);
  font-size: 1.4rem;
  font-weight: 600;
}

.rec-score-bar {
  height: 6px;
  background: var(--contour);
  border-radius: 3px;
  overflow: hidden;
}

.rec-score-fill {
  display: block;
  height: 100%;
  background: var(--overprint);
}

.rec-confidence {
  grid-column: 1 / -1;
  font-size: 0.72rem;
  color: var(--ink-soft);
  text-align: right;
}

.rec-points {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.9rem;
}

.rec-reason::before,
.rec-warning::before {
  display: inline-block;
  width: 1.2em;
  font-weight: 800;
}

.rec-reason::before {
  content: '+';
  color: var(--forest);
}

.rec-warning::before {
  content: '!';
  color: var(--open);
}

.rec-neutral {
  color: var(--ink-soft);
}

.rec-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px 16px;
  padding-top: 8px;
  border-top: 1px solid var(--contour);
  font-size: 0.8rem;
}

.rec-meta {
  color: var(--ink-soft);
}

.rec-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
}

.rec-add {
  padding: 4px 10px;
  font-size: 0.8rem;
}
</style>

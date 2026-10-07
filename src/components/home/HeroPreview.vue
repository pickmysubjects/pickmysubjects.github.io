<script setup lang="ts">
import { computed } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import { recommend } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/** A floating "product shot" built from the app's own data — no stock images needed. */
const { data, subjectList } = useDataset()
const { profile } = useProfile()
const { t } = useI18n()

const featured = computed(
  () => [...subjectList.value].sort((a, b) => (b.signals?.reviews ?? 0) - (a.signals?.reviews ?? 0))[0],
)
const bars = computed(() => {
  const s = featured.value?.signals
  return s
    ? [
        { key: 'rating.difficulty', value: s.difficulty },
        { key: 'rating.workload', value: s.workload },
        { key: 'rating.generosity', value: s.grading },
      ]
    : []
})
// Undergraduate subjects only, so the preview reads naturally.
const top = computed(() =>
  recommend(data.value, profile.value).filter((r) => (data.value.subjects[r.code]?.level ?? 9) < 9).slice(0, 3),
)
</script>

<template>
  <div class="preview" :aria-label="t('home.preview')" role="img">
    <article v-if="featured" class="glass pane pane-subject">
      <p class="code pane-code">{{ featured.code }}</p>
      <p class="pane-title">{{ featured.title }}</p>
      <div v-for="b in bars" :key="b.key" class="bar">
        <span class="bar-label">{{ t(b.key) }}</span>
        <span class="bar-track"><span class="bar-fill" :style="{ width: `${(b.value / 5) * 100}%` }" /></span>
      </div>
    </article>

    <article class="glass pane pane-route">
      <svg viewBox="0 0 220 110" class="route" aria-hidden="true">
        <path d="M30 80 C 80 80, 80 30, 110 30 S 150 70, 190 40" class="route-line" />
        <circle cx="30" cy="80" r="9" class="route-node" />
        <circle cx="110" cy="30" r="9" class="route-node" />
        <circle cx="190" cy="40" r="9" class="route-node route-node-end" />
      </svg>
      <div class="route-terms"><span>S1</span><span>S2</span><span>S1</span></div>
    </article>

    <article class="glass pane pane-match">
      <Sparkles :size="16" aria-hidden="true" />
      <div class="match-list">
        <p v-for="r in top" :key="r.code" class="match-row">
          <span class="code">{{ r.code }}</span>
          <span class="match-score">{{ t('home.match', { n: r.score }) }}</span>
        </p>
      </div>
    </article>
  </div>
</template>

<style scoped>
.preview {
  position: relative;
  min-height: 380px;
}

.pane {
  position: absolute;
  border-radius: 22px;
  padding: 18px 20px;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 70%),
    0 30px 60px -24px rgb(60 20 80 / 35%);
  animation: float 7s ease-in-out infinite;
}

.pane-subject {
  top: 10px;
  left: 4%;
  width: 290px;
  transform: rotate(-3deg);
}

.pane-route {
  top: 190px;
  right: 2%;
  width: 250px;
  transform: rotate(4deg);
  animation-delay: -2s;
}

.pane-match {
  top: 248px;
  left: 0;
  display: flex;
  gap: 10px;
  width: 230px;
  color: var(--accent);
  transform: rotate(-1deg);
  animation-delay: -4s;
}

@keyframes float {
  50% {
    translate: 0 -10px;
  }
}

.pane-code {
  font-size: 0.8rem;
  color: var(--accent);
}

.pane-title {
  margin: 2px 0 14px;
  font-size: 1.15rem;
  font-weight: 650;
  color: var(--ink);
}

.bar {
  display: grid;
  grid-template-columns: 96px 1fr;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.bar-label {
  font-size: 0.78rem;
  color: var(--ink-soft);
}

.bar-track {
  height: 8px;
  border-radius: 999px;
  background: rgb(0 0 0 / 7%);
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff7eb6, var(--accent));
}

.route {
  width: 100%;
}

.route-line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3;
  stroke-linecap: round;
}

.route-node {
  fill: #fff;
  stroke: var(--accent);
  stroke-width: 3;
}

.route-node-end {
  fill: var(--accent);
}

.route-terms {
  display: flex;
  justify-content: space-between;
  padding: 0 14px;
  font-family: var(--font-code);
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.match-list {
  flex: 1;
}

.match-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 0.82rem;
  color: var(--ink);
}

.match-score {
  font-weight: 600;
  color: var(--accent);
}

@media (max-width: 860px) {
  /* On phones the cards stack neatly instead of floating over each other. */
  .preview {
    display: grid;
    gap: 12px;
    min-height: 0;
  }

  .pane {
    position: static;
    width: 100%;
    animation: none;
  }

  .pane-subject {
    transform: rotate(-1.5deg);
  }

  .pane-match {
    transform: rotate(1deg);
  }

  .pane-route {
    display: none;
  }

  .bar {
    grid-template-columns: 110px 1fr;
  }
}
</style>

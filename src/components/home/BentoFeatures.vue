<script setup lang="ts">
import { BookOpen, Languages, Lock, Route, Sparkles } from 'lucide-vue-next'
import { LOCALES, useI18n } from '@/i18n'

const { t, locale, setLocale } = useI18n()
const emit = defineEmits<{ search: [] }>()
</script>

<template>
  <section class="bento">
    <a class="tile glass tile-subject" href="#/" @click.prevent="emit('search')">
      <span class="tile-icon"><BookOpen :size="20" aria-hidden="true" /></span>
      <h2 class="tile-title">{{ t('home.cardSubject') }}</h2>
      <p class="tile-text">{{ t('home.cardSubjectText') }}</p>
      <div class="mock mock-subject" aria-hidden="true">
        <span class="mock-chip">Level 3</span><span class="mock-chip">12.5</span><span class="mock-chip mock-chip-accent">S1</span>
        <span class="mock-bar" style="--w: 78%" /><span class="mock-bar" style="--w: 64%" /><span class="mock-bar" style="--w: 52%" />
      </div>
    </a>

    <a class="tile glass tile-plan" href="#/plan">
      <span class="tile-icon"><Route :size="20" aria-hidden="true" /></span>
      <h2 class="tile-title">{{ t('home.cardPlan') }}</h2>
      <p class="tile-text">{{ t('home.cardPlanText') }}</p>
      <svg class="mock-route" viewBox="0 0 300 90" aria-hidden="true">
        <path d="M20 70 C 70 70, 70 20, 120 20 S 170 65, 220 50 S 260 20, 285 25" />
        <circle cx="20" cy="70" r="7" /><circle cx="120" cy="20" r="7" /><circle cx="220" cy="50" r="7" /><circle cx="285" cy="25" r="7" />
      </svg>
    </a>

    <a class="tile glass tile-you" href="#/recommend">
      <span class="tile-icon"><Sparkles :size="20" aria-hidden="true" /></span>
      <h2 class="tile-title">{{ t('home.cardForYou') }}</h2>
      <p class="tile-text">{{ t('home.cardForYouText') }}</p>
      <div class="mock-rank" aria-hidden="true">
        <span style="--w: 92%" /><span style="--w: 74%" /><span style="--w: 58%" />
      </div>
    </a>

    <div class="tile glass tile-lang">
      <span class="tile-icon"><Languages :size="20" aria-hidden="true" /></span>
      <h2 class="tile-title">{{ t('home.langTitle') }}</h2>
      <p class="lang-cloud">
        <button
          v-for="l in LOCALES"
          :key="l.code"
          type="button"
          :lang="l.code"
          :aria-pressed="locale === l.code"
          @click="setLocale(l.code)"
        >
          {{ l.name }}
        </button>
      </p>
    </div>

    <a class="tile glass tile-private" href="#/privacy">
      <span class="tile-icon"><Lock :size="20" aria-hidden="true" /></span>
      <h2 class="tile-title">{{ t('home.trustNoLogin') }}</h2>
      <p class="tile-text">{{ t('home.trustLocal') }}</p>
    </a>
  </section>
</template>

<style scoped>
.bento {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
}

.tile {
  position: relative;
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 24px;
  border-radius: 26px;
  overflow: hidden;
  color: var(--ink);
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

a.tile:hover {
  transform: translateY(-3px);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 60%),
    var(--shadow-2);
}

.tile-subject {
  grid-column: span 3;
  background-image: radial-gradient(90% 70% at 100% 0%, color-mix(in srgb, #ff8cc0 22%, transparent), transparent 70%);
}

.tile-plan {
  grid-column: span 3;
  background-image: radial-gradient(90% 70% at 100% 0%, color-mix(in srgb, #ffb36b 20%, transparent), transparent 70%);
}

.tile-you {
  grid-column: span 2;
  background-image: radial-gradient(90% 70% at 100% 0%, color-mix(in srgb, #8b7bff 22%, transparent), transparent 70%);
}

.tile-lang {
  grid-column: span 2;
  background-image: radial-gradient(90% 70% at 100% 0%, color-mix(in srgb, #5ac8fa 20%, transparent), transparent 70%);
}

.tile-private {
  grid-column: span 2;
  background-image: radial-gradient(90% 70% at 100% 0%, color-mix(in srgb, #34c77b 18%, transparent), transparent 70%);
}

.tile-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: linear-gradient(135deg, #ff8cc0, var(--accent));
  color: #fff;
  box-shadow: 0 8px 18px -8px var(--accent);
}

.tile-title {
  margin-top: 6px;
  font-size: 1.2rem;
  font-weight: 650;
}

.tile-text {
  color: var(--ink-soft);
}

.mock-subject {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
  padding: 18px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface) 70%, transparent);
  border: 1px solid var(--line);
}

.mock-chip {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface-2);
  font-family: var(--font-code);
  font-size: 0.75rem;
}

.mock-chip-accent {
  background: var(--accent-soft);
  color: var(--accent);
}

.mock-bar {
  display: block;
  flex-basis: 100%;
  height: 9px;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff8cc0, var(--accent)) left / var(--w) 100% no-repeat, var(--surface-2);
}

.mock-route {
  width: 100%;
  height: 96px;
  margin-top: 14px;
}

.mock-route path {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3;
  stroke-linecap: round;
}

.mock-route circle {
  fill: var(--surface);
  stroke: var(--accent);
  stroke-width: 3;
}

.mock-rank {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

.mock-rank span {
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(90deg, #8b7bff, #c084fc) left / var(--w) 100% no-repeat, var(--surface-2);
}

.lang-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.lang-cloud button {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface) 75%, transparent);
  font-size: 0.8rem;
  color: var(--ink);
  cursor: pointer;
}

.lang-cloud button:hover {
  border-color: var(--accent);
}

.lang-cloud button[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

@media (max-width: 860px) {
  .bento {
    grid-template-columns: 1fr;
  }

  .tile-subject,
  .tile-plan,
  .tile-you,
  .tile-lang,
  .tile-private {
    grid-column: auto;
    grid-row: auto;
  }
}
</style>

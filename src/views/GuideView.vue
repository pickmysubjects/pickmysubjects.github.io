<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import GradeScale from '@/components/guide/GradeScale.vue'
import { link } from '@/composables/useView'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const { wam } = useProfile()

const FACTS = [
  { value: '12.5', key: 'guide.factPoints' },
  { value: '50', key: 'guide.factLoad' },
  { value: '300', key: 'guide.factDegree' },
  { value: '80+', key: 'guide.factH1' },
] as const

const SECTIONS = ['first', 'points', 'load', 'grades', 'wam', 'rules', 'drop', 'abroad', 'rank'] as const

const ABROAD = [
  { key: 'guide.wes', href: 'https://www.wes.org/' },
  { key: 'guide.enic', href: 'https://www.enic.org.uk/' },
  { key: 'guide.cscse', href: 'https://zwfw.cscse.edu.cn/' },
  { key: 'guide.umCalc', href: 'https://study.unimelb.edu.au/how-to-apply/graduate-coursework-study/grade-conversion-eligibility-calculator' },
] as const

const RANKINGS = [
  { key: 'guide.qs', href: 'https://www.topuniversities.com/world-university-rankings' },
  { key: 'guide.the', href: 'https://www.timeshighereducation.com/world-university-rankings' },
  { key: 'guide.arwu', href: 'https://www.shanghairanking.com/rankings/arwu/2025' },
] as const

const STUDENT_SITE = 'https://students.unimelb.edu.au/'

// In-page jumps use scrollIntoView: a #fragment would go through the app's
// history handler, which scrolls back to the top.
function jump(id: string): void {
  document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <article class="guide">
    <header class="guide-head">
      <p class="guide-eyebrow">{{ t('guide.eyebrow') }}</p>
      <h1 class="guide-title">{{ t('guide.title') }}</h1>
      <p class="guide-lede">{{ t('guide.lede') }}</p>
    </header>

    <ul class="facts">
      <li v-for="f in FACTS" :key="f.key" class="fact surface">
        <span class="fact-value">{{ f.value }}</span>
        <span class="fact-label">{{ t(f.key) }}</span>
      </li>
    </ul>

    <nav class="jumps" :aria-label="t('guide.contents')">
      <button v-for="s in SECTIONS" :key="s" type="button" class="jump" @click="jump(s)">
        {{ t(`guide.${s}Title`) }}
      </button>
    </nav>

    <section id="guide-first" class="block surface">
      <h2>{{ t('guide.firstTitle') }}</h2>
      <p>{{ t('guide.firstText') }}</p>
      <ol class="steps">
        <li>{{ t('guide.firstStep1') }}</li>
        <li>{{ t('guide.firstStep2') }}</li>
        <li>{{ t('guide.firstStep3') }}</li>
        <li>{{ t('guide.firstStep4') }}</li>
      </ol>
      <p class="breadth">{{ t('guide.breadthText') }}</p>
      <p class="actions">
        <a class="button button-accent" :href="link('subjects?preset=firstSemester')">{{ t('guide.firstFind') }}</a>
        <a class="button button-quiet" :href="link('plan')">{{ t('guide.firstPlan') }}</a>
      </p>
    </section>

    <section id="guide-points" class="block surface">
      <h2>{{ t('guide.pointsTitle') }}</h2>
      <p>{{ t('guide.pointsText') }}</p>
    </section>

    <section id="guide-load" class="block surface">
      <h2>{{ t('guide.loadTitle') }}</h2>
      <p>{{ t('guide.loadText') }}</p>
      <ul class="checks">
        <li>{{ t('guide.overloadWam') }}</li>
        <li>{{ t('guide.overloadLast') }}</li>
        <li>{{ t('guide.overloadFails') }}</li>
      </ul>
      <p class="note">{{ t('guide.overloadFinal') }}</p>
      <div class="who">
        <div class="who-card">
          <h3>{{ t('guide.localTitle') }}</h3>
          <p>{{ t('guide.loadLocal') }}</p>
        </div>
        <div class="who-card">
          <h3>{{ t('guide.intlTitle') }}</h3>
          <p>{{ t('guide.loadIntl') }}</p>
        </div>
      </div>
    </section>

    <section id="guide-grades" class="block surface">
      <h2>{{ t('guide.gradesTitle') }}</h2>
      <p>{{ t('guide.gradesText') }}</p>
      <GradeScale />
    </section>

    <section id="guide-wam" class="block surface">
      <h2>{{ t('guide.wamTitle') }}</h2>
      <p>{{ t('guide.wamText') }}</p>
      <p class="formula">{{ t('guide.wamFormula') }}</p>
      <p>{{ t('guide.wamExample') }}</p>
      <ul class="plain">
        <li>{{ t('guide.wamIn') }}</li>
        <li>{{ t('guide.wamOut') }}</li>
      </ul>
      <p class="yours">
        <span>{{ wam !== null ? t('guide.wamYours', { wam }) : t('guide.wamNone') }}</span>
        <a class="button button-quiet" :href="link('record')">{{ t('guide.wamGo') }}</a>
      </p>
    </section>

    <section id="guide-rules" class="block surface">
      <h2>{{ t('guide.rulesTitle') }}</h2>
      <dl class="terms">
        <div>
          <dt>{{ t('guide.prereqTerm') }}</dt>
          <dd>{{ t('guide.prereqText') }}</dd>
        </div>
        <div>
          <dt>{{ t('guide.coreqTerm') }}</dt>
          <dd>{{ t('guide.coreqText') }}</dd>
        </div>
        <div>
          <dt>{{ t('guide.nonTerm') }}</dt>
          <dd>{{ t('guide.nonText') }}</dd>
        </div>
      </dl>
      <p class="note">{{ t('guide.waiverText') }}</p>
    </section>

    <section id="guide-drop" class="block surface">
      <h2>{{ t('guide.dropTitle') }}</h2>
      <ol class="timeline">
        <li class="tl-good">{{ t('guide.dropBefore') }}</li>
        <li class="tl-warn">{{ t('guide.dropWd') }}</li>
        <li class="tl-bad">{{ t('guide.dropFail') }}</li>
      </ol>
      <div class="who">
        <p class="who-card">{{ t('guide.dropLocal') }}</p>
        <p class="who-card">{{ t('guide.dropIntl') }}</p>
      </div>
      <p class="note">{{ t('guide.dropWhere') }}</p>
    </section>

    <section id="guide-abroad" class="block surface">
      <h2>{{ t('guide.abroadTitle') }}</h2>
      <p>{{ t('guide.abroadText') }}</p>
      <ul class="links">
        <li v-for="l in ABROAD" :key="l.key">
          <a :href="l.href" target="_blank" rel="noopener">
            {{ t(l.key) }}<ExternalLink :size="14" aria-hidden="true" />
          </a>
        </li>
      </ul>
    </section>

    <section id="guide-rank" class="block surface">
      <h2>{{ t('guide.rankTitle') }}</h2>
      <p>{{ t('guide.rankText') }}</p>
      <ul class="links">
        <li v-for="l in RANKINGS" :key="l.key">
          <a :href="l.href" target="_blank" rel="noopener">
            {{ t(l.key) }}<ExternalLink :size="14" aria-hidden="true" />
          </a>
        </li>
      </ul>
    </section>

    <p class="source">
      {{ t('guide.sourcesText') }}
      <a :href="STUDENT_SITE" target="_blank" rel="noopener">{{ t('guide.sourcesLink') }}</a>
    </p>
  </article>
</template>

<style scoped>
.guide {
  display: grid;
  gap: 18px;
  max-width: 780px;
  padding-top: 32px;
}

.guide-eyebrow {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}

.guide-title {
  margin-top: 4px;
}

.guide-lede {
  margin-top: 10px;
  font-size: 1.05rem;
  line-height: 1.65;
  color: var(--ink-soft);
}

.facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
}

.fact {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 14px 16px;
}

.fact-value {
  font-family: var(--font-code);
  font-size: 1.6rem;
  font-weight: 650;
  letter-spacing: -0.03em;
  color: var(--accent);
}

.fact-label {
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--ink-soft);
}

.jumps {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.jump {
  padding: 6px 12px;
  font: inherit;
  font-size: 0.85rem;
  color: var(--ink-soft);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
}

.jump:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.block {
  display: grid;
  gap: 10px;
  padding: 20px 22px;
  line-height: 1.65;
  scroll-margin-top: 84px;
}

.block h2 {
  font-size: 1.15rem;
  font-weight: 650;
}

.note {
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.steps {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 22px;
}

.breadth {
  padding: 12px 14px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.who {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.who-card {
  padding: 12px 14px;
  font-size: 0.92rem;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}

.who-card h3 {
  margin-bottom: 4px;
  font-size: 0.95rem;
  font-weight: 650;
}

.checks,
.plain {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 20px;
}

.formula {
  padding: 10px 14px;
  font-family: var(--font-code);
  font-size: 0.92rem;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}

.yours {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  background: var(--accent-soft);
  border-radius: var(--radius-sm);
}

.terms {
  display: grid;
  gap: 10px;
  margin: 0;
}

.terms dt {
  font-weight: 650;
}

.terms dd {
  margin: 2px 0 0;
  color: var(--ink-soft);
}

/* Dropping a subject, in time order: free, then WD, then a fail. */
.timeline {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.timeline li {
  position: relative;
  padding: 0 0 14px 22px;
}

.timeline li::before {
  content: '';
  position: absolute;
  top: 0.5em;
  left: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--dot);
}

.timeline li:not(:last-child)::after {
  content: '';
  position: absolute;
  top: calc(0.5em + 12px);
  bottom: 2px;
  left: 4px;
  width: 2px;
  background: var(--line);
}

.tl-good {
  --dot: var(--good);
}
.tl-warn {
  --dot: var(--warn);
}
.tl-bad {
  --dot: var(--bad);
}

.links {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.links a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
}

.source {
  font-size: 0.85rem;
  color: var(--ink-faint);
}

@media (max-width: 720px) {
  .facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .block {
    padding: 16px;
  }

  .who {
    grid-template-columns: 1fr;
  }
}
</style>

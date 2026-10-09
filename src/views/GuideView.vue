<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import GradeScale from '@/components/guide/GradeScale.vue'
import GuideItem from '@/components/guide/GuideItem.vue'
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
const KEY_DATES = 'https://students.unimelb.edu.au/course-admin/key-dates'
const FAILING = 'https://students.unimelb.edu.au/course-admin/planning-your-course-and-subjects/failing-a-subject'
</script>

<template>
  <article class="guide">
    <header>
      <p class="guide-eyebrow">{{ t('guide.eyebrow') }}</p>
      <h1 class="page-title">{{ t('guide.title') }}</h1>
      <p class="page-lede">{{ t('guide.lede') }}</p>
    </header>

    <div class="layout">
    <div class="main">
    <section class="group">
      <h2 class="group-title">{{ t('guide.groupPlan') }}</h2>
      <div class="list surface">
        <GuideItem :title="t('guide.firstTitle')" :short="t('guide.firstShort')" open>
          <ol class="steps">
            <li>{{ t('guide.firstStep1') }}</li>
            <li>{{ t('guide.firstStep2') }}</li>
            <li>{{ t('guide.firstStep3') }}</li>
            <li>{{ t('guide.firstStep4') }}</li>
          </ol>
          <p class="aside">{{ t('guide.breadthText') }}</p>
          <p class="actions">
            <a class="button button-accent" :href="link('subjects?preset=firstSemester')">{{ t('guide.firstFind') }}</a>
            <a class="button button-quiet" :href="link('majors')">{{ t('guide.firstMajors') }}</a>
            <a class="button button-quiet" :href="link('plan')">{{ t('guide.firstPlan') }}</a>
          </p>
        </GuideItem>

        <GuideItem :title="t('guide.pointsTitle')" :short="t('guide.pointsShort')">
          <p>{{ t('guide.pointsText') }}</p>
        </GuideItem>

        <GuideItem :title="t('guide.loadTitle')" :short="t('guide.loadShort')">
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
          <p>{{ t('guide.loadText') }}</p>
          <ul class="plain">
            <li>{{ t('guide.overloadWam') }}</li>
            <li>{{ t('guide.overloadLast') }}</li>
            <li>{{ t('guide.overloadFails') }}</li>
          </ul>
          <p class="note">{{ t('guide.overloadFinal') }}</p>
        </GuideItem>

        <GuideItem :title="t('guide.rulesTitle')" :short="t('guide.rulesShort')">
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
        </GuideItem>

        <GuideItem :title="t('guide.dropTitle')" :short="t('guide.dropShort')">
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
        </GuideItem>

        <GuideItem :title="t('guide.datesTitle')" :short="t('guide.datesShort')">
          <ul class="plain">
            <li>{{ t('guide.datesStart') }}</li>
            <li>{{ t('guide.datesS1') }}</li>
            <li>{{ t('guide.datesS2') }}</li>
            <li>{{ t('guide.datesOther') }}</li>
          </ul>
          <p>
            <a class="ext" :href="KEY_DATES" target="_blank" rel="noopener">{{ t('guide.datesLink') }}<ExternalLink :size="14" aria-hidden="true" /></a>
          </p>
        </GuideItem>
      </div>
    </section>

    <section class="group">
      <h2 class="group-title">{{ t('guide.groupMarks') }}</h2>
      <div class="list surface">
        <GuideItem :title="t('guide.gradesTitle')" :short="t('guide.gradesShort')">
          <GradeScale />
        </GuideItem>

        <GuideItem :title="t('guide.wamTitle')" :short="t('guide.wamShort')">
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
        </GuideItem>

        <GuideItem :title="t('guide.failTitle')" :short="t('guide.failShort')">
          <ul class="plain">
            <li>{{ t('guide.failPoints') }}</li>
            <li>{{ t('guide.failRepeat') }}</li>
            <li>{{ t('guide.failProgress') }}</li>
            <li>{{ t('guide.failSupp') }}</li>
            <li>{{ t('guide.failSpecial') }}</li>
            <li>{{ t('guide.failIntl') }}</li>
          </ul>
          <p>
            <a class="ext" :href="FAILING" target="_blank" rel="noopener">{{ t('guide.failLink') }}<ExternalLink :size="14" aria-hidden="true" /></a>
          </p>
        </GuideItem>

        <GuideItem :title="t('guide.abroadTitle')" :short="t('guide.abroadShort')">
          <p>{{ t('guide.abroadText') }}</p>
          <ul class="links">
            <li v-for="l in ABROAD" :key="l.key">
              <a :href="l.href" target="_blank" rel="noopener">{{ t(l.key) }}<ExternalLink :size="14" aria-hidden="true" /></a>
            </li>
          </ul>
        </GuideItem>

        <GuideItem :title="t('guide.rankTitle')" :short="t('guide.rankShort')">
          <p>{{ t('guide.rankText') }}</p>
          <ul class="links">
            <li v-for="l in RANKINGS" :key="l.key">
              <a :href="l.href" target="_blank" rel="noopener">{{ t(l.key) }}<ExternalLink :size="14" aria-hidden="true" /></a>
            </li>
          </ul>
        </GuideItem>
      </div>
    </section>

    <p class="source">
      {{ t('guide.sourcesText') }}
      <a :href="STUDENT_SITE" target="_blank" rel="noopener">{{ t('guide.sourcesLink') }}</a>
    </p>
    </div>

    <!-- The numbers people look up most, kept in view while reading. -->
    <aside class="side">
      <ul class="facts surface">
        <li v-for="f in FACTS" :key="f.key" class="fact">
          <span class="fact-value">{{ f.value }}</span>
          <span class="fact-label">{{ t(f.key) }}</span>
        </li>
      </ul>
    </aside>
    </div>
  </article>
</template>

<style scoped>
.guide {
  display: grid;
  gap: 28px;
  padding-top: 32px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 32px;
  align-items: start;
}

.main {
  display: grid;
  gap: 28px;
  min-width: 0;
}

.side {
  position: sticky;
  top: 88px;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }

  /* On narrow screens the numbers come first, as a strip. */
  .side {
    position: static;
    order: -1;
  }
}

.guide-eyebrow {
  margin-bottom: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}

/* Four numbers in one strip, split by hairlines. */
.facts {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.fact {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 18px 20px;
}

.fact + .fact {
  border-top: 1px solid var(--glass-edge);
}

/* Between phone and desktop: one strip of four above the guide. */
@media (max-width: 960px) {
  .facts {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .fact + .fact {
    border-top: 0;
    border-left: 1px solid var(--glass-edge);
  }
}

.fact-value {
  font-family: var(--font-code);
  font-size: 1.5rem;
  font-weight: 650;
  letter-spacing: -0.03em;
  color: var(--accent);
}

.fact-label {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--ink-soft);
}

.group {
  display: grid;
  gap: 10px;
}

.group-title {
  padding-left: 4px;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.list {
  overflow: hidden;
}

.note {
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.steps,
.plain {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 22px;
}

.aside,
.formula,
.who-card {
  padding: 12px 14px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}

.formula {
  font-family: var(--font-code);
  font-size: 0.9375rem;
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
  font-size: 0.9375rem;
}

.who-card h3 {
  margin-bottom: 4px;
  font-size: 0.9375rem;
  font-weight: 650;
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

.ext {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
}

.source {
  font-size: 0.875rem;
  color: var(--ink-faint);
}

@media (max-width: 720px) {
  .guide {
    gap: 22px;
  }

  .facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .fact {
    padding: 14px 16px;
  }

  .fact:nth-child(3) {
    border-left: 0;
  }

  .fact:nth-child(n + 3) {
    border-top: 1px solid var(--glass-edge);
  }

  .who {
    grid-template-columns: 1fr;
  }
}
</style>

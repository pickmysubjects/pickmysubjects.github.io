<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import { usePlans } from '@/composables/usePlans'
import { usePlanCompare } from '@/composables/usePlanCompare'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { ruleText, termLabel } from '@/i18n/format'
import { planName } from './planName'

/** Two plans side by side (stacked on a phone): read-only, each judged against its own degree. */
const emit = defineEmits<{ close: [] }>()
const plans = usePlans()
const { all } = useDataset()
const { t } = useI18n()

// The open plan and the next one, to start with.
const firstOther = () => plans.list.value.find((p) => p.id !== plans.active.value.id)?.id ?? ''
const idA = shallowRef(plans.active.value.id)
const idB = shallowRef(firstOther())
// A deleted plan can't stay picked.
watch(plans.list, (list) => {
  if (!list.some((p) => p.id === idA.value)) idA.value = list[0]?.id ?? ''
  if (!list.some((p) => p.id === idB.value) || idB.value === idA.value) idB.value = list.find((p) => p.id !== idA.value)?.id ?? ''
})

const a = computed(() => plans.list.value.find((p) => p.id === idA.value))
const b = computed(() => plans.list.value.find((p) => p.id === idB.value))
const { sides, diff } = usePlanCompare(a, b)

const names = computed(() => [a.value ? planName(t.value, a.value) : '', b.value ? planName(t.value, b.value) : ''] as const)
const cards = computed(() =>
  (sides.value ?? []).map((s) => ({
    ...s.summary,
    name: planName(t.value, s.summary.entry),
    open: s.summary.statuses.filter((x) => x.status !== 'ok').map((x) => ({ id: x.ruleId, text: ruleText(t.value, s.rules.find((r) => r.id === x.ruleId), x.description), status: x.status })),
  })),
)
const groups = computed(() =>
  diff.value
    ? [
        { key: 'a', title: t.value('plans.onlyIn', { name: names.value[0] }), codes: diff.value.onlyA },
        { key: 'b', title: t.value('plans.onlyIn', { name: names.value[1] }), codes: diff.value.onlyB },
      ]
    : [],
)
const title = (code: string) => all.subjects[code]?.title ?? ''
const pts = (n: number) => t.value('plans.points', { n: Math.round(n * 10) / 10 })

function open(id: string): void {
  plans.switchTo(id)
  emit('close')
}
</script>

<template>
  <section class="compare" :aria-label="t('plans.compareTitle')">
    <header class="head">
      <button class="button button-quiet" type="button" @click="emit('close')"><ArrowLeft :size="16" aria-hidden="true" /> {{ t('plans.back') }}</button>
      <h2 class="title">{{ t('plans.compareTitle') }}</h2>
    </header>

    <div class="pickers">
      <select v-model="idA" class="pick" :aria-label="t('plans.compareTitle') + ' 1'">
        <option v-for="p in plans.list.value" :key="p.id" :value="p.id" :disabled="p.id === idB">{{ planName(t, p) }}</option>
      </select>
      <span class="vs">{{ t('plans.vs') }}</span>
      <select v-model="idB" class="pick" :aria-label="t('plans.compareTitle') + ' 2'">
        <option v-for="p in plans.list.value" :key="p.id" :value="p.id" :disabled="p.id === idA">{{ planName(t, p) }}</option>
      </select>
    </div>

    <template v-if="diff">
      <div class="pair">
        <article v-for="(c, i) in cards" :key="c.entry.id" class="card surface">
          <p class="card-name"><span class="side">{{ i === 0 ? '1' : '2' }}</span>{{ c.name }}</p>
          <p class="card-degree">{{ c.courseTitle }}</p>
          <p class="card-major">{{ c.major || t('plans.noMajor') }}</p>
          <p v-if="c.minor" class="card-minor">{{ t(c.minorInformal ? 'plans.informalLine' : 'plans.minorLine', { title: c.minor }) }}</p>
          <p v-if="c.diploma" class="card-minor">{{ t('plans.diplomaLine', { title: c.diploma }) }}</p>
          <dl class="facts">
            <div>
              <dt>{{ t('plans.total') }}</dt>
              <dd>{{ pts(i === 0 ? diff.totalA : diff.totalB) }}</dd>
            </div>
            <div>
              <dt>{{ t('rules.title') }}</dt>
              <dd :class="c.open.length ? 'warn' : 'good'">
                {{ c.open.length ? t('plans.rulesMet', { met: c.met, total: c.statuses.length }) : t('rules.allMet') }}
              </dd>
            </div>
            <div>
              <dt>{{ t('plans.goal') }}</dt>
              <dd>{{ t(`suggest.goals.${c.entry.prefs.goal}`) }}</dd>
            </div>
            <div>
              <dt>{{ t('plans.interests') }}</dt>
              <dd class="soft">{{ c.entry.prefs.interests.length ? c.entry.prefs.interests.map((x) => t(`topic.${x}`)).join(', ') : t('plans.noInterests') }}</dd>
            </div>
          </dl>
          <ul v-if="c.open.length" class="rules">
            <li v-for="r in c.open" :key="r.id" :class="`rule-${r.status}`">{{ r.text }}</li>
          </ul>
          <button v-if="c.entry.id !== plans.active.value.id" class="button button-quiet card-open" type="button" @click="open(c.entry.id)">
            {{ t('plans.open') }}
          </button>
        </article>
      </div>

      <div class="pair">
        <section v-for="g in groups" :key="g.key" class="group surface">
          <h3 class="group-title">{{ g.title }} <span class="count">{{ g.codes.length }}</span></h3>
          <ul v-if="g.codes.length" class="codes">
            <li v-for="c in g.codes" :key="c"><span class="code">{{ c }}</span> {{ title(c) }}</li>
          </ul>
          <p v-else class="muted">{{ t('plans.none') }}</p>
        </section>
      </div>

      <details v-if="diff.both.length" class="group surface">
        <summary class="group-title">{{ t('plans.inBoth') }} <span class="count">{{ diff.both.length }}</span></summary>
        <ul class="codes">
          <li v-for="c in diff.both" :key="c"><span class="code">{{ c }}</span> {{ title(c) }}</li>
        </ul>
      </details>

      <section class="group surface">
        <h3 class="group-title">{{ t('plans.semesters') }}</h3>
        <div class="terms" role="table">
          <div class="term term-head" role="row">
            <span role="columnheader" />
            <span role="columnheader">1 · {{ names[0] }}</span>
            <span role="columnheader">2 · {{ names[1] }}</span>
          </div>
          <div v-for="r in diff.rows" :key="`${r.year}${r.period}`" class="term" role="row">
            <span class="term-label" role="rowheader">{{ termLabel(t, r) }}</span>
            <span v-for="(cell, i) in [r.a, r.b]" :key="i" role="cell" class="cell" :class="cell?.level ? `level-${cell.level}` : 'cell-empty'">
              <template v-if="cell">
                <strong>{{ pts(cell.points) }}</strong>
                <span class="level">{{ cell.level === 'ok' || !cell.level ? t('plans.levelOk') : t(`stress.${cell.level}`) }}</span>
              </template>
              <template v-else>{{ t('plans.notPlanned') }}</template>
            </span>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.compare {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.title {
  margin: 0;
  font-size: 1.25rem;
}

.pickers {
  display: grid;
  grid-template-columns: minmax(0, 20em) auto minmax(0, 20em);
  justify-content: start;
  align-items: center;
  gap: var(--space-2);
}

.pick {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  padding: 0 var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--paper);
  color: var(--ink);
  font: inherit;
}

.vs {
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: var(--space-4);
}

.card,
.group {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-5);
}

.card p {
  margin: 0;
}

.card-name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 700;
}

.side {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.75rem;
}

.card-degree {
  font-weight: 600;
}

.card-major,
.card-minor,
.muted {
  margin: 0;
  color: var(--ink-soft);
}

.facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3) var(--space-4);
  margin: var(--space-2) 0 0;
}

.facts dt {
  color: var(--ink-soft);
  font-size: 0.75rem;
}

.facts dd {
  margin: 0;
  font-weight: 600;
}

.facts .soft {
  font-weight: 500;
  font-size: 0.875rem;
}

.good {
  color: var(--good);
}

.warn {
  color: var(--warn);
}

.rules {
  display: grid;
  gap: var(--space-1);
  margin: var(--space-1) 0 0;
  padding-left: 18px;
  color: var(--ink-soft);
  font-size: 0.8125rem;
}

.rule-fail {
  color: var(--bad);
}

.card-open {
  justify-self: start;
  margin-top: var(--space-3);
}

.group-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  cursor: default;
}

summary.group-title {
  cursor: pointer;
}

.count {
  margin-left: var(--space-1);
  color: var(--ink-soft);
  font-weight: 500;
}

.codes {
  display: grid;
  gap: var(--space-1);
  margin: var(--space-1) 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
}

.code {
  font-family: var(--font-code);
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.terms {
  display: grid;
  gap: var(--space-1);
}

.term {
  display: grid;
  grid-template-columns: minmax(5.5em, 0.8fr) 1fr 1fr;
  gap: var(--space-2);
  align-items: center;
  min-width: 0;
}

.term-head {
  color: var(--ink-soft);
  font-size: 0.75rem;
}

.term-head span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.term-label {
  font-size: 0.875rem;
}

.cell {
  display: flex;
  flex-wrap: wrap;
  gap: 2px var(--space-2);
  align-items: baseline;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--good-soft);
  font-size: 0.875rem;
}

.level {
  color: var(--ink-soft);
  font-size: 0.8125rem;
}

.level-heavy {
  background: var(--warn-soft);
}

.level-heavy .level {
  color: var(--warn);
}

.level-veryHeavy {
  background: var(--bad-soft);
}

.level-veryHeavy .level {
  color: var(--bad);
}

.cell-empty {
  background: transparent;
  color: var(--ink-faint);
}
</style>

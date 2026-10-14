<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from 'lucide-vue-next'
import type { CourseRule, Note, Period } from '@/engine'
import { useI18n } from '@/i18n'
import { noteText, ruleText, termLabel } from '@/i18n/format'

// What the generator did, grouped by why: prerequisites it pulled in, subjects added for each
// degree rule, then anything else (swaps, short terms). Codes open the subject peek.
const props = defineProps<{
  notes: (Note | string)[]
  rules: CourseRule[]
  unplaced: { code: string; reason: string; reasonKey?: string }[]
}>()
const emit = defineEmits<{ open: [code: string] }>()
const { t } = useI18n()

const structured = computed(() => props.notes.filter((n): n is Note => typeof n !== 'string'))

const prereqs = computed(() =>
  structured.value.filter((n) => n.key === 'prereqAdded').map((n) => ({ code: String(n.params.code), for: String(n.params.for) })),
)

const byRule = computed(() => {
  const groups = new Map<string, { title: string; items: { code: string; term: string }[] }>()
  for (const n of structured.value) {
    if (n.key !== 'added') continue
    const id = String(n.params.rule)
    const g = groups.get(id) ?? { title: ruleText(t.value, props.rules.find((r) => r.id === id), id), items: [] }
    g.items.push({ code: String(n.params.code), term: termLabel(t.value, { year: Number(n.params.year), period: n.params.period as Period }) })
    groups.set(id, g)
  }
  return [...groups.values()]
})

const others = computed(() =>
  props.notes
    .filter((n) => typeof n === 'string' || (n.key !== 'prereqAdded' && n.key !== 'added'))
    .map((n) => noteText(t.value, n, props.rules)),
)
</script>

<template>
  <div class="how">
    <h2 class="how-title">{{ t('plan.howBuilt') }}</h2>

    <ul v-if="unplaced.length" class="how-bad">
      <li v-for="u in unplaced" :key="u.code">
        {{ t('plan.unplaced', { code: u.code, reason: u.reasonKey ? t(`unplacedReason.${u.reasonKey}`) : u.reason }) }}
      </li>
    </ul>

    <section v-if="prereqs.length" class="how-group">
      <h3 class="how-sub">{{ t('plan.howPrereq') }} <span class="how-n">{{ prereqs.length }}</span></h3>
      <ul class="pairs">
        <li v-for="p in prereqs" :key="`${p.code}-${p.for}`" class="pair">
          <button type="button" class="code-btn" @click="emit('open', p.code)">{{ p.code }}</button>
          <ArrowRight :size="14" aria-hidden="true" class="pair-arrow" />
          <span class="pair-for">{{ t('plan.howFor') }}</span>
          <button type="button" class="code-btn code-quiet" @click="emit('open', p.for)">{{ p.for }}</button>
        </li>
      </ul>
    </section>

    <section v-if="byRule.length" class="how-group">
      <h3 class="how-sub">{{ t('plan.howRules') }}</h3>
      <div class="rules">
        <div v-for="g in byRule" :key="g.title" class="rule">
          <p class="rule-title">{{ g.title }}</p>
          <div class="rule-codes">
            <button v-for="i in g.items" :key="i.code" type="button" class="code-btn" @click="emit('open', i.code)">
              {{ i.code }} <span class="code-term">{{ i.term }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="others.length" class="how-group">
      <h3 class="how-sub">{{ t('plan.howOther') }}</h3>
      <ul class="others">
        <li v-for="(o, i) in others" :key="i">{{ o }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.how {
  display: grid;
  gap: 18px;
  grid-column: 1 / -1;
}

.how-title {
  font-size: 1rem;
  font-weight: 700;
}

.how-group {
  display: grid;
  gap: 10px;
}

.how-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 650;
  color: var(--ink-soft);
}

.how-n {
  padding: 0 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  font-size: 0.75rem;
  color: var(--accent);
}

.pairs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pair {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--glass-edge);
  border-radius: 12px;
  background: var(--glass-fill);
}

.pair-arrow {
  color: var(--ink-faint);
}

.pair-for {
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.rules {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  align-items: start;
  gap: 10px;
}

.rule {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--glass-edge);
  border-radius: 14px;
  background: var(--glass-fill);
}

.rule-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.rule-codes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 6px;
}

.code-btn {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 4px 10px;
  border: 0;
  border-radius: 10px;
  background: var(--accent-soft);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 650;
  color: var(--accent);
  cursor: pointer;
}

.code-quiet {
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  color: var(--ink);
}

.code-term {
  white-space: nowrap;
  font-weight: 500;
  color: var(--ink-soft);
}

.others,
.how-bad {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.how-bad {
  color: var(--bad);
}

/* Narrow cards: tighter chips so two fit per line. */
@media (max-width: 520px) {
  .rule {
    padding: 10px;
  }

  /* Two equal columns, so long term labels (Hindi, Vietnamese) still fit two codes per line. */
  .rule-codes {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .code-btn {
    flex-wrap: wrap;
    gap: 0 4px;
    min-width: 0;
    padding: 4px 8px;
    font-size: 0.75rem;
  }
}

@media (pointer: coarse) {
  .code-btn {
    min-height: 40px;
  }
}
</style>

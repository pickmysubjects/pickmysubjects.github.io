<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { computed, onMounted, shallowRef, useTemplateRef } from 'vue'
import { CircleCheck, Search, TriangleAlert, X } from 'lucide-vue-next'
import { categoryOf, doneBefore, heldMajorIds, previewAdd, recommend, type Plan, type Subject } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { issueText, reasonText, termLabel } from '@/i18n/format'
import { runsIn } from '@/utils/planBoard'

/**
 * Add a subject to a term, or swap one for another, in one sheet. Lists only subjects that run
 * that term and count in the degree; each says whether it fits (prerequisites, clashes, load).
 * Swapping starts from subjects of the same kind and level, best for the student first.
 */
const props = defineProps<{
  termIndex: number
  /** The subject being swapped out; none when adding. */
  replacing?: string
  role?: 'required' | 'option'
  /** Subjects on the major's or specialisation's lists (a major option swaps for another of these). */
  optionSet: ReadonlySet<string>
}>()
const emit = defineEmits<{ pick: [code: string]; close: [] }>()

const { t } = useI18n()
const { data, subjectList } = useDataset()
const plan = usePlan()
const { profile } = useProfile()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const input = useTemplateRef<HTMLInputElement>('input')
const text = shallowRef('')

onMounted(() => {
  dialog.value?.showModal()
  input.value?.focus()
})

const term = computed(() => plan.terms.value[props.termIndex])
const where = computed(() => (term.value ? termLabel(t.value, term.value) : ''))
const course = computed(() => plan.setup.value.course)
const load = computed(() => plan.course.value?.standardLoad ?? 50)
const current = computed<Subject | undefined>(() => (props.replacing ? data.value.subjects[props.replacing] : undefined))

// The plan as if the swapped-out subject were already gone.
const base = computed<Plan>(() => {
  const p = plan.plan.value
  if (!props.replacing) return p
  return { ...p, terms: p.terms.map((x, i) => (i === props.termIndex ? { ...x, subjects: x.subjects.filter((c) => c !== props.replacing) } : x)) }
})
const taken = computed(() => new Set([...base.value.terms.flatMap((x) => x.subjects), ...base.value.completed]))

/** Could go in this term at all: runs then, counts in the degree, not planned or done already. */
function eligible(s: Subject): boolean {
  const at = term.value
  if (!at || taken.value.has(s.code) || s.code === props.replacing) return false
  if (categoryOf(s, course.value) === undefined) return false
  if (s.discontinuedFrom !== undefined && at.year >= s.discontinuedFrom) return false
  return runsIn(s, at.year, at.period)
}

/** The first thing stopping it here, or null when it fits. */
function problem(code: string): string | null {
  const issues = previewAdd(base.value, data.value, props.termIndex, code, load.value)
  const worst = issues.find((i) => i.severity === 'error') ?? issues[0]
  return worst ? issueText(t.value, worst, [], [], data.value.subjects, course.value) : null
}

interface Row {
  code: string
  title: string
  why: string | null
  problem: string | null
}

// Suggestions: the recommender's own ranking for this term, already filtered to what fits.
const suggested = computed<Row[]>(() => {
  const at = term.value
  if (!at) return []
  const recs = recommend(data.value, profile.value, {
    course: course.value,
    term: { year: at.year, period: at.period },
    planned: [...taken.value].filter((c) => !base.value.completed.includes(c)),
    eligibleWith: [...doneBefore(base.value.completed, base.value.terms, props.termIndex, data.value)],
    termSubjects: base.value.terms[props.termIndex]?.subjects ?? [],
    programme: { courseYear: plan.setup.value.courseYear, components: heldMajorIds(base.value).filter((id): id is string => !!id), minors: plan.setup.value.minors ?? [] },
    ...(current.value ? { category: categoryOf(current.value, course.value), level: current.value.level } : {}),
  })
  const out: Row[] = []
  for (const r of recs) {
    if (out.length >= 8) break
    const s = data.value.subjects[r.code]
    if (!s || r.eligibility === 'fail' || !eligible(s)) continue
    if (props.role === 'option' && !props.optionSet.has(r.code)) continue
    if (problem(r.code)) continue
    out.push({ code: r.code, title: s.title, why: r.reasons[0] ? reasonText(t.value, r.reasons[0]) : null, problem: null })
  }
  return out
})

// Search: by code or title, still only subjects that could run in this term.
const found = computed<Row[]>(() => {
  const q = text.value.trim().toLowerCase()
  if (!q) return []
  return subjectList.value
    .filter((s) => s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
    .map((s) => data.value.subjects[s.code])
    .filter((s): s is Subject => !!s && eligible(s))
    .slice(0, 30)
    .map((s) => ({ code: s.code, title: s.title, why: null, problem: problem(s.code) }))
})
const rows = computed(() => (text.value.trim() ? found.value : suggested.value))

function pick(code: string): void {
  emit('pick', code)
  dialog.value?.close()
}
function onClick(event: MouseEvent): void {
  if (event.target === dialog.value) dialog.value?.close()
}
</script>

<template>
  <dialog ref="dialog" class="slot" :aria-label="replacing ? t('plan.swapTitle', { code: replacing }) : t('plan.addTitle', { term: where })" @close="emit('close')" @click="onClick">
    <div class="slot-body">
      <header class="slot-head">
        <div>
          <h2 class="slot-title">{{ replacing ? t('plan.swapTitle', { code: replacing }) : t('plan.addTitle', { term: where }) }}</h2>
          <p class="slot-hint"><template v-if="replacing">{{ t('plan.swapHintShort', { term: where }) }}<InfoTip :text="t('plan.swapHint', { term: where })" /></template><template v-else>{{ t('plan.addHint', { term: where }) }}</template></p>
        </div>
        <button class="slot-close" type="button" :aria-label="t('subject.close')" @click="dialog?.close()">
          <X :size="18" aria-hidden="true" />
        </button>
      </header>

      <p v-if="replacing && role === 'required'" class="slot-warn">
        <TriangleAlert :size="15" aria-hidden="true" /> {{ t('plan.swapRequired', { code: replacing }) }}
      </p>

      <label class="slot-search">
        <Search :size="16" aria-hidden="true" />
        <span class="visually-hidden">{{ t('plan.addSearch') }}</span>
        <input ref="input" v-model="text" class="slot-input" type="search" :placeholder="t('plan.addSearch')" />
      </label>

      <p v-if="!text.trim() && rows.length" class="slot-label">{{ t('plan.addSuggested') }}</p>
      <ul v-if="rows.length" class="slot-list">
        <li v-for="r in rows" :key="r.code">
          <button class="slot-row" type="button" @click="pick(r.code)">
            <span class="slot-row-top">
              <span class="code">{{ r.code }}</span>
              <span class="slot-row-title">{{ r.title }}</span>
            </span>
            <span v-if="r.problem" class="slot-fit slot-fit-bad"><TriangleAlert :size="13" aria-hidden="true" /> {{ r.problem }}</span>
            <span v-else class="slot-fit"><CircleCheck :size="13" aria-hidden="true" /> {{ r.why ?? t('plan.fitsHere') }}</span>
          </button>
        </li>
      </ul>
      <p v-else class="slot-empty">{{ text.trim() ? t('plan.addNoMatch', { term: where }) : t('plan.swapNone', { term: where }) }}</p>
    </div>
  </dialog>
</template>

<style scoped>
.slot {
  width: min(560px, calc(100vw - 24px));
  max-height: min(86vh, 720px);
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--glass-shine), var(--sheet-fill);
  color: var(--ink);
  box-shadow: var(--shadow-2);
}

.slot::backdrop {
  background: rgb(16 16 20 / 40%);
}

.slot-body {
  display: grid;
  gap: 12px;
  padding: 20px;
}

.slot-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.slot-title {
  font-size: 1.125rem;
  font-weight: 700;
}

.slot-hint {
  margin-top: 4px;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.slot-close {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--glass-shine), var(--sheet-fill);
  color: var(--ink-soft);
  cursor: pointer;
}

.slot-warn {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 0.875rem;
}

.slot-warn svg {
  flex: none;
  margin-top: 2px;
}

.slot-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--inset-fill);
  color: var(--ink-soft);
}

.slot-search:focus-within {
  border-color: var(--accent);
}

.slot-input {
  flex: 1;
  min-width: 0;
  min-height: 42px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink);
  font: inherit;
}

.slot-label {
  font-size: 0.75rem;
  font-weight: 650;
  color: var(--ink-soft);
}

.slot-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.slot-row {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--glass-shine), var(--sheet-fill);
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.slot-row:hover,
.slot-row:focus-visible {
  border-color: var(--accent);
}

.slot-row-top {
  display: flex;
  gap: 8px;
  align-items: baseline;
  min-width: 0;
}

.slot-row-top .code {
  flex: none;
  font-weight: 650;
  color: var(--accent);
}

.slot-row-title {
  min-width: 0;
  font-size: 0.9375rem;
}

.slot-fit {
  display: flex;
  gap: 5px;
  align-items: flex-start;
  font-size: 0.8125rem;
  color: var(--good);
}

.slot-fit svg {
  flex: none;
  margin-top: 2px;
}

.slot-fit-bad {
  color: var(--ink-soft);
}

.slot-fit-bad svg {
  color: var(--bad);
}

.slot-empty {
  padding: 16px;
  border: 1.5px dashed var(--line);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  color: var(--ink-soft);
  text-align: center;
}
</style>

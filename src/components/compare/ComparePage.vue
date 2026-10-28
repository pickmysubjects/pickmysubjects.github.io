<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, shallowRef, watch } from 'vue'
import { Copy, FilePlus, Plus } from 'lucide-vue-next'
import DetailHero from '@/components/browse/DetailHero.vue'
import { careerName as nameOf, careerTarget, compareQuery, readCompareAddress, summaryLines, type TermRef } from '@/engine'
import { useComparePlans, type ComparedPlan } from '@/composables/usePlanCompare'
import { usePlans } from '@/composables/usePlans'
import { useDataset } from '@/composables/useDataset'
import { go, link, replaceAddress, useView } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { MAX_PLANS } from '@/utils/planBook'
import { trackEvent } from '@/utils/analytics'
import { planName } from '@/components/plans/planName'
import CompareSummary from './CompareSummary.vue'
import CompareTable from './CompareTable.vue'
import CompareTimeline from './CompareTimeline.vue'
import { compareGroups, groupOf, type GroupId } from './compareRows'

/**
 * /plan/compare/: the student's plans side by side. Which plans, in which order, and whether
 * only the differences show all live in the address (?plans=A,B&diff=0), so a refresh or a
 * shared link opens the same view.
 */
const { t, locale } = useI18n()
const { query } = useView()
const plans = usePlans()
const { all } = useDataset()
const art = () => import('@/components/planner/art/ArtCompare.vue')

const letters = computed(() => plans.list.value.map((p) => p.label))
// The address's plans; with fewer than two named, the open plan and the next ones (up to five).
const state = computed(() => {
  const asked = readCompareAddress(query.value, letters.value)
  if (asked.plans.length >= 2) return asked
  const open = plans.active.value.label
  const rest = letters.value.filter((l) => l !== open && !asked.plans.includes(l))
  return { ...asked, plans: [...new Set([...asked.plans, open, ...rest])].slice(0, MAX_PLANS) }
})
// The address keeps its #fragment (a link straight to a row) whatever changes.
function write(next: { plans: string[]; diff: boolean }): void {
  const q = compareQuery(next)
  replaceAddress(`plan/compare/${q ? `?${q}` : ''}${location.hash}`)
}
// Opened without plans named: the columns picked from the open plan go into the address, so
// Edit and then Back (the open plan has changed by then) brings back the same columns.
onMounted(() => {
  if (readCompareAddress(query.value, letters.value).plans.length < 2 && state.value.plans.length >= 2) write(state.value)
})

const shown = computed(() => state.value.plans.map((l) => plans.list.value.find((p) => p.label === l)!).filter(Boolean))

// A phone, or a window too narrow for every column: two plans, picked in the header.
const narrow = shallowRef(false)
function measure(): void {
  narrow.value = window.innerWidth < 720 || window.innerWidth < 300 + shown.value.length * 170
}
onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => window.removeEventListener('resize', measure))
watch(() => shown.value.length, measure)

// The plans on screen: every one picked, or the first two on a narrow screen.
const onScreen = computed(() => (narrow.value ? shown.value.slice(0, 2) : shown.value))
const { plans: compared, timeline } = useComparePlans(onScreen, locale)
const names = computed(() => onScreen.value.map((p) => planName(t.value, p)))

const termParam = (term?: TermRef | null) => (term ? `&term=${term.year}-${term.period}` : '')
const editLink = (p: ComparedPlan, term?: TermRef | null) => link(`plan/?plan=${p.entry.label}${termParam(term)}`)
const careerName = (id: string) => {
  const c = careerTarget(all, id)
  return c ? nameOf(c.names, locale.value) || c.names.en : id
}
const groups = computed(() => compareGroups(compared.value, { t: t.value, editLink, careerName }))
const lines = computed(() =>
  summaryLines(
    compared.value.map((p) => p.facts),
    {
      majors: compared.value.map((p) => `${p.major}|${p.minor}`),
      careers: compared.value.map((p) => p.careers),
      subjects: timeline.value,
    },
  ),
)
const edits = computed(() => compared.value.map((p) => editLink(p)))

const open = reactive<Record<GroupId, boolean>>({ progress: true, load: true, outcomes: true, profile: true })
const allOpen = computed(() => Object.values(open).every(Boolean))
function setAll(value: boolean): void {
  for (const k of Object.keys(open) as GroupId[]) open[k] = value
}
function reveal(rowId: string): void {
  const g = groupOf(groups.value, rowId)
  if (g) open[g] = true
}

// Column changes, each kept in the address.
function replace(index: number, label: string): void {
  const next = [...state.value.plans]
  const at = next.indexOf(label)
  if (at >= 0) [next[index], next[at]] = [next[at]!, next[index]!]
  else next[index] = label
  write({ ...state.value, plans: next })
}
function move(index: number, by: -1 | 1): void {
  const next = [...state.value.plans]
  const to = index + by
  if (to < 0 || to >= next.length) return
  ;[next[index], next[to]] = [next[to]!, next[index]!]
  write({ ...state.value, plans: next })
}
function remove(index: number): void {
  if (state.value.plans.length <= 2) return
  write({ ...state.value, plans: state.value.plans.filter((_, i) => i !== index) })
}
function swap(): void {
  const next = [...state.value.plans]
  ;[next[0], next[1]] = [next[1]!, next[0]!]
  write({ ...state.value, plans: next })
}
const hidden = computed(() => plans.list.value.filter((p) => !state.value.plans.includes(p.label)))
function add(label: string): void {
  write({ ...state.value, plans: [...state.value.plans, label] })
}
function setDiff(diff: boolean): void {
  write({ ...state.value, diff })
}

// Fewer than two plans: make the second from the first.
function copy(): void {
  const from = plans.active.value.label
  plans.create('copy')
  write({ plans: [from, plans.active.value.label], diff: true })
}
function fresh(): void {
  plans.create('fresh')
  go('plan')
}
onMounted(() => trackEvent('compare-open'))
</script>

<template>
  <div class="cmp">
    <DetailHero :back="{ href: link('plan/'), label: t('cmp.back') }" :title="t('cmp.title')" :art="art">
      <p class="lede">{{ t('cmp.lede') }}</p>
    </DetailHero>

    <section v-if="shown.length < 2" class="empty surface" aria-labelledby="cmp-empty-title">
      <h2 id="cmp-empty-title" class="empty-title">{{ t('cmp.emptyTitle') }}</h2>
      <p class="empty-text">{{ t('cmp.emptyText') }}</p>
      <div class="empty-actions">
        <button class="button button-accent" type="button" @click="copy"><Copy :size="16" aria-hidden="true" />{{ t('cmp.copy', { name: planName(t, plans.active.value) }) }}</button>
        <button class="button button-quiet" type="button" @click="fresh"><FilePlus :size="16" aria-hidden="true" />{{ t('cmp.fresh') }}</button>
      </div>
    </section>

    <template v-else>
      <div class="bar surface">
        <button class="diff-switch" type="button" role="switch" :aria-checked="state.diff" @click="setDiff(!state.diff)">
          <span class="switch-track" aria-hidden="true"><span class="switch-knob" /></span>
          {{ t('cmp.onlyDiff') }}
        </button>
        <button class="button button-quiet bar-btn" type="button" @click="setAll(!allOpen)">{{ allOpen ? t('cmp.closeAll') : t('cmp.openAll') }}</button>
        <div v-if="hidden.length && !narrow && shown.length < MAX_PLANS" class="add">
          <span class="add-label"><Plus :size="15" aria-hidden="true" />{{ t('cmp.addPlan') }}</span>
          <button v-for="h in hidden" :key="h.id" class="button button-quiet bar-btn" type="button" @click="add(h.label)">{{ planName(t, h) }}</button>
        </div>
      </div>

      <CompareSummary :lines="lines" :plans="compared" :names="names" :groups="groups" @reveal="reveal" />

      <CompareTable
        :plans="compared"
        :groups="groups"
        :diff="state.diff"
        :open="open"
        :phone="narrow"
        :every="plans.list.value"
        :edits="edits"
        @toggle="(id) => (open[id] = !open[id])"
        @replace="replace"
        @move="move"
        @remove="remove"
        @swap="swap"
      />

      <CompareTimeline :timeline="timeline" :names="names" :diff="state.diff" :subjects="all.subjects" :phone="narrow" />
    </template>
  </div>
</template>

<style scoped>
.cmp {
  --card-fill: var(--peek-fill);

  display: grid;
  gap: 20px;
  min-width: 0;
  padding-top: 20px;
}

.lede {
  max-width: 62ch;
  margin: 0;
  font-size: 1rem;
  color: var(--ink-soft);
}

.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 10px 14px;
  border-radius: 999px;
}

.diff-switch {
  display: inline-flex;
  flex: none;
  white-space: nowrap;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 12px 0 4px;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  font-weight: var(--fw-semibold);
  cursor: pointer;
}

.switch-track {
  position: relative;
  display: inline-block;
  flex: none;
  width: 40px;
  height: 24px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 22%, transparent);
  transition: background 0.2s;
}

.switch-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 25%);
  transition: transform 0.2s var(--ease-spring);
}

.diff-switch[aria-checked='true'] .switch-track {
  background: var(--accent-fill);
}

.diff-switch[aria-checked='true'] .switch-knob {
  transform: translateX(16px);
}

.diff-switch:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 999px;
}

@media (prefers-reduced-motion: reduce) {
  .switch-track,
  .switch-knob {
    transition: none;
  }
}

.bar-btn {
  min-height: 36px;
}

.add {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.add-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
}

.empty {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding: 28px 32px;
}

.empty-title {
  font-size: var(--fs-section);
  font-weight: var(--fw-bold);
}

.empty-text {
  max-width: 60ch;
  margin: 0;
  color: var(--ink-soft);
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

@media (max-width: 640px) {
  .cmp {
    gap: 14px;
    padding-top: 12px;
  }

  .bar {
    border-radius: 18px;
  }

  .bar-btn {
    min-height: 44px;
  }

  .diff-switch {
    min-height: 44px;
  }

  .empty {
    padding: 20px 16px;
    border-radius: 18px;
  }

  .empty-actions .button {
    min-height: 44px;
  }
}
</style>

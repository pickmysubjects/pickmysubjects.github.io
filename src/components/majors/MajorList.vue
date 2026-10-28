<script setup lang="ts">
import { thisYear } from '@/engine/dataYear'
import BrowseHero from '@/components/browse/BrowseHero.vue'
import { computed, shallowRef, watch } from 'vue'
import { BadgeCheck, ChevronRight, Search, SearchX } from 'lucide-vue-next'
import { componentCareers, type Component as Major } from '@/engine'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'
import { groupMajors, majorGroupOf } from '@/utils/majorGroups'

/**
 * Every major, minor and specialisation, found fast: the search (across every degree), the
 * degree (the student's own first), the kind, and for majors the field. Each card says what it
 * asks for in numbers and names a few of its compulsory subjects.
 */
const { data } = useDataset()
const plan = usePlan()
const { t } = useI18n()
const query = shallowRef('')

const KINDS = ['major', 'minor', 'specialisation', 'informal'] as const
type Kind = (typeof KINDS)[number]
const kindOf = (c: Major): Kind => (c.informal ? 'informal' : c.kind === 'minor' ? 'minor' : c.kind === 'specialisation' ? 'specialisation' : 'major')

// Closed to new students: not listed (their pages still open from an existing plan).
const open = computed(() => data.value.components.filter((c) => c.closedFrom === undefined || thisYear() < c.closedFrom))
// The degrees that have majors; a degree based on another (B-SCIEXTD) shows that one's.
const baseOf = (code: string) => data.value.courses.find((c) => c.code === code)?.basedOn ?? code
const courseTitle = (code: string) => data.value.courses.find((c) => c.code === code)?.title ?? code
const degrees = computed(() => [...new Set(open.value.map((c) => c.course))].map((code) => ({ code, title: courseTitle(code) })))
const degree = shallowRef(baseOf(plan.setup.value.course || 'B-SCI'))
watch(
  degrees,
  (ds) => {
    if (!ds.some((d) => d.code === degree.value)) degree.value = ds[0]?.code ?? ''
  },
  { immediate: true },
)

const inDegree = computed(() => open.value.filter((c) => c.course === degree.value))
const kinds = computed(() => KINDS.map((k) => ({ k, n: inDegree.value.filter((c) => kindOf(c) === k).length })).filter((x) => x.n > 0))
const kind = shallowRef<Kind>('major')
watch(
  kinds,
  (ks) => {
    if (!ks.some((x) => x.k === kind.value)) kind.value = ks[0]?.k ?? 'major'
  },
  { immediate: true },
)
const field = shallowRef('')
watch([degree, kind], () => (field.value = ''))

// A search looks across every degree and kind (by name or field); otherwise the chosen degree,
// kind and field.
const q = computed(() => query.value.trim().toLowerCase())
const matches = (c: Major) => c.title.toLowerCase().includes(q.value) || t.value(`majorGroup.${majorGroupOf(c.id)}`).toLowerCase().includes(q.value)
const pool = computed(() => (q.value ? open.value.filter(matches) : inDegree.value.filter((c) => kindOf(c) === kind.value)))
const byField = computed(() => !q.value && kind.value === 'major')
const fields = computed(() => (byField.value ? groupMajors(pool.value) : []))
const shown = computed(() => {
  const groups = byField.value ? fields.value : [{ id: '', majors: [...pool.value].sort((a, b) => a.title.localeCompare(b.title)) }]
  return groups.filter((g) => !field.value || g.id === field.value)
})
const count = computed(() => shown.value.reduce((n, g) => n + g.majors.length, 0))

// What each card says: how many compulsory subjects, what to pick, which levels, a few names.
const levelOf = (code: string) => data.value.subjects[code]?.level ?? (Number(code.match(/\d/)?.[0]) || 0)
interface Facts {
  core: number
  picks: { n: number; of: number }[]
  levels: string
  key: string[]
}
const factsOf = computed(() => {
  const out = new Map<string, Facts>()
  for (const c of pool.value) {
    const req = c.requirements === 'unknown' ? [] : c.requirements
    const core = [...new Set(req.flatMap((r) => ('all' in r ? r.all : [])))]
    const picks = req.flatMap((r) => ('choose' in r ? [{ n: r.choose.points / 12.5, of: r.choose.from.length }] : []))
    const lv = [...new Set([...core, ...req.flatMap((r) => ('choose' in r ? r.choose.from : []))].map(levelOf).filter((x) => x > 0))].sort()
    const levels = !lv.length ? '' : lv.length === 1 ? `${lv[0]}` : `${lv[0]}–${lv[lv.length - 1]}`
    out.set(c.id, { core: core.length, picks, levels, key: core.slice(0, 3) })
  }
  return out
})
const accredited = computed(() => new Set(data.value.components.filter((c) => componentCareers(data.value.careers, c.id)?.accreditation).map((c) => c.id)))
</script>

<template>
  <div class="list">
    <BrowseHero :title="t('majors.title')">
      <label class="search">
        <Search :size="18" aria-hidden="true" class="search-icon" />
        <input v-model="query" class="search-input" type="search" :placeholder="t('majors.search')" :aria-label="t('majors.search')" />
      </label>
    </BrowseHero>

    <!-- Which degree, which kind, which field: one glass bar (a search looks everywhere). -->
    <div v-if="!q" class="pick surface">
      <div class="pick-row" role="group" :aria-label="t('majors.degree')">
        <span class="pick-label">{{ t('majors.degree') }}</span>
        <button v-for="d in degrees" :key="d.code" type="button" class="opt" :aria-pressed="degree === d.code" @click="degree = d.code">
          {{ d.title.replace(/^Bachelor of /, '') }}
        </button>
      </div>
      <div class="pick-row" role="group" :aria-label="t('majors.kind')">
        <span class="pick-label">{{ t('majors.kind') }}</span>
        <button v-for="x in kinds" :key="x.k" type="button" class="opt" :aria-pressed="kind === x.k" @click="kind = x.k">
          {{ t(`majors.kinds.${x.k}`) }} <span class="opt-n">{{ x.n }}</span>
        </button>
      </div>
      <div v-if="fields.length > 1" class="pick-row" role="group" :aria-label="t('majors.field')">
        <span class="pick-label">{{ t('majors.field') }}</span>
        <button type="button" class="opt" :aria-pressed="field === ''" @click="field = ''">{{ t('browse.any') }}</button>
        <button v-for="g in fields" :key="g.id" type="button" class="opt" :aria-pressed="field === g.id" @click="field = g.id">
          {{ t(`majorGroup.${g.id}`) }} <span class="opt-n">{{ g.majors.length }}</span>
        </button>
      </div>
    </div>
    <p v-else class="found surface" role="status">{{ t('majors.found', { n: count }) }}</p>

    <div v-if="!count" class="empty surface">
      <SearchX :size="28" aria-hidden="true" class="empty-icon" />
      <p>{{ t('wizard.noMajorMatch') }}</p>
      <button type="button" class="button button-quiet" @click="query = ''">{{ t('browse.clearSearch') }}</button>
    </div>

    <section v-for="g in shown" :key="g.id || 'all'" class="group" :aria-label="g.id ? t(`majorGroup.${g.id}`) : undefined">
      <h2 v-if="g.id && !field" class="group-title">{{ t(`majorGroup.${g.id}`) }} <span class="group-count">{{ g.majors.length }}</span></h2>
      <ul class="cards">
        <li v-for="m in g.majors" :key="m.id">
          <a class="card" :href="link(`majors/${m.id}`)">
            <span class="card-top">
              <span class="card-kind">{{ t(`majors.kinds.${kindOf(m)}`) }}<template v-if="q"> · {{ courseTitle(m.course) }}</template></span>
              <span v-if="accredited.has(m.id)" class="acc-chip" :title="t('careers.accTitle')"><BadgeCheck :size="13" aria-hidden="true" /> {{ t('majors.accChip') }}</span>
            </span>
            <span class="card-title">{{ m.title }}</span>
            <span class="card-facts">
              <span>{{ t('majors.points', { n: m.points }) }}</span>
              <span v-if="factsOf.get(m.id)?.core">{{ t('majors.sumCore', { n: factsOf.get(m.id)!.core }) }}</span>
              <span v-for="(p, i) in factsOf.get(m.id)?.picks ?? []" :key="i">{{ t('majors.sumPick', p) }}</span>
              <span v-if="factsOf.get(m.id)?.levels">{{ t('majors.levels', { x: factsOf.get(m.id)!.levels }) }}</span>
            </span>
            <span v-if="factsOf.get(m.id)?.key.length" class="card-key">
              <span v-for="c in factsOf.get(m.id)!.key" :key="c" class="code">{{ c }}</span>
            </span>
            <ChevronRight :size="18" aria-hidden="true" class="go" />
          </a>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 16px;
}

/* The hero's search. */
.search {
  position: relative;
  display: block;
  max-width: 600px;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 18px;
  color: var(--ink-faint);
  transform: translateY(-50%);
}

.search-input {
  width: 100%;
  min-height: 52px;
  padding: 12px 18px 12px 48px;
  font-size: 1rem;
  background: var(--glass-shine), var(--peek-fill);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-1);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

/* Degree, kind, field: rows of options in one glass bar. */
.pick {
  display: grid;
  gap: 10px;
  padding: 14px 18px;
  border-radius: 22px;
}

.pick-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.pick-label {
  min-width: 4.5em;
  margin-right: 6px;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
}

.opt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--ink);
  background: color-mix(in srgb, var(--ink) 4%, transparent);
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.opt:hover {
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  background: var(--inset-fill);
}

.opt:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.opt[aria-pressed='true'] {
  color: var(--accent-fill-ink);
  background: var(--accent-fill);
}

.opt-n {
  font-size: var(--fs-caption);
  font-weight: var(--fw-medium);
  opacity: 0.85;
}

.found {
  width: fit-content;
  margin: 0;
  padding: 10px 16px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  border-radius: 14px;
}

.empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 32px 20px;
  text-align: center;
  border-radius: 22px;
}

.empty p {
  margin: 0;
  color: var(--ink-soft);
}

.empty-icon {
  color: var(--accent);
}

.group {
  display: grid;
  gap: 10px;
}

/* A field's name on its own frosted strip, never straight on the colour field. */
.group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  margin: 8px 0 0;
  padding: 6px 14px;
  font-size: 1rem;
  font-weight: 650;
  border: 1px solid var(--card-edge);
  border-radius: 14px;
  background: var(--card-fill);
}

.group-count {
  padding: 1px 9px;
  border-radius: 999px;
  background: var(--accent-soft);
  font-size: var(--fs-meta);
  color: var(--accent);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A card: kind and badges, the name, its numbers, a few compulsory subjects; same parts, same places. */
.card {
  position: relative;
  display: grid;
  align-content: start;
  gap: 6px;
  height: 100%;
  padding: 14px 40px 14px 16px;
  color: var(--ink);
  text-decoration: none;
  border: 1px solid var(--card-edge);
  border-radius: 18px;
  background: var(--glass-shine), var(--card-fill);
  box-shadow: var(--glass-shadow);
  transition: border-color 0.15s;
}

.card:hover {
  border-color: var(--accent);
}

.card:hover .card-title {
  color: var(--accent);
}

.card-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
}

.card-kind {
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
}

.card-title {
  font-size: 1.0625rem;
  font-weight: var(--fw-semibold);
  line-height: 1.3;
}

.card-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.card-key {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card-key .code {
  padding: 1px 8px;
  font-size: var(--fs-caption);
  font-weight: 650;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
}

.acc-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: var(--fs-caption);
  font-weight: 600;
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
}

.go {
  position: absolute;
  top: 50%;
  right: 14px;
  color: var(--ink-faint);
  transform: translateY(-50%);
}

@media (max-width: 720px) {
  .list {
    gap: 12px;
  }

  .search-input {
    min-height: 48px;
  }

  .pick {
    padding: 12px;
  }

  /* Each row scrolls sideways instead of stacking, so the cards start near the top. */
  .pick-row {
    flex-wrap: nowrap;
    margin: 0 -12px;
    padding: 0 12px 2px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .pick-row::-webkit-scrollbar {
    display: none;
  }

  .pick-label {
    flex: none;
    min-width: 0;
  }

  .opt {
    flex: none;
    white-space: nowrap;
  }

  .opt {
    min-height: 44px;
  }
}
</style>

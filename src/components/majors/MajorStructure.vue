<script setup lang="ts">
import { computed } from 'vue'
import { periodsFor, type MajorOverview } from '@/engine'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useDataYear } from '@/composables/useDataYear'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'

/**
 * A major as a path, one column per level, left to right: the subjects to take first, then the
 * compulsory ones and the lists to pick from. Each subject says which it is; each pick list
 * says how many to choose. Every subject links to its page (or the Handbook, when it isn't in
 * our data yet).
 */
const props = defineProps<{ overview: MajorOverview; year: number }>()
const { data } = useDataset()
const { handbookFor } = useDataYear()
const { t, locale } = useI18n()

interface Item {
  code: string
  title: string
  when: string
  href: string
  missing: boolean
  /** For a subject to take first: the later one it's needed for. */
  note?: string
}
function item(code: string, via?: string): Item {
  const s = data.value.subjects[code]
  return {
    code,
    title: s ? localTitle(s, locale.value) || s.title : t.value('subject.notYetAdded'),
    when: s ? periodsFor(s, props.year).map((p) => t.value(`periodShort.${p}`)).join(' · ') || t.value('browse.notRunning') : '',
    href: s ? link(`subject/${code}`) : handbookFor(code, props.year),
    missing: !s,
    ...(via ? { note: t.value('majors.leadsTo', { code: via }) } : {}),
  }
}
const levelOf = (code: string) => data.value.subjects[code]?.level ?? (Number(code.match(/\d/)?.[0]) || 3)

const columns = computed(() => {
  const o = props.overview
  const levels = [...new Set([...o.core, ...o.choices.flatMap((c) => c.from), ...o.pathway.map((p) => p.code)].map(levelOf))].sort((a, b) => a - b)
  return levels.map((level) => ({
    level,
    first: o.pathway.filter((p) => levelOf(p.code) === level).map((p) => item(p.code, p.via)),
    core: o.core.filter((c) => levelOf(c) === level).map((c) => item(c)),
    picks: o.choices
      .map((c, i) => ({ group: i, n: c.points / 12.5, of: c.from.length, items: c.from.filter((x) => levelOf(x) === level).map((x) => item(x)) }))
      .filter((g) => g.items.length > 0),
  }))
})
const letter = (i: number) => String.fromCharCode(65 + i)
</script>

<template>
  <ol class="path">
    <li v-for="col in columns" :key="col.level" class="col">
      <h3 class="col-title">{{ t('majors.level', { n: col.level }) }}</h3>
      <div v-if="col.first.length" class="part">
        <p class="part-label"><span class="dot dot-first" aria-hidden="true" />{{ t('majors.tagFirst') }}</p>
        <ul class="items">
          <li v-for="s in col.first" :key="s.code">
            <a class="it" :class="{ missing: s.missing }" :href="s.href" :target="s.missing ? '_blank' : undefined" :rel="s.missing ? 'noopener' : undefined">
              <span class="it-code">{{ s.code }}</span><span class="it-title">{{ s.title }}</span><span class="it-when">{{ [s.when, s.note].filter(Boolean).join(' · ') }}</span>
            </a>
          </li>
        </ul>
      </div>
      <div v-if="col.core.length" class="part">
        <p class="part-label"><span class="dot dot-core" aria-hidden="true" />{{ t('majors.tagCore') }}</p>
        <ul class="items">
          <li v-for="s in col.core" :key="s.code">
            <a class="it it-core" :class="{ missing: s.missing }" :href="s.href" :target="s.missing ? '_blank' : undefined" :rel="s.missing ? 'noopener' : undefined">
              <span class="it-code">{{ s.code }}</span><span class="it-title">{{ s.title }}</span><span v-if="s.when" class="it-when">{{ s.when }}</span>
            </a>
          </li>
        </ul>
      </div>
      <div v-for="g in col.picks" :key="g.group" class="part pick">
        <p class="part-label"><span class="dot dot-pick" aria-hidden="true" />{{ t('majors.tagPick', { g: letter(g.group), n: g.n, of: g.of }) }}</p>
        <ul class="items">
          <li v-for="s in g.items" :key="s.code">
            <a class="it" :class="{ missing: s.missing }" :href="s.href" :target="s.missing ? '_blank' : undefined" :rel="s.missing ? 'noopener' : undefined">
              <span class="it-code">{{ s.code }}</span><span class="it-title">{{ s.title }}</span><span v-if="s.when" class="it-when">{{ s.when }}</span>
            </a>
          </li>
        </ul>
      </div>
    </li>
  </ol>
</template>

<style scoped>
/* Levels side by side, a thin arrow-like rule between them; stacked on narrow screens. */
.path {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: none;
}

.col {
  display: grid;
  align-content: start;
  gap: 14px;
  min-width: 0;
  padding: 14px;
  border-radius: 18px;
  background: var(--inset-fill);
}

.col-title {
  margin: 0;
  font-size: var(--fs-small);
  font-weight: var(--fw-bold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
}

.part {
  display: grid;
  gap: 6px;
}

.part-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
}

.dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.dot-first {
  border: 2px solid var(--ink-faint);
}

.dot-core {
  background: var(--accent-fill);
}

.dot-pick {
  border: 2px solid var(--accent-fill);
}

.items {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A subject: code, name, when it runs; the compulsory ones carry a pink edge. */
.it {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0 8px;
  padding: 8px 10px;
  color: var(--ink);
  text-decoration: none;
  border: 1px solid var(--card-edge);
  border-radius: 12px;
  background: var(--peek-fill);
  transition: border-color 0.15s;
}

.it-core {
  box-shadow: inset 3px 0 0 var(--accent-fill);
}

.it:hover {
  border-color: var(--accent);
}

.it:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.it-code {
  font-family: var(--font-code);
  font-size: var(--fs-meta);
  font-weight: 650;
  color: var(--accent);
}

.it-title {
  overflow: hidden;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.it-when {
  grid-column: 2;
  font-size: var(--fs-caption);
  color: var(--ink-soft);
}

.missing .it-title {
  font-weight: var(--fw-regular);
  color: var(--ink-soft);
}
</style>

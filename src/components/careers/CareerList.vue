<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import BrowseHero from '@/components/browse/BrowseHero.vue'
import { computed, shallowRef } from 'vue'
import { Briefcase, ChevronRight, GraduationCap, Search } from 'lucide-vue-next'
import { careerGroups, careerMatchRank, careerSearchTerms, careerTargets, majorsForCareer } from '@/engine'
import { careerLabel } from '@/utils/careersHtml'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'

const { data } = useDataset()
const { t, locale } = useI18n()
const query = shallowRef('')

const all = computed(() =>
  careerTargets(data.value).map((c) => ({
    ...c,
    label: careerLabel(c.names, locale.value),
    majors: majorsForCareer(data.value, c.id).length,
    // Search finds a job by its name in any language or an everyday name (会计, 程序员, IT).
    terms: careerSearchTerms(c),
  })),
)
const shown = computed(() => all.value.filter((c) => (c.majors > 0 || c.graduate) && careerMatchRank(c.terms, query.value) >= 0))
const groups = computed(() =>
  careerGroups(shown.value).map((g) => ({
    ...g,
    title: t.value(g.id === 'jobs' ? 'careerPath.jobsTitle' : 'careerPath.fieldsTitle'),
    hint: g.id === 'jobs' ? '' : t.value('careerPath.fieldsHint'),
  })),
)
</script>

<template>
  <div class="list">
    <BrowseHero :title="t('careerPath.title')">
      <p class="hero-line">{{ t('careerPath.ledeShort') }}<InfoTip :text="t('careerPath.lede')" /></p>
      <label class="search">
        <Search :size="18" aria-hidden="true" class="search-icon" />
        <input v-model="query" class="search-input" type="search" :placeholder="t('careerPath.search')" :aria-label="t('careerPath.search')" />
      </label>
    </BrowseHero>

    <p v-if="groups.length === 0" class="empty surface">{{ t('careerPath.noMatch') }}</p>

    <section v-for="g in groups" :key="g.id" class="group surface" :aria-labelledby="`careers-${g.id}`">
      <h2 :id="`careers-${g.id}`" class="group-title">{{ g.title }} <span class="group-count">{{ g.items.length }}</span></h2>
      <p v-if="g.hint" class="group-hint">{{ g.hint }}</p>
      <div class="cards">
        <a v-for="c in g.items" :key="c.id" class="card surface tile" :href="link(`careers/${c.id}`)">
          <span class="card-icon"><component :is="c.graduate ? GraduationCap : Briefcase" :size="18" aria-hidden="true" /></span>
          <span class="card-main">
            <span class="card-title">{{ c.label }}</span>
            <span class="card-meta">{{ c.graduate ? t('careerPath.graduateMeta', { course: c.graduate.title }) : t('careerPath.majorCount', { n: c.majors }) }}</span>
          </span>
          <ChevronRight :size="18" aria-hidden="true" class="go" />
        </a>
      </div>
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

.hero-line {
  margin: -6px 0 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.empty {
  margin: 0;
  padding: 24px;
  color: var(--ink-soft);
  border-radius: 20px;
}

/* Each group is a glass panel: its title and line, then its cards in a grid. */
.group {
  display: grid;
  gap: 10px;
  padding: 18px;
  border-radius: 22px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 650;
}

.group-count {
  padding: 1px 9px;
  border-radius: 999px;
  background: var(--accent-soft);
  font-size: 0.8125rem;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

.group-hint {
  margin: 0;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--divider);
}

.card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: 12px 16px;
  border-radius: 16px;
  color: var(--ink);
  text-decoration: none;
  transition: border-color 0.15s;
}

.card:hover {
  border-color: var(--accent);
}

.card:hover .card-title {
  color: var(--accent);
}

/* Inside a group's panel the cards are a shade frostier, not boxes on boxes. */
.group .card {
  background: var(--inset-fill);
  box-shadow: none;
}

.card-icon {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent-fill) 12%, transparent);
}

.card-main {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.card-title {
  font-size: var(--fs-small);
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.card-meta {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

@media (max-width: 720px) {
  .list {
    gap: 12px;
  }

  .group {
    padding: 14px;
    border-radius: 18px;
  }

  .search-input {
    min-height: 48px;
  }

  .cards {
    gap: 8px;
  }

  .card {
    padding: 11px 14px;
  }
}

.go {
  flex-shrink: 0;
  color: var(--ink-faint);
}
</style>

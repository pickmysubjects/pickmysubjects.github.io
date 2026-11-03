<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import BrowseHero from '@/components/browse/BrowseHero.vue'
import Pager from '@/components/Pager.vue'
import { CLUB_CATEGORIES, CLUBS, CLUBS_LISTING, type ClubCategory } from '@/content/clubs'
import { suggestClubs } from '@/engine/clubs'
import { foldSearch } from '@/engine/careerPaths'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/**
 * Every UMSU club: the ones that fit the student first (when they've told us anything), then all
 * of them by UMSU's own categories, searchable by name, a page at a time.
 */
const { t } = useI18n()
const { data, course } = useDataset()
const { profile } = useProfile()
const plan = usePlan()

const forYou = computed(() =>
  suggestClubs(CLUBS, {
    interests: profile.value.interests,
    course: plan.setupChosen.value ? course.value : undefined,
    codes: [...profile.value.results.map((r) => r.code), ...plan.plan.value.terms.flatMap((term) => term.subjects)],
    data: data.value,
  }),
)

const query = shallowRef('')
const category = shallowRef<ClubCategory | ''>('')
const counts = computed(() => Object.fromEntries(CLUB_CATEGORIES.map((c) => [c, CLUBS.filter((x) => x.category === c).length])))
const byName = [...CLUBS].sort((a, b) => a.name.localeCompare(b.name))
const shown = computed(() => {
  const q = foldSearch(query.value)
  return byName.filter((c) => (!category.value || c.category === category.value) && (!q || foldSearch(c.name).includes(q)))
})

// A page at a time, as on Find subjects; a new filter starts again from the first page.
const PER_PAGE = 24
const page = shallowRef(1)
const pages = computed(() => Math.max(1, Math.ceil(shown.value.length / PER_PAGE)))
const rows = computed(() => shown.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE))
watch([query, category], () => (page.value = 1))
function go(n: number): void {
  page.value = n
  document.getElementById('clubs-all')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** A club's topics as the student's interest names, a few at most. */
const topicNames = (topics: readonly string[]) => topics.slice(0, 3).map((x) => t.value(`topic.${x}`)).join(t.value('listSep'))
</script>

<template>
  <div class="list">
    <BrowseHero :title="t('clubsPage.title')">
      <p class="hero-line">{{ t('clubsPage.lede', { n: CLUBS.length }) }}</p>
      <label class="search">
        <input v-model="query" class="search-input" type="search" :placeholder="t('clubsPage.search')" :aria-label="t('clubsPage.search')" />
      </label>
    </BrowseHero>

    <section v-if="forYou.length && !query && !category" class="group surface" aria-labelledby="clubs-for-you">
      <h2 id="clubs-for-you" class="group-title">{{ t('clubsPage.forYou') }}</h2>
      <p class="group-hint">{{ t('clubsPage.forYouHint') }}</p>
      <div class="cards">
        <a v-for="s in forYou" :key="s.club.slug" class="card surface tile" :href="link(`clubs/${s.club.slug}`)">
          <span class="card-title">{{ s.club.name }}</span>
          <span class="card-meta">{{ s.reasons[0]!.kind === 'degree' ? t('clubs.forDegree') : t(s.reasons[0]!.kind === 'interest' ? 'clubs.forInterest' : 'clubs.forStudied', { topic: t(`topic.${(s.reasons[0] as { topic: string }).topic}`) }) }}</span>
        </a>
      </div>
    </section>

    <section id="clubs-all" class="group surface" aria-labelledby="clubs-all-title">
      <h2 id="clubs-all-title" class="group-title">{{ t('clubsPage.all') }} <span class="group-count">{{ shown.length }}</span></h2>
      <div class="filters" role="group" :aria-label="t('clubsPage.category')">
        <button class="chip" type="button" :aria-pressed="category === ''" @click="category = ''">{{ t('clubsPage.any') }}</button>
        <button v-for="c in CLUB_CATEGORIES" :key="c" class="chip" type="button" :aria-pressed="category === c" @click="category = category === c ? '' : c">
          {{ t(`clubsPage.cat.${c}`) }} <span class="chip-n">{{ counts[c] }}</span>
        </button>
      </div>
      <p v-if="!rows.length" class="group-hint">{{ t('clubsPage.none') }}</p>
      <div v-else class="cards">
        <a v-for="c in rows" :key="c.slug" class="card surface tile" :href="link(`clubs/${c.slug}`)">
          <span class="card-title">{{ c.name }}</span>
          <span class="card-meta">{{ t(`clubsPage.cat.${c.category}`) }}<template v-if="c.topics.length"> · {{ topicNames(c.topics) }}</template></span>
        </a>
      </div>
      <Pager v-if="pages > 1" :page="page" :pages="pages" @go="go" />
    </section>

    <p class="source">{{ t('clubsPage.source') }} <a :href="CLUBS_LISTING" target="_blank" rel="noopener">{{ t('clubs.all') }}</a></p>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 16px;
}

.search {
  display: block;
  max-width: 600px;
}

.search-input {
  width: 100%;
  min-height: 52px;
  padding: 12px 20px;
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

.group {
  display: grid;
  gap: 10px;
  padding: 18px;
  border-radius: 22px;
  scroll-margin-top: 80px;
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
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
}

.group-hint {
  margin: 0;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip-n {
  color: var(--ink-faint);
  font-size: 0.75rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--divider);
}

.card {
  display: grid;
  gap: 2px;
  align-content: center;
  min-height: 64px;
  padding: 12px 16px;
  border-radius: 16px;
  color: var(--ink);
  text-decoration: none;
  background: var(--inset-fill);
  box-shadow: none;
  transition: border-color 0.15s;
}

.card:hover {
  border-color: var(--accent);
}

.card:hover .card-title {
  color: var(--accent);
}

.card-title {
  font-size: var(--fs-small);
  font-weight: 600;
}

.card-meta {
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.source {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.source a {
  color: var(--accent);
}
</style>

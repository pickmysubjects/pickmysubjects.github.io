<script setup lang="ts">
import { computed } from 'vue'
import DetailHero from '@/components/browse/DetailHero.vue'
import SubjectSection from '@/components/subject/SubjectSection.vue'
import { CLUBS, CLUBS_CHECKED } from '@/content/clubs'
import { clubSubjects, similarClubs } from '@/engine/clubs'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'

/**
 * One UMSU club: its UMSU category, the way to join (on UMSU's own page), what it's about in the
 * interests students pick, subjects on the same thing, and clubs like it.
 */
const props = defineProps<{ slug: string }>()
const { t, locale } = useI18n()
const { data } = useDataset()

const club = computed(() => CLUBS.find((c) => c.slug === props.slug))
const subjects = computed(() => (club.value ? clubSubjects(club.value, data.value) : []))
const similar = computed(() => (club.value ? similarClubs(club.value, CLUBS) : []))
const degree = computed(() => club.value?.courses?.map((c) => data.value.courses.find((x) => x.code === c)?.title ?? c).join(t.value('listSep')))
const checked = computed(() => new Date(`${CLUBS_CHECKED}T12:00:00`).toLocaleDateString(locale.value, { year: 'numeric', month: 'long', day: 'numeric' }))
const heroArt = () => import('@/components/browse/art/ArtMajor.vue')
</script>

<template>
  <div v-if="club" class="detail">
    <DetailHero :back="{ href: link('clubs'), label: t('clubsPage.back') }" :eyebrow="t(`clubsPage.cat.${club.category}`)" :title="club.name" :art="heroArt">
      <p v-if="degree" class="hero-line">{{ t('clubsPage.degreeSociety', { degree }) }}</p>
      <div class="hero-actions">
        <a class="button button-accent" :href="club.url" target="_blank" rel="noopener">{{ t('clubsPage.join') }}</a>
      </div>
      <p class="hero-note">{{ t('clubsPage.joinNote') }}</p>
    </DetailHero>

    <div class="article">
      <SubjectSection v-if="club.topics.length" :title="t('clubsPage.about')">
        <ul class="chips">
          <li v-for="x in club.topics" :key="x" class="chip">{{ t(`topic.${x}`) }}</li>
        </ul>
      </SubjectSection>

      <SubjectSection v-if="subjects.length" :title="t('clubsPage.subjects')" :short="t('clubsPage.subjectsHint')">
        <ul class="links">
          <li v-for="c in subjects" :key="c">
            <a :href="link(`subject/${c}`)"><span class="code">{{ c }}</span> {{ data.subjects[c]?.title }}</a>
          </li>
        </ul>
      </SubjectSection>

      <SubjectSection v-if="similar.length" :title="t('clubsPage.similar')">
        <ul class="links">
          <li v-for="c in similar" :key="c.slug">
            <a :href="link(`clubs/${c.slug}`)">{{ c.name }}</a>
          </li>
        </ul>
      </SubjectSection>

      <p class="foot">{{ t('clubsPage.checked', { date: checked }) }}</p>
    </div>
  </div>

  <div v-else class="detail">
    <DetailHero :back="{ href: link('clubs'), label: t('clubsPage.back') }" :title="t('clubsPage.notFound')" :art="heroArt" />
  </div>
</template>

<style scoped>
.detail {
  --card-fill: var(--peek-fill);

  display: grid;
  gap: 24px;
  min-width: 0;
}

.article {
  display: grid;
  gap: 16px;
}

.hero-line {
  margin: 0;
  color: var(--ink-soft);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.hero-note {
  margin: 8px 0 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chips .chip {
  color: var(--ink);
}

.links {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.links a {
  display: block;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  text-decoration: none;
}

.links li:last-child a {
  border-bottom: 0;
}

.links a:hover {
  color: var(--accent);
}

.code {
  font-family: var(--font-code);
  font-size: 0.8125rem;
  color: var(--accent);
}

.foot {
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: 10px 16px;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  border: 1px solid var(--card-edge);
  border-radius: 999px;
  background: var(--glass-shine), var(--card-fill);
}
</style>

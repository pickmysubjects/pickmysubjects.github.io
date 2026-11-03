<script setup lang="ts">
import { computed } from 'vue'
import { CLUBS } from '@/content/clubs'
import { link } from '@/composables/useView'
import { suggestClubs, type ClubReason } from '@/engine/clubs'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/**
 * UMSU clubs that fit the student: by the interests they picked, their degree and what their
 * subjects are about. Names stay as UMSU writes them; each links to the club's UMSU page.
 */
const { t } = useI18n()
const { data, course } = useDataset()
const { profile } = useProfile()
const plan = usePlan()

const suggestions = computed(() =>
  suggestClubs(CLUBS, {
    interests: profile.value.interests,
    // Only a degree the student chose, not the one the site shows by default.
    course: plan.setupChosen.value ? course.value : undefined,
    codes: [...profile.value.results.map((r) => r.code), ...plan.plan.value.terms.flatMap((term) => term.subjects)],
    data: data.value,
  }),
)

/** One short reason per club: the strongest one it has. */
function reason(r: ClubReason): string {
  if (r.kind === 'degree') return t.value('clubs.forDegree')
  return t.value(r.kind === 'interest' ? 'clubs.forInterest' : 'clubs.forStudied', { topic: t.value(`topic.${r.topic}`) })
}
</script>

<template>
  <div class="clubs">
    <ul v-if="suggestions.length" class="club-list">
      <li v-for="s in suggestions" :key="s.club.url" class="club">
        <a class="club-name" :href="link(`clubs/${s.club.slug}`)">{{ s.club.name }}</a>
        <span class="club-why">{{ reason(s.reasons[0]!) }}</span>
      </li>
    </ul>
    <p v-else class="clubs-empty">{{ t('clubs.empty') }}</p>
    <p class="clubs-note">{{ t('clubs.note') }} <a class="clubs-all" :href="link('clubs')">{{ t('clubsPage.browseAll') }}</a></p>
  </div>
</template>

<style scoped>
.club-list {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.club {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 2px 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}

.club:last-child {
  border-bottom: 0;
}

/* On a phone the reason always goes under the name, so the rows line up. */
@media (max-width: 640px) {
  .club {
    flex-direction: column;
    align-items: flex-start;
  }
}

.club-name {
  color: var(--ink);
  font-weight: 600;
  text-decoration: none;
}

.club-name:hover {
  color: var(--accent);
}

.club-why {
  color: var(--ink-soft);
  font-size: var(--fs-small);
}

.clubs-empty {
  margin: 0;
  color: var(--ink-soft);
}

.clubs-all {
  color: var(--accent);
}

.clubs-note {
  margin: 10px 0 0;
  color: var(--ink-soft);
  font-size: var(--fs-small);
}
</style>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { bachelorPrefs, useBachelorRecord, useProfile } from '@/composables/useProfile'
import { useStudyLevel } from '@/composables/useStudyLevel'
import { useI18n } from '@/i18n'

/**
 * The master's side of My record: the bachelor's the student did here, read from the bachelor's
 * side (never changed from here), and one button to start this side's strengths, interests and
 * goal from that side's answers.
 */
const { t } = useI18n()
const record = useBachelorRecord()
const { level } = useStudyLevel()
const { profile, setPrefs } = useProfile()
const theirs = bachelorPrefs()
const copied = shallowRef(false)

const hasTheirs = computed(() => !!theirs && (Object.keys(theirs.skills).length > 0 || theirs.interests.length > 0 || !!theirs.career))
const summary = computed(() => {
  const r = record.value
  if (!r) return ''
  const majors = r.majors.join(', ') || '—'
  return r.wam !== undefined ? t.value('entryAdvice.fromRecord', { majors, wam: Math.round(r.wam * 10) / 10 }) : t.value('entryAdvice.fromRecordNoWam', { majors })
})
const passed = computed(() => record.value?.passed.length ?? 0)
// Only offered while this side has nothing of its own yet, so it never overwrites answers.
const mineEmpty = computed(() => Object.keys(profile.value.skills).length === 0 && profile.value.interests.length === 0 && !profile.value.career)

function copy(): void {
  if (!theirs) return
  setPrefs(theirs)
  copied.value = true
}
</script>

<template>
  <div class="bach">
    <p v-if="record" class="bach-line">{{ summary }}<template v-if="passed"> · {{ t('bachelorCard.passed', { n: passed }) }}</template></p>
    <p v-else class="bach-line">{{ t('entryAdvice.noRecord') }}</p>
    <div class="bach-actions">
      <button type="button" class="button button-quiet" @click="level = 'bachelor'">{{ t('bachelorCard.open') }}</button>
      <button v-if="hasTheirs && mineEmpty && !copied" type="button" class="button button-accent" @click="copy">{{ t('bachelorCard.copy') }}</button>
      <span v-if="copied" class="bach-done" role="status">{{ t('bachelorCard.copied') }}</span>
    </div>
  </div>
</template>

<style scoped>
.bach {
  display: grid;
  gap: 12px;
}

.bach-line {
  margin: 0;
  color: var(--ink-soft);
}

.bach-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.bach-done {
  font-size: var(--fs-small);
  color: var(--good);
}
</style>

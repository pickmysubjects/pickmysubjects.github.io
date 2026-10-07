<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import ResultsEditor from '@/components/profile/ResultsEditor.vue'
import SkillsEditor from '@/components/profile/SkillsEditor.vue'
import SuggestionPreview from '@/components/profile/SuggestionPreview.vue'
import { Download, Upload } from 'lucide-vue-next'
import { downloadBackup, restoreBackup } from '@/utils/backup'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

const { data, subjectList, topics } = useDataset()
const { profile, wam, setResults, setSkills, setInterests } = useProfile()

const results = computed({ get: () => profile.value.results, set: setResults })
const skills = computed({ get: () => profile.value.skills, set: setSkills })
const interests = computed({ get: () => profile.value.interests, set: setInterests })
const { t } = useI18n()
const options = computed(() => subjectList.value.map((s) => ({ code: s.code, title: s.title })))

const restoreFailed = shallowRef(false)
async function onRestore(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  restoreFailed.value = !restoreBackup(await file.text())
  // Saved state is read when the app starts, so reload to pick up the restored copy.
  if (!restoreFailed.value) location.reload()
}
</script>

<template>
  <div class="record">
    <section class="record-intro">
      <h1 class="record-title">{{ t('record.title') }}</h1>
      <p class="record-lede">{{ t('record.lede') }}</p>
      <!-- UniMelb shows the official WAM; here it only feeds the predictions. -->
      <p v-if="wam !== null" class="wam-line">{{ t('record.wamLine', { wam }) }}</p>
    </section>
    <div class="record-body">
      <ResultsEditor v-model="results" :subjects="data.subjects" :options="options" />
      <div class="record-side">
        <SuggestionPreview />
        <SkillsEditor v-model:skills="skills" v-model:interests="interests" :topics="topics" />
      </div>
    </div>

    <section class="backup surface">
      <div>
        <h2 class="backup-title">{{ t('record.backupTitle') }}</h2>
        <p class="backup-text">{{ t('record.backupText') }}</p>
        <p v-if="restoreFailed" class="backup-bad" role="alert">{{ t('record.restoreFailed') }}</p>
      </div>
      <div class="backup-actions">
        <button class="button button-quiet" type="button" @click="downloadBackup">
          <Download :size="16" aria-hidden="true" /> {{ t('record.backup') }}
        </button>
        <label class="button button-quiet">
          <Upload :size="16" aria-hidden="true" /> {{ t('record.restore') }}
          <input class="visually-hidden" type="file" accept="application/json,.json" @change="onRestore" />
        </label>
      </div>
    </section>
  </div>
</template>

<style scoped>
.record {
  padding-top: 32px;
  display: grid;
  gap: 24px;
  max-width: 1100px;
}

.record-title {
  font-size: clamp(1.6rem, 3vw, 2.3rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.record-lede {
  margin: 8px 0 0;
  color: var(--ink-soft);
}





.wam-line {
  margin-top: 8px;
  font-size: 0.88rem;
  color: var(--ink-soft);
}

.record-side {
  display: grid;
  gap: 20px;
}

.backup {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 14px 24px;
  padding: 18px 22px;
}

.backup-title {
  font-size: 1rem;
  font-weight: 650;
}

.backup-text {
  margin-top: 4px;
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.backup-bad {
  margin-top: 6px;
  font-weight: 600;
  color: var(--bad);
}

.backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.record-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: start;
}

@media (max-width: 860px) {
  .record-body {
    grid-template-columns: 1fr;
  }
}
</style>

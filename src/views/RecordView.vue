<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import ResultsEditor from '@/components/profile/ResultsEditor.vue'
import SkillsEditor from '@/components/profile/SkillsEditor.vue'
import TopicChips from '@/components/profile/TopicChips.vue'
import SuggestionPreview from '@/components/profile/SuggestionPreview.vue'
import WamGoal from '@/components/profile/WamGoal.vue'
import { ArrowRight, Download, Upload } from 'lucide-vue-next'
import { link } from '@/composables/useView'
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
      <p v-if="wam !== null" class="wam-line">
        {{ t('record.wamLine', { wam }) }}
        <a :href="link('guide')">{{ t('guide.wamWhat') }}</a>
      </p>
    </section>
    <div class="record-body">
      <div class="record-col">
        <ResultsEditor class="results-card surface" v-model="results" :subjects="data.subjects" :options="options" />
      </div>
      <div class="record-col">
        <SuggestionPreview />
        <WamGoal />
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
    </div>

    <SkillsEditor v-model:skills="skills" />

    <section class="interests surface" aria-labelledby="interests-title">
      <header>
        <h2 id="interests-title" class="interests-title">{{ t('record.interestsTitle') }}</h2>
        <p class="interests-hint">{{ t('record.interestsHint') }}</p>
      </header>
      <TopicChips v-model="interests" :topics="topics" />
    </section>

    <p class="next">
      <a class="button button-accent" :href="link('plan')">{{ t('record.next') }} <ArrowRight :size="16" aria-hidden="true" /></a>
    </p>
  </div>
</template>

<style scoped>
.record {
  padding-top: 32px;
  display: grid;
  gap: 24px;
  max-width: 1100px;
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

.record-col {
  display: grid;
  gap: 20px;
  align-content: start;
}

.next {
  display: flex;
  justify-content: flex-end;
}

.interests {
  display: grid;
  gap: 14px;
  padding: 20px 22px;
}

.interests-title {
  font-size: 1.05rem;
  font-weight: 650;
}

.interests-hint {
  margin-top: 4px;
  font-size: 0.88rem;
  color: var(--ink-soft);
}

.results-card {
  padding: 20px 22px;
}

.backup {
  display: grid;
  gap: 12px;
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
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  gap: 24px;
  align-items: start;
}

@media (max-width: 860px) {
  .record-body {
    grid-template-columns: 1fr;
  }

  /* One column on a phone: the backup goes last, after suggestions and strengths. */
  .record-col {
    display: contents;
  }

  .backup {
    order: 1;
  }
}
</style>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Check, Send } from 'lucide-vue-next'
import { GRADES_FORM } from '@/config'
import { bandOf, computeWam, wamBandOf } from '@/engine'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePersisted } from '@/composables/usePersisted'
import { useProfile } from '@/composables/useProfile'
import { isFormReady, submitGoogleForm } from '@/utils/googleForm'
import { cleanRated } from '@/utils/sanitize'
import { useI18n } from '@/i18n'

/**
 * Optional and anonymous: share the grade band of subjects already on My page, so the site can
 * learn how each subject grades. Nothing is sent until the student ticks subjects and presses send;
 * each subject goes as its own response, so no one's subjects can be linked together.
 */
const { profile } = useProfile()
const { data } = useDataset()
const { t, locale } = useI18n()
const shared = usePersisted<string[]>('sc:gradesShared', [], cleanRated)
const ready = isFormReady(GRADES_FORM)

// A band only means something next to the student's level: their WAM without that subject,
// which needs a few other marks.
const MIN_OTHER_MARKS = 3
const rows = computed(() =>
  profile.value.results
    .filter((r) => r.mark !== undefined && data.value.subjects[r.code] && !shared.value.includes(r.code))
    .flatMap((r) => {
      const others = profile.value.results.filter((x) => x.code !== r.code && x.mark !== undefined)
      const wam = others.length >= MIN_OTHER_MARKS ? computeWam(others, data.value) : null
      return wam === null ? [] : [{ code: r.code, year: r.year, band: bandOf(r.mark!), wamBand: wamBandOf(wam) }]
    }),
)
const picked = shallowRef<string[]>([])
watch(rows, (rs) => (picked.value = rs.map((r) => r.code)), { immediate: true })
const status = shallowRef<'idle' | 'sending' | 'sent' | 'failed'>('idle')

function toggle(code: string): void {
  picked.value = picked.value.includes(code) ? picked.value.filter((c) => c !== code) : [...picked.value, code]
}

async function send(): Promise<void> {
  status.value = 'sending'
  const sent: string[] = []
  try {
    for (const r of rows.value.filter((x) => picked.value.includes(x.code))) {
      await submitGoogleForm(GRADES_FORM, { code: r.code, year: r.year ? String(r.year) : '', band: r.band, wamBand: r.wamBand, language: locale.value })
      sent.push(r.code)
    }
    status.value = 'sent'
  } catch {
    status.value = 'failed'
  } finally {
    shared.value = [...new Set([...shared.value, ...sent])]
  }
}
</script>

<template>
  <section v-if="ready && (rows.length || shared.length)" class="share surface" aria-labelledby="share-title">
    <h2 id="share-title" class="share-title">{{ t('grades.title') }}</h2>
    <p class="share-text">{{ t('grades.why') }}</p>
    <p class="share-text">
      {{ t('grades.what') }} <a :href="link('privacy')">{{ t('grades.privacy') }}</a>
    </p>
    <ul v-if="rows.length" class="share-list">
      <li v-for="r in rows" :key="r.code">
        <label class="share-row">
          <input type="checkbox" :checked="picked.includes(r.code)" @change="toggle(r.code)" />
          <span class="share-code">{{ r.code }}</span>
          <span>{{ r.band }}</span>
          <span class="share-soft">{{ t('grades.wamBand', { range: r.wamBand }) }}</span>
        </label>
      </li>
    </ul>
    <p v-if="shared.length" class="share-soft"><Check :size="14" aria-hidden="true" /> {{ t('grades.done', { n: shared.length }) }}</p>
    <p v-if="status === 'failed'" class="share-bad" role="alert">{{ t('grades.failed') }}</p>
    <button v-if="rows.length" class="button button-quiet share-send" type="button" :disabled="!picked.length || status === 'sending'" @click="send">
      <Send :size="16" aria-hidden="true" /> {{ t('grades.send', { n: picked.length }) }}
    </button>
  </section>
</template>

<style scoped>
.share {
  display: grid;
  gap: 10px;
  padding: 18px 22px;
}

.share-title {
  font-size: 1.05rem;
  font-weight: 650;
}

.share-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.share-list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.share-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  min-height: 36px;
  font-size: 0.9375rem;
  cursor: pointer;
}

.share-code {
  font-family: var(--font-mono, monospace);
  font-weight: 600;
}

.share-soft {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.share-bad {
  margin: 0;
  color: var(--bad);
}

.share-send {
  justify-self: start;
}
</style>

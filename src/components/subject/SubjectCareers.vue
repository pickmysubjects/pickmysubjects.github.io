<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { BadgeCheck } from 'lucide-vue-next'
import { subjectCareers } from '@/engine'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { careerShortName } from '@/utils/careerPathText'
import { SUBJECT_CAREERS_SHOWN, subjectRequiredText } from '@/utils/careersHtml'

/**
 * How the subject relates to careers, in a line or two: the accreditation routes that need it,
 * else a few careers it helps toward. Nothing at all when it isn't tied to one.
 */
const props = defineProps<{ code: string }>()
const { data } = useDataset()
const { t, locale } = useI18n()

const info = computed(() => subjectCareers(data.value, props.code))
const expanded = shallowRef(false)
const helps = computed(() => (expanded.value ? info.value.helps : info.value.helps.slice(0, SUBJECT_CAREERS_SHOWN)))
const more = computed(() => info.value.helps.length - SUBJECT_CAREERS_SHOWN)
</script>

<template>
  <section v-if="info.required.length || info.helps.length" class="careers">
    <h3 class="roles-title">{{ t('careerPath.subjectTitle') }}</h3>
    <ul v-if="info.required.length" class="required">
      <li v-for="r in info.required" :key="`${r.body}|${r.component}`">
        <BadgeCheck :size="15" aria-hidden="true" class="icon" />
        <a :href="link(`careers/${r.career.id}?major=${encodeURIComponent(r.component)}`)">{{ subjectRequiredText(t, r, locale) }}</a>
      </li>
    </ul>
    <p v-else class="helps">
      {{ t('careerPath.subjectHelps') }}:
      <template v-for="(c, i) in helps" :key="c.id">
        <a :href="link(`careers/${c.id}`)">{{ careerShortName(c.names, locale) }}</a><template v-if="i < helps.length - 1">{{ t('listSep') }}</template>
      </template>
      <button v-if="!expanded && more > 0" type="button" class="more" @click="expanded = true">{{ t('careerPath.subjectMore', { n: more }) }}</button>
    </p>
  </section>
</template>

<style scoped>
.careers {
  display: grid;
  gap: 6px;
}

.required {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.required li {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  font-size: var(--fs-small);
}

.icon {
  flex-shrink: 0;
  margin-top: 3px;
  color: var(--accent);
}

.helps {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}

a {
  color: var(--accent);
  overflow-wrap: anywhere;
}

.more {
  margin-left: 6px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}
</style>

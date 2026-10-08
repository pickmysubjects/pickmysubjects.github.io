<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronRight, Search } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'
import { groupMajors } from '@/utils/majorGroups'

const { data } = useDataset()
const plan = usePlan()
const { t } = useI18n()
const query = shallowRef('')

const course = computed(() => plan.setup.value.course || 'B-SCI')
const majors = computed(() => data.value.components.filter((c) => c.course === course.value && c.kind === 'major'))
const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  return groupMajors(majors.value)
    .map((g) => {
      const label = t.value(`majorGroup.${g.id}`).toLowerCase()
      return { ...g, majors: !q || label.includes(q) ? g.majors : g.majors.filter((m) => m.title.toLowerCase().includes(q)) }
    })
    .filter((g) => g.majors.length > 0)
})
const courseTitle = computed(() => data.value.courses.find((c) => c.code === course.value)?.title ?? course.value)
</script>

<template>
  <div class="list">
    <header>
      <h1 class="page-title">{{ t('majors.title') }}</h1>
      <p class="page-lede">{{ t('majors.lede', { course: courseTitle }) }}</p>
    </header>

    <label class="search">
      <Search :size="18" aria-hidden="true" class="search-icon" />
      <input v-model="query" class="search-input" type="search" :placeholder="t('majors.search')" :aria-label="t('majors.search')" />
    </label>

    <p v-if="groups.length === 0" class="empty">{{ t('wizard.noMajorMatch') }}</p>

    <section v-for="g in groups" :key="g.id" class="group">
      <h2 class="group-title">{{ t(`majorGroup.${g.id}`) }}</h2>
      <div class="cards">
        <a v-for="m in g.majors" :key="m.id" class="card surface" :href="link(`majors/${m.id}`)">
          <span class="card-title">{{ m.title }}</span>
          <ChevronRight :size="18" aria-hidden="true" class="go" />
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 24px;
}

.search {
  position: relative;
  display: block;
  max-width: 560px;
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
  padding: 13px 18px 13px 48px;
  font-size: 1rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-1);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.empty {
  color: var(--ink-soft);
}

.group {
  display: grid;
  gap: 10px;
}

.group-title {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  color: var(--ink);
  text-decoration: none;
  transition: border-color 0.15s;
}

.card:hover {
  border-color: var(--accent);
}

.card-title {
  flex: 1;
  font-weight: 600;
}

.go {
  flex: none;
  color: var(--ink-faint);
}
</style>

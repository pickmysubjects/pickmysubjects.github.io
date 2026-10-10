<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { link } from '@/composables/useView'
import { subjectRoles } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'

/** Which majors and specialisations need this subject: compulsory, one of a choice, or on the way there. */
const props = defineProps<{ code: string }>()
const { data } = useDataset()
const plan = usePlan()
const { t } = useI18n()

const ORDER = { core: 0, option: 1, pathway: 2, route: 3 } as const
const mine = computed(() => new Set([plan.setup.value.major, plan.setup.value.specialisation].filter(Boolean)))
const roles = computed(() =>
  subjectRoles(data.value, props.code, plan.setup.value.course)
    .map((r) => ({ ...r, mine: mine.value.has(r.component) }))
    .sort((a, b) => Number(b.mine) - Number(a.mine) || ORDER[a.role] - ORDER[b.role] || a.title.localeCompare(b.title)),
)
// A first-year subject leads into dozens of majors: show a few (yours first), the rest on a tap.
const LIMIT = 6
const expanded = shallowRef(false)
const shown = computed(() => (expanded.value ? roles.value : roles.value.slice(0, LIMIT)))
// One heading per kind of role, instead of the same tag on every line.
const groups = computed(() =>
  (Object.keys(ORDER) as (keyof typeof ORDER)[])
    .map((role) => ({ role, items: shown.value.filter((r) => r.role === role) }))
    .filter((g) => g.items.length),
)
</script>

<template>
  <section v-if="roles.length" class="roles">
    <h3 class="roles-title">{{ t('subject.rolesTitle') }}</h3>
    <div class="groups">
      <div v-for="g in groups" :key="g.role" class="group" :class="`role-${g.role}`">
        <p class="role-tag">{{ t(`subject.role.${g.role}`) }}</p>
        <ul class="roles-list">
          <li v-for="r in g.items" :key="r.component" class="role">
            <a class="role-link" :href="link(`majors/${r.component}`)">{{ r.title }}</a>
            <span v-if="r.mine" class="role-mine">{{ t('subject.yours') }}</span>
            <span v-if="r.via" class="role-via">{{ t('subject.roleVia', { code: r.via }) }}</span>
          </li>
        </ul>
      </div>
    </div>
    <button v-if="!expanded && roles.length > LIMIT" type="button" class="roles-more" @click="expanded = true">
      {{ t('subject.showAll', { n: roles.length }) }}
    </button>
  </section>
</template>

<style scoped>
.roles-more {
  justify-self: start;
  padding: 4px 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}

.roles {
  display: grid;
  gap: 8px;
}

.roles-title {
  font-size: 0.9375rem;
  font-weight: 650;
}

.groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px 28px;
}

.group {
  display: grid;
  align-content: start;
  gap: 8px;
}

.roles-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px 24px;
  align-items: start;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.9375rem;
}

.role {
  display: grid;
  gap: 1px;
}

.role-tag {
  justify-self: start;
  margin: 0;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--surface-2);
  color: var(--ink-soft);
}

.role-core .role-tag {
  background: var(--accent-soft);
  color: var(--accent);
}

.role-mine {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
}

.role-via {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.role-link {
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}

.role-link:hover {
  color: var(--accent);
}
</style>

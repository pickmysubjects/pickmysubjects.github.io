<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { link } from '@/composables/useView'
import { planComponentIds, subjectRoles } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'
import { usePhone } from '@/composables/usePhone'

/** Which majors and specialisations need this subject: compulsory, one of a choice, or on the way there. */
const props = defineProps<{ code: string }>()
const { data } = useDataset()
const plan = usePlan()
const { t } = useI18n()
// A long list on a phone: folded to its heading, opened on tap.
const phone = usePhone()

const ORDER = { core: 0, option: 1, pathway: 2, route: 3 } as const
const mine = computed(() => new Set(planComponentIds(plan.plan.value).filter(Boolean)))
const roles = computed(() =>
  subjectRoles(data.value, props.code, plan.setup.value.course)
    .map((r) => ({ ...r, mine: mine.value.has(r.component) }))
    .sort((a, b) => Number(b.mine) - Number(a.mine) || ORDER[a.role] - ORDER[b.role] || a.title.localeCompare(b.title)),
)
// A first-year subject leads into dozens of majors: show a few (yours first), the rest on a tap.
const LIMIT = 6
const expanded = shallowRef(false)
const shown = computed(() => (expanded.value ? roles.value : roles.value.slice(0, LIMIT)))
</script>

<template>
  <component :is="phone ? 'details' : 'section'" v-if="roles.length" class="roles" :class="{ 'roles-fold': phone }">
    <summary v-if="phone" class="roles-title roles-summary">{{ t('subject.rolesTitle') }}</summary>
    <h3 v-else class="roles-title">{{ t('subject.rolesTitle') }}</h3>
    <ul class="roles-list">
      <li v-for="r in shown" :key="r.component" class="role" :class="`role-${r.role}`">
        <a class="role-link" :href="link(`majors/${r.component}`)">{{ r.title }}</a>
        <span v-if="r.mine" class="role-mine">{{ t('subject.yours') }}</span>
        <span class="role-what">{{ t(`subject.roleLine.${r.role}`, { via: r.via ?? '' }) }}</span>
      </li>
    </ul>
    <button v-if="!expanded && roles.length > LIMIT" type="button" class="roles-more" @click="expanded = true">
      {{ t('subject.showAll', { n: roles.length }) }}
    </button>
  </component>
</template>

<style scoped>
.roles-summary {
  padding: 10px 0;
  color: var(--accent);
  cursor: pointer;
}

.roles-more {
  justify-self: start;
  padding: 4px 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: var(--fs-small);
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}

.roles {
  display: grid;
  gap: 8px;
}

.roles-title {
  font-size: var(--fs-body);
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
  font-size: var(--fs-body);
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
  font-size: var(--fs-meta);
  font-weight: 600;
  background: var(--surface-2);
  color: var(--ink-soft);
}

.role-core .role-tag {
  background: var(--accent-soft);
  color: var(--accent);
}

.role-mine {
  font-size: var(--fs-meta);
  font-weight: 600;
  color: var(--accent);
}

.role-what {
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.role-core .role-what {
  font-weight: 600;
  color: var(--accent);
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

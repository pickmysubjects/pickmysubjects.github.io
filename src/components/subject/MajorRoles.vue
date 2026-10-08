<script setup lang="ts">
import { computed } from 'vue'
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
</script>

<template>
  <section v-if="roles.length" class="roles">
    <h3 class="roles-title">{{ t('subject.rolesTitle') }}</h3>
    <ul class="roles-list">
      <li v-for="r in roles" :key="r.component" class="role" :class="`role-${r.role}`">
        <span class="role-tag">{{ t(`subject.role.${r.role}`) }}</span>
        <span>
          <a class="role-link" :href="link(`majors/${r.component}`)"><strong>{{ r.title }}</strong></a>
          <span v-if="r.mine" class="role-mine">{{ t('subject.yours') }}</span>
          <span v-if="r.via" class="role-via"> · {{ t('subject.roleVia', { code: r.via }) }}</span>
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.roles {
  display: grid;
  gap: 8px;
}

.roles-title {
  font-size: 0.95rem;
  font-weight: 650;
}

.roles-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.9rem;
}

.role {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.role-tag {
  flex: none;
  padding: 1px 8px;
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
  margin-left: 6px;
  font-size: 0.75rem;
  color: var(--accent);
}

.role-via {
  color: var(--ink-soft);
}

.role-link {
  color: inherit;
  text-decoration: none;
}

.role-link:hover strong {
  color: var(--accent);
}
</style>

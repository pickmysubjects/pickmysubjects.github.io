<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef } from 'vue'
import { Columns2, Copy, Ellipsis, FilePlus, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { usePlans } from '@/composables/usePlans'
import { MAX_PLANS } from '@/utils/planBook'
import { useI18n } from '@/i18n'
import { planName } from './planName'

/** Plan A, Plan B…: one tap to switch, and a small panel underneath for new / rename / delete. */
const props = defineProps<{ noCompare?: boolean }>()
const emit = defineEmits<{ compare: [] }>()
const plans = usePlans()
const { t } = useI18n()

type Panel = 'new' | 'menu' | 'rename' | 'delete' | null
const panel = shallowRef<Panel>(null)
const draft = shallowRef('')
const input = useTemplateRef<HTMLInputElement>('input')

function toggle(next: Panel): void {
  panel.value = panel.value === next ? null : next
}
function create(mode: 'copy' | 'fresh'): void {
  plans.create(mode)
  panel.value = null
}
async function startRename(): Promise<void> {
  draft.value = plans.active.value.name ?? ''
  panel.value = 'rename'
  await nextTick()
  input.value?.focus()
}
function saveName(): void {
  plans.rename(plans.active.value.id, draft.value)
  panel.value = null
}
function confirmDelete(): void {
  plans.remove(plans.active.value.id)
  panel.value = null
}
</script>

<template>
  <section class="switcher" :aria-label="t('plans.label')">
    <div class="row">
      <div class="tabs" role="group" :aria-label="t('plans.label')">
        <button
          v-for="p in plans.list.value"
          :key="p.id"
          class="tab"
          :class="{ 'tab-on': p.id === plans.active.value.id }"
          type="button"
          :aria-pressed="p.id === plans.active.value.id"
          @click="plans.switchTo(p.id); panel = null"
        >
          {{ planName(t, p) }}
        </button>
        <button class="icon" type="button" :aria-label="t('plans.new')" :title="t('plans.new')" :aria-expanded="panel === 'new'" @click="toggle('new')">
          <Plus :size="16" aria-hidden="true" />
        </button>
      </div>
      <div class="tools">
        <button v-if="!props.noCompare && plans.list.value.length > 1" class="link" type="button" @click="emit('compare')">
          <Columns2 :size="16" aria-hidden="true" /> {{ t('plans.compare') }}
        </button>
        <button class="icon" type="button" :aria-label="planName(t, plans.active.value)" :aria-expanded="panel === 'menu'" @click="toggle('menu')">
          <Ellipsis :size="16" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-if="panel === 'new'" class="panel">
      <template v-if="plans.canAdd.value">
        <button class="button button-quiet" type="button" @click="create('copy')"><Copy :size="16" aria-hidden="true" /> {{ t('plans.copy') }}</button>
        <button class="button button-quiet" type="button" @click="create('fresh')"><FilePlus :size="16" aria-hidden="true" /> {{ t('plans.fresh') }}</button>
      </template>
      <p v-else class="note">{{ t('plans.max', { n: MAX_PLANS }) }}</p>
    </div>

    <div v-else-if="panel === 'menu'" class="panel">
      <button class="button button-quiet" type="button" @click="startRename"><Pencil :size="16" aria-hidden="true" /> {{ t('plans.rename') }}</button>
      <button v-if="plans.list.value.length > 1" class="button button-quiet" type="button" @click="panel = 'delete'">
        <Trash2 :size="16" aria-hidden="true" /> {{ t('plans.delete') }}
      </button>
    </div>

    <form v-else-if="panel === 'rename'" class="panel" @submit.prevent="saveName">
      <input
        ref="input"
        v-model="draft"
        class="name"
        maxlength="40"
        :aria-label="t('plans.renameLabel')"
        :placeholder="t('plans.named', { letter: plans.active.value.label })"
        @keydown.esc="panel = null"
      />
      <button class="button button-accent" type="submit">{{ t('plans.save') }}</button>
      <button class="button button-quiet" type="button" @click="panel = null">{{ t('plans.cancel') }}</button>
    </form>

    <div v-else-if="panel === 'delete'" class="panel" role="alert">
      <p class="note">{{ t('plans.deleteConfirm', { name: planName(t, plans.active.value) }) }}</p>
      <button class="button button-danger" type="button" @click="confirmDelete">{{ t('plans.delete') }}</button>
      <button class="button button-quiet" type="button" @click="panel = null">{{ t('plans.cancel') }}</button>
    </div>
  </section>
</template>

<style scoped>
.switcher {
  display: grid;
  gap: 10px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tabs,
.tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.tab {
  max-width: 14em;
  overflow: hidden;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.875rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
}

.tab-on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--ink);
  font-weight: 600;
}

.icon {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
}

.link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 8px;
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.tab:focus-visible,
.icon:focus-visible,
.link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.note {
  flex-basis: 100%;
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.name {
  flex: 1 1 12em;
  min-width: 0;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--paper);
  color: var(--ink);
  font: inherit;
}

.button-danger {
  background: var(--bad);
  color: #fff;
}
</style>

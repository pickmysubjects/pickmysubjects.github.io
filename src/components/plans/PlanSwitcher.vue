<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
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

// The sliding pill under the active plan: measured from the active button, so any name length works.
const track = useTemplateRef<HTMLElement>('track')
const pill = shallowRef<{ left: number; width: number } | null>(null)
function place(): void {
  const on = track.value?.querySelector<HTMLElement>('.tab-on')
  pill.value = on ? { left: on.offsetLeft, width: on.offsetWidth } : null
}
let ro: ResizeObserver | undefined
onMounted(() => {
  place()
  if (typeof ResizeObserver !== 'undefined' && track.value) {
    ro = new ResizeObserver(place)
    ro.observe(track.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())
watch(() => [plans.active.value.id, plans.list.value.map((p) => planName(t.value, p)).join('|')], () => nextTick(place))

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
      <div class="tabs">
        <div ref="track" class="seg" role="group" :aria-label="t('plans.label')">
        <span v-if="pill" class="seg-pill" aria-hidden="true" :style="{ transform: `translateX(${pill.left}px)`, width: `${pill.width}px` }" />
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
        </div>
        <button class="icon" type="button" :aria-label="t('plans.new')" :title="t('plans.new')" :aria-expanded="panel === 'new'" @click="toggle('new')">
          <Plus :size="16" aria-hidden="true" />
        </button>
      </div>
      <div class="tools">
        <button v-if="!props.noCompare && plans.list.value.length > 1" class="button button-quiet compare" type="button" @click="emit('compare')">
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

/* Plan A / Plan B as one segmented control; a glass pill slides to the active plan. */
.seg {
  position: relative;
  display: inline-flex;
  max-width: 100%;
  padding: 3px;
  overflow-x: auto;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  scrollbar-width: none;
}

.seg-pill {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 0;
  border-radius: 999px;
  background: var(--glass-shine), var(--surface);
  box-shadow: 0 1px 3px rgb(16 16 20 / 14%), inset 0 0 0 1px var(--glass-edge);
  transition: transform 0.25s cubic-bezier(0.3, 0.7, 0.2, 1), width 0.25s cubic-bezier(0.3, 0.7, 0.2, 1);
}

.tab {
  position: relative;
  flex: none;
  max-width: 14em;
  overflow: hidden;
  min-height: 36px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: color 0.15s;
}

.tab:hover {
  color: var(--ink);
}

.tab-on {
  color: var(--ink);
  font-weight: 650;
}

@media (prefers-reduced-motion: reduce) {
  .seg-pill {
    transition: none;
  }
}

.icon {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
}

.compare {
  min-height: 40px;
  padding: 0 14px;
  font-size: 0.875rem;
}

.tab:focus-visible,
.icon:focus-visible {
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

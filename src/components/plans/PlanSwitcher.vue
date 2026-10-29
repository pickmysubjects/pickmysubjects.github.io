<script setup lang="ts">
import { useImeGuard } from '@/utils/ime'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { usePlans } from '@/composables/usePlans'
import { MAX_PLANS } from '@/utils/planBook'
import { useI18n } from '@/i18n'
import { link } from '@/composables/useView'
import { planName } from './planName'
import { useAnchoredOverlay } from '@/utils/anchoredOverlay'

/**
 * Plan A, Plan B…: one tap to switch. New / rename / delete open in a dropdown anchored to the
 * button that opened it (a sheet at the bottom on phones), so opening one never moves the page.
 */
const props = defineProps<{ noCompare?: boolean }>()
const plans = usePlans()
const { t } = useI18n()

type Panel = 'new' | 'menu' | 'rename' | 'delete' | null
const panel = shallowRef<Panel>(null)
const draft = shallowRef('')
// An input method's Enter (confirming a Chinese or Japanese word) doesn't save the name yet.
const ime = useImeGuard()
const input = useTemplateRef<HTMLInputElement>('input')
const newBtn = useTemplateRef<HTMLButtonElement>('newBtn')
const manageBtn = useTemplateRef<HTMLButtonElement>('manageBtn')
const sheet = useTemplateRef<HTMLElement>('sheet')

const isOpen = computed(() => panel.value !== null)
const anchor = (): HTMLButtonElement | null => (panel.value === 'new' ? newBtn.value : manageBtn.value)
const { pos, reposition } = useAnchoredOverlay({
  open: isOpen,
  anchor,
  panel: () => sheet.value,
  close: () => (panel.value = null),
  align: 'start',
})
// Menu → rename → delete stay in one dropdown on the same button; re-place when its size changes.
watch(panel, (now, before) => {
  if (now && before) void reposition()
})
/** Close from inside the dropdown and hand focus back to the button that opened it. */
function closeToButton(): void {
  const a = anchor()
  panel.value = null
  a?.focus()
}

// The sliding pill under the active plan: measured from the active button, so any name length works.
const track = useTemplateRef<HTMLElement>('track')
const pill = shallowRef<{ left: number; width: number } | null>(null)
function place(): void {
  const on = track.value?.querySelector<HTMLElement>('.tab-on')
  pill.value = on ? { left: on.offsetLeft, width: on.offsetWidth } : null
  // On narrow screens the tabs scroll sideways: keep the active one in view (without scrolling the page).
  const el = track.value
  if (on && el) {
    if (on.offsetLeft < el.scrollLeft) el.scrollLeft = on.offsetLeft - 3
    else if (on.offsetLeft + on.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollLeft = on.offsetLeft + on.offsetWidth - el.clientWidth + 3
  }
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
async function startDelete(): Promise<void> {
  panel.value = 'delete'
  await nextTick()
  sheet.value?.querySelector<HTMLButtonElement>('button')?.focus()
}
async function startRename(): Promise<void> {
  draft.value = plans.active.value.name ?? ''
  panel.value = 'rename'
  await nextTick()
  input.value?.focus({ preventScroll: true })
}
function saveName(): void {
  plans.rename(plans.active.value.id, draft.value)
  closeToButton()
}
// With one plan left, "delete" starts it over instead, so a student can always begin again.
function confirmDelete(): void {
  const id = plans.active.value.id
  if (plans.list.value.length > 1) plans.remove(id)
  else plans.clear(id)
  closeToButton()
}
</script>

<template>
  <section class="switcher" :aria-label="t('plans.label')">
    <div class="row">
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
      <div class="tools">
        <button ref="newBtn" class="button button-quiet text-btn" type="button" aria-haspopup="dialog" :aria-expanded="panel === 'new'" @click="toggle('new')">+ {{ t('plans.new') }}</button>
        <button
          ref="manageBtn"
          class="button button-quiet text-btn"
          type="button"
          aria-haspopup="dialog"
          :aria-expanded="panel === 'menu' || panel === 'rename' || panel === 'delete'"
          @click="panel && panel !== 'new' ? (panel = null) : (panel = 'menu')"
        >
          {{ t('plans.manage') }}
        </button>
        <a v-if="!props.noCompare && plans.list.value.length > 1" class="button button-quiet text-btn" :href="link('plan/compare/')">{{ t('plans.compare') }}</a>
      </div>
    </div>

    <Teleport v-if="panel" to="body">
      <div ref="sheet" class="plan-sheet" role="dialog" :aria-label="panel === 'new' ? t('plans.new') : t('plans.manage')" :style="pos">
        <template v-if="panel === 'new'">
          <template v-if="plans.canAdd.value">
            <button class="item" type="button" @click="create('copy')">{{ t('plans.copy') }}</button>
            <button class="item" type="button" @click="create('fresh')">{{ t('plans.fresh') }}</button>
          </template>
          <p v-else class="note">{{ t('plans.max', { n: MAX_PLANS }) }}</p>
        </template>

        <template v-else-if="panel === 'menu'">
          <button class="item" type="button" @click="startRename">{{ t('plans.rename') }}</button>
          <button v-if="plans.canAdd.value" class="item" type="button" @click="create('copy')">{{ t('plans.copy') }}</button>
          <button class="item item-bad" type="button" @click="startDelete">
            {{ plans.list.value.length > 1 ? t('plans.deletePlan') : t('plans.clearPlan') }}
          </button>
        </template>

        <form v-else-if="panel === 'rename'" class="form" @submit.prevent="saveName">
          <input
            ref="input"
            v-model="draft"
            class="name"
            maxlength="40"
            :aria-label="t('plans.renameLabel')"
            :placeholder="t('plans.named', { letter: plans.active.value.label })"
            @keydown.enter="ime.holdImeEnter"
            @compositionstart="ime.onCompositionstart"
            @compositionend="ime.onCompositionend"
          />
          <div class="actions">
            <button class="button button-quiet" type="button" @click="closeToButton">{{ t('plans.cancel') }}</button>
            <button class="button button-accent" type="submit">{{ t('plans.save') }}</button>
          </div>
        </form>

        <div v-else-if="panel === 'delete'" class="form" role="alert">
          <p class="note">
            {{
              plans.list.value.length > 1
                ? t('plans.deleteConfirm', { name: planName(t, plans.active.value) })
                : t('plans.clearConfirm', { name: planName(t, plans.active.value) })
            }}
          </p>
          <div class="actions">
            <button class="button button-quiet" type="button" @click="closeToButton">{{ t('plans.cancel') }}</button>
            <button class="button button-danger" type="button" @click="confirmDelete">
              {{ plans.list.value.length > 1 ? t('plans.delete') : t('plans.clear') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.switcher {
  display: grid;
  gap: 10px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

/* The tabs scroll sideways when there are many; the text buttons keep one line. */
.tools {
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
}

/* Plan A / Plan B as one segmented control; a glass pill slides to the active plan. */
.seg {
  position: relative;
  display: inline-flex;
  flex: 0 1 auto;
  min-width: 0;
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

.text-btn {
  min-height: 40px;
  padding: 0 12px;
  font-size: 0.875rem;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .row {
    gap: 4px;
  }

  .text-btn {
    padding: 0 8px;
  }

  .tab {
    padding: 0 12px;
  }
}

.tab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.plan-sheet {
  position: fixed;
  z-index: 1000;
  display: grid;
  gap: 2px;
  width: max-content;
  min-width: 200px;
  max-width: min(340px, calc(100vw - 24px));
  padding: 6px;
  color: var(--ink);
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius);
  /* Near-opaque like the search dropdown, so text behind never shows through. */
  background: var(--glass-shine), color-mix(in srgb, var(--sheet-fill) 20%, var(--bg));
  -webkit-backdrop-filter: var(--glass-blur-strong);
  backdrop-filter: var(--glass-blur-strong);
  box-shadow: var(--glass-shadow), var(--shadow-2);
}

.item {
  min-height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.9375rem;
  text-align: start;
  cursor: pointer;
}

.item:hover {
  background: var(--inset-fill);
}

.item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.item-bad {
  color: var(--bad);
}

.form {
  display: grid;
  gap: 10px;
  padding: 6px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.note {
  margin: 0;
  padding: 4px 6px;
  color: var(--ink-soft);
  font-size: 0.875rem;
  line-height: var(--lh-body);
}

.name {
  width: 100%;
  min-width: 16em;
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

@media (max-width: 640px) {
  .plan-sheet {
    inset: auto 12px calc(12px + env(safe-area-inset-bottom)) 12px;
    width: auto;
    max-width: none;
  }

  .name {
    min-width: 0;
  }
}
</style>

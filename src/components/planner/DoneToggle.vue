<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from '@/i18n'
import { doneWith } from '@/utils/pastTerms'
import { useAnchoredOverlay } from '@/utils/anchoredOverlay'

/**
 * Done or not, on every card and in the subject window: the student's own call, kept on My
 * record. A graded subject is done once it has a mark (0–100); a pass/fail one with a tap.
 * Done in a term that hasn't started says so, without stopping it.
 */
// ask: on the record with no mark yet, so the mark box is open and highlighted from the start.
// card: the board card's one bottom line: a text action, or "已修 · 82" / "未通过 · 22" that opens a
// small overlay (mark box + 标为未修) anchored to it, so the card never grows or moves.
// failed: on the record as not passed; note: shown instead of the status text (e.g. "重修于 …").
const props = defineProps<{ code: string; done: boolean; mark?: number; passFail?: boolean; future?: boolean; ask?: boolean; card?: boolean; failed?: boolean; note?: string }>()
const emit = defineEmits<{ done: [mark: number | undefined]; undo: [] }>()
const { t } = useI18n()

// Asking for the mark: a graded subject's 已修 opens the box first.
const asking = shallowRef(props.ask === true)
const typed = shallowRef('')
const box = useTemplateRef<HTMLInputElement>('box')
watch(() => props.mark, (m) => (typed.value = m === undefined ? '' : String(m)), { immediate: true })

async function onDone(): Promise<void> {
  if (props.card && onRecord.value) return openMenu()
  if (props.passFail && !props.done) return emit('done', undefined)
  asking.value = true
  await nextTick()
  box.value?.focus()
}
function commit(): void {
  const m = doneWith(typed.value)?.mark
  if (m === undefined) {
    // An empty or unreadable box leaves it as it was.
    typed.value = props.mark === undefined ? '' : String(props.mark)
    return
  }
  asking.value = false
  if (!props.done || m !== props.mark) emit('done', m)
}
// On a card, a subject on the record (done or failed): its status opens the overlay.
const onRecord = computed(() => props.done || props.failed === true)
const menuOpen = shallowRef(false)
const status = useTemplateRef<HTMLButtonElement>('status')
const menu = useTemplateRef<HTMLElement>('menu')
const menuBox = useTemplateRef<HTMLInputElement>('menuBox')
const { pos } = useAnchoredOverlay({ open: menuOpen, anchor: () => status.value, panel: () => menu.value, close: () => (menuOpen.value = false), align: 'start' })
async function openMenu(): Promise<void> {
  typed.value = props.mark === undefined ? '' : String(props.mark)
  menuOpen.value = !menuOpen.value
  if (!menuOpen.value) return
  await nextTick()
  ;(menuBox.value ?? menu.value?.querySelector('button'))?.focus({ preventScroll: true })
}
function closeMenu(): void {
  menuOpen.value = false
  status.value?.focus()
}
/** The mark box in the overlay: a readable 0–100 mark updates the record; anything else is put back. */
function saveMark(): void {
  const m = doneWith(typed.value)?.mark
  if (m === undefined) {
    typed.value = props.mark === undefined ? '' : String(props.mark)
    return
  }
  if (m !== props.mark) emit('done', m)
}
function onMenuEnter(e: KeyboardEvent): void {
  if (e.isComposing || e.keyCode === 229) return
  // Without this the same Enter would "click" the status button that focus returns to.
  e.preventDefault()
  saveMark()
  closeMenu()
}
function unmark(): void {
  menuOpen.value = false
  emit('undo')
}
// On a card, editing a done subject's mark closes again once focus leaves the box and its button.
function onFocusOut(e: FocusEvent): void {
  if (!props.card || !props.done) return
  const wrap = e.currentTarget as Element
  // After the tap swaps the button for the box, focus moves to the box a moment later: check then.
  setTimeout(() => {
    if (!wrap.contains(document.activeElement)) asking.value = false
  })
}
function onEnter(e: KeyboardEvent): void {
  if (e.isComposing || e.keyCode === 229) return
  ;(e.target as HTMLInputElement).blur()
}
</script>

<template>
  <span v-if="card && onRecord" class="toggle toggle-card" @click.stop>
    <button
      ref="status"
      type="button"
      class="toggle-text toggle-state"
      :class="{ 'toggle-failed': failed }"
      aria-haspopup="dialog"
      :aria-expanded="menuOpen"
      :title="future && !failed ? t('plan.doneFuture') : undefined"
      @click="onDone"
    >
      <template v-if="note">{{ note }}</template>
      <template v-else>{{ t(failed ? 'plan.pastNotPassed' : 'plan.pastTag') }}<template v-if="mark !== undefined"> · {{ mark }}</template></template>
    </button>
    <Teleport v-if="menuOpen" to="body">
      <div ref="menu" class="done-menu" role="dialog" :aria-label="code" :style="pos">
        <label v-if="!passFail" class="done-menu-mark">
          <span>{{ t('record.markFor', { code }) }}</span>
          <input
            ref="menuBox"
            v-model="typed"
            class="input toggle-mark"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            :placeholder="t('record.markShort')"
            @change="saveMark"
            @keydown.enter="onMenuEnter"
          />
        </label>
        <p class="done-menu-ask">{{ t('plan.doneUndoAsk') }}</p>
        <div class="done-menu-acts">
          <button type="button" class="toggle-btn toggle-act" @click="unmark">{{ t('plan.doneUndo') }}</button>
          <button type="button" class="toggle-btn" @click="closeMenu">{{ t('plans.cancel') }}</button>
        </div>
      </div>
    </Teleport>
  </span>
  <span v-else-if="card" class="toggle toggle-card" @click.stop @focusout="onFocusOut">
    <template v-if="asking">
      <input
        v-if="!passFail"
        ref="box"
        v-model="typed"
        class="input toggle-mark"
        :class="{ 'toggle-ask': !done }"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        :placeholder="t('record.markShort')"
        :aria-label="t('record.markFor', { code })"
        :title="done ? undefined : t('plan.doneNeedsMark')"
        @change="commit"
        @keydown.enter="onEnter"
      />
      <button v-if="done" type="button" class="toggle-text" @click="emit('undo')">{{ t('plan.doneUndo') }}</button>
    </template>
    <button v-else-if="done" type="button" class="toggle-text toggle-state" :title="future ? t('plan.doneFuture') : undefined" @click="onDone">
      {{ t('plan.pastTag') }}<template v-if="mark !== undefined"> · {{ mark }}</template>
    </button>
    <button v-else type="button" class="toggle-text toggle-act" @click="onDone">{{ t('plan.doneMark') }}</button>
  </span>
  <span v-else class="toggle" @click.stop>
    <input
      v-if="!passFail && (done || asking)"
      ref="box"
      v-model="typed"
      class="input toggle-mark"
      :class="{ 'toggle-ask': !done }"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :placeholder="t('record.markShort')"
      :aria-label="t('record.markFor', { code })"
      @change="commit"
      @keydown.enter="onEnter"
    />
    <button v-if="done" type="button" class="toggle-btn" @click="emit('undo')">{{ t('plan.doneUndo') }}</button>
    <button v-else-if="!asking" type="button" class="toggle-btn toggle-act" @click="onDone">{{ t('plan.doneMark') }}</button>
    <span v-if="asking && !done" class="toggle-note">{{ t('plan.doneNeedsMark') }}</span>
    <span v-else-if="done && future" class="toggle-note">{{ t('plan.doneFuture') }}</span>
  </span>
</template>

<style scoped>
/* The overlay for a subject on the record: glass like the plan menus, a sheet on phones. */
.done-menu {
  position: fixed;
  z-index: 1000;
  display: grid;
  gap: 8px;
  width: max-content;
  min-width: 200px;
  max-width: min(300px, calc(100vw - 24px));
  padding: 10px 12px;
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius);
  background: var(--glass-shine), color-mix(in srgb, var(--sheet-fill) 20%, var(--bg));
  -webkit-backdrop-filter: var(--glass-blur-strong);
  backdrop-filter: var(--glass-blur-strong);
  box-shadow: var(--glass-shadow), var(--shadow-2);
  color: var(--ink);
  font-size: 0.8125rem;
}

.done-menu-mark {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--ink-soft);
}

.done-menu-ask {
  margin: 0;
  font-weight: 600;
}

.done-menu-acts {
  display: flex;
  gap: 8px;
}

.done-menu .toggle-btn {
  min-height: 32px;
  padding: 0 12px;
  font-size: 0.8125rem;
}

@media (max-width: 640px) {
  .done-menu {
    inset: auto 12px calc(12px + env(safe-area-inset-bottom)) 12px;
    width: auto;
    max-width: none;
  }

  .done-menu .toggle-btn {
    flex: 1;
    min-height: 44px;
  }
}

.toggle-state.toggle-failed {
  color: var(--bad);
}

/* On a card: one short line of text, no pill, so the card grows by a line at most. */
.toggle-card {
  flex-wrap: nowrap;
  gap: 6px;
  min-width: 0;
}

.toggle-text {
  min-height: 22px;
  min-width: 0;
  padding: 0 2px;
  margin: 0 -2px;
  overflow: hidden;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--ink-soft);
  font: inherit;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.toggle-text:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.toggle-text:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.toggle-card .toggle-act {
  border: 0;
  color: var(--accent);
}

.toggle-card .toggle-act:hover,
.toggle-card .toggle-act:focus-visible {
  background: none;
  color: var(--accent);
}

.toggle-state {
  color: var(--good-ink, var(--good));
}

.toggle-card .toggle-mark {
  width: 56px;
  min-height: 22px;
  padding: 0 6px;
}

.toggle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  font-size: 0.75rem;
}

.toggle-mark {
  width: 64px;
  min-height: 26px;
  padding: 1px 8px;
  font-size: 0.8125rem;
}

.toggle-ask {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent);
}

.toggle-btn {
  min-height: 26px;
  padding: 0 8px;
  border: 1px solid var(--col-edge, var(--glass-edge));
  border-radius: 999px;
  background: none;
  color: var(--ink-soft);
  font: inherit;
  cursor: pointer;
}

.toggle-btn:hover,
.toggle-btn:focus-visible {
  color: var(--ink);
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}

/* An action, not a status: outlined in the accent, unlike the filled 必修 / 专业选修 tags. */
.toggle-act {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.toggle-act:hover,
.toggle-act:focus-visible {
  color: var(--accent-ink);
  background: var(--accent);
}

@media (max-width: 640px) {
  .toggle:not(.toggle-card) .toggle-act {
    flex: 1 1 100%;
  }
}

.toggle-note {
  flex-basis: 100%;
  color: var(--warn-ink, var(--ink-soft));
}

@media (pointer: coarse) {
  .toggle:not(.toggle-card) .toggle-text {
    min-height: 32px;
  }

  /* On a card the line stays 22px (fixed card height); the tap area reaches past it. */
  .toggle-card .toggle-text {
    position: relative;
    overflow: visible;
  }

  .toggle-card .toggle-text::after {
    content: '';
    position: absolute;
    inset: -8px -4px;
  }

  .toggle:not(.toggle-card) .toggle-mark,
  .toggle-btn {
    min-height: 44px;
  }
}
</style>

<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from '@/i18n'
import { doneWith } from '@/utils/pastTerms'

/**
 * Done or not, on every card and in the subject window: the student's own call, kept on My
 * record. A graded subject is done once it has a mark (0–100); a pass/fail one with a tap.
 * Done in a term that hasn't started says so, without stopping it.
 */
// ask: on the record with no mark yet, so the mark box is open and highlighted from the start.
// card: the board card's one bottom line: a text action, or "已修 · 82" that opens the box when tapped.
const props = defineProps<{ code: string; done: boolean; mark?: number; passFail?: boolean; future?: boolean; ask?: boolean; card?: boolean }>()
const emit = defineEmits<{ done: [mark: number | undefined]; undo: [] }>()
const { t } = useI18n()

// Asking for the mark: a graded subject's 已修 opens the box first.
const asking = shallowRef(props.ask === true)
const typed = shallowRef('')
const box = useTemplateRef<HTMLInputElement>('box')
watch(() => props.mark, (m) => (typed.value = m === undefined ? '' : String(m)), { immediate: true })

async function onDone(): Promise<void> {
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
  <span v-if="card" class="toggle toggle-card" @click.stop @focusout="onFocusOut">
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
  .toggle-text {
    min-height: 32px;
  }

  .toggle:not(.toggle-card) .toggle-mark,
  .toggle-btn {
    min-height: 44px;
  }
}
</style>

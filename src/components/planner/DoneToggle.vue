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
const props = defineProps<{ code: string; done: boolean; mark?: number; passFail?: boolean; future?: boolean; ask?: boolean }>()
const emit = defineEmits<{ done: [mark: number | undefined]; undo: [] }>()
const { t } = useI18n()

// Asking for the mark: a graded subject's 已修 opens the box first.
const asking = shallowRef(props.ask === true)
const typed = shallowRef('')
const box = useTemplateRef<HTMLInputElement>('box')
watch(() => props.mark, (m) => (typed.value = m === undefined ? '' : String(m)), { immediate: true })

async function onDone(): Promise<void> {
  if (props.passFail) return emit('done', undefined)
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
function onEnter(e: KeyboardEvent): void {
  if (e.isComposing || e.keyCode === 229) return
  ;(e.target as HTMLInputElement).blur()
}
</script>

<template>
  <span class="toggle" @click.stop>
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
    <button v-else-if="!asking" type="button" class="toggle-btn" @click="onDone">{{ t('plan.doneMark') }}</button>
    <span v-if="asking && !done" class="toggle-note">{{ t('plan.doneNeedsMark') }}</span>
    <span v-else-if="done && future" class="toggle-note">{{ t('plan.doneFuture') }}</span>
  </span>
</template>

<style scoped>
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

.toggle-note {
  flex-basis: 100%;
  color: var(--warn-ink, var(--ink-soft));
}

@media (pointer: coarse) {
  .toggle-mark,
  .toggle-btn {
    min-height: 44px;
  }
}
</style>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { Check, X } from 'lucide-vue-next'
import type { Subject } from '@/engine'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import type { PastResult } from '@/utils/pastTerms'
import { LINK_COUNTS } from '@/utils/planBoard'

/**
 * A subject from My record on the plan board: the same card as a planned one, in green with a
 * tick (red when not passed), the mark where a planned card shows its points. A start for
 * prerequisite lines (data-past-code), never moved or removed here.
 */
const props = defineProps<{ result: PastResult; subject?: Subject; note?: string; highlighted?: boolean; dimmed?: boolean }>()
const emit = defineEmits<{ open: []; hover: [on: boolean] }>()
const { t, locale } = useI18n()
const linkCounts = inject(LINK_COUNTS, null)
const links = computed(() => linkCounts?.value.counts.get(props.result.code))
const linksQuiet = computed(() => linkCounts?.value.quiet ?? false)
// The title in the reader's language where we have one, with the English after it, small (as on a planned card).
const local = computed(() => (props.subject ? localTitle(props.subject, locale.value) : ''))
const label = computed(() => (props.result.failed ? t.value('plan.pastNotPassed') : t.value('plan.pastTag')))
</script>

<template>
  <button
    type="button"
    class="done"
    :class="{ failed: result.failed, highlighted, dimmed }"
    :data-past-code="result.code"
    @click="emit('open')"
    @mouseenter="emit('hover', true)"
    @mouseleave="emit('hover', false)"
    @focusin="emit('hover', true)"
    @focusout="emit('hover', false)"
  >
    <span class="top">
      <span class="mark-icon" aria-hidden="true">
        <X v-if="result.failed" :size="10" :stroke-width="3" />
        <Check v-else :size="10" :stroke-width="3" />
      </span>
      <span class="code">{{ result.code }}</span>
      <span v-if="result.mark !== undefined" class="mark">{{ result.mark }}</span>
    </span>
    <span class="title">
      {{ local || subject?.title || t('subject.notYetAdded') }}
      <span v-if="local" class="title-en">{{ subject?.title }}</span>
    </span>
    <span class="foot">
      <span class="tag tag-state">{{ label }}</span>
      <span v-if="subject" class="tag">L{{ subject.level }}</span>
      <span v-if="note" class="note">{{ note }}</span>
      <span v-if="links" class="link-mark" :class="{ 'link-mark-quiet': linksQuiet }" aria-hidden="true"><template v-if="links.needs">← {{ links.needs }}</template><template v-if="links.needs && links.unlocks"> · </template><template v-if="links.unlocks">→ {{ links.unlocks }}</template></span>
    </span>
  </button>
</template>

<style scoped>
/* "← 1 · → 2": how many of its prerequisites and follow-ons are on the board. */
.link-mark-quiet {
  visibility: hidden;
}

.link-mark {
  margin-left: auto;
  padding: 0 7px;
  border: 1px solid var(--card-edge, var(--line));
  border-radius: 999px;
  background: var(--glass-shine), var(--sheet-fill);
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1.5;
  color: var(--ink-soft);
  white-space: nowrap;
}

.done {
  /* Above the prerequisite lines, like a planned card. */
  position: relative;
  z-index: 1;
  display: grid;
  gap: 4px;
  padding: 6px 9px;
  border: 1px solid color-mix(in srgb, var(--good) 30%, transparent);
  border-radius: var(--radius);
  background: var(--good-soft);
  font: inherit;
  text-align: left;
  color: var(--ink);
  cursor: pointer;
}

.highlighted {
  border-color: var(--overprint);
  box-shadow: 0 0 0 1px var(--overprint);
}

.dimmed {
  opacity: 0.45;
}

.failed {
  border: 1px dashed var(--bad);
  background: var(--bad-soft);
}

.top {
  display: flex;
  align-items: center;
  gap: 7px;
}

.mark-icon {
  display: inline-grid;
  place-items: center;
  width: 12px;
  height: 12px;
  flex: none;
  border-radius: 50%;
  background: var(--good);
  color: #fff;
}

.failed .mark-icon {
  background: var(--bad);
}

.code {
  font-size: 0.875rem;
  font-weight: 600;
}

.mark {
  margin-left: auto;
  font-family: var(--font-code);
  font-size: 0.8125rem;
  font-weight: 700;
}

.title-en {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--ink-faint);
}

.title {
  font-size: 0.875rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 20px;
}

.tag {
  padding: 0 6px;
  border-radius: 999px;
  /* The card's own surface, lifted a little: readable in light, dark and Reduce Transparency. */
  background: color-mix(in srgb, var(--surface) 60%, transparent);
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.tag-state {
  font-weight: 650;
  color: var(--good);
}

.failed .tag-state {
  color: var(--bad);
}

.note {
  font-size: 0.75rem;
  color: var(--bad);
}
</style>

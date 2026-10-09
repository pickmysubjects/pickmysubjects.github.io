<script setup lang="ts">
import { useI18n } from '@/i18n'

const { t } = useI18n()

// UniMelb's grading scheme, lowest first so the bar reads 0 → 100.
const GRADES = [
  { code: 'N', from: 0, to: 49 },
  { code: 'P', from: 50, to: 64 },
  { code: 'H3', from: 65, to: 69 },
  { code: 'H2B', from: 70, to: 74 },
  { code: 'H2A', from: 75, to: 79 },
  { code: 'H1', from: 80, to: 100 },
] as const

const rows = [...GRADES].reverse()
</script>

<template>
  <div class="scale">
    <div class="bar" aria-hidden="true">
      <span
        v-for="g in GRADES"
        :key="g.code"
        class="seg"
        :class="`g-${g.code}`"
        :style="{ flexGrow: g.to - g.from + 1 }"
      />
    </div>
    <div class="ticks" aria-hidden="true">
      <span>0</span>
      <span class="tick-pass">50</span>
      <span class="tick-h1">80</span>
      <span>100</span>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th scope="col">{{ t('guide.colGrade') }}</th>
          <th scope="col">{{ t('guide.colMark') }}</th>
          <th scope="col">{{ t('guide.colMeaning') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="g in rows" :key="g.code">
          <th scope="row">
            <span class="swatch" :class="`g-${g.code}`" aria-hidden="true" />
            <span class="code">{{ g.code }}</span>
          </th>
          <td class="range">{{ g.from }}–{{ g.to }}</td>
          <td>{{ t(`guide.g${g.code}`) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.scale {
  display: grid;
  gap: 6px;
}

.bar {
  display: flex;
  gap: 2px;
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
}

.seg {
  flex-basis: 0;
}

.g-N {
  background: color-mix(in srgb, var(--bad) 55%, transparent);
}
.g-P {
  background: color-mix(in srgb, var(--ink-faint) 45%, transparent);
}
.g-H3 {
  background: color-mix(in srgb, var(--accent) 35%, transparent);
}
.g-H2B {
  background: color-mix(in srgb, var(--accent) 55%, transparent);
}
.g-H2A {
  background: color-mix(in srgb, var(--accent) 75%, transparent);
}
.g-H1 {
  background: var(--accent);
}

/* Tick positions match the bar: 50 and 80 sit where those marks start. */
.ticks {
  position: relative;
  display: flex;
  justify-content: space-between;
  height: 1.2em;
  font-family: var(--font-code);
  font-size: 0.75rem;
  color: var(--ink-faint);
}

.tick-pass,
.tick-h1 {
  position: absolute;
  transform: translateX(-50%);
}
.tick-pass {
  left: 50%;
}
.tick-h1 {
  left: 80%;
}

.table {
  width: 100%;
  margin-top: 10px;
  border-collapse: collapse;
  font-size: 0.9375rem;
}

.table th,
.table td {
  padding: 9px 8px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--line);
}

.table thead th {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink-faint);
}

.table tbody tr:last-child > * {
  border-bottom: 0;
}

.table tbody th {
  white-space: nowrap;
  font-weight: 650;
}

.swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 8px;
  border-radius: 3px;
}

.code,
.range {
  font-family: var(--font-code);
  white-space: nowrap;
}
</style>

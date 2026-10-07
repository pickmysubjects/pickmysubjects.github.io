<script setup lang="ts">
import { shallowRef, useId } from 'vue'
import { PASS_MARK, type Profile, type Subject } from '@/engine'

const results = defineModel<Profile['results']>({ required: true })
defineProps<{ subjects: Record<string, Subject>; options: { code: string; title: string }[] }>()

const listId = useId()
const code = shallowRef('')
const mark = shallowRef<number | ''>('')
const error = shallowRef('')

function add(): void {
  const c = code.value.trim().split(/\s/)[0]?.toUpperCase() ?? ''
  if (!/^[A-Z]{4}\d{5}$/.test(c)) {
    error.value = 'Enter a subject code like COMP10001.'
    return
  }
  if (results.value.some((r) => r.code === c)) {
    error.value = `${c} is already in your record — edit its mark below.`
    return
  }
  const m = mark.value === '' ? undefined : Number(mark.value)
  results.value = [...results.value, { code: c, mark: m }]
  code.value = ''
  mark.value = ''
  error.value = ''
}

function setMark(c: string, raw: string): void {
  const m = raw === '' ? undefined : Math.max(0, Math.min(100, Number(raw)))
  results.value = results.value.map((r) => (r.code === c ? { code: c, mark: m } : r))
}

function remove(c: string): void {
  results.value = results.value.filter((r) => r.code !== c)
}

function value(event: Event): string {
  return (event.target as HTMLInputElement).value
}
</script>

<template>
  <section class="results" aria-labelledby="results-title">
    <h2 id="results-title" class="section-title">Subjects you've completed</h2>
    <form class="add" @submit.prevent="add">
      <label class="field add-code">
        Subject
        <input v-model="code" class="input" :list="listId" placeholder="Code or name" />
        <datalist :id="listId">
          <option v-for="o in options" :key="o.code" :value="`${o.code} ${o.title}`" />
        </datalist>
      </label>
      <label class="field add-mark">
        Mark (optional)
        <input v-model="mark" class="input" type="number" min="0" max="100" placeholder="0–100" />
      </label>
      <button class="button" type="submit">Add</button>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <p v-if="results.length === 0" class="empty">
      Nothing yet. Add what you've finished — marks sharpen suggestions, and a mark below {{ PASS_MARK }} counts as a
      fail you can retake.
    </p>
    <table v-else class="table">
      <thead>
        <tr>
          <th scope="col">Subject</th>
          <th scope="col">Mark</th>
          <th scope="col"><span class="visually-hidden">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in results" :key="r.code">
          <td>
            <span class="code">{{ r.code }}</span>
            <span class="title">{{ subjects[r.code]?.title ?? 'Not in the dataset' }}</span>
          </td>
          <td>
            <input
              class="input mark"
              type="number"
              min="0"
              max="100"
              :value="r.mark ?? ''"
              :aria-label="`Mark for ${r.code}`"
              @change="setMark(r.code, value($event))"
            />
            <span v-if="r.mark !== undefined && r.mark < PASS_MARK" class="fail">Fail — can retake</span>
          </td>
          <td><button class="button button-quiet" type="button" @click="remove(r.code)">Remove</button></td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.section-title {
  font-size: 1.1rem;
  font-weight: 800;
  margin-bottom: 10px;
}

.add {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 10px;
}

.add-code {
  flex: 1 1 260px;
}

.add-mark {
  flex: 0 1 140px;
}

.error {
  margin: 6px 0 0;
  color: var(--stop);
  font-size: 0.85rem;
}

.empty {
  margin: 12px 0 0;
  color: var(--ink-soft);
}

.table {
  width: 100%;
  margin-top: 12px;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.table th {
  padding: 6px 8px;
  border-bottom: 1px solid var(--contour);
  font-size: 0.75rem;
  text-align: left;
  color: var(--ink-soft);
}

.table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--contour);
  vertical-align: middle;
}

.title {
  margin-left: 8px;
  color: var(--ink-soft);
}

.mark {
  width: 80px;
}

.fail {
  margin-left: 8px;
  white-space: nowrap;
  color: var(--stop);
  font-size: 0.8rem;
}
</style>

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// In <script setup>, a local function or variable named like a prop hides that prop in the
// template: the board's line legend once read a function's .length instead of the edges.
const DIR = join(__dirname, '../src/components/planner')

describe('planner components', () => {
  it('declare nothing with the same name as one of their props', () => {
    const clashes: string[] = []
    for (const file of readdirSync(DIR).filter((f) => f.endsWith('.vue'))) {
      const src = readFileSync(join(DIR, file), 'utf8')
      const props = src.match(/defineProps<\{([\s\S]*?)\n\}>/)?.[1] ?? ''
      const names = [...props.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1]!)
      for (const n of names) if (new RegExp(`^(function ${n}\\(|(const|let) ${n} =)`, 'm').test(src)) clashes.push(`${file}: ${n}`)
    }
    expect(clashes).toEqual([])
  })
})

/**
 * The tools: only what exists nowhere else on the site. Shown on /tools/, its static page and the
 * Tools menu; `text` is the one line on what each answers.
 */
export interface Tool {
  key: string
  to: string
  text: string
  art: 'final' | 'wam' | 'revision'
}

export const TOOLS: readonly Tool[] = [
  { key: 'calc.title', to: 'tools/final/', text: 'tools.line.final', art: 'final' },
  { key: 'tools.wam', to: 'tools/wam/', text: 'tools.line.wam', art: 'wam' },
  { key: 'rev.title', to: 'tools/revision/', text: 'tools.line.revision', art: 'revision' },
]

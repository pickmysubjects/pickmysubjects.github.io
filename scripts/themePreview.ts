import postcss, { type AtRule, type Root, type Rule, type PluginCreator } from 'postcss'

/**
 * Local preview only (dev server, `npm run local`): lets the floating switch (ThemePreview.vue)
 * force light/dark and a Reduce Transparency look without changing the Mac's settings.
 *
 * Every `@media (prefers-color-scheme: …)` / `(prefers-reduced-transparency: reduce)` block is
 * kept, guarded so a forced theme wins, and copied outside the media query under
 * `:root[data-theme="dark"]` / `:root.preview-rt`. `(prefers-reduced-motion: reduce)` blocks get the
 * same treatment (see rewriteMotion). Production builds never run this.
 */
const DARK = /\(prefers-color-scheme:\s*dark\)/
const LIGHT = /\(prefers-color-scheme:\s*light\)/
const RT = /\(prefers-reduced-transparency:\s*reduce\)/
const RM = /\(prefers-reduced-motion:\s*reduce\)/

function prefix(selector: string, extra: string): string {
  return selector
    .split(',')
    .map((s) => {
      const t = s.trim()
      return t.startsWith(':root') ? `:root${extra}${t.slice(5)}` : `:root${extra} ${t}`
    })
    .join(', ')
}

/** Rules inside an at-rule, without the keyframe steps. */
function rulesIn(at: AtRule): Rule[] {
  const rules: Rule[] = []
  at.walkRules((r) => {
    if (r.parent?.type === 'atrule' && (r.parent as AtRule).name.endsWith('keyframes')) return
    rules.push(r)
  })
  return rules
}

/**
 * Reduce Motion: the Mac's setting is ignored under `:root.force-motion` (motion on), and
 * `:root.preview-rm` turns the reduced-motion rules on without it (motion off).
 */
function rewriteMotion(at: AtRule): void {
  const rest = at.params.replace(RM, '').replace(/^\s*and\s*|\s*and\s*$/g, '').trim()
  const rules = rulesIn(at)
  const forced = rules.map((r) => r.clone({ selector: prefix(r.selector, '.preview-rm') }))
  if (rest) {
    const wrap = postcss.atRule({ name: 'media', params: rest })
    for (const f of forced) wrap.append(f)
    at.after(wrap)
  } else {
    for (const f of forced.reverse()) at.after(f)
  }
  for (const r of rules) r.selector = prefix(r.selector, ':not(.force-motion)')
}

function rewrite(root: Root): void {
  root.walkAtRules('media', (at: AtRule) => {
    const p = at.params
    if (RM.test(p)) return rewriteMotion(at)
    const dark = DARK.test(p)
    const light = LIGHT.test(p)
    const rt = RT.test(p)
    if (!dark && !light && !rt) return
    const rest = p.replace(DARK, '').replace(LIGHT, '').replace(RT, '').replace(/^\s*and\s*|\s*and\s*$/g, '').replace(/\s*and\s+and\s*/g, ' and ').trim()
    if (rest) return // other conditions (print, widths): leave alone
    const theme = dark ? '[data-theme="dark"]' : light ? '[data-theme="light"]' : ''
    const rules = rulesIn(at)
    // The forced copy, outside the media query.
    const forced = rules.map((r) => r.clone({ selector: prefix(r.selector, (rt ? '.preview-rt' : '') + theme) }))
    // With RT + a colour scheme on "Auto": the RT copy still follows the system scheme.
    if (rt && theme) {
      const auto = postcss.atRule({ name: 'media', params: dark ? '(prefers-color-scheme: dark)' : '(prefers-color-scheme: light)' })
      for (const r of rules) auto.append(r.clone({ selector: prefix(r.selector, `.preview-rt:not(${dark ? '[data-theme="light"]' : '[data-theme="dark"]'})`) }))
      at.after(auto)
    }
    for (const f of forced.reverse()) at.after(f)
    // The original: a forced opposite theme turns it off.
    if (theme) {
      const guard = dark ? ':not([data-theme="light"])' : ':not([data-theme="dark"])'
      for (const r of rules) r.selector = prefix(r.selector, guard)
    }
  })
}

export const themePreview: PluginCreator<void> = () => ({
  postcssPlugin: 'theme-preview',
  Once: rewrite,
})
themePreview.postcss = true

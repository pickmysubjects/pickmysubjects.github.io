export type Params = Record<string, string | number>
export type Translate = (key: string, params?: Params) => string

/** Fills {name} placeholders. Kept free of Vue so build scripts can use it too. */
export function interpolate(text: string, params: Params = {}): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

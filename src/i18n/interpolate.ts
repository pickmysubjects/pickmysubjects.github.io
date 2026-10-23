export type Params = Record<string, string | number>
export type Translate = (key: string, params?: Params) => string

/** Fills {name} placeholders. Kept free of Vue so build scripts can use it too. */
export function interpolate(text: string, params: Params = {}): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

/** Items as one list in the reader's language: "A, B" in English, "A、B" in Chinese and Japanese. */
export function joinList(t: Translate, items: readonly (string | number)[]): string {
  return items.join(t('listSep'))
}

/** An engine list param ("A, B": codes, skills, topics), re-joined for the reader. */
export function localList(t: Translate, list: unknown, each: (x: string) => string = (x) => x): string {
  return joinList(
    t,
    String(list ?? '')
      .split(/,\s*/)
      .filter(Boolean)
      .map(each),
  )
}

/**
 * The majors list's choices (degree, kind, field, search) live in its address, e.g.
 * /majors/?degree=B-ARTS&kind=minor&field=…&q=…, so Back from a major, a reload or a shared link
 * opens the list as it was left.
 */
export const MAJOR_KINDS = ['major', 'minor', 'specialisation', 'informal'] as const
export type MajorKind = (typeof MAJOR_KINDS)[number]

export interface MajorsChoice {
  degree: string
  kind: string
  field: string
  q: string
}

/** The choices as written in the address (unchecked: the list falls back for unknown ones). */
export function majorsFromQuery(query: URLSearchParams): MajorsChoice {
  return { degree: query.get('degree') ?? '', kind: query.get('kind') ?? '', field: query.get('field') ?? '', q: query.get('q') ?? '' }
}

/** The list's address for these choices; a choice equal to the page's default is left out. */
export function majorsAddress(c: MajorsChoice, defaults: { degree: string; kind: string }): string {
  const q = new URLSearchParams()
  if (c.degree && c.degree !== defaults.degree) q.set('degree', c.degree)
  if (c.kind && c.kind !== defaults.kind) q.set('kind', c.kind)
  if (c.field) q.set('field', c.field)
  if (c.q) q.set('q', c.q)
  const s = q.toString()
  return s ? `majors/?${s}` : 'majors/'
}

// The list once had a section per kind; links to those sections open that kind.
const OLD_ANCHORS: Record<string, MajorKind> = { 'majors-title': 'major', 'minors-title': 'minor', 'specs-title': 'specialisation', 'informals-title': 'informal' }

/** The kind an old /majors/#minors-title style link meant, or null. */
export function majorsAnchorKind(hash: string): MajorKind | null {
  return OLD_ANCHORS[hash.replace(/^#/, '')] ?? null
}

const LAST_LIST = 'sc:majors-list'
/** Remembers the list's address (this tab only), so a major's "All majors" link returns to it. */
export function rememberMajorsList(address: string): void {
  try {
    sessionStorage.setItem(LAST_LIST, address)
  } catch {
    // Storage blocked: the link opens the plain list.
  }
}
/** The list's last address in this tab, or the plain list. */
export function lastMajorsList(): string {
  try {
    const a = sessionStorage.getItem(LAST_LIST)
    return a && a.startsWith('majors/') ? a : 'majors/'
  } catch {
    return 'majors/'
  }
}

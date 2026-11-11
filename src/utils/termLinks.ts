/**
 * Terms in the guide's text that have a page of their own on this site ("census date" → the key
 * dates, "WAM" → how WAM works, a subject code → that subject), so a student reading one page is
 * one tap from the next. The guide keeps these terms in English in every language (墨大 students
 * see them in English at uni), so one list serves all nine; Japanese and Korean also write
 * "hurdle" in their own script.
 *
 * Rules: each term links once per section (its first mention), never to the section it sits in,
 * and never to the page it's on when it points at the whole page.
 */
export interface TermTarget {
  id: string
  /** Where it links, without the language prefix ("guide/semester/#hurdles"). */
  to: string
  pattern: RegExp
}

// Latin terms only match as whole words; CJK text around them ("census日期") is fine.
const word = (s: string, flags = 'i') => new RegExp(`(?<![\\w.-])(?:${s})(?![\\w-])`, flags)

export const TERM_TARGETS: TermTarget[] = [
  { id: 'census', to: 'guide/key-dates/', pattern: word('census(?: date)?') },
  { id: 'swotvac', to: 'guide/key-dates/', pattern: word('SWOT Vac') },
  { id: 'wam', to: 'guide/basics/#wam', pattern: word('WAM', '') },
  { id: 'special', to: 'guide/semester/#special-consideration', pattern: word('special consideration') },
  { id: 'hurdle', to: 'guide/semester/#hurdles', pattern: /(?<![\w.-])hurdles?(?![\w-])|ハードル|허들/i },
  { id: 'timetable', to: 'guide/enrolling/#timetable', pattern: word('MyTimetable', '') },
  { id: 'hecs', to: 'guide/enrolling/#fees', pattern: word('HECS-HELP', '') },
  { id: 'breadth', to: 'subjects/breadth/', pattern: word('breadth') },
]

const CODE = /(?<![A-Za-z0-9])[A-Z]{4}\d{5}(?!\d)/

export interface TermSegment {
  text: string
  /** Set on a linked term: its target, without the language prefix. */
  to?: string
}

export interface TermContext {
  /** The page being read, without the language prefix ("guide/semester/"). */
  page: string
  /** The section it sits in (its anchor id), when known. */
  section?: string
  /** Subject codes that have a page; other codes stay plain text. */
  subjects?: ReadonlySet<string>
  /**
   * Terms already linked in this section: a term links only at its first mention. Returns false
   * when another mention already has it.
   */
  claim: (id: string) => boolean
}

/** Whether a target is where the reader already is: the same section, or the same whole page. */
function isHere(to: string, ctx: TermContext): boolean {
  const [page, anchor] = to.split('#')
  if (page !== ctx.page) return false
  return anchor === undefined || anchor === ctx.section
}

/** The text cut into plain runs and linked terms. Pure: the guide page and its static HTML share it. */
export function termSegments(text: string, ctx: TermContext): TermSegment[] {
  const out: TermSegment[] = []
  // Once per text as well: the section's claim lets the same sentence keep its link on a re-render.
  const linked = new Set<string>()
  let rest = text
  for (;;) {
    // The earliest term (or code) still in the text; ties go to the longer match.
    let best: { index: number; length: number; to: string; id: string } | null = null
    for (const t of TERM_TARGETS) {
      const m = t.pattern.exec(rest)
      if (m && (!best || m.index < best.index || (m.index === best.index && m[0].length > best.length))) best = { index: m.index, length: m[0].length, to: t.to, id: t.id }
    }
    const code = CODE.exec(rest)
    if (code && ctx.subjects?.has(code[0]) && (!best || code.index < best.index)) best = { index: code.index, length: code[0].length, to: `subject/${code[0]}/`, id: `subject-${code[0]}` }
    if (!best) break
    const before = rest.slice(0, best.index)
    const match = rest.slice(best.index, best.index + best.length)
    if (before) out.push({ text: before })
    if (!linked.has(best.id) && !isHere(best.to, ctx) && ctx.claim(best.id)) {
      linked.add(best.id)
      out.push({ text: match, to: best.to })
    }
    else out.push({ text: match })
    rest = rest.slice(best.index + best.length)
  }
  if (rest) out.push({ text: rest })
  // Adjacent plain runs back together, so a sentence with nothing linked is one run.
  return out.reduce<TermSegment[]>((acc, s) => {
    const last = acc[acc.length - 1]
    if (last && !last.to && !s.to) last.text += s.text
    else acc.push({ ...s })
    return acc
  }, [])
}

/** A claim function for one section: each term id once. Re-claiming by the same owner is allowed. */
export function sectionClaims(): (id: string, owner: unknown) => boolean {
  const owners = new Map<string, unknown>()
  return (id, owner) => {
    const had = owners.get(id)
    if (had !== undefined && had !== owner) return false
    owners.set(id, owner)
    return true
  }
}

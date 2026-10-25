import type { Translate } from '../i18n/interpolate'
import { diffCounts, type SubjectChange, type YearDiff } from '../engine/yearDiff'

/** One line of the changes page: a subject or major (linked), and what changed about it. */
export interface ChangeItem {
  kind: 'subject' | 'major'
  id: string // subject code or component id
  label: string
  details: string[]
}

export interface ChangeSection {
  key: string
  title: string
  items: ChangeItem[]
}

interface Names {
  subjectTitle: (code: string) => string | undefined
  componentTitle: (id: string) => string | undefined
  listSep: string
}

function changeText(t: Translate, c: SubjectChange, sep: string): string {
  const periods = (ps: string[]) => (ps.length ? ps.map((p) => t(`periodShort.${p}`)).join(sep) : t('changes.notOffered'))
  switch (c.field) {
    case 'periods':
      return t('changes.periods', { from: periods(c.from), to: periods(c.to) })
    case 'prerequisites':
      return [t('changes.prereq'), c.added.length ? t('changes.prereqAdded', { codes: c.added.join(sep) }) : '', c.removed.length ? t('changes.prereqRemoved', { codes: c.removed.join(sep) }) : '']
        .filter(Boolean)
        .join(' ')
    case 'exam':
      return t('changes.exam', { from: Math.round(c.from), to: Math.round(c.to) })
    case 'points':
      return t('changes.points', { from: c.from, to: c.to })
    case 'title':
      return t('changes.title', { from: c.from })
  }
}

/** The page's summary line: counts, the ones that are zero left out. */
export function changesSummary(t: Translate, d: YearDiff, sep: string): string {
  const n = diffCounts(d)
  return (['added', 'discontinued', 'changed', 'majors'] as const)
    .filter((k) => n[k] > 0)
    .map((k) => t(`changes.count.${k}`, { n: n[k] }))
    .join(sep)
}

/** The page's lists, grouped: new subjects, ones that stop, ones that changed, then majors. */
export function changeSections(t: Translate, d: YearDiff, names: Names): ChangeSection[] {
  const subject = (code: string, details: string[] = []): ChangeItem => ({ kind: 'subject', id: code, label: [code, names.subjectTitle(code)].filter(Boolean).join(' '), details })
  const major = (id: string, details: string[] = []): ChangeItem => ({ kind: 'major', id, label: names.componentTitle(id) ?? id, details })
  const sections: ChangeSection[] = [
    { key: 'added', title: t('changes.added'), items: d.subjects.added.map((c) => subject(c)) },
    { key: 'discontinued', title: t('changes.discontinued'), items: d.subjects.discontinued.map((c) => subject(c)) },
    { key: 'changed', title: t('changes.changed'), items: d.subjects.changed.map((x) => subject(x.code, x.changes.map((c) => changeText(t, c, names.listSep)))) },
    {
      key: 'majors',
      title: t('changes.majors'),
      items: [
        ...d.components.added.map((id) => major(id, [t('changes.majorNew')])),
        ...d.components.closed.map((id) => major(id, [t('changes.majorClosed')])),
        ...d.components.changed.map((x) =>
          major(x.id, [
            x.added.length ? t('changes.coreAdded', { codes: x.added.join(names.listSep) }) : '',
            x.removed.length ? t('changes.coreRemoved', { codes: x.removed.join(names.listSep) }) : '',
          ].filter(Boolean)),
        ),
      ],
    },
  ]
  return sections.filter((s) => s.items.length > 0)
}

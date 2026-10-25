import { computed, shallowReactive, watch, type Ref } from 'vue'
import { defaultCourse, forCourse, type Dataset } from '@/engine'
import { detailArea, withDetail, type SubjectDetail } from '@/engine/split'
import { activePlan, books } from './planStore'

/*
 * The UniMelb data (the demo set is for tests and the data scripts only) is fetched, not bundled:
 * a lean core (hashed file name, so safe to cache) is loaded before the app mounts, and each
 * area's long text (about, discussion summaries, breadth lists) when one of its subjects is opened.
 */
import coreUrl from '@/generated/real-core.json?url'
const detailUrls = import.meta.glob<string>('@/generated/detail/*.json', { query: '?url', import: 'default', eager: true })

let real: Dataset | undefined

/** Loads the core data; call (and wait) once before mounting the app. */
export async function loadDataset(): Promise<void> {
  if (real) return
  const res = await fetch(coreUrl)
  if (!res.ok) throw new Error(`Couldn't load the subject data (${res.status})`)
  real = (await res.json()) as Dataset
}

/** For tests: use data that's already in memory instead of fetching it. */
export function provideDataset(data: Dataset): void {
  real = data
}

function loaded(): Dataset {
  if (!real) throw new Error('useDataset() before loadDataset() finished')
  return real
}

export function useDataset() {
  const real = loaded()
  // Seen as a student of the planned course (or the default one) sees it.
  const course = computed(() => activePlan(books.value[real.name])?.setup.course ?? defaultCourse(real))
  const data = computed(() => forCourse(real, course.value))
  const subjectList = computed(() => Object.values(data.value.subjects).sort((a, b) => a.code.localeCompare(b.code)))
  const topics = computed(() => [...new Set(subjectList.value.flatMap((s) => s.topics))].sort())
  // Saved plans and profiles are kept per data set; this is the one name they live under.
  const name = computed(() => real.name)
  // The whole data set, for looking at another plan's course (comparing plans).
  const all = real
  return { name, course, data, all, subjectList, topics }
}

// Loaded areas, and the requests in flight (one per area).
const areas = shallowReactive(new Map<string, Record<string, SubjectDetail>>())
const pending = new Map<string, Promise<void>>()

function loadArea(area: string): Promise<void> {
  if (areas.has(area)) return Promise.resolve()
  let p = pending.get(area)
  if (!p) {
    const url = Object.entries(detailUrls).find(([path]) => path.endsWith(`/${area}.json`))?.[1]
    p = (url ? fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))) : Promise.resolve({}))
      .then((part: Record<string, SubjectDetail>) => void areas.set(area, part))
      .catch(() => void pending.delete(area)) // offline: try again next time
    pending.set(area, p)
  }
  return p
}

/**
 * The subject `code` with its long text put back once its area has loaded; until then (or if
 * the request fails) the core subject, with `ready` false, so the page shows the rest at once.
 */
export function useSubjectDetail(code: Readonly<Ref<string>>) {
  const { data } = useDataset()
  watch(code, (c) => void loadArea(detailArea(c)), { immediate: true })
  const ready = computed(() => areas.has(detailArea(code.value)))
  const subject = computed(() => {
    const s = data.value.subjects[code.value]
    return s && withDetail(s, areas.get(detailArea(code.value))?.[code.value])
  })
  const takenWith = computed(() => areas.get(detailArea(code.value))?.[code.value]?.takenWith ?? [])
  return { subject, ready, takenWith }
}

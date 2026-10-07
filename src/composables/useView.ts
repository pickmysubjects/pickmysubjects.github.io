import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'

export const VIEWS = ['home', 'subject', 'plan', 'recommend', 'record', 'contribute', 'feedback', 'privacy'] as const
export type View = (typeof VIEWS)[number]

interface Route {
  view: View
  /** Path parameter, e.g. the code in #/subject/COMP30027. */
  param: string
  query: URLSearchParams
}

function parse(): Route {
  const [path = '', search = ''] = location.hash.replace(/^#\/?/, '').split('?')
  const [head = '', param = ''] = path.split('/')
  const view = (VIEWS as readonly string[]).includes(head) ? (head as View) : 'home'
  return { view, param: decodeURIComponent(param), query: new URLSearchParams(search) }
}

/**
 * The current view, its parameter and query, kept in the URL hash
 * (e.g. #/subject/COMP30027 or #/feedback?topic=data) so pages can be linked to.
 */
export function useView() {
  const route = shallowRef(parse())
  const sync = () => {
    route.value = parse()
    window.scrollTo({ top: 0 })
  }
  onMounted(() => window.addEventListener('hashchange', sync))
  onBeforeUnmount(() => window.removeEventListener('hashchange', sync))
  return {
    view: computed(() => route.value.view),
    param: computed(() => route.value.param),
    query: computed(() => route.value.query),
  }
}

export function go(path: string): void {
  location.hash = `#/${path}`
}

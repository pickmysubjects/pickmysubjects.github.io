import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'

export const VIEWS = ['plan', 'recommend', 'record', 'contribute', 'feedback'] as const
export type View = (typeof VIEWS)[number]

function parse(): { view: View; query: URLSearchParams } {
  const [path = '', search = ''] = location.hash.replace(/^#\/?/, '').split('?')
  const view = (VIEWS as readonly string[]).includes(path) ? (path as View) : 'plan'
  return { view, query: new URLSearchParams(search) }
}

/**
 * The current view and its query, kept in the URL hash (e.g. #/feedback?subject=COMP30027)
 * so it survives reloads and can be linked to.
 */
export function useView() {
  const route = shallowRef(parse())
  const sync = () => {
    route.value = parse()
  }
  onMounted(() => window.addEventListener('hashchange', sync))
  onBeforeUnmount(() => window.removeEventListener('hashchange', sync))
  return {
    view: computed(() => route.value.view),
    query: computed(() => route.value.query),
  }
}

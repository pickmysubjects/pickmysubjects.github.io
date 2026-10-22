import { onBeforeUnmount, shallowRef } from 'vue'

/** True on phone-width screens (≤ 560px), kept up to date as the window changes. */
export function usePhone(query = '(max-width: 560px)') {
  const mq = typeof matchMedia === 'undefined' ? null : matchMedia(query)
  const phone = shallowRef(mq?.matches ?? false)
  const update = (e: MediaQueryListEvent) => (phone.value = e.matches)
  mq?.addEventListener('change', update)
  onBeforeUnmount(() => mq?.removeEventListener('change', update))
  return phone
}

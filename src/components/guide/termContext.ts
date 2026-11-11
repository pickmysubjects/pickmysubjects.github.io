import type { InjectionKey, Ref } from 'vue'

/** The guide page being read, without the language prefix ("guide/semester/"), for TermText. */
export const GUIDE_PAGE: InjectionKey<Ref<string>> = Symbol('guidePage')

/** One guide section: its anchor id and which terms already have their link in it. */
export interface GuideSection {
  id: string | undefined
  claim: (id: string, owner: unknown) => boolean
}
export const GUIDE_SECTION: InjectionKey<GuideSection> = Symbol('guideSection')

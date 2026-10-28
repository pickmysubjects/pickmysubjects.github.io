import { defineAsyncComponent, type Component } from 'vue'
import { MENUS } from '@/components/layout/nav'
import { anchorTitleKey, GUIDE_FEATURED, type GuidePageSlug } from '@/utils/guideSections'
import { MINI_ART } from './art/minis'

export interface GuidePageCardData {
  slug: GuidePageSlug
  to: string
  /** The page's short name (the 墨大入门 menu's). */
  name: string
  art: Component
  /** The places students look for most on the page, each a link straight to it. */
  links: { to: string; key: string }[]
}

/** The three pages a new student starts with. */
export const GUIDE_START: readonly GuidePageSlug[] = ['basics', 'systems', 'enrolling']

/** Every guide page but the overview and key dates, in menu order, as a card. */
export const GUIDE_PAGE_CARDS: GuidePageCardData[] = MENUS.find((m) => m.area === 'guide')!
  .items.filter((i) => i.to !== 'guide/' && i.to !== 'guide/key-dates/')
  .map((i) => {
    const slug = i.to.split('/')[1] as GuidePageSlug
    return {
      slug,
      to: i.to,
      name: i.key,
      art: defineAsyncComponent(MINI_ART[slug]),
      links: GUIDE_FEATURED[slug].map((a) => ({ to: `${i.to}#${a}`, key: anchorTitleKey(a) })),
    }
  })

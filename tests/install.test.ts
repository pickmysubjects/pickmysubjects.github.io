import { describe, expect, it } from 'vitest'
import { installWay, isIos } from '@/utils/install'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const IPAD_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const WECHAT = `${IPHONE} MicroMessenger/8.0.50(0x1800322c) NetType/WIFI Language/zh_CN`

describe('adding the site to the home screen', () => {
  it('says nothing once it is there', () => {
    expect(installWay({ ua: ANDROID, standalone: true, hasPrompt: true })).toBe('done')
  })

  it("uses the browser's own prompt when there is one", () => {
    expect(installWay({ ua: ANDROID, standalone: false, hasPrompt: true })).toBe('prompt')
  })

  it("points an iPhone to the Share button, and an iPad asking for desktop pages too", () => {
    expect(installWay({ ua: IPHONE, standalone: false, hasPrompt: false })).toBe('ios')
    expect(isIos(IPAD_DESKTOP, 5)).toBe(true)
    // A real Mac has no touch points.
    expect(isIos(IPAD_DESKTOP, 0)).toBe(false)
  })

  it("sends an in-app browser (WeChat) to a real browser first", () => {
    expect(installWay({ ua: WECHAT, standalone: false, hasPrompt: false })).toBe('in-app')
  })

  it("falls back to the browser's menu with no prompt (Firefox on Android)", () => {
    expect(installWay({ ua: ANDROID.replace('Chrome/130.0.0.0', 'Firefox/132.0'), standalone: false, hasPrompt: false })).toBe('menu')
  })
})

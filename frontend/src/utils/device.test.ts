import { afterEach, describe, expect, it, vi } from 'vitest'
import { isMobileDevice } from './device'

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36',
  ipadOs: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
}

const stubNavigator = (userAgent: string, maxTouchPoints = 0, userAgentData?: { mobile: boolean }) =>
  vi.stubGlobal('navigator', { userAgent, maxTouchPoints, userAgentData })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isMobileDevice', () => {
  it.each([
    ['iPhone', UA.iphone, 5],
    ['Android phone', UA.android, 5],
    ['iPad (reports itself as a Mac)', UA.ipadOs, 5],
  ])('is true for %s', (_, ua, touchPoints) => {
    stubNavigator(ua, touchPoints)
    expect(isMobileDevice()).toBe(true)
  })

  it.each([
    ['Mac desktop', UA.macChrome],
    ['Windows desktop', UA.windows],
  ])('is false for %s', (_, ua) => {
    stubNavigator(ua, 0)
    expect(isMobileDevice()).toBe(false)
  })

  it('is false for a touchscreen Windows laptop', () => {
    stubNavigator(UA.windows, 10)
    expect(isMobileDevice()).toBe(false)
  })

  it('trusts userAgentData.mobile when available', () => {
    stubNavigator(UA.windows, 0, { mobile: true })
    expect(isMobileDevice()).toBe(true)
  })
})

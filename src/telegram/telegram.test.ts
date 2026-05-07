import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTelegramThemeToCss } from './theme'
import type { TelegramWebApp } from './types'
import { getTelegramWebApp, isTelegramMiniApp } from './webapp'

function makeWebApp(overrides: Partial<TelegramWebApp> = {}): TelegramWebApp {
  return {
    initData: '',
    initDataUnsafe: {},
    version: '7.0',
    platform: 'unknown',
    colorScheme: 'light',
    themeParams: {},
    isExpanded: true,
    viewportHeight: 800,
    viewportStableHeight: 800,
    headerColor: '#ffffff',
    backgroundColor: '#ffffff',
    isClosingConfirmationEnabled: false,
    ready: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    enableClosingConfirmation: vi.fn(),
    disableClosingConfirmation: vi.fn(),
    onEvent: vi.fn(),
    offEvent: vi.fn(),
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
    MainButton: {
      text: '',
      color: '',
      textColor: '',
      isVisible: false,
      isActive: false,
      isProgressVisible: false,
      setText: vi.fn().mockReturnThis(),
      onClick: vi.fn().mockReturnThis(),
      offClick: vi.fn().mockReturnThis(),
      show: vi.fn().mockReturnThis(),
      hide: vi.fn().mockReturnThis(),
      enable: vi.fn().mockReturnThis(),
      disable: vi.fn().mockReturnThis(),
      setParams: vi.fn().mockReturnThis(),
    },
    BackButton: {
      isVisible: false,
      onClick: vi.fn().mockReturnThis(),
      offClick: vi.fn().mockReturnThis(),
      show: vi.fn().mockReturnThis(),
      hide: vi.fn().mockReturnThis(),
    },
    ...overrides,
  } as TelegramWebApp
}

describe('telegram detection', () => {
  beforeEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram
    document.documentElement.removeAttribute('data-telegram')
    document.documentElement.removeAttribute('data-telegram-scheme')
    document.documentElement.style.cssText = ''
  })

  afterEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram
  })

  it('returns null when the SDK is absent', () => {
    expect(getTelegramWebApp()).toBeNull()
    expect(isTelegramMiniApp()).toBe(false)
  })

  it('treats a stub SDK without initData and unknown platform as not in Telegram', () => {
    window.Telegram = { WebApp: makeWebApp({ initData: '', platform: 'unknown' }) }
    expect(getTelegramWebApp()).not.toBeNull()
    expect(isTelegramMiniApp()).toBe(false)
  })

  it('detects Telegram when initData is present', () => {
    window.Telegram = { WebApp: makeWebApp({ initData: 'auth_date=1&hash=abc' }) }
    expect(isTelegramMiniApp()).toBe(true)
  })

  it('detects Telegram when the platform is recognised even without initData', () => {
    window.Telegram = { WebApp: makeWebApp({ initData: '', platform: 'tdesktop' }) }
    expect(isTelegramMiniApp()).toBe(true)
  })
})

describe('applyTelegramThemeToCss', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-telegram')
    document.documentElement.removeAttribute('data-telegram-scheme')
    document.documentElement.style.cssText = ''
  })

  it('sets data attributes and CSS variables from theme params', () => {
    const wa = makeWebApp({
      colorScheme: 'light',
      themeParams: {
        bg_color: '#ffffff',
        text_color: '#101010',
        button_color: '#2481cc',
      },
    })

    applyTelegramThemeToCss(wa)

    expect(document.documentElement.dataset.telegram).toBe('true')
    expect(document.documentElement.dataset.telegramScheme).toBe('light')
    expect(document.documentElement.style.getPropertyValue('--tg-bg')).toBe('#ffffff')
    expect(document.documentElement.style.getPropertyValue('--tg-text')).toBe('#101010')
    expect(document.documentElement.style.getPropertyValue('--tg-button')).toBe('#2481cc')
    // In light mode the paper override should not be set, so the base theme wins.
    expect(document.documentElement.style.getPropertyValue('--paper')).toBe('')
  })

  it('overrides paper colors in dark mode', () => {
    const wa = makeWebApp({
      colorScheme: 'dark',
      themeParams: {
        bg_color: '#101010',
        secondary_bg_color: '#070707',
        text_color: '#f5f5f5',
        hint_color: '#9aa0a6',
      },
    })

    applyTelegramThemeToCss(wa)

    expect(document.documentElement.dataset.telegramScheme).toBe('dark')
    expect(document.documentElement.style.getPropertyValue('--paper')).toBe('#101010')
    expect(document.documentElement.style.getPropertyValue('--paper-dark')).toBe('#070707')
    expect(document.documentElement.style.getPropertyValue('--ink')).toBe('#f5f5f5')
    expect(document.documentElement.style.getPropertyValue('--ink-muted')).toBe('#9aa0a6')
  })
})

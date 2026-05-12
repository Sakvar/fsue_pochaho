import { afterEach, describe, expect, it, vi } from 'vitest'
import { initTelegramMiniApp, shareOutcomeText, telegramImpact } from '@/integrations/telegram'

describe('telegram mini app integration', () => {
  afterEach(() => {
    delete window.Telegram
    document.body.classList.remove('runtime-telegram-mini-app')
    document.documentElement.style.removeProperty('--tg-viewport-height')
    document.documentElement.style.removeProperty('--tg-bg-color')
  })

  it('stays in browser mode when Telegram SDK is absent', () => {
    const cleanup = initTelegramMiniApp()
    expect(typeof cleanup).toBe('function')
    expect(document.body.classList.contains('runtime-telegram-mini-app')).toBe(false)
  })

  it('initializes Telegram runtime and cleans up listeners', () => {
    const onEvent = vi.fn()
    const offEvent = vi.fn()
    const ready = vi.fn()
    const expand = vi.fn()

    window.Telegram = {
      WebApp: {
        initData: 'signed_payload',
        ready,
        expand,
        onEvent,
        offEvent,
        themeParams: {
          bg_color: '#101010',
        },
        viewportHeight: 640,
      },
    }

    const cleanup = initTelegramMiniApp()

    expect(ready).toHaveBeenCalledTimes(1)
    expect(expand).toHaveBeenCalledTimes(1)
    expect(onEvent).toHaveBeenCalledWith('themeChanged', expect.any(Function))
    expect(onEvent).toHaveBeenCalledWith('viewportChanged', expect.any(Function))
    expect(document.body.classList.contains('runtime-telegram-mini-app')).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--tg-bg-color')).toBe('#101010')
    expect(document.documentElement.style.getPropertyValue('--tg-viewport-height')).toBe('640px')

    cleanup()

    expect(offEvent).toHaveBeenCalledWith('themeChanged', expect.any(Function))
    expect(offEvent).toHaveBeenCalledWith('viewportChanged', expect.any(Function))
    expect(document.body.classList.contains('runtime-telegram-mini-app')).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--tg-viewport-height')).toBe('')
  })

  it('triggers haptic feedback only inside Telegram runtime', () => {
    const impactOccurred = vi.fn()
    window.Telegram = {
      WebApp: {
        initData: 'signed_payload',
        ready: vi.fn(),
        expand: vi.fn(),
        HapticFeedback: {
          impactOccurred,
        },
      },
    }

    telegramImpact('heavy')
    expect(impactOccurred).toHaveBeenCalledWith('heavy')

    delete window.Telegram
    telegramImpact('medium')
    expect(impactOccurred).toHaveBeenCalledTimes(1)
  })

  it('shares text via openTelegramLink in telegram runtime', () => {
    const openTelegramLink = vi.fn()
    window.Telegram = {
      WebApp: {
        initData: 'signed_payload',
        ready: vi.fn(),
        expand: vi.fn(),
        openTelegramLink,
      },
    }

    shareOutcomeText('Исход засекречен')

    expect(openTelegramLink).toHaveBeenCalledTimes(1)
    const url = new URL(openTelegramLink.mock.calls[0][0] as string)
    expect(url.hostname).toBe('t.me')
    expect(url.pathname).toBe('/share/url')
    expect(url.searchParams.get('text')).toBe('Исход засекречен')
  })
})

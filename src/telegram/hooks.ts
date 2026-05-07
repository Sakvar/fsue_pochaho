import { useEffect, useState } from 'react'
import { getTelegramWebApp, isTelegramMiniApp } from './webapp'
import type { TelegramWebApp } from './types'

/** Reactive wrapper that returns the WebApp instance only when in Telegram. */
export function useTelegramWebApp(): TelegramWebApp | null {
  const [wa] = useState<TelegramWebApp | null>(() => (isTelegramMiniApp() ? getTelegramWebApp() : null))
  return wa
}

/**
 * Configures the Telegram MainButton while the component is mounted. Hides
 * the button on unmount or when the controller is disabled. No-op outside
 * Telegram.
 */
export function useTelegramMainButton(options: {
  enabled: boolean
  text: string
  onClick: () => void
  color?: string
  textColor?: string
}): void {
  const { enabled, text, onClick, color, textColor } = options
  const wa = useTelegramWebApp()

  useEffect(() => {
    if (!wa) return
    const button = wa.MainButton
    if (!button) return

    if (!enabled) {
      try {
        button.hide()
      } catch {
        /* noop */
      }
      return
    }

    try {
      button.setParams({
        text,
        ...(color ? { color } : {}),
        ...(textColor ? { text_color: textColor } : {}),
        is_active: true,
        is_visible: true,
      })
      button.onClick(onClick)
    } catch {
      /* noop */
    }

    return () => {
      try {
        button.offClick(onClick)
        button.hide()
      } catch {
        /* noop */
      }
    }
  }, [wa, enabled, text, onClick, color, textColor])
}

/**
 * Shows the Telegram BackButton and subscribes a handler. The button is
 * hidden when the component unmounts or when `enabled` is false.
 */
export function useTelegramBackButton(options: { enabled: boolean; onClick: () => void }): void {
  const { enabled, onClick } = options
  const wa = useTelegramWebApp()

  useEffect(() => {
    if (!wa) return
    const button = wa.BackButton
    if (!button) return

    if (!enabled) {
      try {
        button.hide()
      } catch {
        /* noop */
      }
      return
    }

    try {
      button.onClick(onClick)
      button.show()
    } catch {
      /* noop */
    }

    return () => {
      try {
        button.offClick(onClick)
        button.hide()
      } catch {
        /* noop */
      }
    }
  }, [wa, enabled, onClick])
}

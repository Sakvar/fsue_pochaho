import type {
  TelegramHapticImpactStyle,
  TelegramHapticNotificationType,
  TelegramWebApp,
} from './types'

/** Returns the Telegram WebApp object if the page is running inside Telegram. */
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  const wa = window.Telegram?.WebApp
  if (!wa) return null
  // The SDK script can be present even in regular browsers; treat the app as
  // running inside Telegram only when the host actually supplied initData.
  // A genuine launch always carries a non-empty `initData` string.
  return wa
}

/**
 * Detects whether the page is actually being rendered inside Telegram. The
 * SDK injects `window.Telegram.WebApp` even in regular browsers when the
 * script loads, so we additionally check for the launch payload.
 */
export function isTelegramMiniApp(): boolean {
  const wa = getTelegramWebApp()
  if (!wa) return false
  if (typeof wa.initData === 'string' && wa.initData.length > 0) return true
  // Some web preview clients omit initData but still set a recognised
  // platform identifier ("ios", "android", "tdesktop", etc.). The SDK fallback
  // platform in regular browsers is "unknown".
  return typeof wa.platform === 'string' && wa.platform !== 'unknown'
}

export function safeVersionAtLeast(wa: TelegramWebApp | null, version: string): boolean {
  if (!wa) return false
  if (typeof wa.isVersionAtLeast === 'function') {
    try {
      return wa.isVersionAtLeast(version)
    } catch {
      return false
    }
  }
  return false
}

export function impact(style: TelegramHapticImpactStyle = 'light'): void {
  const wa = getTelegramWebApp()
  try {
    wa?.HapticFeedback?.impactOccurred(style)
  } catch {
    /* noop */
  }
}

export function notify(type: TelegramHapticNotificationType): void {
  const wa = getTelegramWebApp()
  try {
    wa?.HapticFeedback?.notificationOccurred(type)
  } catch {
    /* noop */
  }
}

export function selectionChanged(): void {
  const wa = getTelegramWebApp()
  try {
    wa?.HapticFeedback?.selectionChanged()
  } catch {
    /* noop */
  }
}

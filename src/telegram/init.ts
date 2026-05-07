import { applyTelegramThemeToCss, syncTelegramChrome } from './theme'
import { getTelegramWebApp, isTelegramMiniApp } from './webapp'

let initialized = false

/**
 * Boots the Telegram Mini App integration if the page is running inside
 * Telegram. Safe to call in regular browsers — it's a no-op there.
 *
 * Performs the recommended startup ritual: declares readiness, expands the
 * viewport, applies the host theme, and subscribes to theme/viewport
 * changes so CSS variables stay in sync with the Telegram client.
 */
export function initTelegram(): void {
  if (initialized) return
  if (!isTelegramMiniApp()) return
  const wa = getTelegramWebApp()
  if (!wa) return
  initialized = true

  try {
    wa.ready()
  } catch {
    /* noop */
  }

  try {
    wa.expand()
  } catch {
    /* noop */
  }

  applyTelegramThemeToCss(wa)
  syncTelegramChrome(wa)
  applyViewportHeightVar(wa)

  const onThemeChanged = () => {
    applyTelegramThemeToCss(wa)
    syncTelegramChrome(wa)
  }
  const onViewportChanged = () => {
    applyViewportHeightVar(wa)
  }

  try {
    wa.onEvent('themeChanged', onThemeChanged)
    wa.onEvent('viewportChanged', onViewportChanged)
  } catch {
    /* noop */
  }
}

function applyViewportHeightVar(wa: { viewportStableHeight?: number; viewportHeight?: number }): void {
  const root = document.documentElement
  const height = wa.viewportStableHeight ?? wa.viewportHeight
  if (typeof height === 'number' && Number.isFinite(height) && height > 0) {
    root.style.setProperty('--tg-viewport-height', `${height}px`)
  }
}

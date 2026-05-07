import WebApp from '@twa-dev/sdk'

/** Matches `--paper` in theme.css so Telegram chrome blends with the game. */
const APP_SURFACE = '#e8dcc8'

let telegramMiniAppActive = false

function isTelegramWebAppContext(): boolean {
  return WebApp.initData.length > 0 || WebApp.platform !== 'unknown'
}

function applyContentSafeAreaVars(): void {
  const root = document.documentElement
  const s = WebApp.safeAreaInset
  const c = WebApp.contentSafeAreaInset
  root.style.setProperty('--tg-safe-top', `${s.top}px`)
  root.style.setProperty('--tg-safe-right', `${s.right}px`)
  root.style.setProperty('--tg-safe-bottom', `${s.bottom}px`)
  root.style.setProperty('--tg-safe-left', `${s.left}px`)
  root.style.setProperty('--tg-content-safe-top', `${c.top}px`)
  root.style.setProperty('--tg-content-safe-right', `${c.right}px`)
  root.style.setProperty('--tg-content-safe-bottom', `${c.bottom}px`)
  root.style.setProperty('--tg-content-safe-left', `${c.left}px`)
}

function syncTelegramSurfaceColors(): void {
  try {
    WebApp.setHeaderColor(APP_SURFACE)
    WebApp.setBackgroundColor(APP_SURFACE)
  } catch {
    // Older Telegram clients may reject custom hex values.
  }
}

/**
 * Call once at startup. No-ops in a normal browser; inside Telegram it signals
 * readiness, expands the viewport, and wires safe-area CSS variables.
 */
export function initTelegramMiniApp(): void {
  if (!isTelegramWebAppContext()) {
    telegramMiniAppActive = false
    return
  }

  telegramMiniAppActive = true
  document.documentElement.classList.add('tg-mini-app')

  WebApp.ready()
  WebApp.expand()

  try {
    WebApp.disableVerticalSwipes()
  } catch {
    // Unsupported in some WebView versions.
  }

  syncTelegramSurfaceColors()
  applyContentSafeAreaVars()

  WebApp.onEvent('themeChanged', syncTelegramSurfaceColors)
  WebApp.onEvent('safeAreaChanged', applyContentSafeAreaVars)
  WebApp.onEvent('contentSafeAreaChanged', applyContentSafeAreaVars)
}

export function isTelegramMiniApp(): boolean {
  return telegramMiniAppActive
}

export function telegramChoiceHaptic(): void {
  if (!telegramMiniAppActive) return
  try {
    WebApp.HapticFeedback.selectionChanged()
  } catch {
    // Haptics not available on this platform.
  }
}

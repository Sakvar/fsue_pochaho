import type { TelegramThemeParams, TelegramWebApp } from './types'

/**
 * Translates a Telegram theme into CSS custom properties so the rest of the
 * stylesheet can adapt automatically. The mapping intentionally preserves the
 * paper-and-stamps look in light themes and only swaps the canvas to a darker
 * palette when Telegram requests dark mode. We avoid recolouring the entire
 * art style on each theme change to keep the game's visual identity stable.
 */
export function applyTelegramThemeToCss(wa: TelegramWebApp): void {
  const root = document.documentElement
  const params: TelegramThemeParams = wa.themeParams ?? {}
  const isDark = wa.colorScheme === 'dark'

  root.dataset.telegram = 'true'
  root.dataset.telegramScheme = isDark ? 'dark' : 'light'

  if (params.bg_color) root.style.setProperty('--tg-bg', params.bg_color)
  if (params.secondary_bg_color)
    root.style.setProperty('--tg-secondary-bg', params.secondary_bg_color)
  if (params.text_color) root.style.setProperty('--tg-text', params.text_color)
  if (params.hint_color) root.style.setProperty('--tg-hint', params.hint_color)
  if (params.link_color) root.style.setProperty('--tg-link', params.link_color)
  if (params.button_color) root.style.setProperty('--tg-button', params.button_color)
  if (params.button_text_color)
    root.style.setProperty('--tg-button-text', params.button_text_color)
  if (params.header_bg_color)
    root.style.setProperty('--tg-header-bg', params.header_bg_color)

  // Darken the paper canvas in dark mode without throwing away the warm
  // off-white look in light mode; light Telegram themes keep paper colours.
  if (isDark) {
    root.style.setProperty('--paper', params.bg_color ?? '#1c1814')
    root.style.setProperty('--paper-dark', params.secondary_bg_color ?? '#13110d')
    root.style.setProperty('--ink', params.text_color ?? '#e8dcc8')
    root.style.setProperty('--ink-muted', params.hint_color ?? '#a89c84')
    root.style.setProperty('--border', '#0d0b08')
    root.style.setProperty('--shadow', 'rgba(0, 0, 0, 0.55)')
  } else {
    // Reset any previously set overrides so toggling back to light restores
    // the original palette declared in `theme.css`.
    root.style.removeProperty('--paper')
    root.style.removeProperty('--paper-dark')
    root.style.removeProperty('--ink')
    root.style.removeProperty('--ink-muted')
    root.style.removeProperty('--border')
    root.style.removeProperty('--shadow')
  }
}

/** Sync Telegram chrome (header / background) with the resolved CSS theme. */
export function syncTelegramChrome(wa: TelegramWebApp): void {
  try {
    const isDark = wa.colorScheme === 'dark'
    const headerColor = isDark ? '#13110d' : '#d2c4ae'
    const bgColor = isDark ? '#1c1814' : '#e8dcc8'
    wa.setHeaderColor?.(headerColor)
    wa.setBackgroundColor?.(bgColor)
  } catch {
    /* The host can reject these calls on older clients; ignore. */
  }
}

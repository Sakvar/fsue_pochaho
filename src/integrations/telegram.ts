type TelegramThemeParams = Partial<
  Record<
    | 'bg_color'
    | 'secondary_bg_color'
    | 'text_color'
    | 'hint_color'
    | 'button_color'
    | 'button_text_color'
    | 'link_color'
    | 'destructive_text_color',
    string
  >
>

type TelegramEvent = 'themeChanged' | 'viewportChanged'
type TelegramImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'

type TelegramUser = {
  id: number
}

type TelegramInitDataUnsafe = {
  user?: TelegramUser
}

type TelegramHapticFeedback = {
  impactOccurred: (style: TelegramImpactStyle) => void
}

type TelegramWebApp = {
  initData?: string
  initDataUnsafe?: TelegramInitDataUnsafe
  themeParams?: TelegramThemeParams
  viewportHeight?: number
  ready: () => void
  expand: () => void
  disableVerticalSwipes?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  onEvent?: (event: TelegramEvent, listener: () => void) => void
  offEvent?: (event: TelegramEvent, listener: () => void) => void
  HapticFeedback?: TelegramHapticFeedback
}

type TelegramNamespace = {
  WebApp?: TelegramWebApp
}

declare global {
  interface Window {
    Telegram?: TelegramNamespace
  }
}

const TELEGRAM_RUNTIME_CLASS = 'runtime-telegram-mini-app'

function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  return window.Telegram?.WebApp ?? null
}

function isTelegramMiniAppRuntime(webApp: TelegramWebApp): boolean {
  if (webApp.initData && webApp.initData.length > 0) return true
  return Boolean(webApp.initDataUnsafe?.user)
}

function setThemeVariable(name: string, value: string | undefined): void {
  if (typeof document === 'undefined' || !value) return
  document.documentElement.style.setProperty(name, value)
}

function syncTheme(webApp: TelegramWebApp): void {
  const theme = webApp.themeParams
  if (!theme) return
  setThemeVariable('--tg-bg-color', theme.bg_color)
  setThemeVariable('--tg-secondary-bg-color', theme.secondary_bg_color)
  setThemeVariable('--tg-text-color', theme.text_color)
  setThemeVariable('--tg-hint-color', theme.hint_color)
  setThemeVariable('--tg-link-color', theme.link_color)
  setThemeVariable('--tg-button-color', theme.button_color)
  setThemeVariable('--tg-button-text-color', theme.button_text_color)
  setThemeVariable('--tg-destructive-text-color', theme.destructive_text_color)
}

function syncViewport(webApp: TelegramWebApp): void {
  if (typeof document === 'undefined') return
  const viewportHeight = webApp.viewportHeight
  if (!viewportHeight || viewportHeight <= 0) return
  document.documentElement.style.setProperty('--tg-viewport-height', `${viewportHeight}px`)
}

export function initTelegramMiniApp(): () => void {
  if (typeof document === 'undefined') return () => {}

  const webApp = getTelegramWebApp()
  if (!webApp || !isTelegramMiniAppRuntime(webApp)) return () => {}

  webApp.ready()
  webApp.expand()
  webApp.disableVerticalSwipes?.()
  webApp.setHeaderColor?.('bg_color')
  if (webApp.themeParams?.bg_color) {
    webApp.setBackgroundColor?.(webApp.themeParams.bg_color)
  }

  document.body.classList.add(TELEGRAM_RUNTIME_CLASS)

  const handleThemeChanged = () => syncTheme(webApp)
  const handleViewportChanged = () => syncViewport(webApp)

  syncTheme(webApp)
  syncViewport(webApp)

  webApp.onEvent?.('themeChanged', handleThemeChanged)
  webApp.onEvent?.('viewportChanged', handleViewportChanged)

  return () => {
    webApp.offEvent?.('themeChanged', handleThemeChanged)
    webApp.offEvent?.('viewportChanged', handleViewportChanged)
    document.body.classList.remove(TELEGRAM_RUNTIME_CLASS)
    document.documentElement.style.removeProperty('--tg-viewport-height')
  }
}

export function telegramImpact(style: TelegramImpactStyle = 'light'): void {
  const webApp = getTelegramWebApp()
  if (!webApp || !isTelegramMiniAppRuntime(webApp)) return
  webApp.HapticFeedback?.impactOccurred(style)
}

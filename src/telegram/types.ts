/**
 * Minimal type declarations for the subset of the Telegram Web App SDK
 * that this project uses. The full surface is documented at
 * https://core.telegram.org/bots/webapps. We only model what we touch.
 */

export type TelegramThemeParams = {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
  header_bg_color?: string
  accent_text_color?: string
  section_bg_color?: string
  section_header_text_color?: string
  subtitle_text_color?: string
  destructive_text_color?: string
}

export type TelegramColorScheme = 'light' | 'dark'

export type TelegramHapticImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
export type TelegramHapticNotificationType = 'error' | 'success' | 'warning'

export type TelegramHapticFeedback = {
  impactOccurred: (style: TelegramHapticImpactStyle) => void
  notificationOccurred: (type: TelegramHapticNotificationType) => void
  selectionChanged: () => void
}

export type TelegramMainButton = {
  text: string
  color: string
  textColor: string
  isVisible: boolean
  isActive: boolean
  isProgressVisible: boolean
  setText: (text: string) => TelegramMainButton
  onClick: (cb: () => void) => TelegramMainButton
  offClick: (cb: () => void) => TelegramMainButton
  show: () => TelegramMainButton
  hide: () => TelegramMainButton
  enable: () => TelegramMainButton
  disable: () => TelegramMainButton
  setParams: (params: {
    text?: string
    color?: string
    text_color?: string
    is_active?: boolean
    is_visible?: boolean
  }) => TelegramMainButton
}

export type TelegramBackButton = {
  isVisible: boolean
  onClick: (cb: () => void) => TelegramBackButton
  offClick: (cb: () => void) => TelegramBackButton
  show: () => TelegramBackButton
  hide: () => TelegramBackButton
}

export type TelegramUser = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export type TelegramInitDataUnsafe = {
  user?: TelegramUser
  query_id?: string
  start_param?: string
  auth_date?: number
  hash?: string
}

/** Minimal CloudStorage surface (Bot API 6.9+). Async, async callbacks-style. */
export type TelegramCloudStorage = {
  setItem: (key: string, value: string, cb?: (err: Error | null, ok?: boolean) => void) => void
  getItem: (key: string, cb: (err: Error | null, value?: string) => void) => void
  getItems: (keys: string[], cb: (err: Error | null, values?: Record<string, string>) => void) => void
  removeItem: (key: string, cb?: (err: Error | null, ok?: boolean) => void) => void
  removeItems: (keys: string[], cb?: (err: Error | null, ok?: boolean) => void) => void
  getKeys: (cb: (err: Error | null, keys?: string[]) => void) => void
}

export type TelegramWebApp = {
  initData: string
  initDataUnsafe: TelegramInitDataUnsafe
  version: string
  platform: string
  colorScheme: TelegramColorScheme
  themeParams: TelegramThemeParams
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  isClosingConfirmationEnabled: boolean
  ready: () => void
  expand: () => void
  close: () => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
  onEvent: (event: string, cb: () => void) => void
  offEvent: (event: string, cb: () => void) => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  HapticFeedback?: TelegramHapticFeedback
  MainButton: TelegramMainButton
  BackButton: TelegramBackButton
  CloudStorage?: TelegramCloudStorage
  isVersionAtLeast?: (version: string) => boolean
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

export {}

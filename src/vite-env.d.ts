/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** POST JSON `{ events: [...] }` — см. `src/analytics.ts` */
  readonly VITE_ANALYTICS_ENDPOINT?: string
  /** Ссылка «Поддержать объект» в меню */
  readonly VITE_SUPPORT_URL?: string
  /** Microsoft Clarity — ID проекта из кабинета clarity.microsoft.com */
  readonly VITE_CLARITY_PROJECT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

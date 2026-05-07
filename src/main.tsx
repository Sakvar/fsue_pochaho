import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from '@/App.tsx'
import { initTelegram, isTelegramMiniApp } from '@/telegram'
import '@/styles/globals.css'

initTelegram()

if (!isTelegramMiniApp()) {
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

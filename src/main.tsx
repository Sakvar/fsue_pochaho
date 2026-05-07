import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from '@/App.tsx'
import { initTelegramMiniApp } from '@/telegram/miniApp'
import '@/styles/globals.css'

initTelegramMiniApp()
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

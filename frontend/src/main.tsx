import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './locales'
import { readLang, applyDirection } from './locales'
import App from './App.tsx'

applyDirection(readLang())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register the service worker only in production builds (vite preview and
// deployed sites). In dev the transformed on-the-fly modules are not cached,
// so keeping the SW out of `vite dev` avoids stale-UI issues during daily work.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service workers are an enhancement (PWA installability) — never
      // block the app or surface errors when registration is unavailable.
    });
  });
}

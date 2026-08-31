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

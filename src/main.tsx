import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initApiStatus } from './store/appStore.ts'
import { initRender } from './store/renderStore.ts'

initRender()
initApiStatus()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

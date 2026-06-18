import { useEffect, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { checkForUpdates } from './updater'

function hideSplash() {
  const splash = document.getElementById('splash')
  if (splash) {
    splash.classList.add('hide')
    setTimeout(() => splash?.remove(), 300)
  }
}

function Root() {
  useEffect(() => {
    hideSplash()
    checkForUpdates()
  }, [])
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

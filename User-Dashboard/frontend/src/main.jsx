import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MobileApp from './MobileApp.jsx'
import { AppProvider } from './context/AppContext.jsx'

// ── App-like feel ────────────────────────────────────────────────────────────
// Lock the page so the whole UI can't be pinch-/double-tap-zoomed like a web
// page. (The Map screen implements its own controlled zoom.) This makes the
// installed PWA behave like a real app.
function lockViewport() {
  let meta = document.querySelector('meta[name="viewport"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'viewport'
    document.head.appendChild(meta)
  }
  meta.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover',
  )
  // Belt-and-suspenders: cancel pinch / double-tap zoom gestures (iOS Safari/WebView).
  document.addEventListener('gesturestart', (e) => e.preventDefault())
  let lastTouch = 0
  document.addEventListener('touchend', (e) => {
    const now = Date.now()
    if (now - lastTouch <= 300) e.preventDefault()
    lastTouch = now
  }, { passive: false })
}
lockViewport()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <MobileApp />
    </AppProvider>
  </StrictMode>,
)
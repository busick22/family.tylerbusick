import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Global styles first so feature stylesheets (imported by the pages below)
// come later in the cascade and can override base component styles.
import './styles/tokens.css'
import './styles/base.css'
import App from './App.jsx'
import { AuthProvider } from './state/AuthContext.jsx'
import { SettingsProvider } from './state/SettingsContext.jsx'
import { installErrorReporter } from './lib/errorReporter.js'

if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true') import('../tests/emulator.css')

installErrorReporter()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

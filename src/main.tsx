import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { controleerVersie } from './versie'
import './ui/thema.css'

// Meteen kijken of er iets nieuwers is. Loopt naast het opstarten; is er een
// nieuwere versie, dan haalt hij de pagina binnen een paar tellen opnieuw op.
controleerVersie()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

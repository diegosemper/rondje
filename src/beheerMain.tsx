import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BeheerApp } from './schermen/Beheer'
import { controleerVersie } from './versie'
import './ui/thema.css'

/* Het beheerscherm heeft zijn eigen ingang: beheer.html. Zie de uitleg daar. */

// Meteen kijken of er iets nieuwers is. Loopt naast het opstarten; is er een
// nieuwere versie, dan haalt hij de pagina binnen een paar tellen opnieuw op.
controleerVersie()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BeheerApp />
  </StrictMode>,
)

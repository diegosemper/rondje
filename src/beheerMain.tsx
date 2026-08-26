import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BeheerApp } from './schermen/Beheer'
import './ui/thema.css'

/* Het beheerscherm heeft zijn eigen ingang: beheer.html. Zie de uitleg daar. */

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BeheerApp />
  </StrictMode>,
)

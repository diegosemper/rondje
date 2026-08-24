import { useEffect, useRef, useState } from 'react'
import { drinkKreet, eenheid, isDroog } from '../engine/slokken'
import type { Zwaarte } from '../engine/types'
import { tril } from './Basis'

/**
 * Het grote rode scherm. Zodra jouw stand omhoog gaat, neemt dit je hele
 * telefoon over. Subtiel werkt niet als het rumoerig is.
 */
export function DrinkScherm({
  gedronken,
  zwaarte,
}: {
  gedronken: number
  zwaarte: Zwaarte
}) {
  const vorige = useRef(gedronken)
  const opgewarmd = useRef(false)
  const [aantal, zetAantal] = useState<number | null>(null)

  // Even wachten na het laden, anders knalt de stand van de hele avond
  // in beeld zodra je opnieuw verbindt.
  useEffect(() => {
    const id = setTimeout(() => {
      opgewarmd.current = true
    }, 1500)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    const verschil = gedronken - vorige.current
    vorige.current = gedronken
    if (!opgewarmd.current || verschil <= 0) return

    zetAantal(verschil)
    tril([90, 70, 90])
    const id = setTimeout(() => zetAantal(null), 2800)
    return () => clearTimeout(id)
  }, [gedronken])

  if (aantal === null) return null

  return (
    <div
      className={`drinkscherm ${isDroog(zwaarte) ? 'droog' : ''}`}
      onClick={() => zetAantal(null)}
    >
      <div className="kop-klein" style={{ color: 'rgba(255,255,255,.75)' }}>
        {drinkKreet(zwaarte)}
      </div>
      <div className="reusachtig klopt">{aantal}</div>
      <h2>{eenheid(zwaarte, aantal !== 1)}</h2>
      <div className="klein" style={{ opacity: 0.7, marginTop: 20 }}>
        tik om weg te halen
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import type { KijkContext } from './types'

/**
 * Laat de host een actie sturen zodra een deadline verstrijkt.
 *
 * Spellen met een aftelklok hebben iemand nodig die "tijd is om" zegt. Dat
 * moet er precies één zijn, anders komt de actie acht keer binnen. De host
 * doet het; de rest kijkt alleen naar de klok.
 *
 *   useHostKlok(ctx, s.fase === 'race', s.raceEind, 'sluit-race')
 */
export function useHostKlok(
  ctx: KijkContext,
  actief: boolean,
  eind: number,
  type: string,
): void {
  const gestuurd = useRef(false)

  // Nieuwe deadline of nieuwe fase → weer scherp.
  useEffect(() => {
    gestuurd.current = false
  }, [eind, actief, type])

  useEffect(() => {
    if (!ctx.benIkHost || !actief || gestuurd.current) return
    if (ctx.nu < eind) return
    gestuurd.current = true
    ctx.stuur(type)
  }, [ctx, actief, eind, type])
}

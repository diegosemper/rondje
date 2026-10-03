import { useEffect, useRef, useState } from 'react'
import type { Beeld } from '../engine/demo'
import { tril } from './Basis'

/* ─────────────────────────────────────────────────────────────
   HET VOORBEELDJE

   Een rijtje beeldjes dat vanzelf doorloopt, zodat je in tien seconden ziet
   hoe een spel werkt zonder het te hoeven starten.

   Hij loopt door op een klok, maar je kunt ook zelf tikken om verder te gaan.
   Dat is er allebei met opzet: wie het snel doorheeft wil niet wachten, en wie
   iets wil nalezen wil niet dat het wegspringt. Op het laatste beeldje blijft
   hij staan tot je hem sluit of opnieuw start.
   ───────────────────────────────────────────────────────────── */

/** Hoe lang één beeldje blijft staan. */
const BEELD_MS = 2200

export function Voorbeeld({
  naam,
  teken,
  beelden,
  bijSluiten,
}: {
  naam: string
  teken: string
  beelden: Beeld[]
  bijSluiten: () => void
}) {
  const [i, zetI] = useState(0)
  const klok = useRef<number | null>(null)

  const laatste = i >= beelden.length - 1

  // De klok loopt alleen zolang er nog een beeldje komt.
  useEffect(() => {
    if (laatste) return
    klok.current = window.setTimeout(() => zetI((n) => n + 1), BEELD_MS)
    return () => {
      if (klok.current !== null) window.clearTimeout(klok.current)
      klok.current = null
    }
  }, [i, laatste])

  const beeld = beelden[i]
  if (!beeld) return null

  function verder() {
    tril(6)
    if (laatste) zetI(0)
    else zetI(i + 1)
  }

  return (
    <div
      className="demo-laag"
      role="dialog"
      aria-label={`Voorbeeld van ${naam}`}
      onClick={verder}
    >
      <div className="demo-doos" onClick={(e) => e.stopPropagation()}>
        <div className="balk">
          <span className="kop-klein">
            {teken} {naam}
          </span>
          <button
            className="demo-sluit"
            aria-label="Sluiten"
            onClick={(e) => {
              e.stopPropagation()
              bijSluiten()
            }}
          >
            ✕
          </button>
        </div>

        <div className="demo-beeld" onClick={verder}>
          {beeld.teken && <div className="demo-teken">{beeld.teken}</div>}

          {beeld.kaarten && (
            <div className="demo-kaarten">
              {beeld.kaarten.map((k, n) => (
                <span
                  key={n}
                  className={`demo-kaart ${k.includes('♥') || k.includes('♦') ? 'rood' : ''}`}
                >
                  {k}
                </span>
              ))}
            </div>
          )}

          {beeld.kop && <div className="demo-kop">{beeld.kop}</div>}
          {beeld.tekst && <div className="demo-tekst">{beeld.tekst}</div>}
          {beeld.knop && <div className="demo-knop">{beeld.knop}</div>}
          {beeld.slok && <div className="demo-slok">🍺 {beeld.slok}</div>}
        </div>

        <div className="demo-stippen">
          {beelden.map((_, n) => (
            <span key={n} className={`demo-stip ${n === i ? 'nu' : ''}`} />
          ))}
        </div>

        <button className="demo-verder" onClick={verder}>
          {laatste ? 'Nog eens' : 'Volgende'}
        </button>
      </div>
    </div>
  )
}

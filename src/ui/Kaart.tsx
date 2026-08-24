import { KLEUR_TEKEN, isRood, waardeTekst, type Kaart } from '../engine/deck'

type Maat = 'groot' | 'midden' | 'klein'

const MAAT_KLASSE: Record<Maat, string> = {
  groot: 'kaart-groot',
  midden: 'kaart-midden',
  klein: 'kaart-klein',
}

export function Speelkaart({
  kaart,
  maat = 'midden',
  dicht = false,
}: {
  kaart?: Kaart | null
  maat?: Maat
  dicht?: boolean
}) {
  if (dicht || !kaart) {
    return (
      <div className={`speelkaart dicht ${MAAT_KLASSE[maat]}`}>
        <div className="teken">🍺</div>
      </div>
    )
  }
  return (
    <div className={`speelkaart ${isRood(kaart) ? 'rood' : ''} ${MAAT_KLASSE[maat]}`}>
      <div className="waarde">{waardeTekst(kaart.waarde)}</div>
      <div className="teken">{KLEUR_TEKEN[kaart.kleur]}</div>
    </div>
  )
}

/** Een rijtje kaarten naast elkaar. */
export function KaartRij({
  kaarten,
  maat = 'klein',
  dicht = false,
}: {
  kaarten: (Kaart | null)[]
  maat?: Maat
  dicht?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
      {kaarten.map((k, i) => (
        <Speelkaart key={k?.id ?? i} kaart={k} maat={maat} dicht={dicht} />
      ))}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { eenheid } from '../engine/slokken'
import type { KijkContext } from '../engine/types'
import { GroteKnop, tril } from './Basis'

/* ─────────────────────────────────────────────────────────────
   Slokken verdelen.

   Mag je er acht uitdelen, dan wil je ze kunnen spreiden: vier naar Tim, drie
   naar Sanne, één naar Joost. Tik op iemand om er één bij te geven, tik op de
   min om er een af te halen. Pas als alles vergeven is kun je bevestigen.

   Zit je maar met z'n tweeën, dan valt er niets te kiezen en staat alles al
   ingevuld — dan is het één tik.

   Let op: `totaal` is het aantal zoals de speler het op zijn scherm ziet, dus
   al omgerekend naar de zwaarte-instelling. Het spel moet de uitkomst daarom
   met ctx.deelUitPrecies() verwerken en niet nog eens omrekenen.
   ───────────────────────────────────────────────────────────── */

export function Verdeler({
  totaal,
  ctx,
  titel,
  bijKlaar,
}: {
  totaal: number
  ctx: KijkContext
  titel?: string
  bijKlaar: (verdeling: Record<string, number>) => void
}) {
  const anderen = useMemo(
    () => ctx.spelers.filter((p) => p.uid !== ctx.ik),
    [ctx.spelers, ctx.ik],
  )

  // Met één tegenstander valt er niets te verdelen.
  const alleenEen = anderen.length === 1

  const [verdeling, zetVerdeling] = useState<Record<string, number>>(() =>
    alleenEen ? { [anderen[0].uid]: totaal } : {},
  )

  const gegeven = Object.values(verdeling).reduce((a, b) => a + b, 0)
  const over = totaal - gegeven

  function wijzig(uid: string, delta: number) {
    zetVerdeling((oud) => {
      const huidig = oud[uid] ?? 0
      const nieuw = Math.max(0, Math.min(huidig + delta, huidig + over))
      if (nieuw === huidig) return oud
      tril(8)
      return { ...oud, [uid]: nieuw }
    })
  }

  if (anderen.length === 0) {
    return (
      <GroteKnop kleur="goud" bijTik={() => bijKlaar({})}>
        Niemand om aan te geven — verder
      </GroteKnop>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="kop-klein">{titel ?? 'Verdeel je slokken'}</div>
        <div
          className={over > 0 ? 'reusachtig klopt' : 'reusachtig'}
          style={{
            fontSize: 'clamp(34px,11vw,58px)',
            color: over > 0 ? 'var(--goud)' : 'var(--groen)',
          }}
        >
          {over}
        </div>
        <div className="klein zacht">
          {over > 0
            ? `${eenheid(ctx.zwaarte, over !== 1)} nog te vergeven`
            : 'alles vergeven'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {anderen.map((p) => {
          const n = verdeling[p.uid] ?? 0
          return (
            <div key={p.uid} style={{ position: 'relative' }}>
              <button
                onClick={() => wijzig(p.uid, 1)}
                disabled={over === 0}
                style={{
                  width: '100%',
                  minHeight: 76,
                  padding: '10px 12px',
                  borderRadius: 'var(--straal)',
                  background: n > 0 ? 'var(--goud)' : 'var(--vlak-hoog)',
                  color: n > 0 ? '#1a1205' : 'var(--tekst)',
                  border: '1px solid var(--rand)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  opacity: over === 0 && n === 0 ? 0.4 : 1,
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{p.emoji}</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.naam}
                </span>
                <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{n}</span>
              </button>

              {n > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    wijzig(p.uid, -1)
                  }}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 30,
                    height: 30,
                    borderRadius: 99,
                    background: 'rgba(0,0,0,.35)',
                    color: '#fff',
                    fontSize: 20,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  −
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="rij">
        {gegeven > 0 && (
          <GroteKnop kleur="leeg" klein bijTik={() => zetVerdeling({})}>
            Opnieuw
          </GroteKnop>
        )}
        <GroteKnop
          kleur="goud"
          uit={over !== 0}
          bijTik={() => bijKlaar(verdeling)}
        >
          {over === 0 ? 'Uitdelen' : `Nog ${over} te gaan`}
        </GroteKnop>
      </div>
    </div>
  )
}

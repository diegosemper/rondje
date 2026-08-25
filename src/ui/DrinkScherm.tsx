import { drinkKreet, eenheid, isDroog } from '../engine/slokken'
import type { Drinkgate, Speler, Zwaarte } from '../engine/types'
import { GroteKnop, Kaartje, tril } from './Basis'

/* ─────────────────────────────────────────────────────────────
   De drinkpauze.

   Het spel staat stil zolang dit scherm er is. Moet jij drinken, dan neemt
   het je hele telefoon over tot je bevestigt. Moet je niets, dan zie je wie
   de groep nog ophoudt.

   Dit is er omdat het zonder niet werkte: je kreeg te horen dat je vier
   slokken moest, en twee tellen later moest je alweer opletten of de
   volgende kaart van jou was.
   ───────────────────────────────────────────────────────────── */

export function DrinkPauze({
  gate,
  ik,
  spelers,
  zwaarte,
  benIkHost,
  bijGedronken,
  bijDoorgaan,
}: {
  gate: Drinkgate
  ik: string
  spelers: Speler[]
  zwaarte: Zwaarte
  benIkHost: boolean
  bijGedronken: () => void
  bijDoorgaan: () => void
}) {
  const mijnAantal = gate.wachtOp[ik] ?? 0
  const ikKlaar = !!gate.klaar[ik]
  const nodig = Object.keys(gate.wachtOp).filter((u) => spelers.some((p) => p.uid === u))
  const klaar = nodig.filter((u) => gate.klaar[u])
  const naam = (uid: string) => spelers.find((p) => p.uid === uid)?.naam ?? '?'

  // Jij moet drinken en hebt nog niet bevestigd: scherm helemaal over.
  if (mijnAantal > 0 && !ikKlaar) {
    return (
      <div className={`drinkscherm ${isDroog(zwaarte) ? 'droog' : ''}`}>
        <div className="kop-klein" style={{ color: 'rgba(255,255,255,.75)' }}>
          {drinkKreet(zwaarte)}
        </div>
        <div className="reusachtig klopt">{mijnAantal}</div>
        <h2 style={{ marginBottom: 24 }}>{eenheid(zwaarte, mijnAantal !== 1)}</h2>

        <div style={{ width: '100%', maxWidth: 380 }}>
          <button
            className="knop enorm"
            style={{ background: '#fff', color: 'var(--rood)', border: 'none' }}
            onClick={() => {
              tril(20)
              bijGedronken()
            }}
          >
            Gedronken 🍺
          </button>
        </div>

        <div className="klein" style={{ opacity: 0.8, marginTop: 16 }}>
          Neem je tijd — het spel wacht op je.
        </div>
      </div>
    )
  }

  // Jij hoeft niets (meer): laten zien op wie er gewacht wordt.
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(11,11,16,.94)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 52 }}>🍻</div>
      <h1>Er wordt gedronken</h1>
      <div className="zacht">
        {klaar.length} van {nodig.length} klaar
      </div>

      <div style={{ display: 'grid', gap: 8, width: '100%', maxWidth: 380 }}>
        {nodig.map((uid) => (
          <div
            key={uid}
            className="kaartje balk"
            style={{
              opacity: gate.klaar[uid] ? 0.45 : 1,
              borderColor: gate.klaar[uid] ? undefined : 'var(--rood)',
            }}
          >
            <span>
              {spelers.find((p) => p.uid === uid)?.emoji} <strong>{naam(uid)}</strong>
            </span>
            <span>
              {gate.klaar[uid] ? '✓' : `${gate.wachtOp[uid]} ${eenheid(zwaarte)}`}
            </span>
          </div>
        ))}
      </div>

      {mijnAantal > 0 && (
        <Kaartje style={{ maxWidth: 380 }}>
          <span className="zacht klein">Jij hebt bevestigd. Even geduld.</span>
        </Kaartje>
      )}

      {benIkHost && (
        <div style={{ width: '100%', maxWidth: 380, marginTop: 8 }}>
          <GroteKnop kleur="leeg" klein bijTik={bijDoorgaan}>
            Toch doorgaan
          </GroteKnop>
        </div>
      )}
    </div>
  )
}

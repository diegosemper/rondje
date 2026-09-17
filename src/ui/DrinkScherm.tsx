import { useEffect, useState } from 'react'
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

/**
 * Zo lang staat de knop uit nadat het scherm verschijnt.
 *
 * Het slokkenscherm valt over het spel heen op het moment dat je nog aan het
 * tikken bent — "Hoger", een kaart, een reflexknop. De grote knop ligt precies
 * waar je vinger al is, dus de tik die voor het spel bedoeld was drukt hem
 * meteen weg. Dan heb je de melding nooit gezien. Een tel wachten vangt die
 * doorgeschoten tik op; bewust drukken duurt toch langer dan dat.
 */
const KNOP_UIT_MS = 1200

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

  // Per pauze-id opnieuw: komen er slokken bij, dan moet je opnieuw bevestigen
  // en hoort de knop ook opnieuw even uit te staan.
  const [scherp, zetScherp] = useState<string | null>(null)
  useEffect(() => {
    const id = setTimeout(() => zetScherp(gate.id), KNOP_UIT_MS)
    return () => clearTimeout(id)
  }, [gate.id])
  const knopAan = scherp === gate.id

  // "Toch doorgaan" wist de melding bij iedereen. Eén verdwaalde tik van de
  // host mag dat niet doen, dus eerst vragen of het echt de bedoeling is.
  const [zeker, zetZeker] = useState(false)
  useEffect(() => {
    if (!zeker) return
    const id = setTimeout(() => zetZeker(false), 4000)
    return () => clearTimeout(id)
  }, [zeker])

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
            disabled={!knopAan}
            style={{
              background: '#fff',
              color: 'var(--rood)',
              border: 'none',
              opacity: knopAan ? 1 : 0.45,
              transition: 'opacity .25s',
            }}
            onClick={() => {
              if (!knopAan) return
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
          <GroteKnop
            kleur={zeker ? 'rood' : 'leeg'}
            klein
            bijTik={() => {
              if (!zeker) {
                zetZeker(true)
                return
              }
              zetZeker(false)
              bijDoorgaan()
            }}
          >
            {zeker ? 'Tik nog een keer — iedereen gaat door' : 'Toch doorgaan'}
          </GroteKnop>
        </div>
      )}
    </div>
  )
}

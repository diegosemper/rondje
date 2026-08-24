import { useState } from 'react'
import type { Kamer, Zwaarte } from '../engine/types'
import { SPELLEN } from '../engine/registry'
import { ZWAARTE_LABEL, ZWAARTE_UITLEG } from '../engine/slokken'
import { MAX_SPELERS, MIN_SPELERS, verlaatKamer, zetSpellen, zetZwaarte } from '../net/kamer'
import { naarFase } from '../net/hostLoop'
import { deelLink } from '../net/profiel'
import { GroteKnop, Kaartje } from '../ui/Basis'

const ZWAARTES: Zwaarte[] = ['zacht', 'normaal', 'hard', 'droog']

export function Lobby({
  kamer,
  uid,
  bijVertrek,
}: {
  kamer: Kamer
  uid: string
  bijVertrek: () => void
}) {
  const [toonSpellen, zetToonSpellen] = useState(false)
  const [gedeeld, zetGedeeld] = useState(false)

  const code = kamer.meta.code
  const benHost = kamer.meta.hostUid === uid
  const spelers = kamer.volgorde.map((u) => kamer.spelers[u]).filter(Boolean)
  const genoeg = spelers.length >= MIN_SPELERS

  const aan = kamer.instelling.spellen
  const isAan = (id: string) => (aan === null ? id !== 'testspel' : aan.includes(id))

  async function deel() {
    const link = deelLink(code)
    const tekst = `Doe mee met Rondje — lobby ${code}\n${link}`
    try {
      if (navigator.share) await navigator.share({ title: 'Rondje', text: tekst, url: link })
      else {
        await navigator.clipboard.writeText(tekst)
        zetGedeeld(true)
        setTimeout(() => zetGedeeld(false), 2000)
      }
    } catch {
      /* gebruiker brak het delen af */
    }
  }

  function wisselSpel(id: string) {
    const huidig = aan === null ? SPELLEN.filter((s) => s.id !== 'testspel').map((s) => s.id) : aan
    const nieuw = huidig.includes(id) ? huidig.filter((x) => x !== id) : [...huidig, id]
    zetSpellen(code, nieuw)
  }

  return (
    <div className="scherm">
      <div style={{ textAlign: 'center' }}>
        <div className="kop-klein">Lobbycode</div>
        <div className="code">{code}</div>
      </div>

      <GroteKnop kleur="leeg" bijTik={deel}>
        {gedeeld ? '✓ Link gekopieerd' : '📤 Stuur de link'}
      </GroteKnop>

      <div>
        <div className="kop-klein" style={{ marginBottom: 8 }}>
          Spelers · {spelers.length}/{MAX_SPELERS}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {spelers.map((s) => (
            <div
              key={s.uid}
              className="kaartje balk"
              style={{ opacity: s.online ? 1 : 0.45, padding: 12 }}
            >
              <span>
                <span style={{ fontSize: 22 }}>{s.emoji}</span> <strong>{s.naam}</strong>
              </span>
              {s.uid === kamer.meta.hostUid && <span className="klein zacht">host</span>}
            </div>
          ))}
        </div>
      </div>

      {benHost ? (
        <>
          <div>
            <div className="kop-klein" style={{ marginBottom: 8 }}>
              Hoe zwaar?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ZWAARTES.map((z) => (
                <GroteKnop
                  key={z}
                  klein
                  kleur={kamer.instelling.zwaarte === z ? 'goud' : 'leeg'}
                  bijTik={() => zetZwaarte(code, z)}
                >
                  {ZWAARTE_LABEL[z]}
                </GroteKnop>
              ))}
            </div>
            <div className="klein zacht" style={{ marginTop: 6 }}>
              {ZWAARTE_UITLEG[kamer.instelling.zwaarte]}
            </div>
          </div>

          <GroteKnop kleur="leeg" klein bijTik={() => zetToonSpellen(!toonSpellen)}>
            {toonSpellen ? 'Verberg spellijst' : `Welke spellen? (${SPELLEN.filter((s) => isAan(s.id)).length})`}
          </GroteKnop>

          {toonSpellen && (
            <Kaartje>
              {SPELLEN.map((s) => (
                <label
                  key={s.id}
                  className="balk"
                  style={{ padding: '10px 0', borderBottom: '1px solid var(--rand)' }}
                >
                  <span>
                    <strong>{s.naam}</strong>
                    <br />
                    <span className="klein zacht">{s.uitleg}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={isAan(s.id)}
                    onChange={() => wisselSpel(s.id)}
                    style={{ width: 26, height: 26, minHeight: 0, flexShrink: 0 }}
                  />
                </label>
              ))}
            </Kaartje>
          )}
        </>
      ) : (
        <Kaartje style={{ textAlign: 'center' }}>
          <div className="kop-klein">Zwaarte</div>
          <strong>{ZWAARTE_LABEL[kamer.instelling.zwaarte]}</strong>
        </Kaartje>
      )}

      <div className="onderaan" style={{ marginTop: 'auto' }}>
        {benHost ? (
          <GroteKnop kleur="goud" enorm uit={!genoeg} bijTik={() => naarFase(code, 'kiezen')}>
            {genoeg ? 'Begin de avond' : `Wacht op ${MIN_SPELERS - spelers.length} speler(s)`}
          </GroteKnop>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <h2 className="zacht">Wachten op de host…</h2>
          </Kaartje>
        )}
        <GroteKnop
          kleur="leeg"
          klein
          bijTik={() => {
            verlaatKamer(code, uid).finally(bijVertrek)
          }}
        >
          Verlaat lobby
        </GroteKnop>
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import type { Kamer } from '../engine/types'
import {
  DUUR_TEKST,
  gehusseldeSpellen,
  kiesWillekeurig,
  pastBijGroep,
  speelbaar,
  spelEmoji,
  waaromNiet,
} from '../engine/registry'
import { maakRng } from '../engine/random'
import { naarFase, startSpel } from '../net/hostLoop'
import { verlaatKamer } from '../net/kamer'
import { GroteKnop, Kaartje } from '../ui/Basis'
import { meldFout } from '../ui/Fout'

export function SpelKiezer({
  kamer,
  uid,
  bijVertrek,
}: {
  kamer: Kamer
  uid: string
  bijVertrek: () => void
}) {
  const benHost = kamer.meta.hostUid === uid
  const spelers = kamer.volgorde.map((u) => kamer.spelers[u]).filter(Boolean)
  const lijst = speelbaar(spelers.length, kamer.instelling.uit)

  // Door elkaar, maar vast per lobby: de lijst mag niet verspringen terwijl je
  // aan het kiezen bent.
  const volgorde = useMemo(() => gehusseldeSpellen(kamer.meta.code), [kamer.meta.code])

  const stand = spelers
    .map((s) => ({ s, n: kamer.score[s.uid]?.gedronken ?? 0 }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .filter((r) => r.n > 0)

  function dobbel() {
    const rng = maakRng(Date.now() & 0x7fffffff)
    const keuze = kiesWillekeurig(rng, spelers.length, kamer.instelling.uit, kamer.geschiedenis)
    if (keuze) startSpel(kamer, keuze.id).catch(meldFout)
  }

  return (
    <div className="scherm">
      {stand.length > 0 && (
        <Kaartje>
          <div className="kop-klein" style={{ marginBottom: 6 }}>
            Tussenstand
          </div>
          {stand.map(({ s, n }, i) => (
            <div key={s.uid} className="balk" style={{ padding: '3px 0' }}>
              <span>
                {['🥇', '🥈', '🥉'][i]} {s.emoji} {s.naam}
              </span>
              <strong>{n}</strong>
            </div>
          ))}
        </Kaartje>
      )}

      <h1>Wat nu?</h1>

      {!benHost && (
        <Kaartje style={{ textAlign: 'center' }}>
          <h2 className="zacht">De host kiest het volgende spel…</h2>
          <div className="klein zacht">Lobby {kamer.meta.code}</div>
        </Kaartje>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {lijst.length === 0 && (
          <Kaartje style={{ borderColor: 'var(--goud)' }}>
            <strong>Geen enkel spel kan nu.</strong>
            <div className="klein zacht">
              Nodig iemand uit, of zet spellen aan in de lobby.
            </div>
          </Kaartje>
        )}

        {volgorde.filter((s) => pastBijGroep(s, kamer.instelling.verwacht)).map((s) => {
          const blokkade = waaromNiet(s, spelers.length, kamer.instelling.uit)
          const gespeeld = kamer.geschiedenis.includes(s.id)
          const klikbaar = benHost && !blokkade

          return (
            <button
              key={s.id}
              className="kaartje"
              disabled={!klikbaar}
              onClick={() => klikbaar && startSpel(kamer, s.id).catch(meldFout)}
              style={{
                textAlign: 'left',
                opacity: blokkade ? 0.4 : gespeeld ? 0.6 : 1,
                cursor: klikbaar ? 'pointer' : 'default',
              }}
            >
              <div className="balk">
                <strong style={{ fontSize: 19 }}>
                  <span className="spel-teken">{spelEmoji(s.id)}</span> {s.naam}
                </strong>
                <span className="klein zacht">
                  {gespeeld && !blokkade ? 'geweest · ' : ''}
                  {DUUR_TEKST[s.duur]}
                </span>
              </div>
              <div className="klein zacht">{s.uitleg}</div>
              {blokkade && (
                <div className="klein" style={{ color: 'var(--goud)', marginTop: 3 }}>
                  🔒 {blokkade}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {benHost && (
        <div className="onderaan">
          <GroteKnop kleur="goud" enorm uit={lijst.length === 0} bijTik={dobbel}>
            🎲 Laat het lot beslissen
          </GroteKnop>
          <div className="rij">
            <GroteKnop
              kleur="leeg"
              klein
              bijTik={() => naarFase(kamer.meta.code, 'lobby').catch(meldFout)}
            >
              Terug naar lobby
            </GroteKnop>
            <GroteKnop
              kleur="leeg"
              klein
              bijTik={() => naarFase(kamer.meta.code, 'scorebord').catch(meldFout)}
            >
              Eindstand
            </GroteKnop>
          </div>
        </div>
      )}

      {!benHost && (
        <GroteKnop
          kleur="leeg"
          klein
          bijTik={() => {
            verlaatKamer(kamer.meta.code, uid).catch(meldFout).finally(bijVertrek)
          }}
        >
          Verlaat lobby
        </GroteKnop>
      )}
    </div>
  )
}

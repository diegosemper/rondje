import type { Kamer } from '../engine/types'
import { DUUR_TEKST, kiesWillekeurig, speelbaar, TAG_EMOJI } from '../engine/registry'
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
  const lijst = speelbaar(spelers.length, kamer.instelling.spellen)

  const stand = spelers
    .map((s) => ({ s, n: kamer.score[s.uid]?.gedronken ?? 0 }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .filter((r) => r.n > 0)

  function dobbel() {
    const rng = maakRng(Date.now() & 0x7fffffff)
    const keuze = kiesWillekeurig(rng, spelers.length, kamer.instelling.spellen, kamer.geschiedenis)
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
          <Kaartje>
            <strong>Geen spel past bij {spelers.length} spelers.</strong>
            <div className="klein zacht">
              Zet meer spellen aan in de lobby, of nodig iemand uit.
            </div>
          </Kaartje>
        )}

        {lijst.map((s) => {
          const gespeeld = kamer.geschiedenis.includes(s.id)
          return (
            <button
              key={s.id}
              className="kaartje"
              disabled={!benHost}
              onClick={() => benHost && startSpel(kamer, s.id).catch(meldFout)}
              style={{
                textAlign: 'left',
                opacity: gespeeld ? 0.55 : 1,
                cursor: benHost ? 'pointer' : 'default',
              }}
            >
              <div className="balk">
                <strong style={{ fontSize: 19 }}>
                  {s.tags.map((t) => TAG_EMOJI[t] ?? '').join('')} {s.naam}
                </strong>
                <span className="klein zacht">
                  {gespeeld ? 'geweest · ' : ''}
                  {DUUR_TEKST[s.duur]}
                </span>
              </div>
              <div className="klein zacht">{s.uitleg}</div>
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

import { useEffect } from 'react'
import type { Kamer } from '../engine/types'
import { geefSpel } from '../engine/registry'
import { beginSpel, stopSpel } from '../net/hostLoop'
import { zetGereed } from '../net/kamer'
import { GroteKnop, Kaartje } from '../ui/Basis'
import { meldFout } from '../ui/Fout'

/**
 * Drie regels en een grote knop. Meer leest niemand op dit moment van de
 * avond, dus meer staat er ook niet.
 */
export function Uitleg({ kamer, uid }: { kamer: Kamer; uid: string }) {
  const code = kamer.meta.code
  const benHost = kamer.meta.hostUid === uid
  const mod = kamer.spel ? geefSpel(kamer.spel.gameId) : undefined

  const spelers = kamer.volgorde.map((u) => kamer.spelers[u]).filter(Boolean)
  const gereed = spelers.filter((s) => kamer.gereed[s.uid]).length
  const ikGereed = !!kamer.gereed[uid]
  const iedereenGereed = gereed >= spelers.length && spelers.length > 0

  // Iedereen heeft "snap ik" getikt → de host zet het spel in gang.
  useEffect(() => {
    if (benHost && iedereenGereed) beginSpel(code).catch(meldFout)
  }, [benHost, iedereenGereed, code])

  if (!mod) {
    return (
      <div className="scherm">
        <Kaartje>Spel niet gevonden. Vraag de host om iets anders te kiezen.</Kaartje>
      </div>
    )
  }

  return (
    <div className="scherm">
      <div className="balk">
        <span className="kop-klein">Volgende spel</span>
        <button
          className="knop klein leeg"
          onClick={() => benHost && stopSpel(code).catch(meldFout)}
        >
          {benHost ? 'Toch niet' : ''}
        </button>
      </div>

      <div className="midden" style={{ gap: 20 }}>
        <div>
          <h1>{mod.naam}</h1>
          <div className="zacht">{mod.uitleg}</div>
        </div>

        <div style={{ textAlign: 'left', width: '100%', display: 'grid', gap: 10 }}>
          {mod.regels.map((r, i) => (
            <div key={i} className="balk" style={{ alignItems: 'flex-start', gap: 12 }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  background: 'var(--goud)',
                  color: '#1a1205',
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 14,
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 19, lineHeight: 1.3 }}>{r}</span>
            </div>
          ))}
        </div>

        {mod.privescherm && (
          <div className="klein zacht">🤫 Dit spel heeft geheimen — hou je scherm afgeschermd.</div>
        )}
      </div>

      <div className="onderaan">
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          {gereed} van {spelers.length} klaar
        </div>
        <GroteKnop
          kleur={ikGereed ? 'leeg' : 'goud'}
          enorm={!ikGereed}
          uit={ikGereed}
          bijTik={() => zetGereed(code, uid).catch(meldFout)}
        >
          {ikGereed ? 'Wachten op de rest…' : 'Snap ik'}
        </GroteKnop>
        {benHost && !iedereenGereed && (
          <GroteKnop kleur="leeg" klein bijTik={() => beginSpel(code).catch(meldFout)}>
            Nu beginnen
          </GroteKnop>
        )}
      </div>
    </div>
  )
}

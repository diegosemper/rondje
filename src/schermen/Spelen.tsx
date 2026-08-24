import { useMemo } from 'react'
import type { Kamer, KijkContext } from '../engine/types'
import { geefSpel } from '../engine/registry'
import { berekenSlokken, slokKort, slokTekst } from '../engine/slokken'
import { stopSpel } from '../net/hostLoop'
import { stuurActie, zetSkip } from '../net/kamer'
import { useNu } from '../net/useKamer'
import { GroteKnop, Kaartje } from '../ui/Basis'
import { DrinkScherm } from '../ui/DrinkScherm'
import { meldFout } from '../ui/Fout'

export function Spelen({
  kamer,
  uid,
  prive,
}: {
  kamer: Kamer
  uid: string
  prive: any
}) {
  const nu = useNu(100)
  const code = kamer.meta.code
  const benHost = kamer.meta.hostUid === uid
  const zwaarte = kamer.instelling.zwaarte
  const mod = kamer.spel ? geefSpel(kamer.spel.gameId) : undefined

  const spelers = useMemo(
    () => kamer.volgorde.map((u) => kamer.spelers[u]).filter(Boolean),
    [kamer.volgorde, kamer.spelers],
  )

  const ctx: KijkContext = useMemo(
    () => ({
      ik: uid,
      benIkHost: benHost,
      spelers,
      zwaarte,
      prive,
      nu,
      stuur: (type, payload) => {
        stuurActie(code, uid, type, payload).catch(meldFout)
      },
      slok: (n) => slokTekst(berekenSlokken(n, zwaarte), zwaarte),
      slokKort: (n) => slokKort(berekenSlokken(n, zwaarte), zwaarte),
      naam: (u) => kamer.spelers[u]?.naam ?? '?',
      speler: (u) => kamer.spelers[u],
      ik_speler: () => kamer.spelers[uid],
    }),
    [uid, benHost, spelers, zwaarte, prive, nu, code, kamer.spelers],
  )

  const skipStemmen = Object.keys(kamer.skip).filter((u) => kamer.spelers[u]).length
  const ikGeskipt = !!kamer.skip[uid]
  const nodig = Math.floor(spelers.length / 2) + 1

  if (!mod || !kamer.spel) {
    return (
      <div className="scherm">
        <Kaartje>Spel niet gevonden.</Kaartje>
        {benHost && (
          <GroteKnop kleur="goud" bijTik={() => stopSpel(code).catch(meldFout)}>
            Kies iets anders
          </GroteKnop>
        )}
      </div>
    )
  }

  return (
    <div className="scherm">
      <DrinkScherm gedronken={kamer.score[uid]?.gedronken ?? 0} zwaarte={zwaarte} />

      <div className="balk">
        <span className="kop-klein">{mod.naam}</span>
        <button
          className={`knop klein ${ikGeskipt ? 'goud' : 'leeg'}`}
          onClick={() => zetSkip(code, uid, !ikGeskipt).catch(meldFout)}
        >
          {benHost
            ? 'Skip ⏭'
            : ikGeskipt
              ? `Skip ${skipStemmen}/${nodig}`
              : `Skip ⏭ ${skipStemmen > 0 ? `${skipStemmen}/${nodig}` : ''}`}
        </button>
      </div>

      {kamer.spel.klaar ? (
        <>
          <div className="midden">
            <div style={{ fontSize: 64 }}>🏁</div>
            <h1>{mod.naam} is klaar</h1>
            <div className="zacht">
              {spelers
                .map((s) => ({ s, n: kamer.score[s.uid]?.gedronken ?? 0 }))
                .sort((a, b) => b.n - a.n)
                .slice(0, 3)
                .map(({ s, n }) => `${s.emoji} ${s.naam} ${n}`)
                .join('  ·  ')}
            </div>
          </div>
          <div className="onderaan">
            {benHost ? (
              <GroteKnop kleur="goud" enorm bijTik={() => stopSpel(code).catch(meldFout)}>
                Volgende spel
              </GroteKnop>
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">De host kiest het volgende spel…</span>
              </Kaartje>
            )}
          </div>
        </>
      ) : (
        <mod.View state={kamer.spel.state} ctx={ctx} />
      )}

      {kamer.log.length > 0 && !kamer.spel.klaar && (
        <div className="logboek">
          {kamer.log.slice(-6).map((r) => (
            <div key={r.id}>{r.tekst}</div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { Actie, GameModule, KijkContext } from '../../engine/types'
import { GroteKnop, Kaartje, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { maakBekers, zoekRaak, type Beker, type Worp } from '../../ui/Pongveld'
import { Pongveld } from '../../ui/Pongveld'

/* ─────────────────────────────────────────────────────────────
   BIERPONG

   Twee teams, twee driehoeken bekers. Je veegt vanaf het balletje richting de
   bekers van de tegenpartij: richting bepaalt waar hij heen gaat, lengte hoe
   ver. Raak je er een, dan is die beker weg en drinkt de tegenpartij.

   Er zit met opzet geen toeval in de worp. Dezelfde veeg landt altijd op
   dezelfde plek — anders voelt missen als pech in plaats van als jouw schuld,
   en dan valt er niets te leren en niets op te scheppen.

   Wie als eerste zonder bekers zit, verliest en drinkt na.
   ───────────────────────────────────────────────────────────── */

const BEKERS = 6
const SLOK_PER_BEKER = 2
const VERLIES_STRAF = 5
const WINST_UITDELEN = 5

interface PongState {
  fase: 'gooien' | 'vlucht' | 'uitslag'
  /** teamindeling: 0 en 1 */
  teams: [string[], string[]]
  /** wie er nu gooit */
  beurt: string
  aanZetTeam: number
  /** hoeveel beurten elk team gehad heeft, voor het rouleren binnen een team */
  index: [number, number]

  bekers: [Beker[], Beker[]]
  laatsteWorp: Worp | null
  laatsteRaak: number | null

  verliezer: number | null
  magUitdelen: boolean
  klaar: boolean
}

function overGebleven(bekers: Beker[]): number {
  return bekers.filter((b) => !b.weg).length
}

function volgendeBeurt(s: PongState) {
  s.aanZetTeam = s.aanZetTeam === 0 ? 1 : 0
  const team = s.teams[s.aanZetTeam]
  s.index[s.aanZetTeam] = (s.index[s.aanZetTeam] + 1) % Math.max(1, team.length)
  s.beurt = team[s.index[s.aanZetTeam]] ?? team[0]
  s.laatsteWorp = null
  s.laatsteRaak = null
  s.fase = 'gooien'
}

export const bierpong: GameModule<PongState> = {
  id: 'bierpong',
  naam: 'Bierpong',
  uitleg: 'Veeg het balletje in de bekers van de tegenpartij. Twee teams.',
  regels: [
    'Veeg vanaf het balletje richting de bekers.',
    'Richting is waarheen, lengte is hoe ver.',
    'Raak? Die beker is weg en zij drinken 2.',
    'Wie als eerste leeg is, verliest en drinkt na.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['reflex', 'chaos'],
  privescherm: false,

  init(ctx) {
    const uids = ctx.spelers.map((p) => p.uid)
    const teamA = uids.filter((_, i) => i % 2 === 0)
    const teamB = uids.filter((_, i) => i % 2 === 1)
    // Bij een oneven aantal speelt iemand in beide teams mee; dat is beter
    // dan iemand laten toekijken.
    if (teamB.length === 0) teamB.push(uids[0])

    return {
      fase: 'gooien',
      teams: [teamA, teamB],
      beurt: teamA[0],
      aanZetTeam: 0,
      index: [0, -1],
      bekers: [maakBekers(BEKERS), maakBekers(BEKERS)],
      laatsteWorp: null,
      laatsteRaak: null,
      verliezer: null,
      magUitdelen: false,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'gooien' && actie.type === 'gooi') {
      if (actie.uid !== s.beurt) return
      const worp: Worp = {
        x: Number(actie.payload?.x),
        diepte: Number(actie.payload?.diepte),
      }
      if (!Number.isFinite(worp.x) || !Number.isFinite(worp.diepte)) return

      const doelTeam = s.aanZetTeam === 0 ? 1 : 0
      const raak = zoekRaak(worp, s.bekers[doelTeam])

      s.laatsteWorp = worp
      s.laatsteRaak = raak?.id ?? null
      s.fase = 'vlucht'
      return
    }

    /* De vlucht is afgelopen: nu pas de gevolgen. */
    if (s.fase === 'vlucht' && actie.type === 'geland') {
      const doelTeam = s.aanZetTeam === 0 ? 1 : 0

      if (s.laatsteRaak !== null) {
        const beker = s.bekers[doelTeam].find((b) => b.id === s.laatsteRaak)
        if (beker && !beker.weg) {
          beker.weg = true
          for (const uid of s.teams[doelTeam]) {
            ctx.drink(uid, SLOK_PER_BEKER, `beker weg door ${ctx.naam(s.beurt)}`)
          }
        }

        if (overGebleven(s.bekers[doelTeam]) === 0) {
          s.verliezer = doelTeam
          s.fase = 'uitslag'
          for (const uid of s.teams[doelTeam]) {
            ctx.drink(uid, VERLIES_STRAF, 'verloor bierpong')
          }
          s.magUitdelen = true
          return
        }
      }

      volgendeBeurt(s)
      return
    }

    if (s.fase === 'uitslag') {
      if (actie.type === 'geef' && s.magUitdelen) {
        const winTeam = s.verliezer === 0 ? 1 : 0
        if (!s.teams[winTeam].includes(actie.uid)) return
        const verdeling: Record<string, number> = actie.payload?.verdeling
        if (!verdeling || typeof verdeling !== 'object') return
        for (const [uid, aantal] of Object.entries(verdeling)) {
          if (!iedereen.includes(uid) || uid === actie.uid) continue
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'won bierpong')
        }
        s.magUitdelen = false
        return
      }

      if (actie.type === 'verder') {
        s.klaar = true
        ctx.klaar()
        return
      }
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

function Scherm({ s, ctx }: { s: PongState; ctx: KijkContext }) {
  const [vlucht, zetVlucht] = useState<Worp | null>(null)
  const mijnTeam = s.teams[0].includes(ctx.ik) ? 0 : 1
  const doelTeam = s.aanZetTeam === 0 ? 1 : 0
  const ikGooi = ctx.ik === s.beurt && s.fase === 'gooien'

  /* De bal laten vliegen, en pas daarna melden dat hij geland is. */
  useEffect(() => {
    if (s.fase !== 'vlucht' || !s.laatsteWorp) {
      zetVlucht(null)
      return
    }
    zetVlucht(s.laatsteWorp)
    if (!ctx.benIkHost) return
    const id = setTimeout(() => ctx.stuur('geland'), 900)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.fase, s.laatsteWorp, ctx.benIkHost])

  if (s.fase === 'uitslag') {
    const winTeam = s.verliezer === 0 ? 1 : 0
    const ikWon = mijnTeam === winTeam
    const magUitdelen = s.magUitdelen && ikWon

    return (
      <>
        <div className="midden" style={{ gap: 10 }}>
          <div style={{ fontSize: 56 }}>{ikWon ? '🏆' : '💀'}</div>
          <h1>Team {winTeam === 0 ? 'A' : 'B'} wint</h1>
          <Kaartje style={{ textAlign: 'center' }}>
            <div className="kop-klein">Winnaars</div>
            <strong>{s.teams[winTeam].map(ctx.naam).join(', ')}</strong>
            <div className="kop-klein" style={{ marginTop: 8 }}>
              Verliezers
            </div>
            <span className="zacht">{s.teams[s.verliezer!].map(ctx.naam).join(', ')}</span>
          </Kaartje>
        </div>
        <div className="onderaan">
          {magUitdelen ? (
            <Verdeler
              totaal={ctx.slokAantal(WINST_UITDELEN)}
              ctx={ctx}
              titel="Gewonnen — deel uit"
              bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
            />
          ) : s.magUitdelen ? (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">De winnaars delen uit…</span>
            </Kaartje>
          ) : ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
              Klaar
            </GroteKnop>
          ) : (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">Wachten op de host…</span>
            </Kaartje>
          )}
        </div>
      </>
    )
  }

  const speler = ctx.speler(s.beurt)

  return (
    <>
      <div className="balk">
        <span className="kop-klein" style={{ color: mijnTeam === 0 ? 'var(--goud)' : undefined }}>
          A · {overGebleven(s.bekers[0])} bekers
        </span>
        <span className="kop-klein" style={{ color: mijnTeam === 1 ? 'var(--goud)' : undefined }}>
          {overGebleven(s.bekers[1])} bekers · B
        </span>
      </div>

      <Kaartje style={{ textAlign: 'center', padding: 8 }}>
        <span className={ikGooi ? '' : 'zacht'}>
          {ikGooi
            ? '🏓 Jij gooit — veeg omhoog'
            : `${speler?.emoji} ${speler?.naam} gooit op team ${doelTeam === 0 ? 'A' : 'B'}`}
        </span>
      </Kaartje>

      <Pongveld
        bekers={s.bekers[doelTeam]}
        magGooien={ikGooi}
        vlucht={vlucht}
        bijWorp={(worp) => {
          tril(12)
          ctx.stuur('gooi', { x: worp.x, diepte: worp.diepte })
        }}
      />

      {s.fase === 'vlucht' && (
        <div
          className="klein"
          style={{
            textAlign: 'center',
            color: s.laatsteRaak !== null ? 'var(--groen)' : 'var(--rood)',
          }}
        >
          {s.laatsteRaak !== null ? '🎯 RAAK!' : 'mis…'}
        </div>
      )}

      <div className="klein zacht" style={{ textAlign: 'center' }}>
        Elke beker die eruit gaat kost de tegenpartij {ctx.slok(SLOK_PER_BEKER)}.
      </div>
    </>
  )
}

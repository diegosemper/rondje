import { useEffect, useRef, useState } from 'react'
import { husselen } from '../../engine/random'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, tril } from '../../ui/Basis'
import { HITS, type HitNummer } from './lijst'

/* ─────────────────────────────────────────────────────────────
   HITSTER

   Twee teams. Er speelt een nummer, en je moet raden waar het in de tijd
   thuishoort: vóór je oudste kaart, tussen twee kaarten, of ná je nieuwste.
   Zit je goed, dan komt de kaart in je tijdlijn.

   Het eerste team met vijf kaarten wint. Bewust vijf en niet tien: dit moet
   een minispel blijven en geen avondvullend bordspel.

   Alleen de link naar het fragment is openbaar, niet de titel of het jaar.
   Die staan in het geheime deel van de spelstand tot er onthuld wordt, dus
   niemand kan iets uitlezen dat hij nog niet hoort te weten.
   ───────────────────────────────────────────────────────────── */

const DOEL = 5
const STRAF_FOUT = 2
const STRAF_GOED_ANDER = 1
const STRAF_VERLIES = 5

interface HitState {
  teams: [string[], string[]]
  aanZetTeam: number
  index: [number, number]
  /** wie er nu afspeelt en plaatst */
  beurt: string

  tijdlijnen: [HitNummer[], HitNummer[]]

  _geheim: { nummer: HitNummer | null; gebruikt: string[] }
  /** alleen de link is openbaar; titel en jaar blijven geheim */
  url: string

  fase: 'luisteren' | 'plaatsen' | 'uitslag' | 'einde'
  laatste: { nummer: HitNummer; goed: boolean; team: number; wie: string } | null
  winnaar: number | null
  klaar: boolean
}

function pakNummer(s: HitState, ctx: SpelContext) {
  const vrij = HITS.filter((h) => !s._geheim.gebruikt.includes(h.url))
  const nummer = husselen(ctx.rng, vrij.length > 0 ? vrij : HITS)[0]
  s._geheim.nummer = nummer
  s._geheim.gebruikt.push(nummer.url)
  s.url = nummer.url
  s.fase = 'luisteren'
}

/** Klopt de gekozen plek in de tijdlijn? */
function plekKlopt(tijdlijn: HitNummer[], plek: number, jaar: number): boolean {
  const links = plek > 0 ? tijdlijn[plek - 1].jaar : -Infinity
  const rechts = plek < tijdlijn.length ? tijdlijn[plek].jaar : Infinity
  return jaar >= links && jaar <= rechts
}

function volgendeBeurt(s: HitState, ctx: SpelContext) {
  s.aanZetTeam = s.aanZetTeam === 0 ? 1 : 0
  const team = s.teams[s.aanZetTeam]
  s.index[s.aanZetTeam] = (s.index[s.aanZetTeam] + 1) % Math.max(1, team.length)
  s.beurt = team[s.index[s.aanZetTeam]] ?? team[0]
  s.laatste = null
  pakNummer(s, ctx)
}

export const hitster: GameModule<HitState> = {
  id: 'hitster',
  naam: 'Hitster',
  uitleg: 'Hoor het nummer en zet het op de goede plek in de tijd. Eerst bij vijf wint.',
  regels: [
    'Luister naar het fragment.',
    'Zet het op de juiste plek in je tijdlijn.',
    'Goed? De kaart is van jou en zij drinken.',
    'Fout? Jouw team drinkt. Eerst bij vijf wint.',
  ],
  minSpelers: 4,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['praten', 'geluk'],
  privescherm: false,

  init(ctx) {
    const uids = ctx.spelers.map((p) => p.uid)
    const teamA = uids.filter((_, i) => i % 2 === 0)
    const teamB = uids.filter((_, i) => i % 2 === 1)

    // Elk team begint met één kaart open op tafel; anders valt er niets te
    // plaatsen bij de eerste beurt.
    const start = husselen(ctx.rng, HITS).slice(0, 2)

    const s: HitState = {
      teams: [teamA, teamB],
      aanZetTeam: 0,
      index: [0, -1],
      beurt: teamA[0],
      tijdlijnen: [[start[0]], [start[1]]],
      _geheim: { nummer: null, gebruikt: [start[0].url, start[1].url] },
      url: '',
      fase: 'luisteren',
      laatste: null,
      winnaar: null,
      klaar: false,
    }
    pakNummer(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    if (s.fase === 'luisteren' && actie.type === 'plaatsen') {
      if (actie.uid !== s.beurt) return
      s.fase = 'plaatsen'
      return
    }

    if (s.fase === 'plaatsen' && actie.type === 'zet') {
      if (actie.uid !== s.beurt) return
      const nummer = s._geheim.nummer
      if (!nummer) return
      const plek = Number(actie.payload?.plek)
      const tijdlijn = s.tijdlijnen[s.aanZetTeam]
      if (!Number.isInteger(plek) || plek < 0 || plek > tijdlijn.length) return

      const goed = plekKlopt(tijdlijn, plek, nummer.jaar)
      const anderTeam = s.aanZetTeam === 0 ? 1 : 0

      if (goed) {
        tijdlijn.splice(plek, 0, nummer)
        tijdlijn.sort((a, b) => a.jaar - b.jaar)
        for (const uid of s.teams[anderTeam]) {
          ctx.drink(uid, STRAF_GOED_ANDER, `${ctx.naam(s.beurt)} zat goed`)
        }
      } else {
        for (const uid of s.teams[s.aanZetTeam]) {
          ctx.drink(uid, STRAF_FOUT, `${nummer.titel} is uit ${nummer.jaar}`)
        }
      }

      s.laatste = { nummer, goed, team: s.aanZetTeam, wie: s.beurt }

      if (tijdlijn.length >= DOEL) {
        s.winnaar = s.aanZetTeam
        s.fase = 'einde'
        for (const uid of s.teams[anderTeam]) {
          ctx.drink(uid, STRAF_VERLIES, 'verloor Hitster')
        }
        return
      }

      s.fase = 'uitslag'
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      volgendeBeurt(s, ctx)
      return
    }

    if (s.fase === 'einde' && actie.type === 'klaar') {
      s.klaar = true
      ctx.klaar()
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

/* ── Scherm ─────────────────────────────────────────────────── */

function Tijdlijn({
  kaarten,
  kiesbaar,
  bijKeuze,
}: {
  kaarten: HitNummer[]
  kiesbaar?: boolean
  bijKeuze?: (plek: number) => void
}) {
  const gleuf = (plek: number) => (
    <button
      key={`g${plek}`}
      disabled={!kiesbaar}
      onClick={() => bijKeuze?.(plek)}
      style={{
        flex: '0 0 auto',
        width: kiesbaar ? 40 : 8,
        minHeight: 58,
        borderRadius: 8,
        border: kiesbaar ? '2px dashed var(--goud)' : 'none',
        background: kiesbaar ? 'rgba(255,209,102,.14)' : 'transparent',
        color: 'var(--goud)',
        fontSize: 20,
        fontWeight: 900,
      }}
    >
      {kiesbaar ? '+' : ''}
    </button>
  )

  return (
    <div style={{ display: 'flex', gap: 4, overflowX: 'auto', alignItems: 'stretch', padding: '2px 0' }}>
      {gleuf(0)}
      {kaarten.map((k, i) => (
        <div key={k.url}>
          <div
            className="kaartje"
            style={{
              padding: '8px 10px',
              minWidth: 92,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--goud)' }}>{k.jaar}</div>
            <div style={{ fontSize: 10, opacity: 0.75, lineHeight: 1.2 }}>{k.titel}</div>
          </div>
          {gleuf(i + 1)}
        </div>
      ))}
    </div>
  )
}

function Scherm({ s, ctx }: { s: HitState; ctx: KijkContext }) {
  const [speelt, zetSpeelt] = useState(false)
  const [laadfout, zetLaadfout] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const ikBeurt = ctx.ik === s.beurt
  const mijnTeam = s.teams[0].includes(ctx.ik) ? 0 : 1
  const teamNaam = (n: number) => (n === 0 ? 'A' : 'B')

  useEffect(() => {
    const el = new Audio()
    el.preload = 'auto'
    el.onended = () => zetSpeelt(false)
    audioRef.current = el
    return () => {
      el.pause()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    const el = audioRef.current
    if (!el || !s.url) return
    el.pause()
    el.src = s.url
    el.load()
    zetLaadfout(false)
    zetSpeelt(false)
  }, [s.url])

  function speelWissel() {
    const el = audioRef.current
    if (!el) return
    if (speelt) {
      el.pause()
      zetSpeelt(false)
      return
    }
    zetSpeelt(true)
    el.play().catch(() => {
      zetLaadfout(true)
      zetSpeelt(false)
    })
  }

  const kop = (
    <div className="balk">
      <span className="kop-klein" style={{ color: mijnTeam === 0 ? 'var(--goud)' : undefined }}>
        A · {s.tijdlijnen[0].length}/{DOEL}
      </span>
      <span className="kop-klein">team {teamNaam(s.aanZetTeam)} aan zet</span>
      <span className="kop-klein" style={{ color: mijnTeam === 1 ? 'var(--goud)' : undefined }}>
        {s.tijdlijnen[1].length}/{DOEL} · B
      </span>
    </div>
  )

  /* ── Einde ── */
  if (s.fase === 'einde') {
    const win = s.winnaar ?? 0
    return (
      <>
        <div className="midden" style={{ gap: 12 }}>
          <div style={{ fontSize: 60 }}>🏆</div>
          <h1>Team {teamNaam(win)} wint</h1>
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">{s.teams[win].map(ctx.naam).join(', ')}</span>
          </Kaartje>
          <Tijdlijn kaarten={s.tijdlijnen[win]} />
        </div>
        <div className="onderaan">
          {ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('klaar')}>
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

  /* ── Uitslag van een beurt ── */
  if (s.fase === 'uitslag' && s.laatste) {
    const l = s.laatste
    return (
      <>
        {kop}
        <div className="midden" style={{ gap: 12 }}>
          <div style={{ fontSize: 54 }}>{l.goed ? '🎯' : '💥'}</div>
          <h1>{l.goed ? 'Goed geplaatst!' : 'Mis'}</h1>
          <Kaartje style={{ textAlign: 'center', borderColor: l.goed ? 'var(--groen)' : 'var(--rood)' }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--goud)' }}>
              {l.nummer.jaar}
            </div>
            <strong>{l.nummer.titel}</strong>
            <div className="klein zacht">{l.nummer.artiest}</div>
          </Kaartje>
          <div className="klein zacht">
            {l.goed
              ? `Team ${teamNaam(l.team === 0 ? 1 : 0)} drinkt ${ctx.slok(STRAF_GOED_ANDER)}`
              : `Team ${teamNaam(l.team)} drinkt ${ctx.slok(STRAF_FOUT)}`}
          </div>
          <Tijdlijn kaarten={s.tijdlijnen[l.team]} />
        </div>
        <div className="onderaan">
          {ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
              Volgende beurt
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

  /* ── Luisteren en plaatsen ── */
  const tijdlijn = s.tijdlijnen[s.aanZetTeam]

  return (
    <>
      {kop}

      <Kaartje style={{ textAlign: 'center', padding: 8 }}>
        <span className={ikBeurt ? '' : 'zacht'}>
          {ikBeurt
            ? '🎧 Jij speelt af en plaatst'
            : `${ctx.speler(s.beurt)?.emoji} ${ctx.naam(s.beurt)} is aan zet`}
        </span>
      </Kaartje>

      <div className="midden" style={{ gap: 10 }}>
        <div style={{ fontSize: 52 }} className={speelt ? 'klopt' : ''}>
          {speelt ? '🔊' : '🎵'}
        </div>
        <div className="kop-klein">Tijdlijn van team {teamNaam(s.aanZetTeam)}</div>
        <div style={{ width: '100%' }}>
          <Tijdlijn
            kaarten={tijdlijn}
            kiesbaar={ikBeurt && s.fase === 'plaatsen'}
            bijKeuze={(plek) => {
              tril(12)
              ctx.stuur('zet', { plek })
            }}
          />
        </div>
        {s.fase === 'plaatsen' && (
          <div className="klein zacht" style={{ textAlign: 'center' }}>
            {ikBeurt
              ? 'Tik op de plek waar het nummer hoort'
              : `${ctx.naam(s.beurt)} kiest een plek…`}
          </div>
        )}
      </div>

      <div className="onderaan">
        {ikBeurt ? (
          <>
            <GroteKnop kleur={speelt ? 'leeg' : 'goud'} enorm bijTik={speelWissel}>
              {speelt ? '⏸ Pauze' : '▶ Speel het fragment'}
            </GroteKnop>
            {laadfout && (
              <div className="klein" style={{ color: 'var(--rood)', textAlign: 'center' }}>
                Fragment laadt niet.
              </div>
            )}
            {s.fase === 'luisteren' && (
              <GroteKnop kleur="groen" bijTik={() => ctx.stuur('plaatsen')}>
                Genoeg gehoord — plaatsen
              </GroteKnop>
            )}
          </>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">
              Luister mee — {s.aanZetTeam === mijnTeam ? 'jouw team' : 'zij'} moet plaatsen.
            </span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

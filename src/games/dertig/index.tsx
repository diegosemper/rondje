import { husselen } from '../../engine/random'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, startKlok, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, tril } from '../../ui/Basis'
import { DERTIG_WOORDEN } from './woorden'

/* ─────────────────────────────────────────────────────────────
   30 SECONDS

   Twee teams. Eén speler krijgt vijf woorden op zijn scherm en omschrijft ze
   zo snel mogelijk aan zijn eigen team; het woord zelf mag hij niet noemen.
   Dertig seconden.

   Hoeveel het team goed heeft, zoveel slokken moet ieder lid van het ándere
   team nemen. Vijf goed is dus vijf slokken voor iedereen aan de overkant.

   De woorden staan alleen op de telefoon van de omschrijver. De rest ziet de
   klok en de stand, zodat je aan het scherm van je buurman niets hebt.
   ───────────────────────────────────────────────────────────── */

const SECONDEN = 30
const PER_KAART = 5
const BEURTEN_PER_TEAM = 3

interface DertigState {
  teams: [string[], string[]]
  aanZetTeam: number
  /** wie er binnen elk team aan de beurt is */
  index: [number, number]
  beurt: string

  fase: 'klaarzetten' | 'bezig' | 'uitslag'
  klok: Klok | null

  _geheim: { kaart: string[]; gebruikt: string[] }
  /** hoe ver de omschrijver is, zichtbaar voor iedereen */
  positie: number
  goed: number
  /** de kaart met uitkomsten, pas na afloop zichtbaar */
  onthuld: { woord: string; goed: boolean }[]

  beurtenGespeeld: number
  maxBeurten: number
  laatste: { team: number; wie: string; goed: number } | null
  klaar: boolean
}

function nieuweKaart(s: DertigState, ctx: SpelContext) {
  const vrij = DERTIG_WOORDEN.filter((w) => !s._geheim.gebruikt.includes(w))
  const bron = vrij.length >= PER_KAART ? vrij : DERTIG_WOORDEN
  const kaart = husselen(ctx.rng, bron).slice(0, PER_KAART)
  s._geheim.kaart = kaart
  s._geheim.gebruikt.push(...kaart)

  // Alleen de omschrijver ziet de woorden.
  for (const p of ctx.spelers) {
    ctx.zetPrive(p.uid, p.uid === s.beurt ? { kaart } : null)
  }
}

function volgendeBeurt(s: DertigState, ctx: SpelContext) {
  s.beurtenGespeeld++
  if (s.beurtenGespeeld >= s.maxBeurten) {
    s.klaar = true
    ctx.wisPrive()
    ctx.klaar()
    return
  }

  s.aanZetTeam = s.aanZetTeam === 0 ? 1 : 0
  const team = s.teams[s.aanZetTeam]
  s.index[s.aanZetTeam] = (s.index[s.aanZetTeam] + 1) % Math.max(1, team.length)
  s.beurt = team[s.index[s.aanZetTeam]] ?? team[0]

  s.fase = 'klaarzetten'
  s.klok = null
  s.positie = 0
  s.goed = 0
  s.onthuld = []
  nieuweKaart(s, ctx)
}

function beurtAf(s: DertigState, ctx: SpelContext) {
  s.fase = 'uitslag'
  s.klok = null

  // Wat niet meer aan bod kwam telt als niet geraden.
  const rest = s._geheim.kaart.slice(s.positie)
  s.onthuld.push(...rest.map((woord) => ({ woord, goed: false })))

  const anderTeam = s.aanZetTeam === 0 ? 1 : 0
  s.laatste = { team: s.aanZetTeam, wie: s.beurt, goed: s.goed }

  if (s.goed > 0) {
    for (const uid of s.teams[anderTeam]) {
      ctx.drink(uid, s.goed, `team ${s.aanZetTeam === 0 ? 'A' : 'B'} had er ${s.goed} goed`)
    }
  } else {
    ctx.log(`${ctx.naam(s.beurt)} kwam er niet één door`)
  }
}

export const dertig: GameModule<DertigState> = {
  id: 'dertig',
  naam: '30 Seconds',
  uitleg: 'Omschrijf vijf woorden in dertig seconden. Het andere team drinkt wat jij haalt.',
  regels: [
    'Je krijgt vijf woorden en dertig seconden.',
    'Omschrijf ze aan je eigen team — het woord zelf mag niet.',
    'Vastgelopen? Sla over, maar dat kost tijd.',
    'Wat je haalt, drinkt iedereen van het andere team.',
  ],
  minSpelers: 4,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['praten', 'reflex'],
  privescherm: true,

  init(ctx) {
    const uids = ctx.spelers.map((p) => p.uid)
    const teamA = uids.filter((_, i) => i % 2 === 0)
    const teamB = uids.filter((_, i) => i % 2 === 1)

    const s: DertigState = {
      teams: [teamA, teamB],
      aanZetTeam: 0,
      index: [0, -1],
      beurt: teamA[0],
      fase: 'klaarzetten',
      klok: null,
      _geheim: { kaart: [], gebruikt: [] },
      positie: 0,
      goed: 0,
      onthuld: [],
      beurtenGespeeld: 0,
      maxBeurten: BEURTEN_PER_TEAM * 2,
      laatste: null,
      klaar: false,
    }
    nieuweKaart(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    if (s.fase === 'klaarzetten' && actie.type === 'start') {
      if (actie.uid !== s.beurt) return
      s.fase = 'bezig'
      s.klok = startKlok(SECONDEN, ctx.nu)
      return
    }

    if (s.fase === 'bezig') {
      if (actie.type === 'goed' || actie.type === 'over') {
        if (actie.uid !== s.beurt) return
        const woord = s._geheim.kaart[s.positie]
        if (!woord) return

        s.onthuld.push({ woord, goed: actie.type === 'goed' })
        if (actie.type === 'goed') s.goed++
        s.positie++

        if (s.positie >= s._geheim.kaart.length) beurtAf(s, ctx)
        return
      }
      if (actie.type === 'tijd-op') {
        beurtAf(s, ctx)
        return
      }
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      volgendeBeurt(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

function Scherm({ s, ctx }: { s: DertigState; ctx: KijkContext }) {
  useHostKlok(ctx, s.fase === 'bezig', s.klok?.eind ?? 0, 'tijd-op')

  const ikOmschrijf = ctx.ik === s.beurt
  const mijnTeam = s.teams[0].includes(ctx.ik) ? 0 : 1
  const kaart: string[] = ctx.prive?.kaart ?? []
  const teamNaam = (n: number) => (n === 0 ? 'A' : 'B')

  const kop = (
    <div className="balk">
      <span className="kop-klein" style={{ color: mijnTeam === 0 ? 'var(--goud)' : undefined }}>
        Team A{mijnTeam === 0 ? ' · jij' : ''}
      </span>
      <span className="kop-klein">
        beurt {Math.min(s.beurtenGespeeld + 1, s.maxBeurten)}/{s.maxBeurten}
      </span>
      <span className="kop-klein" style={{ color: mijnTeam === 1 ? 'var(--goud)' : undefined }}>
        {mijnTeam === 1 ? 'jij · ' : ''}Team B
      </span>
    </div>
  )

  /* ── Uitslag ── */
  if (s.fase === 'uitslag' && s.laatste) {
    const l = s.laatste
    const anderTeam = l.team === 0 ? 1 : 0
    return (
      <>
        {kop}
        <div className="midden" style={{ gap: 10, alignItems: 'stretch' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="kop-klein">Team {teamNaam(l.team)} haalde</div>
            <div className="reusachtig" style={{ fontSize: 'clamp(56px,22vw,120px)' }}>
              {l.goed}
            </div>
            <div className="klein zacht">
              {l.goed > 0
                ? `iedereen van team ${teamNaam(anderTeam)} drinkt ${ctx.slok(l.goed)}`
                : 'niemand drinkt'}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 5 }}>
            {s.onthuld.map((r, i) => (
              <div
                key={i}
                className="kaartje balk"
                style={{
                  padding: 8,
                  borderColor: r.goed ? 'var(--groen)' : 'var(--rood)',
                  background: r.goed ? undefined : 'var(--rood-donker)',
                }}
              >
                <span>{r.woord}</span>
                <span>{r.goed ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="onderaan">
          {ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
              {s.beurtenGespeeld + 1 >= s.maxBeurten ? 'Klaar' : 'Volgende beurt'}
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

  /* ── Klaarzetten ── */
  if (s.fase === 'klaarzetten') {
    return (
      <>
        {kop}
        <div className="midden" style={{ gap: 12 }}>
          <div style={{ fontSize: 54 }}>⏱</div>
          <h1 style={{ textAlign: 'center' }}>
            {ikOmschrijf ? 'Jij omschrijft' : `${ctx.naam(s.beurt)} omschrijft`}
          </h1>
          <Kaartje style={{ textAlign: 'center' }}>
            <div className="kop-klein">Voor team {teamNaam(s.aanZetTeam)}</div>
            <span className="zacht klein">
              {s.teams[s.aanZetTeam].map(ctx.naam).join(', ')}
            </span>
          </Kaartje>
          {ikOmschrijf && (
            <div className="klein zacht" style={{ textAlign: 'center' }}>
              Vijf woorden, dertig seconden.
              <br />
              Het woord zelf mag je niet noemen.
            </div>
          )}
        </div>
        <div className="onderaan">
          {ikOmschrijf ? (
            <GroteKnop
              kleur="groen"
              enorm
              bijTik={() => {
                tril(15)
                ctx.stuur('start')
              }}
            >
              Start — 30 seconden
            </GroteKnop>
          ) : (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">
                {ctx.naam(s.beurt)} maakt zich klaar. Niet meekijken.
              </span>
            </Kaartje>
          )}
        </div>
      </>
    )
  }

  /* ── Bezig ── */
  const secOver = klokTekst(s.klok, ctx.nu)
  const woord = kaart[s.positie]

  return (
    <>
      {kop}
      <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />

      <div className="midden" style={{ gap: 12 }}>
        <div
          className="reusachtig"
          style={{
            fontSize: 'clamp(40px,15vw,84px)',
            color: Number(secOver) <= 10 ? 'var(--rood)' : 'var(--goud)',
          }}
        >
          {secOver}
        </div>

        {ikOmschrijf ? (
          <Kaartje style={{ textAlign: 'center', width: '100%', borderColor: 'var(--goud)' }}>
            <div className="kop-klein">
              Woord {s.positie + 1} van {kaart.length}
            </div>
            <h1 style={{ margin: '8px 0', fontSize: 32 }}>{woord ?? '…'}</h1>
          </Kaartje>
        ) : (
          <>
            <div style={{ fontSize: 48 }}>🗣️</div>
            <h2 className="zacht">{ctx.naam(s.beurt)} omschrijft</h2>
            {s.teams[s.aanZetTeam].includes(ctx.ik) ? (
              <div className="klein" style={{ color: 'var(--goud)' }}>
                Jij mag raden — roep maar!
              </div>
            ) : (
              <div className="klein zacht">Jouw team drinkt straks wat zij halen.</div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: PER_KAART }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 30,
                height: 10,
                borderRadius: 99,
                background:
                  i < s.onthuld.length
                    ? s.onthuld[i].goed
                      ? 'var(--groen)'
                      : 'var(--rood)'
                    : 'rgba(0,0,0,.3)',
              }}
            />
          ))}
        </div>
        <div className="klein zacht">{s.goed} goed</div>
      </div>

      <div className="onderaan">
        {ikOmschrijf ? (
          <>
            <GroteKnop
              kleur="groen"
              enorm
              bijTik={() => {
                tril(10)
                ctx.stuur('goed')
              }}
            >
              ✓ Geraden
            </GroteKnop>
            <GroteKnop kleur="leeg" bijTik={() => ctx.stuur('over')}>
              Sla over
            </GroteKnop>
          </>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Niet op zijn scherm kijken.</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

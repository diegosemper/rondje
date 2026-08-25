import { tussen } from '../../engine/random'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   OPBOUWEN OF STOPPEN

   Je blijft gooien en de pot loopt op. Gooi je een 1, dan ben je alles kwijt
   én drink je de hele pot. Stop je op tijd, dan mag je hem uitdelen.

   Elke worp is vijf zesde kans op winst, en precies daarom blijft iedereen
   te lang doorgaan. Dat is het hele spel.
   ───────────────────────────────────────────────────────────── */

const OGEN = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
const BEURTEN_PER_SPELER = 2
/** Een pot van vijftig zou de avond beëindigen. */
const MAX_STRAF = 10
/** Hier houdt het op: je moet stoppen en cashen. Anders loopt het door tot
 *  iemand met honderd slokken op tafel staat, en dan is het geen keuze meer. */
const MAX_POT = 30

interface OpbouwState {
  beurt: string
  pot: number
  worpen: number[]
  laatste: number | null
  geknald: boolean
  fase: 'gooien' | 'uitdelen'
  beurtenGespeeld: number
  maxBeurten: number
  besteRun: { uid: string; pot: number } | null
  klaar: boolean
}

function volgendeBeurt(s: OpbouwState, ctx: SpelContext) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  s.pot = 0
  s.worpen = []
  s.laatste = null
  s.geknald = false
  s.fase = 'gooien'
  s.beurtenGespeeld++
  s.beurt = volgende(volgorde, s.beurt)
  if (s.beurtenGespeeld >= s.maxBeurten) {
    s.klaar = true
    ctx.klaar()
  }
}

export const opbouwen: GameModule<OpbouwState> = {
  id: 'opbouwen',
  naam: 'Opbouwen of Stoppen',
  uitleg: 'Blijf gooien en de pot groeit. Maar gooi je een 1, dan drink je hem.',
  regels: [
    'Gooi de dobbelsteen; de ogen gaan in de pot.',
    'Stop wanneer je wil en deel de pot uit.',
    'Gooi je een 1, dan drink je de hele pot.',
    'Iedereen komt twee keer aan de beurt.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['geluk', 'chaos'],
  privescherm: false,

  init(ctx) {
    return {
      beurt: ctx.spelers[0].uid,
      pot: 0,
      worpen: [],
      laatste: null,
      geknald: false,
      fase: 'gooien',
      beurtenGespeeld: 0,
      maxBeurten: ctx.spelers.length * BEURTEN_PER_SPELER,
      besteRun: null,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'gooien' && actie.type === 'gooi') {
      if (actie.uid !== s.beurt) return
      const worp = tussen(ctx.rng, 1, 6)
      s.laatste = worp
      s.worpen.push(worp)

      if (worp === 1) {
        s.geknald = true
        const straf = Math.min(MAX_STRAF, Math.max(1, s.pot))
        ctx.drink(actie.uid, straf, `gooide een 1 met ${s.pot} in de pot`)
        volgendeBeurt(s, ctx)
        return
      }

      s.pot += worp
      if (!s.besteRun || s.pot > s.besteRun.pot) {
        s.besteRun = { uid: actie.uid, pot: s.pot }
      }

      // Plafond bereikt: doorgaan mag niet meer, cashen is het enige dat rest.
      if (s.pot >= MAX_POT) {
        s.fase = 'uitdelen'
        ctx.log(`${ctx.naam(actie.uid)} zit op het maximum van ${s.pot}`)
      }
      return
    }

    if (s.fase === 'gooien' && actie.type === 'stop') {
      if (actie.uid !== s.beurt) return
      if (s.pot <= 0) return
      s.fase = 'uitdelen'
      return
    }

    if (s.fase === 'uitdelen' && actie.type === 'geef') {
      if (actie.uid !== s.beurt) return
      const verdeling: Record<string, number> = actie.payload?.verdeling
      if (!verdeling || typeof verdeling !== 'object') return
      for (const [uid, aantal] of Object.entries(verdeling)) {
        if (!iedereen.includes(uid) || uid === actie.uid) continue
        ctx.deelUitPrecies(actie.uid, uid, aantal, `stopte op ${s.pot}`)
      }
      volgendeBeurt(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    const mijnBeurt = ctx.ik === s.beurt
    const speler = ctx.speler(s.beurt)
    const heet = s.pot >= 15

    if (s.fase === 'uitdelen') {
      return (
        <>
          <div className="midden" style={{ gap: 10 }}>
            <div style={{ fontSize: 48 }}>💰</div>
            <h1>Gestopt op {s.pot}</h1>
          </div>
          <div className="onderaan">
            {mijnBeurt ? (
              <Verdeler
                key={s.beurtenGespeeld}
                totaal={ctx.slokAantal(s.pot)}
                ctx={ctx}
                titel={`Pot van ${s.pot} — deel uit`}
                bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
              />
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">
                  {speler?.naam} deelt {ctx.slok(s.pot)} uit…
                </span>
              </Kaartje>
            )}
          </div>
        </>
      )
    }

    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Beurt {s.beurtenGespeeld + 1}/{s.maxBeurten}
          </span>
          {s.besteRun && (
            <span className="kop-klein">
              record: {ctx.naam(s.besteRun.uid)} · {s.besteRun.pot}
            </span>
          )}
        </div>

        <SpelerBalk spelers={ctx.spelers} actief={s.beurt} />

        <div className="midden" style={{ gap: 10 }}>
          <div
            style={{
              fontSize: 'clamp(80px,30vw,160px)',
              lineHeight: 1,
              color: s.laatste === 1 ? 'var(--rood)' : 'var(--tekst)',
            }}
            className={s.laatste === 1 ? 'klopt' : ''}
          >
            {s.laatste ? OGEN[s.laatste] : '🎲'}
          </div>

          <div className="kop-klein">De pot</div>
          <div
            className={heet ? 'reusachtig klopt' : 'reusachtig'}
            style={{
              fontSize: 'clamp(46px,17vw,96px)',
              color: heet ? 'var(--rood)' : 'var(--goud)',
            }}
          >
            {s.pot}
          </div>

          {s.worpen.length > 0 && (
            <div className="klein zacht">{s.worpen.map((w) => OGEN[w]).join(' ')}</div>
          )}
        </div>

        <div className="onderaan">
          {mijnBeurt ? (
            <>
              <GroteKnop
                kleur="groen"
                enorm
                bijTik={() => {
                  tril(12)
                  ctx.stuur('gooi')
                }}
              >
                🎲 Nog een keer
              </GroteKnop>
              <GroteKnop kleur="goud" uit={s.pot <= 0} bijTik={() => ctx.stuur('stop')}>
                {s.pot <= 0 ? 'Eerst gooien' : `Stop — deel ${ctx.slok(s.pot)} uit`}
              </GroteKnop>
              <div className="klein zacht" style={{ textAlign: 'center' }}>
                Een 1 kost je de hele pot. Kans: 1 op 6, elke worp opnieuw.
                <br />
                Bij {MAX_POT} moet je stoppen.
              </div>
            </>
          ) : (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">
                {speler?.emoji} {speler?.naam} staat op {s.pot} en twijfelt…
              </span>
            </Kaartje>
          )}
        </div>
      </>
    )
  },
}

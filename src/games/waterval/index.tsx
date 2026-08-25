import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   WATERVAL

   Iedereen begint tegelijk te drinken. Je mag pas stoppen als je voorganger
   gestopt is, dus wie achteraan de ketting staat zit het langst vast.

   De app meet hoe lang je doorging: ongeveer één slok per twee seconden, met
   een dak van acht. Aan een echte tafel is waterval altijd "we deden allemaal
   alsof"; hier staat het er gewoon.
   ───────────────────────────────────────────────────────────── */

const PER_SLOK_MS = 2000
const MAX_SLOKKEN = 8
const RONDES = 3

interface WatervalState {
  ronde: number
  start: string
  begonOp: number
  gestopt: string[]
  slokken: Record<string, number>
  fase: 'stromen' | 'uitslag'
  klaar: boolean
}

function nieuweRonde(s: WatervalState, ctx: SpelContext) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  if (s.ronde > 1) s.start = volgende(volgorde, s.start)
  s.begonOp = ctx.nu
  s.gestopt = []
  s.slokken = {}
  s.fase = 'stromen'
}

export const waterval: GameModule<WatervalState> = {
  id: 'waterval',
  naam: 'Waterval',
  uitleg: 'Iedereen drinkt. Je mag pas stoppen als je voorganger stopt.',
  regels: [
    'Op het teken begint iedereen te drinken.',
    'Alleen de starter mag meteen stoppen.',
    'Daarna mag steeds de volgende in de kring.',
    'Hoe langer je doorgaat, hoe meer je drinkt.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['chaos'],
  privescherm: false,

  init(ctx) {
    const s: WatervalState = {
      ronde: 1,
      start: ctx.spelers[0].uid,
      begonOp: ctx.nu,
      gestopt: [],
      slokken: {},
      fase: 'stromen',
      klaar: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'stromen' && actie.type === 'stop') {
      if (s.gestopt.includes(actie.uid)) return

      // Je bent pas aan de beurt als iedereen vóór je gestopt is.
      const startPlek = volgorde.indexOf(s.start)
      const mijnPlek = volgorde.indexOf(actie.uid)
      const positie = (mijnPlek - startPlek + volgorde.length) % volgorde.length
      if (positie !== s.gestopt.length) return

      const secondes = (actie.ts - s.begonOp) / 1000
      s.slokken[actie.uid] = Math.min(
        MAX_SLOKKEN,
        Math.max(1, Math.round((actie.ts - s.begonOp) / PER_SLOK_MS)),
      )
      s.gestopt.push(actie.uid)
      if (secondes > 0) {
        /* niets — alleen om de meting expliciet te maken */
      }

      if (s.gestopt.length < volgorde.length) return

      // Pas afrekenen als iedereen gestopt is: anders valt de drinkpauze over
      // het spel heen en kan de rest van de kring niet meer klikken.
      for (const uid of s.gestopt) {
        ctx.drink(uid, s.slokken[uid], 'waterval')
      }
      s.fase = 'uitslag'
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.klaar = true
        ctx.klaar()
        return
      }
      s.ronde++
      nieuweRonde(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    const volgorde = ctx.spelers.map((p) => p.uid)
    const startPlek = volgorde.indexOf(s.start)
    const mijnPlek = volgorde.indexOf(ctx.ik)
    const positie = (mijnPlek - startPlek + volgorde.length) % volgorde.length
    const ikGestopt = s.gestopt.includes(ctx.ik)
    const ikMag = positie === s.gestopt.length
    const secondes = Math.max(0, (ctx.nu - s.begonOp) / 1000)
    const wachtOp = volgorde[(startPlek + s.gestopt.length) % volgorde.length]

    if (s.fase === 'uitslag') {
      const rij = ctx.spelers
        .map((p) => ({ p, n: s.slokken[p.uid] ?? 0 }))
        .sort((a, b) => b.n - a.n)
      return (
        <>
          <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
            <h1 style={{ textAlign: 'center' }}>🌊 Ronde {s.ronde}</h1>
            {rij.map(({ p, n }, i) => (
              <div
                key={p.uid}
                className="kaartje balk"
                style={{
                  borderColor: i === 0 ? 'var(--rood)' : undefined,
                  background: i === 0 ? 'var(--rood-donker)' : undefined,
                }}
              >
                <span>
                  {p.emoji} <strong>{p.naam}</strong>
                </span>
                <strong>{n}</strong>
              </div>
            ))}
          </div>
          <div className="onderaan">
            {ctx.benIkHost ? (
              <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
                {s.ronde >= RONDES ? 'Klaar' : 'Volgende ronde'}
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

    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Ronde {s.ronde}/{RONDES}
          </span>
          <span className="kop-klein">
            {s.gestopt.length}/{volgorde.length} gestopt
          </span>
        </div>

        <div className="midden" style={{ gap: 10 }}>
          <div style={{ fontSize: 56 }}>🌊</div>
          <div className="reusachtig" style={{ fontSize: 'clamp(40px,14vw,76px)' }}>
            {Math.round(secondes)}s
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
            {volgorde.map((uid, i) => {
              const plek = (i - startPlek + volgorde.length) % volgorde.length
              const weg = s.gestopt.includes(uid)
              return (
                <span
                  key={uid}
                  className="kaartje"
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    opacity: weg ? 0.35 : 1,
                    borderColor: plek === s.gestopt.length ? 'var(--goud)' : undefined,
                  }}
                >
                  {ctx.speler(uid)?.emoji} {ctx.naam(uid)}
                  {weg && ` · ${s.slokken[uid]}`}
                </span>
              )
            })}
          </div>
        </div>

        <div className="onderaan">
          {ikGestopt ? (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">
                Je stopte op {s.slokken[ctx.ik]} — wachten op de rest
              </span>
            </Kaartje>
          ) : (
            <>
              <div className="klein zacht" style={{ textAlign: 'center' }}>
                {ikMag ? 'Je mag stoppen wanneer je wil' : `Wachten tot ${ctx.naam(wachtOp)} stopt`}
              </div>
              <GroteKnop
                kleur={ikMag ? 'rood' : 'grijs'}
                enorm
                uit={!ikMag}
                bijTik={() => ctx.stuur('stop')}
              >
                {ikMag ? 'STOP' : '🔒 Doordrinken'}
              </GroteKnop>
            </>
          )}
        </div>
      </>
    )
  },
}

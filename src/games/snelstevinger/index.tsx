import { tussen } from '../../engine/random'
import type { Actie, GameModule, SpelContext } from '../../engine/types'
import { GroteKnop, tril } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   Snelste Vinger

   Het scherm staat rood. Op een willekeurig moment springt het op groen.
   Wie het laatst tikt, drinkt. Te vroeg tikken telt als het traagst.

   Truc: de host bepaalt vooraf één tijdstip waarop het groen wordt en zet
   dat in de spelstand. Elke telefoon rekent zelf uit of dat moment al
   voorbij is. Zo hoeft er geen "nu!"-signaal over het internet — dat zou
   altijd bij de een eerder aankomen dan bij de ander.
   ───────────────────────────────────────────────────────────── */

interface SnelState {
  ronde: number
  maxRondes: number
  /** server-tijd waarop het groen wordt */
  groenOp: number
  fase: 'aftellen' | 'uitslag'
  /** uid → reactietijd in ms; negatief betekent te vroeg */
  tijden: Record<string, number>
}

const MIN_WACHT = 2500
const MAX_WACHT = 8000

function nieuweRonde(s: SnelState, ctx: SpelContext) {
  s.groenOp = ctx.nu + tussen(ctx.rng, MIN_WACHT, MAX_WACHT)
  s.tijden = {}
  s.fase = 'aftellen'
}

function rondAf(s: SnelState, ctx: SpelContext) {
  s.fase = 'uitslag'

  const deelnemers = ctx.spelers.map((p) => p.uid)
  const scores = deelnemers.map((uid) => ({ uid, tijd: s.tijden[uid] ?? 99999 }))

  // Te vroeg (negatief) telt als het allerslechtst.
  const straf = (t: number) => (t < 0 ? 100000 - t : t)
  scores.sort((a, b) => straf(a.tijd) - straf(b.tijd))

  const slechtste = scores[scores.length - 1]
  if (!slechtste) return

  const teVroeg = slechtste.tijd < 0
  ctx.drink(
    slechtste.uid,
    teVroeg ? 3 : 2,
    teVroeg ? 'tikte te vroeg' : 'was het traagst',
  )
}

export const snelstevinger: GameModule<SnelState> = {
  id: 'snelstevinger',
  naam: 'Snelste Vinger',
  uitleg: 'Wacht op groen en tik. De traagste drinkt.',
  regels: [
    'Het scherm staat rood — nog niet tikken.',
    'Zodra het groen wordt: zo snel mogelijk tikken.',
    'De traagste drinkt 2.',
    'Te vroeg getikt? Dan drink je er 3.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['reflex', 'chaos'],
  privescherm: false,

  init(ctx) {
    const s: SnelState = {
      ronde: 0,
      maxRondes: 5,
      groenOp: 0,
      fase: 'aftellen',
      tijden: {},
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    if (actie.type === 'tik' && s.fase === 'aftellen') {
      if (s.tijden[actie.uid] !== undefined) return
      s.tijden[actie.uid] = actie.ts - s.groenOp

      // Iedereen binnen? Dan de uitslag.
      if (ctx.spelers.every((p) => s.tijden[p.uid] !== undefined)) rondAf(s, ctx)
      return
    }

    // Iemand tikt niet (telefoon in de zak). De host kan doorzetten.
    if (actie.type === 'forceer' && s.fase === 'aftellen') {
      rondAf(s, ctx)
      return
    }

    if (actie.type === 'verder' && s.fase === 'uitslag') {
      s.ronde++
      if (s.ronde >= s.maxRondes) {
        ctx.klaar()
        return
      }
      nieuweRonde(s, ctx)
      return
    }
  },

  View({ state: s, ctx }) {
    const groen = ctx.nu >= s.groenOp
    const ikGetikt = s.tijden[ctx.ik] !== undefined
    const mijnTijd = s.tijden[ctx.ik]

    if (s.fase === 'aftellen') {
      return (
        <>
          <div className="kop-klein">
            Ronde {s.ronde + 1} van {s.maxRondes}
          </div>

          <button
            onClick={() => {
              if (ikGetikt) return
              tril(groen ? 15 : [40, 30, 40])
              ctx.stuur('tik')
            }}
            disabled={ikGetikt}
            style={{
              flex: 1,
              borderRadius: 'var(--straal)',
              background: ikGetikt
                ? 'var(--vlak)'
                : groen
                  ? 'var(--groen)'
                  : 'var(--rood-donker)',
              color: groen && !ikGetikt ? '#05230f' : 'var(--tekst)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 60ms linear',
            }}
          >
            {ikGetikt ? (
              <>
                <div className="reusachtig" style={{ fontSize: 'clamp(40px,14vw,80px)' }}>
                  {mijnTijd < 0 ? 'TE VROEG' : `${mijnTijd} ms`}
                </div>
                <div className="zacht">wachten op de rest…</div>
              </>
            ) : groen ? (
              <div className="reusachtig">TIK!</div>
            ) : (
              <>
                <div style={{ fontSize: 56 }}>✋</div>
                <h2>Wacht…</h2>
              </>
            )}
          </button>

          <div className="klein zacht" style={{ textAlign: 'center' }}>
            {Object.keys(s.tijden).length} van {ctx.spelers.length} getikt
          </div>

          {ctx.benIkHost && (
            <GroteKnop kleur="leeg" bijTik={() => ctx.stuur('forceer')}>
              Doorgaan zonder de rest
            </GroteKnop>
          )}
        </>
      )
    }

    const rij = ctx.spelers
      .map((p) => ({ p, tijd: s.tijden[p.uid] }))
      .sort((a, b) => {
        const straf = (t: number | undefined) =>
          t === undefined ? 200000 : t < 0 ? 100000 - t : t
        return straf(a.tijd) - straf(b.tijd)
      })

    return (
      <>
        <div className="kop-klein">Uitslag</div>
        <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
          {rij.map(({ p, tijd }, i) => {
            const laatste = i === rij.length - 1
            return (
              <div
                key={p.uid}
                className="kaartje balk"
                style={{
                  borderColor: laatste ? 'var(--rood)' : undefined,
                  background: laatste ? 'var(--rood-donker)' : undefined,
                }}
              >
                <span>
                  {i + 1}. {p.emoji} <strong>{p.naam}</strong>
                </span>
                <span style={{ fontWeight: 700 }}>
                  {tijd === undefined ? '—' : tijd < 0 ? 'te vroeg' : `${tijd} ms`}
                </span>
              </div>
            )
          })}
        </div>

        <div className="onderaan">
          <GroteKnop kleur="goud" bijTik={() => ctx.stuur('verder')}>
            {s.ronde + 1 >= s.maxRondes ? 'Klaar' : 'Volgende ronde'}
          </GroteKnop>
        </div>
      </>
    )
  },
}

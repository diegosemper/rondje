import { nieuweStapel, trek, type Kaart, type Stapel } from '../../engine/deck'
import { useHostKlok } from '../../engine/hooks'
import { startKlok, type Klok } from '../../engine/timer'
import type { Actie, GameModule, SpelContext } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   EZELEN

   Iedereen heeft vier kaarten. Elke ronde kiest iedereen tegelijk één kaart
   om naar links door te schuiven. Wie vier gelijke krijgt, tikt — en dan moet
   de rest zo snel mogelijk volgen. De laatste drinkt.

   Het gemene zit erin dat je niet weet wanneer het losbarst. Je zit naar je
   eigen kaarten te turen terwijl iemand allang zit te wachten tot jij het
   doorhebt.
   ───────────────────────────────────────────────────────────── */

const HAND = 4
const RONDES = 3
const RACE_SEC = 5
const STRAF_LAATSTE = 3
const MAX_WISSELS = 20

interface EzelState {
  stapel: Stapel
  ronde: number
  fase: 'wisselen' | 'race' | 'uitslag'

  _geheim: {
    handen: Record<string, Kaart[]>
    /** wat iedereen deze wissel doorschuift, tot ze allemaal binnen zijn */
    gekozen: Record<string, string>
  }

  /** wie er deze wissel al gekozen heeft — dit mag iedereen zien */
  klaar: string[]
  wissels: number

  roeper: string | null
  klok: Klok | null
  getikt: Record<string, number>
  verliezer: string | null

  afgelopen: boolean
}

function deelHanden(s: EzelState, ctx: SpelContext) {
  s.stapel = nieuweStapel(ctx.rng)
  for (const p of ctx.spelers) {
    const hand: Kaart[] = []
    for (let i = 0; i < HAND; i++) hand.push(trek(s.stapel, ctx.rng))
    s._geheim.handen[p.uid] = hand
    ctx.zetPrive(p.uid, { hand })
  }
}

function nieuweRonde(s: EzelState, ctx: SpelContext) {
  s.fase = 'wisselen'
  s._geheim.gekozen = {}
  s.klaar = []
  s.wissels = 0
  s.roeper = null
  s.klok = null
  s.getikt = {}
  s.verliezer = null
  deelHanden(s, ctx)
}

function heeftVier(hand: Kaart[]): boolean {
  if (hand.length < HAND) return false
  return hand.every((k) => k.waarde === hand[0].waarde)
}

function rondAf(s: EzelState, ctx: SpelContext) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  let traagste: string | null = null
  let traagsteTijd = -1
  for (const uid of volgorde) {
    const t = s.getikt[uid] ?? Number.MAX_SAFE_INTEGER
    if (t > traagsteTijd) {
      traagsteTijd = t
      traagste = uid
    }
  }
  s.verliezer = traagste
  s.fase = 'uitslag'
  if (traagste) ctx.drink(traagste, STRAF_LAATSTE, 'tikte als laatste')
}

export const ezelen: GameModule<EzelState> = {
  id: 'ezelen',
  naam: 'Ezelen',
  uitleg: 'Schuif kaarten door tot je er vier gelijk hebt. De traagste drinkt.',
  regels: [
    'Iedereen heeft vier kaarten.',
    'Kies er één om door te schuiven.',
    'Vier gelijke? Tik zo snel mogelijk.',
    'Zodra iemand tikt moet de rest volgen — de laatste drinkt.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['kaarten', 'reflex', 'chaos'],
  privescherm: true,

  init(ctx) {
    const s: EzelState = {
      stapel: nieuweStapel(ctx.rng),
      ronde: 1,
      fase: 'wisselen',
      _geheim: { handen: {}, gekozen: {} },
      klaar: [],
      wissels: 0,
      roeper: null,
      klok: null,
      getikt: {},
      verliezer: null,
      afgelopen: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'wisselen') {
      /* Een kaart kiezen om door te schuiven */
      if (actie.type === 'schuif') {
        const kaartId = String(actie.payload?.id ?? '')
        const hand = s._geheim.handen[actie.uid] ?? []
        if (!hand.some((k) => k.id === kaartId)) return

        s._geheim.gekozen[actie.uid] = kaartId
        if (!s.klaar.includes(actie.uid)) s.klaar.push(actie.uid)
        if (!volgorde.every((u) => s._geheim.gekozen[u])) return

        // Iedereen heeft gekozen: allemaal tegelijk doorschuiven naar links.
        const weg: Record<string, Kaart> = {}
        for (const uid of volgorde) {
          const hand2 = s._geheim.handen[uid] ?? []
          const idx = hand2.findIndex((k) => k.id === s._geheim.gekozen[uid])
          weg[uid] = hand2.splice(idx, 1)[0]
          s._geheim.handen[uid] = hand2
        }
        // Jouw kaart gaat naar de volgende in de kring, dus je krijgt er een
        // van de vorige. Iedereen houdt zo altijd precies vier kaarten.
        volgorde.forEach((uid, i) => {
          const vorige = volgorde[(i - 1 + volgorde.length) % volgorde.length]
          s._geheim.handen[uid].push(weg[vorige])
        })
        for (const uid of volgorde) ctx.zetPrive(uid, { hand: s._geheim.handen[uid] })

        s._geheim.gekozen = {}
        s.klaar = []
        s.wissels++

        // Niemand komt eruit? Dan houdt het een keer op.
        if (s.wissels >= MAX_WISSELS) {
          ctx.log('Twintig keer geschoven en niemand had vier gelijke')
          s.fase = 'uitslag'
          s.verliezer = null
        }
        return
      }

      /* Vier gelijke — de race begint */
      if (actie.type === 'roep') {
        const hand = s._geheim.handen[actie.uid] ?? []
        if (!heeftVier(hand)) return
        s.roeper = actie.uid
        s.fase = 'race'
        s.klok = startKlok(RACE_SEC, ctx.nu)
        s.getikt = { [actie.uid]: actie.ts }
        return
      }
      return
    }

    if (s.fase === 'race') {
      if (actie.type === 'tik') {
        if (s.getikt[actie.uid] !== undefined) return
        s.getikt[actie.uid] = actie.ts
        if (!volgorde.every((u) => s.getikt[u] !== undefined)) return
        rondAf(s, ctx)
        return
      }
      if (actie.type === 'sluit-race') {
        rondAf(s, ctx)
        return
      }
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.afgelopen = true
        ctx.wisPrive()
        ctx.klaar()
        return
      }
      s.ronde++
      nieuweRonde(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.afgelopen,

  View({ state: s, ctx }) {
    useHostKlok(ctx, s.fase === 'race', s.klok?.eind ?? 0, 'sluit-race')

    const hand: Kaart[] = ctx.prive?.hand ?? []
    const ikKlaar = s.klaar.includes(ctx.ik)
    const vier = heeftVier(hand)

    if (s.fase === 'race') {
      const ikGetikt = s.getikt[ctx.ik] !== undefined
      return (
        <>
          <div className="midden" style={{ gap: 10 }}>
            <div style={{ fontSize: 60 }}>🚨</div>
            <h1>{ctx.naam(s.roeper ?? '')} heeft ze!</h1>
            <div className="klein zacht">
              {Object.keys(s.getikt).length} van {ctx.spelers.length} getikt
            </div>
          </div>
          <div className="onderaan">
            <GroteKnop
              kleur={ikGetikt ? 'leeg' : 'groen'}
              enorm
              uit={ikGetikt}
              bijTik={() => {
                tril(15)
                ctx.stuur('tik')
              }}
            >
              {ikGetikt ? '✓ Je was er op tijd' : 'TIK!'}
            </GroteKnop>
            <div className="klein zacht" style={{ textAlign: 'center' }}>
              De laatste drinkt {ctx.slok(STRAF_LAATSTE)}.
            </div>
          </div>
        </>
      )
    }

    if (s.fase === 'uitslag') {
      const rij = ctx.spelers
        .map((p) => ({ p, t: s.getikt[p.uid] }))
        .sort((a, b) => (a.t ?? Infinity) - (b.t ?? Infinity))
      const start = s.getikt[s.roeper ?? ''] ?? 0

      return (
        <>
          <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
            <h2 style={{ textAlign: 'center' }}>
              {s.verliezer ? `${ctx.naam(s.verliezer)} was het traagst` : 'Niemand kreeg er vier'}
            </h2>
            {s.verliezer &&
              rij.map(({ p, t }, i) => (
                <div
                  key={p.uid}
                  className="kaartje balk"
                  style={{
                    borderColor: p.uid === s.verliezer ? 'var(--rood)' : undefined,
                    background: p.uid === s.verliezer ? 'var(--rood-donker)' : undefined,
                  }}
                >
                  <span>
                    {i + 1}. {p.emoji} <strong>{p.naam}</strong>
                    {p.uid === s.roeper && ' 🚨'}
                  </span>
                  <span className="klein zacht">
                    {t === undefined ? 'tikte niet' : `+${Math.max(0, t - start)} ms`}
                  </span>
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
          <span className="kop-klein">wissel {s.wissels}</span>
        </div>

        <SpelerBalk spelers={ctx.spelers} actief={s.klaar} />

        <div className="midden" style={{ gap: 10 }}>
          <div className="kop-klein">
            {ikKlaar ? 'Gekozen — wachten op de rest' : 'Kies een kaart om door te schuiven'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {hand.map((k) => (
              <button
                key={k.id}
                disabled={ikKlaar}
                onClick={() => ctx.stuur('schuif', { id: k.id })}
                style={{
                  padding: 0,
                  borderRadius: 14,
                  opacity: ikKlaar ? 0.4 : 1,
                }}
              >
                <Speelkaart kaart={k} maat="midden" />
              </button>
            ))}
          </div>
          <div className="klein zacht">
            {s.klaar.length} van {ctx.spelers.length} gekozen · gaat naar de volgende
          </div>
        </div>

        <div className="onderaan">
          <GroteKnop
            kleur={vier ? 'goud' : 'leeg'}
            enorm={vier}
            uit={!vier}
            bijTik={() => {
              tril(30)
              ctx.stuur('roep')
            }}
          >
            {vier ? '🚨 IK HEB ZE — TIK!' : 'Nog geen vier gelijke'}
          </GroteKnop>
        </div>
      </>
    )
  },
}

import { kaartKort, nieuweStapel, trek, type Kaart, type Stapel } from '../../engine/deck'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, SpelContext } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   21 OVERBOORD

   Om de beurt kaarten pakken. Kom zo dicht mogelijk bij 21, maar ga er niet
   overheen — dan drink je zoveel als je te ver zat.

   Wie het dichtst bij 21 komt zonder overboord te gaan, mag uitdelen.

   Aas telt als 11, tenzij je daarmee zou klappen; dan telt hij als 1. Precies
   zoals bij blackjack, en de app rekent het voor je uit.
   ───────────────────────────────────────────────────────────── */

const RONDES = 3
const WINST_UITDELEN = 3

interface Ehand {
  kaarten: Kaart[]
  totaal: number
  gestopt: boolean
  overboord: boolean
}

interface EenentwintigState {
  stapel: Stapel
  ronde: number
  beurt: string
  handen: Record<string, Ehand>
  fase: 'spelen' | 'uitslag' | 'uitdelen'
  winnaars: string[]
  uitdeelIndex: number
  klaar: boolean
}

/** Telt een hand met de zachte-aas-regel: aas is 11, of 1 als dat moet. */
export function telHand(kaarten: Kaart[]): number {
  let totaal = 0
  let azen = 0
  for (const k of kaarten) {
    if (k.waarde === 14) {
      azen++
      totaal += 11
    } else if (k.waarde >= 11) {
      totaal += 10
    } else {
      totaal += k.waarde
    }
  }
  while (totaal > 21 && azen > 0) {
    totaal -= 10
    azen--
  }
  return totaal
}

function legeHand(): Ehand {
  return { kaarten: [], totaal: 0, gestopt: false, overboord: false }
}

function nieuweRonde(s: EenentwintigState, ctx: SpelContext) {
  s.fase = 'spelen'
  s.winnaars = []
  s.uitdeelIndex = 0
  s.handen = {}
  for (const p of ctx.spelers) s.handen[p.uid] = legeHand()

  // Iedereen begint met één kaart, dat scheelt een saaie eerste ronde.
  for (const p of ctx.spelers) {
    const hand = s.handen[p.uid]
    hand.kaarten.push(trek(s.stapel, ctx.rng))
    hand.totaal = telHand(hand.kaarten)
  }
  s.beurt = ctx.spelers[0].uid
}

function volgendeSpeler(s: EenentwintigState, ctx: SpelContext) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  let kandidaat = s.beurt
  for (let i = 0; i < volgorde.length; i++) {
    kandidaat = volgende(volgorde, kandidaat)
    const h = s.handen[kandidaat]
    if (h && !h.gestopt && !h.overboord) {
      s.beurt = kandidaat
      return
    }
  }
  rondAf(s, ctx)
}

function rondAf(s: EenentwintigState, ctx: SpelContext) {
  const overlevers = ctx.spelers
    .map((p) => ({ uid: p.uid, hand: s.handen[p.uid] }))
    .filter((r) => r.hand && !r.hand.overboord)

  const beste = Math.max(0, ...overlevers.map((r) => r.hand.totaal))
  s.winnaars = beste > 0 ? overlevers.filter((r) => r.hand.totaal === beste).map((r) => r.uid) : []

  if (s.winnaars.length === 0) {
    ctx.log('Iedereen overboord — niemand deelt uit')
    s.fase = 'uitslag'
    return
  }

  ctx.log(`${s.winnaars.map(ctx.naam).join(' en ')} kwam op ${beste}`)
  s.fase = 'uitdelen'
  s.uitdeelIndex = 0
}

export const eenentwintig: GameModule<EenentwintigState> = {
  id: 'eenentwintig',
  naam: '21 Overboord',
  uitleg: 'Zo dicht mogelijk bij 21. Eroverheen en je drinkt het verschil.',
  regels: [
    'Pak kaarten tot je dicht bij 21 zit.',
    'Boven de 21? Je drinkt wat je te ver zat.',
    'Wie het dichtst bij 21 komt mag uitdelen.',
    'Aas telt 11, of 1 als dat beter uitkomt.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['kaarten', 'geluk'],
  privescherm: false,

  init(ctx) {
    const s: EenentwintigState = {
      stapel: nieuweStapel(ctx.rng),
      ronde: 1,
      beurt: ctx.spelers[0].uid,
      handen: {},
      fase: 'spelen',
      winnaars: [],
      uitdeelIndex: 0,
      klaar: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'spelen' && actie.uid === s.beurt) {
      const hand = s.handen[actie.uid]
      if (!hand || hand.gestopt || hand.overboord) return

      if (actie.type === 'pak') {
        hand.kaarten.push(trek(s.stapel, ctx.rng))
        hand.totaal = telHand(hand.kaarten)

        if (hand.totaal > 21) {
          hand.overboord = true
          const teVer = hand.totaal - 21
          ctx.drink(actie.uid, teVer, `overboord op ${hand.totaal}`)
          volgendeSpeler(s, ctx)
        }
        return
      }

      if (actie.type === 'stop') {
        hand.gestopt = true
        volgendeSpeler(s, ctx)
        return
      }
    }

    if (s.fase === 'uitdelen' && actie.type === 'geef') {
      const aanZet = s.winnaars[s.uitdeelIndex]
      if (actie.uid !== aanZet) return
      const verdeling: Record<string, number> = actie.payload?.verdeling
      if (!verdeling || typeof verdeling !== 'object') return

      for (const [uid, aantal] of Object.entries(verdeling)) {
        if (!volgorde.includes(uid) || uid === aanZet) continue
        ctx.deelUitPrecies(aanZet, uid, aantal, 'kwam het dichtst bij 21')
      }
      s.uitdeelIndex++
      if (s.uitdeelIndex >= s.winnaars.length) s.fase = 'uitslag'
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
    const mijnHand = s.handen[ctx.ik]
    const mijnBeurt = ctx.ik === s.beurt && s.fase === 'spelen'
    const aanZet = s.fase === 'uitdelen' ? s.winnaars[s.uitdeelIndex] : null

    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Ronde {s.ronde}/{RONDES}
          </span>
          <span className="kop-klein">doel: 21</span>
        </div>

        <SpelerBalk spelers={ctx.spelers} actief={s.fase === 'spelen' ? s.beurt : s.winnaars} />

        <div style={{ display: 'grid', gap: 6 }}>
          {ctx.spelers.map((p) => {
            const h = s.handen[p.uid]
            if (!h) return null
            const ik = p.uid === ctx.ik
            return (
              <div
                key={p.uid}
                className="kaartje balk"
                style={{
                  padding: 8,
                  borderColor: h.overboord
                    ? 'var(--rood)'
                    : s.winnaars.includes(p.uid)
                      ? 'var(--goud)'
                      : ik
                        ? 'var(--rand)'
                        : undefined,
                  background: h.overboord ? 'var(--rood-donker)' : undefined,
                  opacity: h.gestopt || h.overboord ? 0.8 : 1,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span>{p.emoji}</span>
                  <span
                    className="klein"
                    style={{ maxWidth: 62, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {p.naam}
                  </span>
                  <span style={{ display: 'flex', gap: 2 }}>
                    {h.kaarten.map((k) => (
                      <span key={k.id} className="klein zacht">
                        {kaartKort(k)}
                      </span>
                    ))}
                  </span>
                </span>
                <strong style={{ fontSize: 20 }}>
                  {h.totaal}
                  {h.overboord && ' 💥'}
                  {h.gestopt && ' ✋'}
                </strong>
              </div>
            )
          })}
        </div>

        {mijnHand && mijnHand.kaarten.length > 0 && (
          <div className="midden" style={{ gap: 8 }}>
            <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
              {mijnHand.kaarten.map((k) => (
                <Speelkaart key={k.id} kaart={k} maat="klein" />
              ))}
            </div>
            <div className="reusachtig" style={{ fontSize: 'clamp(40px,14vw,72px)' }}>
              {mijnHand.totaal}
            </div>
          </div>
        )}

        <div className="onderaan">
          {s.fase === 'spelen' &&
            (mijnBeurt ? (
              <div className="rij">
                <GroteKnop kleur="groen" enorm bijTik={() => ctx.stuur('pak')}>
                  Nog een kaart
                </GroteKnop>
                <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('stop')}>
                  Ik stop
                </GroteKnop>
              </div>
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">
                  {ctx.speler(s.beurt)?.emoji} {ctx.naam(s.beurt)} is aan de beurt
                </span>
              </Kaartje>
            ))}

          {s.fase === 'uitdelen' &&
            (aanZet === ctx.ik ? (
              <Verdeler
                key={s.uitdeelIndex}
                totaal={ctx.slokAantal(WINST_UITDELEN)}
                ctx={ctx}
                titel="Je won — deel uit"
                bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
              />
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">{ctx.naam(aanZet!)} deelt uit…</span>
              </Kaartje>
            ))}

          {s.fase === 'uitslag' &&
            (ctx.benIkHost ? (
              <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
                {s.ronde >= RONDES ? 'Klaar' : 'Volgende ronde'}
              </GroteKnop>
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">Wachten op de host…</span>
              </Kaartje>
            ))}
        </div>
      </>
    )
  },
}

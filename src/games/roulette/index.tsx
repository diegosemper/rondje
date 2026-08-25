import { husselen } from '../../engine/random'
import { nieuwDeck, kaartKort, type Kaart } from '../../engine/deck'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, SpelContext } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   KAARTROULETTE

   Vijftien kaarten liggen dicht op tafel. Eén ervan is de bom. Om de beurt
   trek je er een, en bij elke veilige kaart loopt de pot op.

   Je mag ook passen. Dan drink je de helft van de pot en ben je die beurt
   kwijt — maar de pot blijft staan voor de volgende.

   Het gemene is dat de kans elke beurt groter wordt. Bij vijftien kaarten is
   het één op vijftien; bij de laatste twee is het kop of munt. En dan staat
   er inmiddels van alles op.
   ───────────────────────────────────────────────────────────── */

const KAARTEN = 15
const RONDES = 3

interface RouletteState {
  ronde: number
  /** de kaarten die nog dicht liggen */
  rest: Kaart[]
  /** de index in `rest` van de bom — geheim */
  _geheim: { bomId: string }
  getrokken: { uid: string; kaart: Kaart; bom: boolean }[]
  pot: number
  beurt: string
  fase: 'spelen' | 'boem'
  slachtoffer: string | null
  klaar: boolean
}

function nieuweRonde(s: RouletteState, ctx: SpelContext) {
  const deck = husselen(ctx.rng, nieuwDeck()).slice(0, KAARTEN)
  s.rest = deck
  s._geheim.bomId = deck[Math.floor(ctx.rng() * deck.length)].id
  s.getrokken = []
  s.pot = 1
  s.fase = 'spelen'
  s.slachtoffer = null
}

export const roulette: GameModule<RouletteState> = {
  id: 'roulette',
  naam: 'Kaartroulette',
  uitleg: 'Eén kaart is de bom. De pot loopt op bij elke kaart die het niet is.',
  regels: [
    'Vijftien kaarten, één ervan is de bom.',
    'Trek er een — de pot loopt elke keer op.',
    'Trek je de bom? Je drinkt de hele pot.',
    'Passen mag: je drinkt de helft en de beurt gaat door.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['kaarten', 'geluk', 'chaos'],
  privescherm: false,

  init(ctx) {
    const s: RouletteState = {
      ronde: 1,
      rest: [],
      _geheim: { bomId: '' },
      getrokken: [],
      pot: 1,
      beurt: ctx.spelers[0].uid,
      fase: 'spelen',
      slachtoffer: null,
      klaar: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'spelen' && actie.uid === s.beurt) {
      if (actie.type === 'trek') {
        if (s.rest.length === 0) return
        const idx = Math.floor(ctx.rng() * s.rest.length)
        const kaart = s.rest.splice(idx, 1)[0]
        const isBom = kaart.id === s._geheim.bomId

        s.getrokken.push({ uid: actie.uid, kaart, bom: isBom })

        if (isBom) {
          ctx.drink(actie.uid, s.pot, `trok de bom (${kaartKort(kaart)})`)
          s.slachtoffer = actie.uid
          s.fase = 'boem'
          return
        }

        s.pot++
        s.beurt = volgende(volgorde, s.beurt)

        // Alles op en de bom nooit getrokken? Kan niet, maar voor de zekerheid.
        if (s.rest.length === 0) {
          s.fase = 'boem'
          s.slachtoffer = null
        }
        return
      }

      if (actie.type === 'pas') {
        const helft = Math.max(1, Math.ceil(s.pot / 2))
        ctx.drink(actie.uid, helft, 'paste')
        s.beurt = volgende(volgorde, s.beurt)
        return
      }
    }

    if (s.fase === 'boem' && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.klaar = true
        ctx.klaar()
        return
      }
      s.ronde++
      // De volgende ronde begint bij de pechvogel.
      if (s.slachtoffer) s.beurt = s.slachtoffer
      nieuweRonde(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    const mijnBeurt = ctx.ik === s.beurt && s.fase === 'spelen'
    const kans = s.rest.length > 0 ? Math.round((1 / s.rest.length) * 100) : 0
    const laatste = s.getrokken[s.getrokken.length - 1]

    if (s.fase === 'boem') {
      const slachtoffer = ctx.speler(s.slachtoffer ?? '')
      return (
        <>
          <div className="midden" style={{ gap: 10 }}>
            <div style={{ fontSize: 72 }} className="klopt">
              💥
            </div>
            <h1>{slachtoffer ? `${slachtoffer.emoji} ${slachtoffer.naam}` : 'Niemand'}</h1>
            <h2 className="zacht">
              {slachtoffer ? `dronk de pot van ${ctx.slok(s.pot)}` : 'de bom bleef liggen'}
            </h2>
            <div className="klein zacht">
              {s.getrokken.length} kaarten getrokken deze ronde
            </div>
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
            {s.rest.length} kaarten · {kans}% kans
          </span>
        </div>

        <SpelerBalk spelers={ctx.spelers} actief={s.beurt} />

        <div className="midden" style={{ gap: 10 }}>
          <div className="kop-klein">De pot</div>
          <div
            className={s.pot >= 6 ? 'reusachtig klopt' : 'reusachtig'}
            style={{
              fontSize: 'clamp(50px,18vw,100px)',
              color: s.pot >= 6 ? 'var(--rood)' : 'var(--goud)',
            }}
          >
            {s.pot}
          </div>
          <div className="klein zacht">{ctx.slok(s.pot)} voor wie de bom trekt</div>

          {laatste && (
            <div className="klein zacht">
              {ctx.naam(laatste.uid)} trok {kaartKort(laatste.kaart)} — veilig
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
            {s.rest.map((k) => (
              <Speelkaart key={k.id} maat="klein" dicht />
            ))}
          </div>
        </div>

        <div className="onderaan">
          {mijnBeurt ? (
            <>
              <GroteKnop kleur="rood" enorm bijTik={() => ctx.stuur('trek')}>
                Trek een kaart
              </GroteKnop>
              <GroteKnop kleur="leeg" bijTik={() => ctx.stuur('pas')}>
                Passen — drink {ctx.slok(Math.max(1, Math.ceil(s.pot / 2)))}
              </GroteKnop>
            </>
          ) : (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">
                {ctx.speler(s.beurt)?.emoji} {ctx.naam(s.beurt)} is aan de beurt
              </span>
            </Kaartje>
          )}
        </div>
      </>
    )
  },
}

import { isRood, kaartKort, nieuweStapel, trek, type Kaart, type Stapel } from '../../engine/deck'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, SpelContext } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   ROOD OF ZWART

   Het simpelste spel dat er is, en precies daarom het beste om mee te
   beginnen: niemand hoeft iets uit te leggen en iedereen kan meteen mee, ook
   wie net binnenkomt.

   Wel met een addertje: elke fout laat de inzet oplopen. Wie na drie missers
   aan de beurt is, staat ineens voor vier slokken.
   ───────────────────────────────────────────────────────────── */

const MAX_INZET = 6
const BEURTEN_PER_SPELER = 3
const GOED_UITDELEN = 1

interface RoodZwartState {
  stapel: Stapel
  beurt: string
  open: Kaart | null
  inzet: number
  laatste: { uid: string; keuze: 'rood' | 'zwart'; kaart: Kaart; goed: boolean } | null
  beurtenGespeeld: number
  maxBeurten: number
  magUitdelen: string | null
  klaar: boolean
}

function volgendeBeurt(s: RoodZwartState, ctx: SpelContext) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  s.magUitdelen = null
  s.beurtenGespeeld++
  s.beurt = volgende(volgorde, s.beurt)
  if (s.beurtenGespeeld >= s.maxBeurten) {
    s.klaar = true
    ctx.klaar()
  }
}

export const roodzwart: GameModule<RoodZwartState> = {
  id: 'roodzwart',
  naam: 'Rood of Zwart',
  uitleg: 'Fifty-fifty. Maar elke misser maakt het duurder voor de volgende.',
  regels: [
    'Raad of de kaart rood of zwart is.',
    'Fout? Je drinkt de inzet.',
    'Elke fout maakt de inzet één hoger.',
    'Goed geraden? Je zet de inzet terug en deelt er één uit.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['kaarten', 'geluk'],
  privescherm: false,

  init(ctx) {
    return {
      stapel: nieuweStapel(ctx.rng),
      beurt: ctx.spelers[0].uid,
      open: null,
      inzet: 1,
      laatste: null,
      beurtenGespeeld: 0,
      maxBeurten: ctx.spelers.length * BEURTEN_PER_SPELER,
      magUitdelen: null,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    if (actie.type === 'gok' && !s.magUitdelen) {
      if (actie.uid !== s.beurt) return
      const keuze: 'rood' | 'zwart' = actie.payload?.keuze
      if (keuze !== 'rood' && keuze !== 'zwart') return

      const kaart = trek(s.stapel, ctx.rng)
      s.open = kaart
      const goed = (keuze === 'rood') === isRood(kaart)
      s.laatste = { uid: actie.uid, keuze, kaart, goed }

      if (goed) {
        s.inzet = 1
        s.magUitdelen = actie.uid
      } else {
        ctx.drink(actie.uid, s.inzet, `zei ${keuze}, het was ${kaartKort(kaart)}`)
        s.inzet = Math.min(MAX_INZET, s.inzet + 1)
        volgendeBeurt(s, ctx)
      }
      return
    }

    if (actie.type === 'geef' && s.magUitdelen === actie.uid) {
      const verdeling: Record<string, number> = actie.payload?.verdeling
      if (!verdeling || typeof verdeling !== 'object') return
      for (const [uid, aantal] of Object.entries(verdeling)) {
        if (!volgorde.includes(uid) || uid === actie.uid) continue
        ctx.deelUitPrecies(actie.uid, uid, aantal, 'goed geraden')
      }
      volgendeBeurt(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    const mijnBeurt = ctx.ik === s.beurt
    const speler = ctx.speler(s.beurt)

    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Beurt {s.beurtenGespeeld + 1}/{s.maxBeurten}
          </span>
          <span className="kop-klein" style={{ color: s.inzet > 2 ? 'var(--rood)' : undefined }}>
            inzet {ctx.slokKort(s.inzet)}
          </span>
        </div>

        <SpelerBalk spelers={ctx.spelers} actief={s.beurt} />

        <div className="midden" style={{ gap: 12 }}>
          <Speelkaart kaart={s.open} maat="groot" dicht={!s.open} />
          {s.laatste && (
            <div className="klein zacht">
              {ctx.naam(s.laatste.uid)} zei {s.laatste.keuze} ·{' '}
              <strong style={{ color: s.laatste.goed ? 'var(--groen)' : 'var(--rood)' }}>
                {s.laatste.goed ? 'GOED' : 'FOUT'}
              </strong>
            </div>
          )}
        </div>

        <div className="onderaan">
          {s.magUitdelen ? (
            s.magUitdelen === ctx.ik ? (
              <Verdeler
                key={s.beurtenGespeeld}
                totaal={ctx.slokAantal(GOED_UITDELEN)}
                ctx={ctx}
                titel="Goed geraden — deel uit"
                bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
              />
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">{ctx.naam(s.magUitdelen)} deelt uit…</span>
              </Kaartje>
            )
          ) : mijnBeurt ? (
            <>
              <div className="rij">
                <GroteKnop kleur="rood" enorm bijTik={() => ctx.stuur('gok', { keuze: 'rood' })}>
                  Rood
                </GroteKnop>
                <GroteKnop enorm bijTik={() => ctx.stuur('gok', { keuze: 'zwart' })}>
                  Zwart
                </GroteKnop>
              </div>
              <div className="klein zacht" style={{ textAlign: 'center' }}>
                Fout kost je {ctx.slok(s.inzet)}.
              </div>
            </>
          ) : (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">
                {speler?.emoji} {speler?.naam} is aan de beurt
              </span>
            </Kaartje>
          )}
        </div>
      </>
    )
  },
}

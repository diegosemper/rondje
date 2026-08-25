import { kaartKort, nieuweStapel, trek, type Kaart, type Stapel } from '../../engine/deck'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { GroteKnop, Kaartje } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   BLINDE KAART

   Iedereen krijgt één kaart. Je ziet die van alle anderen, maar niet je
   eigen. Dan kies je: blijven of passen.

   Passen kost je één slok en je bent er vanaf. Blijven is gokken: de laagste
   van wie bleef drinkt fors, de hoogste mag uitdelen.

   Het echte spel is niet de kaart maar de gezichten. Je ziet vier hoge
   kaarten liggen en denkt: dan zal die van mij wel laag zijn. Maar iedereen
   denkt dat, en iemand heeft het mis.

   Aan een tafel bestaat dit als "Indian Poker" met een kaart op je voorhoofd.
   Op telefoons werkt het beter: je ziet ze allemaal tegelijk en netjes op een
   rij, en niemand hoeft zijn arm omhoog te houden.
   ───────────────────────────────────────────────────────────── */

const RONDES = 5
const STRAF_PASSEN = 1
const STRAF_LAAGSTE = 4
const WINST_UITDELEN = 2

interface BlindState {
  stapel: Stapel
  ronde: number
  /** ieders kaart — publiek, want iedereen mag ze zien behalve zijn eigen */
  kaarten: Record<string, Kaart>
  keuze: Record<string, 'blijven' | 'passen'>
  fase: 'kiezen' | 'uitslag'
  uitslag: { blijvers: string[]; laagste: string[]; hoogste: string[] } | null
  klaar: boolean
}

function nieuweRonde(s: BlindState, ctx: SpelContext) {
  s.fase = 'kiezen'
  s.keuze = {}
  s.uitslag = null
  s.kaarten = {}
  for (const p of ctx.spelers) {
    s.kaarten[p.uid] = trek(s.stapel, ctx.rng)
  }
}

export const blindekaart: GameModule<BlindState> = {
  id: 'blindekaart',
  naam: 'Blinde Kaart',
  uitleg: 'Je ziet ieders kaart behalve je eigen. Blijven of passen?',
  regels: [
    'Iedereen krijgt één kaart.',
    'Je ziet die van de anderen, niet je eigen.',
    'Passen kost 1 slok en je bent veilig.',
    'Blijven? De laagste drinkt 4, de hoogste deelt uit.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['kaarten', 'bluf', 'geheim'],
  privescherm: true,

  init(ctx) {
    const s: BlindState = {
      stapel: nieuweStapel(ctx.rng),
      ronde: 1,
      kaarten: {},
      keuze: {},
      fase: 'kiezen',
      uitslag: null,
      klaar: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'kiezen' && (actie.type === 'blijven' || actie.type === 'passen')) {
      if (s.keuze[actie.uid]) return
      s.keuze[actie.uid] = actie.type
      if (!iedereen.every((u) => s.keuze[u])) return

      const blijvers = iedereen.filter((u) => s.keuze[u] === 'blijven')
      const passers = iedereen.filter((u) => s.keuze[u] === 'passen')

      for (const uid of passers) ctx.drink(uid, STRAF_PASSEN, 'paste')

      let laagste: string[] = []
      let hoogste: string[] = []

      if (blijvers.length > 0) {
        const waardes = blijvers.map((u) => s.kaarten[u].waarde)
        const min = Math.min(...waardes)
        const max = Math.max(...waardes)
        laagste = blijvers.filter((u) => s.kaarten[u].waarde === min)
        hoogste = blijvers.filter((u) => s.kaarten[u].waarde === max)

        // Bleef er maar één, dan is hij tegelijk hoogste en laagste. Die komt
        // er goed vanaf: hij had lef.
        if (blijvers.length === 1) {
          laagste = []
          ctx.log(`${ctx.naam(blijvers[0])} bleef als enige over met ${kaartKort(s.kaarten[blijvers[0]])}`)
        } else {
          for (const uid of laagste) {
            ctx.drink(uid, STRAF_LAAGSTE, `laagste met ${kaartKort(s.kaarten[uid])}`)
          }
        }
      }

      s.uitslag = { blijvers, laagste, hoogste }
      s.fase = 'uitslag'
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'geef') {
      if (!s.uitslag?.hoogste.includes(actie.uid)) return
      const verdeling: Record<string, number> = actie.payload?.verdeling
      if (!verdeling || typeof verdeling !== 'object') return
      for (const [uid, aantal] of Object.entries(verdeling)) {
        if (!iedereen.includes(uid) || uid === actie.uid) continue
        ctx.deelUitPrecies(actie.uid, uid, aantal, 'hoogste kaart')
      }
      s.uitslag.hoogste = s.uitslag.hoogste.filter((u) => u !== actie.uid)
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
    const ikKlaar = !!s.keuze[ctx.ik]
    const magUitdelen = s.uitslag?.hoogste.includes(ctx.ik)

    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Ronde {s.ronde}/{RONDES}
          </span>
          <span className="kop-klein">
            {s.fase === 'kiezen' ? `${Object.keys(s.keuze).length}/${ctx.spelers.length}` : 'uitslag'}
          </span>
        </div>

        <Tafel s={s} ctx={ctx} />

        {s.fase === 'kiezen' ? (
          <div className="onderaan">
            {ikKlaar ? (
              <Kaartje style={{ textAlign: 'center' }}>
                <h2 className="zacht">
                  Je koos: {s.keuze[ctx.ik] === 'blijven' ? 'blijven 😤' : 'passen 😌'}
                </h2>
              </Kaartje>
            ) : (
              <>
                <div className="rij">
                  <GroteKnop kleur="rood" enorm bijTik={() => ctx.stuur('blijven')}>
                    Blijven
                  </GroteKnop>
                  <GroteKnop enorm bijTik={() => ctx.stuur('passen')}>
                    Passen
                  </GroteKnop>
                </div>
                <div className="klein zacht" style={{ textAlign: 'center' }}>
                  Passen kost {ctx.slok(STRAF_PASSEN)}. Blijven en laagste zijn kost{' '}
                  {ctx.slok(STRAF_LAAGSTE)}.
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="onderaan">
            {magUitdelen ? (
              <Verdeler
                totaal={ctx.slokAantal(WINST_UITDELEN)}
                ctx={ctx}
                titel="Hoogste kaart — deel uit"
                bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
              />
            ) : (
              <>
                {s.uitslag && s.uitslag.hoogste.length > 0 && (
                  <Kaartje style={{ textAlign: 'center' }}>
                    <span className="zacht">
                      {s.uitslag.hoogste.map(ctx.naam).join(' en ')} deelt uit…
                    </span>
                  </Kaartje>
                )}
                {s.uitslag && s.uitslag.hoogste.length === 0 && ctx.benIkHost && (
                  <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
                    {s.ronde >= RONDES ? 'Klaar' : 'Volgende ronde'}
                  </GroteKnop>
                )}
                {s.uitslag && s.uitslag.hoogste.length === 0 && !ctx.benIkHost && (
                  <Kaartje style={{ textAlign: 'center' }}>
                    <span className="zacht">Wachten op de host…</span>
                  </Kaartje>
                )}
              </>
            )}
          </div>
        )}
      </>
    )
  },
}

function Tafel({ s, ctx }: { s: BlindState; ctx: KijkContext }) {
  const onthuld = s.fase === 'uitslag'

  return (
    <div className="midden" style={{ gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {ctx.spelers.map((p) => {
          const ik = p.uid === ctx.ik
          const zichtbaar = onthuld || !ik
          const keuze = s.keuze[p.uid]
          const isLaagste = s.uitslag?.laagste.includes(p.uid)
          const isHoogste = s.uitslag?.hoogste.includes(p.uid)

          return (
            <div key={p.uid} style={{ textAlign: 'center', width: 72 }}>
              <div
                style={{
                  outline: isLaagste
                    ? '3px solid var(--rood)'
                    : isHoogste
                      ? '3px solid var(--goud)'
                      : 'none',
                  outlineOffset: 3,
                  borderRadius: 14,
                  opacity: onthuld && keuze === 'passen' ? 0.4 : 1,
                }}
              >
                <Speelkaart
                  kaart={zichtbaar ? s.kaarten[p.uid] : null}
                  maat="klein"
                  dicht={!zichtbaar}
                />
              </div>
              <div className="klein" style={{ marginTop: 4 }}>
                {ik ? '👤 jij' : `${p.emoji} ${p.naam}`}
              </div>
              <div className="klein zacht" style={{ minHeight: 16 }}>
                {keuze === 'blijven' ? '😤 blijft' : keuze === 'passen' ? '😌 past' : '…'}
              </div>
            </div>
          )
        })}
      </div>

      {!onthuld && (
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          Alle kaarten liggen open — behalve die van jou.
        </div>
      )}
    </div>
  )
}

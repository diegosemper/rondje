import {
  kaartKort,
  nieuweStapel,
  trek,
  waardeTekst,
  type Kaart,
  type Stapel,
} from '../../engine/deck'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   FUCK THE DEALER — de variant van Diego's vriendengroep

   Eén dealer ziet de kaart, de rest niet. Om de beurt raadt iemand de waarde.

   · Je eerste gok mag 7 of 8 zijn, maar dat kost je meteen 1 slok. Dat zijn
     de veilige middenwaarden, en daar moet je voor betalen.
   · Meteen goed: de dealer drinkt 4.
   · Anders krijg je hoger of lager, en nog één kans. Goed: de dealer drinkt 2.
   · Fout: jij drinkt het verschil tussen je gok en de echte kaart.
   · Raden drie mensen achter elkaar mis, dan mag de dealer eindelijk door en
     wordt de volgende in de kring dealer.

   Wat de app oplost: na de hint verdwijnen de onmogelijke waarden vanzelf.
   Aan een tafel zit iedereen dat op zijn vingers te tellen, en daar komt
   altijd gedoe van.
   ───────────────────────────────────────────────────────────── */

/** Wie 7 of 8 zegt als eerste gok betaalt er meteen voor. */
const MIDDEN = [7, 8]
const MIDDEN_STRAF = 1

const DEALER_STRAF_EERSTE = 4
const DEALER_STRAF_TWEEDE = 2

/** Zoveel missers achter elkaar en de dealer is verlost. */
const MISSERS_VOOR_WISSEL = 3

const MAX_KAARTEN = 24

interface FtdState {
  stapel: Stapel
  dealer: string
  gokker: string

  _geheim: { kaart: Kaart | null }

  fase: 'gokken' | 'onthuld'
  /** de eerste gok, zodra die gedaan is */
  gok1: number | null
  hint: 'hoger' | 'lager' | null
  /** wat er na de hint nog mogelijk is */
  laag: number
  hoog: number

  missers: number
  getrokken: number

  laatste: {
    gokker: string
    gok: number
    kaart: Kaart
    goed: boolean
    poging: number
    slokken: number
  } | null

  klaar: boolean
}

/* ── Hulpjes ────────────────────────────────────────────────── */

function volgendeGokker(volgorde: string[], huidig: string, dealer: string): string {
  let kandidaat = huidig
  for (let i = 0; i < volgorde.length; i++) {
    kandidaat = volgende(volgorde, kandidaat)
    if (kandidaat !== dealer) return kandidaat
  }
  return huidig
}

function nieuweKaart(s: FtdState, ctx: SpelContext) {
  const kaart = trek(s.stapel, ctx.rng)
  s._geheim.kaart = kaart
  s.fase = 'gokken'
  s.gok1 = null
  s.hint = null
  s.laag = 2
  s.hoog = 14
  s.getrokken++

  // Alleen de dealer ziet de kaart.
  for (const p of ctx.spelers) {
    ctx.zetPrive(p.uid, p.uid === s.dealer ? { kaart } : null)
  }
}

/* ── Het spel ───────────────────────────────────────────────── */

export const dealer: GameModule<FtdState> = {
  id: 'dealer',
  naam: 'Fuck the Dealer',
  uitleg: 'Raad de kaart die alleen de dealer ziet. Mis en je drinkt het verschil.',
  regels: [
    'Alleen de dealer ziet de kaart.',
    'Raad de waarde. 7 of 8 mag, maar kost meteen 1.',
    'Hoger of lager, dan nog één kans.',
    'Mis? Je drinkt het verschil met de echte kaart.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['kaarten', 'geluk'],
  privescherm: true,

  init(ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)
    const s: FtdState = {
      stapel: nieuweStapel(ctx.rng),
      dealer: volgorde[0],
      gokker: volgorde[1] ?? volgorde[0],
      _geheim: { kaart: null },
      fase: 'gokken',
      gok1: null,
      hint: null,
      laag: 2,
      hoog: 14,
      missers: 0,
      getrokken: 0,
      laatste: null,
      klaar: false,
    }
    nieuweKaart(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'gokken' && actie.type === 'gok') {
      if (actie.uid !== s.gokker) return
      const kaart = s._geheim.kaart
      if (!kaart) return

      const gok = Number(actie.payload?.waarde)
      if (!Number.isInteger(gok) || gok < s.laag || gok > s.hoog) return

      const eerste = s.gok1 === null

      // De middenstraf komt er meteen af, ook als je hem daarna goed hebt.
      if (eerste && MIDDEN.includes(gok)) {
        ctx.drink(actie.uid, MIDDEN_STRAF, `zei ${waardeTekst(gok)} — het midden`)
      }

      if (gok === kaart.waarde) {
        const straf = eerste ? DEALER_STRAF_EERSTE : DEALER_STRAF_TWEEDE
        ctx.drink(s.dealer, straf, `${ctx.naam(actie.uid)} raadde ${kaartKort(kaart)}`)
        s.laatste = {
          gokker: actie.uid,
          gok,
          kaart,
          goed: true,
          poging: eerste ? 1 : 2,
          slokken: straf,
        }
        s.missers = 0
        s.fase = 'onthuld'
        return
      }

      if (eerste) {
        // Mis, maar je krijgt een hint en nog een kans.
        s.gok1 = gok
        if (kaart.waarde > gok) {
          s.hint = 'hoger'
          s.laag = gok + 1
        } else {
          s.hint = 'lager'
          s.hoog = gok - 1
        }
        return
      }

      // Tweede gok mis: je drinkt het verschil.
      const verschil = Math.abs(gok - kaart.waarde)
      ctx.drink(actie.uid, verschil, `zat ${verschil} naast ${kaartKort(kaart)}`)
      s.laatste = { gokker: actie.uid, gok, kaart, goed: false, poging: 2, slokken: verschil }
      s.missers++
      s.fase = 'onthuld'
      return
    }

    if (s.fase === 'onthuld' && actie.type === 'verder') {
      if (s.getrokken >= MAX_KAARTEN) {
        s.klaar = true
        ctx.wisPrive()
        ctx.klaar()
        return
      }

      if (s.missers >= MISSERS_VOOR_WISSEL) {
        const oud = s.dealer
        s.dealer = volgende(volgorde, s.dealer)
        s.missers = 0
        s.gokker = volgendeGokker(volgorde, s.dealer, s.dealer)
        ctx.log(`${ctx.naam(oud)} is verlost — ${ctx.naam(s.dealer)} is nu dealer`)
      } else {
        s.gokker = volgendeGokker(volgorde, s.gokker, s.dealer)
      }

      nieuweKaart(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    const ikDealer = ctx.ik === s.dealer
    const ikGok = ctx.ik === s.gokker
    const dealerSpeler = ctx.speler(s.dealer)
    const gokSpeler = ctx.speler(s.gokker)
    const mijnKaart: Kaart | undefined = ctx.prive?.kaart

    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Kaart {s.getrokken}/{MAX_KAARTEN}
          </span>
          <span className="kop-klein">
            Missers{' '}
            {Array.from({ length: MISSERS_VOOR_WISSEL })
              .map((_, i) => (i < s.missers ? '●' : '○'))
              .join(' ')}
          </span>
        </div>

        <SpelerBalk spelers={ctx.spelers} actief={[s.dealer, s.gokker]} />

        <div className="klein zacht" style={{ textAlign: 'center' }}>
          🎴 dealer: {dealerSpeler?.naam} · 🎯 raadt: {gokSpeler?.naam}
        </div>

        {s.fase === 'onthuld' ? (
          <Onthuld s={s} ctx={ctx} ikDealer={ikDealer} />
        ) : (
          <>
            <div className="midden" style={{ gap: 12 }}>
              {ikDealer ? (
                <>
                  <div className="kop-klein">🤫 Alleen jij ziet deze kaart</div>
                  <Speelkaart kaart={mijnKaart ?? null} maat="groot" dicht={!mijnKaart} />
                </>
              ) : (
                <Speelkaart maat="groot" dicht />
              )}

              {s.hint && (
                <div style={{ textAlign: 'center' }}>
                  <div className="klein zacht">
                    {gokSpeler?.naam} zei {waardeTekst(s.gok1!)} · {dealerSpeler?.naam} zegt
                  </div>
                  <h1 style={{ color: s.hint === 'hoger' ? 'var(--groen)' : 'var(--rood)' }}>
                    {s.hint === 'hoger' ? '▲ HOGER' : '▼ LAGER'}
                  </h1>
                </div>
              )}
            </div>

            <div className="onderaan">
              {ikGok ? (
                <>
                  <div className="kop-klein" style={{ textAlign: 'center' }}>
                    {s.gok1 === null ? 'Raad de waarde' : 'Nog één kans'}
                  </div>
                  <Waardeknoppen s={s} ctx={ctx} />
                  {s.gok1 === null && (
                    <div className="klein zacht" style={{ textAlign: 'center' }}>
                      7 en 8 mogen, maar kosten je meteen {ctx.slok(MIDDEN_STRAF)}.
                    </div>
                  )}
                </>
              ) : (
                <Kaartje style={{ textAlign: 'center' }}>
                  <span className="zacht">
                    {ikDealer
                      ? `${gokSpeler?.naam} zit te raden…`
                      : `${gokSpeler?.emoji} ${gokSpeler?.naam} is aan de beurt`}
                  </span>
                </Kaartje>
              )}
            </div>
          </>
        )}
      </>
    )
  },
}

function Waardeknoppen({ s, ctx }: { s: FtdState; ctx: KijkContext }) {
  const mogelijk: number[] = []
  for (let w = s.laag; w <= s.hoog; w++) mogelijk.push(w)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(7, Math.max(4, mogelijk.length))}, 1fr)`,
        gap: 6,
      }}
    >
      {mogelijk.map((w) => {
        const kost = s.gok1 === null && MIDDEN.includes(w)
        return (
          <button
            key={w}
            onClick={() => ctx.stuur('gok', { waarde: w })}
            style={{
              minHeight: 56,
              borderRadius: 'var(--straal-klein)',
              background: kost ? 'var(--goud-donker)' : 'var(--vlak-hoog)',
              border: `1px solid ${kost ? 'var(--goud)' : 'var(--rand)'}`,
              color: 'var(--tekst)',
              fontSize: 22,
              fontWeight: 800,
              position: 'relative',
            }}
          >
            {waardeTekst(w)}
            {kost && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--goud)',
                }}
              >
                −1
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Onthuld({
  s,
  ctx,
  ikDealer,
}: {
  s: FtdState
  ctx: KijkContext
  ikDealer: boolean
}) {
  const l = s.laatste!
  const wisselStraks = s.missers >= MISSERS_VOOR_WISSEL

  return (
    <>
      <div className="midden" style={{ gap: 12 }}>
        <Speelkaart kaart={l.kaart} maat="groot" />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: l.goed ? 'var(--groen)' : 'var(--rood)' }}>
            {l.goed ? 'GERADEN!' : 'MIS'}
          </h1>
          <div className="zacht">
            {ctx.naam(l.gokker)} zei {waardeTekst(l.gok)}
            {l.goed
              ? ` bij poging ${l.poging} — ${ctx.naam(s.dealer)} drinkt ${ctx.slok(l.slokken)}`
              : ` — ${ctx.slok(l.slokken)} verschil`}
          </div>
          {wisselStraks && (
            <div className="klein" style={{ color: 'var(--goud)', marginTop: 6 }}>
              Drie op rij mis — {ctx.naam(s.dealer)} is verlost
            </div>
          )}
        </div>
      </div>

      <div className="onderaan">
        {ikDealer || ctx.benIkHost ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
            {s.getrokken >= MAX_KAARTEN ? 'Klaar' : 'Volgende kaart'}
          </GroteKnop>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">{ctx.naam(s.dealer)} pakt de volgende kaart…</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

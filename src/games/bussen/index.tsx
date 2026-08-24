import {
  isRood,
  kaartKort,
  nieuweStapel,
  trek,
  waardeVoluit,
  type Kaart,
  type Stapel,
} from '../../engine/deck'
import { volgende } from '../../engine/beurten'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, resterendMs, startKlok, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { Balkje, GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   BUSSEN — de variant van Diego's vriendengroep

   Drie fasen:

   1. De vier vragen. Per vraag krijg je een kaart erbij. Fout kost 1, 2, 3
      of 4 slokken. Je vier kaarten worden je geheime hand.

   2. De boom. Elf kaarten, van onder naar boven 1-2-3-4-1, waard 1 t/m 5
      slokken. Ligt een kaart horizontaal, dan telt hij dubbel. Gaat er één
      open, dan is het een RACE: iedereen die die waarde heeft legt zo snel
      mogelijk op. Wie als eerste legt, deelt als laatste uit — en dat is de
      goede plek, want dan weet je wat de rest al gedaan heeft.

      Bluffen mag. Je hand is op je eigen scherm en niemand kan meekijken, dus
      je kunt opleggen wat je niet hebt. Tot iemand "laat zien" roept.

   3. De bus. Wie de meeste kaarten overhoudt rijdt. Vijf kaarten hoger of
      lager; bij een fout drink je en begin je opnieuw, maar wordt de bus één
      kaart korter. Er komt dus altijd een eind aan.
   ───────────────────────────────────────────────────────────── */

/* ── Vorm van de boom ───────────────────────────────────────── */

/** Aantal kaarten per rij, van onder naar boven. */
const BOOM_RIJEN = [1, 2, 3, 4, 1]
const KANS_HORIZONTAAL = 0.4

const RACE_SEC = 8
const UITDAAG_SEC = 7

const VRAAG_INZET = [1, 2, 3, 4]
const BUS_LENGTE = 5

type Keuze =
  | 'rood'
  | 'zwart'
  | 'hoger'
  | 'lager'
  | 'binnen'
  | 'buiten'
  | 'zebra'
  | 'regenboog'
  | 'wel'
  | 'niet'

interface BoomPlek {
  rij: number
  /** 1 t/m 5 */
  waarde: number
  horizontaal: boolean
  kaart: Kaart | null
}

interface Claim {
  uid: string
  /** hoeveel kaarten deze speler zegt te hebben */
  aantal: number
  /** wanneer hij als eerste oplegde — bepaalt de volgorde */
  ts: number
}

type Uitkomst = 'goed' | 'fout' | 'gelijk'

interface BussenState {
  fase: 'vragen' | 'boom' | 'bus' | 'klaar'
  stapel: Stapel

  _geheim: {
    handen: Record<string, Kaart[]>
    boomKaarten: Kaart[]
  }

  /** hoeveel kaarten iedereen nog heeft — dit mag iedereen zien */
  handGrootte: Record<string, number>

  /* fase 1 */
  vraagBeurt: string
  vraagNr: number
  /** de kaarten die de speler aan de beurt nu open op tafel heeft */
  getoond: Kaart[]
  laatste: { uid: string; keuze: Keuze; kaart: Kaart; uitkomst: Uitkomst } | null
  gedaan: string[]
  /** wie er nog een goed geraden zebra/regenboog mag uitdelen */
  bonus: string | null

  /* fase 2 */
  boom: BoomPlek[]
  boomIndex: number
  boomFase: 'race' | 'uitdagen' | 'uitdelen'
  klok: Klok | null
  claims: Claim[]
  gepast: string[]
  uitdagingen: { door: string; tegen: string }[]
  betrapt: string[]
  /** uid's in de volgorde waarin ze uitdelen (omgekeerde legvolgorde) */
  uitdeelVolgorde: string[]
  uitdeelIndex: number

  /* fase 3 */
  chauffeur: string | null
  busLengte: number
  busPositie: number
  busOpen: Kaart | null
  busPoging: number
}

/* ── Hulpjes ────────────────────────────────────────────────── */

function duwHand(s: BussenState, ctx: SpelContext, uid: string) {
  const hand = s._geheim.handen[uid] ?? []
  s.handGrootte[uid] = hand.length
  ctx.zetPrive(uid, { hand })
}

function bouwBoom(rng: () => number): BoomPlek[] {
  const plekken: BoomPlek[] = []
  BOOM_RIJEN.forEach((aantal, r) => {
    for (let i = 0; i < aantal; i++) {
      plekken.push({
        rij: r + 1,
        waarde: r + 1,
        horizontaal: rng() < KANS_HORIZONTAAL,
        kaart: null,
      })
    }
  })
  return plekken
}

function inzetVan(plek: BoomPlek): number {
  return plek.waarde * (plek.horizontaal ? 2 : 1)
}

/** Beoordeelt het antwoord op één van de vier vragen. */
function beoordeel(hand: Kaart[], nieuw: Kaart, vraagNr: number, keuze: Keuze): Uitkomst {
  if (vraagNr === 0) {
    return (keuze === 'rood') === isRood(nieuw) ? 'goed' : 'fout'
  }

  if (vraagNr === 1) {
    const eerste = hand[0]
    if (nieuw.waarde === eerste.waarde) return 'gelijk'
    const hoger = nieuw.waarde > eerste.waarde
    return (keuze === 'hoger') === hoger ? 'goed' : 'fout'
  }

  if (vraagNr === 2) {
    const laag = Math.min(hand[0].waarde, hand[1].waarde)
    const hoog = Math.max(hand[0].waarde, hand[1].waarde)
    if (nieuw.waarde === laag || nieuw.waarde === hoog) return 'gelijk'
    const binnen = nieuw.waarde > laag && nieuw.waarde < hoog
    return (keuze === 'binnen') === binnen ? 'goed' : 'fout'
  }

  // Vraag 4 — over het patroon van je vier kaarten samen.
  const vier = [...hand, nieuw]
  const soortenEerder = new Set(hand.map((k) => k.kleur))

  if (keuze === 'zebra') {
    const wisselt =
      isRood(vier[0]) !== isRood(vier[1]) &&
      isRood(vier[1]) !== isRood(vier[2]) &&
      isRood(vier[2]) !== isRood(vier[3])
    return wisselt ? 'goed' : 'fout'
  }
  if (keuze === 'regenboog') {
    return new Set(vier.map((k) => k.kleur)).size === 4 ? 'goed' : 'fout'
  }
  if (keuze === 'wel') {
    return soortenEerder.has(nieuw.kleur) ? 'goed' : 'fout'
  }
  return soortenEerder.has(nieuw.kleur) ? 'fout' : 'goed'
}

/** Zebra en regenboog zijn veel moeilijker, dus die leveren wat op. */
function isRisicoGok(keuze: Keuze): boolean {
  return keuze === 'zebra' || keuze === 'regenboog'
}

/** Speler is klaar met zijn vier vragen: door naar de volgende, of naar de boom. */
function volgendeVrager(s: BussenState, ctx: SpelContext, volgorde: string[], uid: string) {
  if (!s.gedaan.includes(uid)) s.gedaan.push(uid)
  s.vraagNr = 0
  s.getoond = []
  if (s.gedaan.length >= volgorde.length) {
    s.fase = 'boom'
    opentVolgendeBoomkaart(s, ctx)
  } else {
    s.vraagBeurt = volgende(volgorde, s.vraagBeurt)
  }
}

function opentVolgendeBoomkaart(s: BussenState, ctx: SpelContext) {
  const plek = s.boom[s.boomIndex]
  plek.kaart = s._geheim.boomKaarten[s.boomIndex]
  s.boomFase = 'race'
  s.klok = startKlok(RACE_SEC, ctx.nu)
  s.claims = []
  s.gepast = []
  s.uitdagingen = []
  s.betrapt = []
  s.uitdeelVolgorde = []
  s.uitdeelIndex = 0
}

function startBus(s: BussenState, ctx: SpelContext) {
  s.fase = 'bus'

  // Wie de meeste kaarten overhoudt, rijdt. Gelijkspel: het lot beslist.
  let meeste = -1
  let kandidaten: string[] = []
  for (const p of ctx.spelers) {
    const n = s.handGrootte[p.uid] ?? 0
    if (n > meeste) {
      meeste = n
      kandidaten = [p.uid]
    } else if (n === meeste) {
      kandidaten.push(p.uid)
    }
  }
  s.chauffeur = kandidaten[Math.floor(ctx.rng() * kandidaten.length)]

  s.busLengte = BUS_LENGTE
  s.busPositie = 0
  s.busPoging = 1
  s.busOpen = trek(s.stapel, ctx.rng)

  // Handen zijn nu betekenisloos, dus weg ermee. Per speler wissen en niet met
  // wisPrive(): in dezelfde zet kunnen er net handen zijn bijgewerkt, en die
  // zouden een algehele wis overleven.
  for (const p of ctx.spelers) ctx.zetPrive(p.uid, null)

  ctx.log(`${ctx.naam(s.chauffeur)} rijdt de bus (${meeste} kaarten over)`)
}

/* ── Het spel ───────────────────────────────────────────────── */

export const bussen: GameModule<BussenState> = {
  id: 'bussen',
  naam: 'Bussen',
  uitleg: 'Vier vragen, de boom met bluffen, en dan rijdt de verliezer de bus.',
  regels: [
    'Vier vragen: fout kost 1, 2, 3 of 4 slokken.',
    'Daarna de boom — wie het snelst oplegt, deelt als laatste uit.',
    'Opleggen wat je niet hebt mag. Tot iemand "laat zien" roept.',
    'Meeste kaarten over? Jij rijdt de bus.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'lang',
  tags: ['kaarten', 'bluf', 'geheim'],
  privescherm: true,

  init(ctx) {
    const stapel = nieuweStapel(ctx.rng)
    const boom = bouwBoom(ctx.rng)
    const boomKaarten: Kaart[] = boom.map(() => trek(stapel, ctx.rng))

    const handen: Record<string, Kaart[]> = {}
    const handGrootte: Record<string, number> = {}
    for (const p of ctx.spelers) {
      handen[p.uid] = []
      handGrootte[p.uid] = 0
    }

    return {
      fase: 'vragen',
      stapel,
      _geheim: { handen, boomKaarten },
      handGrootte,

      vraagBeurt: ctx.spelers[0].uid,
      vraagNr: 0,
      getoond: [],
      laatste: null,
      gedaan: [],
      bonus: null,

      boom,
      boomIndex: 0,
      boomFase: 'race',
      klok: null,
      claims: [],
      gepast: [],
      uitdagingen: [],
      betrapt: [],
      uitdeelVolgorde: [],
      uitdeelIndex: 0,

      chauffeur: null,
      busLengte: BUS_LENGTE,
      busPositie: 0,
      busOpen: null,
      busPoging: 1,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    /* ── Fase 1: de vier vragen ─────────────────────────────── */

    if (s.fase === 'vragen' && actie.type === 'antwoord') {
      if (actie.uid !== s.vraagBeurt) return
      // Eerst je bonus uitdelen, dan pas verder.
      if (s.bonus) return
      const keuze: Keuze = actie.payload?.keuze
      if (!keuze) return

      const hand = s._geheim.handen[actie.uid] ?? []
      const nieuw = trek(s.stapel, ctx.rng)
      const uitkomst = beoordeel(hand, nieuw, s.vraagNr, keuze)
      const inzet = VRAAG_INZET[s.vraagNr]

      hand.push(nieuw)
      s._geheim.handen[actie.uid] = hand
      s.getoond = [...hand]
      s.laatste = { uid: actie.uid, keuze, kaart: nieuw, uitkomst }

      if (uitkomst === 'fout') {
        ctx.drink(actie.uid, inzet, `vraag ${s.vraagNr + 1} fout`)
      } else if (uitkomst === 'gelijk') {
        ctx.drink(actie.uid, inzet * 2, `gelijke kaart bij vraag ${s.vraagNr + 1}`)
      } else if (isRisicoGok(keuze)) {
        // Zebra en regenboog zijn een gok waard: goed geraden mag je uitdelen.
        ctx.log(`${ctx.naam(actie.uid)} had ${keuze} goed`)
        s.bonus = actie.uid
      }

      duwHand(s, ctx, actie.uid)
      s.vraagNr++

      // Wie nog moet uitdelen blijft aan de beurt tot dat gebeurd is.
      if (s.vraagNr >= 4 && !s.bonus) volgendeVrager(s, ctx, volgorde, actie.uid)
      return
    }

    // Uitdelen na een goed geraden zebra of regenboog.
    if (s.fase === 'vragen' && actie.type === 'geef') {
      if (s.bonus !== actie.uid) return
      const doel = actie.payload?.uid
      if (!doel || !volgorde.includes(doel)) return
      ctx.deelUit(actie.uid, doel, VRAAG_INZET[3], 'zebra/regenboog goed')
      s.bonus = null
      volgendeVrager(s, ctx, volgorde, actie.uid)
      return
    }

    /* ── Fase 2: de boom ────────────────────────────────────── */

    if (s.fase === 'boom') {
      const plek = s.boom[s.boomIndex]
      const inzet = inzetVan(plek)

      if (s.boomFase === 'race') {
        if (actie.type === 'legop') {
          const bestaand = s.claims.find((c) => c.uid === actie.uid)
          // Meer dan vier kan niet: zoveel kaarten heeft niemand.
          if (bestaand) bestaand.aantal = Math.min(4, bestaand.aantal + 1)
          else s.claims.push({ uid: actie.uid, aantal: 1, ts: actie.ts })
          s.gepast = s.gepast.filter((u) => u !== actie.uid)
        } else if (actie.type === 'niks') {
          if (!s.gepast.includes(actie.uid)) s.gepast.push(actie.uid)
          s.claims = s.claims.filter((c) => c.uid !== actie.uid)
        } else if (actie.type !== 'sluit-race') {
          return
        }

        const iedereenKlaar = volgorde.every(
          (u) => s.gepast.includes(u) || s.claims.some((c) => c.uid === u),
        )
        if (actie.type !== 'sluit-race' && !iedereenKlaar) return

        // Race voorbij.
        if (s.claims.length === 0) {
          ctx.log(`Niemand had een ${waardeVoluit(plek.kaart!.waarde)}`)
          volgendePlek(s, ctx)
          return
        }
        s.claims.sort((a, b) => a.ts - b.ts)
        s.boomFase = 'uitdagen'
        s.klok = startKlok(UITDAAG_SEC, ctx.nu)
        return
      }

      if (s.boomFase === 'uitdagen') {
        if (actie.type === 'daag') {
          const tegen = actie.payload?.uid
          if (!tegen || tegen === actie.uid) return
          if (!s.claims.some((c) => c.uid === tegen)) return
          if (s.uitdagingen.some((u) => u.door === actie.uid)) return
          s.uitdagingen.push({ door: actie.uid, tegen })
          return
        }

        if (actie.type !== 'sluit-uitdagen') return

        // Uitdagingen afhandelen.
        for (const uitdaging of s.uitdagingen) {
          const claim = s.claims.find((c) => c.uid === uitdaging.tegen)
          if (!claim) continue
          const hand = s._geheim.handen[uitdaging.tegen] ?? []
          const echt = hand.filter((k) => k.waarde === plek.kaart!.waarde).length

          if (echt >= claim.aantal) {
            ctx.drink(uitdaging.door, inzet * 2, `daagde ${ctx.naam(uitdaging.tegen)} onterecht uit`)
          } else {
            ctx.drink(uitdaging.tegen, inzet * 2, 'bluf betrapt')
            if (!s.betrapt.includes(uitdaging.tegen)) s.betrapt.push(uitdaging.tegen)
          }
        }

        // Betrapte bluffers delen niets uit. De rest wel — in omgekeerde
        // legvolgorde, dus wie het snelst was komt als laatste aan de beurt.
        const eerlijk = s.claims.filter((c) => !s.betrapt.includes(c.uid))
        const volgordeUit: string[] = []
        for (const claim of [...eerlijk].reverse()) {
          const hand = s._geheim.handen[claim.uid] ?? []
          const echt = hand.filter((k) => k.waarde === plek.kaart!.waarde).length
          // Een niet-betrapte bluffer mag gewoon uitdelen; dat is de beloning
          // voor durf. Wat hij écht heeft raakt hij kwijt.
          for (let i = 0; i < claim.aantal; i++) volgordeUit.push(claim.uid)

          const teVerwijderen = Math.min(echt, claim.aantal)
          for (let i = 0; i < teVerwijderen; i++) {
            const idx = hand.findIndex((k) => k.waarde === plek.kaart!.waarde)
            if (idx >= 0) hand.splice(idx, 1)
          }
          s._geheim.handen[claim.uid] = hand
          duwHand(s, ctx, claim.uid)
        }

        if (volgordeUit.length === 0) {
          volgendePlek(s, ctx)
          return
        }

        s.uitdeelVolgorde = volgordeUit
        s.uitdeelIndex = 0
        s.boomFase = 'uitdelen'
        s.klok = null
        return
      }

      if (s.boomFase === 'uitdelen') {
        const aanZet = s.uitdeelVolgorde[s.uitdeelIndex]

        if (actie.type === 'sla-over') {
          s.uitdeelIndex++
          if (s.uitdeelIndex >= s.uitdeelVolgorde.length) volgendePlek(s, ctx)
          return
        }

        if (actie.type !== 'geef' || actie.uid !== aanZet) return
        const doel = actie.payload?.uid
        if (!doel || !volgorde.includes(doel)) return

        ctx.deelUit(actie.uid, doel, inzet, `boom rij ${plek.rij}${plek.horizontaal ? ' (dubbel)' : ''}`)
        s.uitdeelIndex++
        if (s.uitdeelIndex >= s.uitdeelVolgorde.length) volgendePlek(s, ctx)
        return
      }
    }

    /* ── Fase 3: de bus ─────────────────────────────────────── */

    if (s.fase === 'bus' && (actie.type === 'hoger' || actie.type === 'lager')) {
      if (actie.uid !== s.chauffeur) return

      const oud = s.busOpen!
      const nieuw = trek(s.stapel, ctx.rng)
      s.busOpen = nieuw

      let uitkomst: Uitkomst
      if (nieuw.waarde === oud.waarde) uitkomst = 'gelijk'
      else uitkomst = (actie.type === 'hoger') === (nieuw.waarde > oud.waarde) ? 'goed' : 'fout'

      if (uitkomst === 'goed') {
        s.busPositie++
        if (s.busPositie >= s.busLengte) {
          ctx.log(`${ctx.naam(s.chauffeur)} is uit de bus!`)
          s.fase = 'klaar'
          ctx.klaar()
        }
        return
      }

      const straf = Math.max(1, s.busPositie) * (uitkomst === 'gelijk' ? 2 : 1)
      ctx.drink(
        s.chauffeur,
        straf,
        uitkomst === 'gelijk' ? 'gelijke kaart in de bus' : `strandde op kaart ${s.busPositie + 1}`,
      )

      s.busPoging++
      s.busPositie = 0
      s.busLengte = Math.max(1, s.busLengte - 1)
      s.busOpen = trek(s.stapel, ctx.rng)
      return
    }
  },

  isKlaar: (s) => s.fase === 'klaar',

  View({ state: s, ctx }) {
    if (s.fase === 'vragen') return <Vragen s={s} ctx={ctx} />
    if (s.fase === 'boom') return <Boom s={s} ctx={ctx} />
    return <Bus s={s} ctx={ctx} />
  },
}

function volgendePlek(s: BussenState, ctx: SpelContext) {
  s.boomIndex++
  s.claims = []
  s.gepast = []
  s.uitdagingen = []
  s.betrapt = []
  s.uitdeelVolgorde = []
  s.uitdeelIndex = 0
  s.klok = null

  if (s.boomIndex >= s.boom.length) {
    startBus(s, ctx)
    return
  }
  opentVolgendeBoomkaart(s, ctx)
}

/* ── Fase 1 ─────────────────────────────────────────────────── */

const VRAAG_TEKST = ['Rood of zwart?', 'Hoger of lager?', 'Binnen of buiten?', 'Het patroon?']

function Vragen({ s, ctx }: { s: BussenState; ctx: KijkContext }) {
  const mijnBeurt = ctx.ik === s.vraagBeurt
  const speler = ctx.speler(s.vraagBeurt)
  const magUitdelen = s.bonus === ctx.ik

  return (
    <>
      <SpelerBalk spelers={ctx.spelers} actief={s.vraagBeurt} />

      <div className="midden" style={{ gap: 12 }}>
        <div className="kop-klein">
          Vraag {s.vraagNr + 1} van 4 · fout kost {ctx.slok(VRAAG_INZET[s.vraagNr])}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2, 3].map((i) => (
            <Speelkaart key={i} kaart={s.getoond[i] ?? null} maat="klein" dicht={!s.getoond[i]} />
          ))}
        </div>

        {s.laatste && <Uitslagje laatste={s.laatste} ctx={ctx} />}

        <h2>{mijnBeurt ? VRAAG_TEKST[s.vraagNr] : `${speler?.emoji} ${speler?.naam} is bezig`}</h2>
      </div>

      {magUitdelen ? (
        <div className="onderaan">
          <h2 style={{ textAlign: 'center' }}>Wie krijgt {ctx.slok(VRAAG_INZET[3])}?</h2>
          <SpelerKnoppen ctx={ctx} bijKeuze={(uid) => ctx.stuur('geef', { uid })} />
        </div>
      ) : mijnBeurt ? (
        <div className="onderaan">
          {s.vraagNr === 0 && (
            <div className="rij">
              <GroteKnop kleur="rood" enorm bijTik={() => ctx.stuur('antwoord', { keuze: 'rood' })}>
                Rood
              </GroteKnop>
              <GroteKnop enorm bijTik={() => ctx.stuur('antwoord', { keuze: 'zwart' })}>
                Zwart
              </GroteKnop>
            </div>
          )}
          {s.vraagNr === 1 && (
            <div className="rij">
              <GroteKnop kleur="groen" enorm bijTik={() => ctx.stuur('antwoord', { keuze: 'hoger' })}>
                ▲ Hoger
              </GroteKnop>
              <GroteKnop kleur="rood" enorm bijTik={() => ctx.stuur('antwoord', { keuze: 'lager' })}>
                ▼ Lager
              </GroteKnop>
            </div>
          )}
          {s.vraagNr === 2 && (
            <div className="rij">
              <GroteKnop enorm bijTik={() => ctx.stuur('antwoord', { keuze: 'binnen' })}>
                Binnen
              </GroteKnop>
              <GroteKnop enorm bijTik={() => ctx.stuur('antwoord', { keuze: 'buiten' })}>
                Buiten
              </GroteKnop>
            </div>
          )}
          {s.vraagNr === 3 && (
            <>
              <div className="rij">
                <GroteKnop kleur="goud" bijTik={() => ctx.stuur('antwoord', { keuze: 'zebra' })}>
                  🦓 Zebra
                </GroteKnop>
                <GroteKnop kleur="goud" bijTik={() => ctx.stuur('antwoord', { keuze: 'regenboog' })}>
                  🌈 Regenboog
                </GroteKnop>
              </div>
              <div className="rij">
                <GroteKnop bijTik={() => ctx.stuur('antwoord', { keuze: 'wel' })}>
                  Heb ik al
                </GroteKnop>
                <GroteKnop bijTik={() => ctx.stuur('antwoord', { keuze: 'niet' })}>
                  Nog niet
                </GroteKnop>
              </div>
              <div className="klein zacht" style={{ textAlign: 'center' }}>
                Zebra = kleuren wisselen af · Regenboog = vier soorten.
                <br />
                Goed geraden? Die mag je uitdelen.
              </div>
            </>
          )}
        </div>
      ) : (
        <Kaartje style={{ textAlign: 'center' }}>
          <span className="zacht">
            {s.gedaan.length} van {ctx.spelers.length} spelers gehad
          </span>
        </Kaartje>
      )}
    </>
  )
}

function Uitslagje({
  laatste,
  ctx,
}: {
  laatste: NonNullable<BussenState['laatste']>
  ctx: KijkContext
}) {
  const kleur =
    laatste.uitkomst === 'goed'
      ? 'var(--groen)'
      : laatste.uitkomst === 'fout'
        ? 'var(--rood)'
        : 'var(--goud)'
  const woord =
    laatste.uitkomst === 'goed' ? 'GOED' : laatste.uitkomst === 'fout' ? 'FOUT' : 'GELIJK'
  return (
    <div className="klein zacht">
      {ctx.naam(laatste.uid)} zei <strong>{laatste.keuze}</strong> · {kaartKort(laatste.kaart)} ·{' '}
      <strong style={{ color: kleur }}>{woord}</strong>
    </div>
  )
}

/* ── Fase 2 ─────────────────────────────────────────────────── */

function Boom({ s, ctx }: { s: BussenState; ctx: KijkContext }) {
  const plek = s.boom[s.boomIndex]
  const inzet = inzetVan(plek)
  const hand: Kaart[] = ctx.prive?.hand ?? []
  const ikHebHem = plek.kaart ? hand.filter((k) => k.waarde === plek.kaart!.waarde).length : 0

  useHostKlok(ctx, s.boomFase === 'race', s.klok?.eind ?? 0, 'sluit-race')
  useHostKlok(ctx, s.boomFase === 'uitdagen', s.klok?.eind ?? 0, 'sluit-uitdagen')

  const ikGeclaimd = s.claims.find((c) => c.uid === ctx.ik)
  const ikGepast = s.gepast.includes(ctx.ik)
  const aanZet = s.uitdeelVolgorde[s.uitdeelIndex]

  return (
    <>
      <BoomPlaatje s={s} />

      <div style={{ textAlign: 'center' }}>
        <div className="kop-klein">
          Rij {plek.rij} · {ctx.slok(inzet)}
          {plek.horizontaal && ' (dubbel)'}
        </div>
      </div>

      {s.klok && (
        <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />
      )}

      <MijnHand hand={hand} raak={plek.kaart?.waarde} />

      {s.boomFase === 'race' && (
        <div className="onderaan">
          {s.claims.length > 0 && (
            <div className="klein zacht" style={{ textAlign: 'center' }}>
              {s.claims.map((c, i) => `${i + 1}. ${ctx.naam(c.uid)}`).join(' · ')}
            </div>
          )}
          <div className="rij">
            <GroteKnop
              kleur="goud"
              enorm
              bijTik={() => ctx.stuur('legop')}
            >
              LEG OP {ikGeclaimd ? `(${ikGeclaimd.aantal})` : ''}
            </GroteKnop>
            <GroteKnop
              kleur={ikGepast ? 'leeg' : 'grijs'}
              enorm
              uit={ikGepast}
              bijTik={() => ctx.stuur('niks')}
            >
              Ik heb niks
            </GroteKnop>
          </div>
          <div className="klein zacht" style={{ textAlign: 'center' }}>
            {ikHebHem > 0
              ? `Je hebt er ${ikHebHem}. Snel zijn loont: wie eerst legt, deelt als laatste uit.`
              : 'Je hebt hem niet — maar opleggen mag alsnog. 😏'}
            {'  '}
            {resterendMs(s.klok, ctx.nu) > 0 && `${klokTekst(s.klok, ctx.nu)}s`}
          </div>
        </div>
      )}

      {s.boomFase === 'uitdagen' && (
        <div className="onderaan">
          <div className="kop-klein" style={{ textAlign: 'center' }}>
            Iemand die bluft? Tik erop. {klokTekst(s.klok, ctx.nu)}s
          </div>
          {s.claims.map((c, i) => (
            <GroteKnop
              key={c.uid}
              klein
              kleur={s.uitdagingen.some((u) => u.tegen === c.uid) ? 'rood' : 'leeg'}
              uit={c.uid === ctx.ik || s.uitdagingen.some((u) => u.door === ctx.ik)}
              bijTik={() => ctx.stuur('daag', { uid: c.uid })}
            >
              {i + 1}e · {ctx.naam(c.uid)}
              {c.aantal > 1 ? ` (${c.aantal}×)` : ''} — laat zien!
            </GroteKnop>
          ))}
          <div className="klein zacht" style={{ textAlign: 'center' }}>
            Betrapt = {ctx.slok(inzet * 2)} voor de bluffer. Mis = {ctx.slok(inzet * 2)} voor jou.
          </div>
        </div>
      )}

      {s.boomFase === 'uitdelen' && (
        <div className="onderaan">
          {s.betrapt.length > 0 && (
            <div className="klein" style={{ textAlign: 'center', color: 'var(--rood)' }}>
              Betrapt: {s.betrapt.map(ctx.naam).join(', ')}
            </div>
          )}
          {aanZet === ctx.ik ? (
            <>
              <h2 style={{ textAlign: 'center' }}>Wie krijgt {ctx.slok(inzet)}?</h2>
              <SpelerKnoppen ctx={ctx} bijKeuze={(uid) => ctx.stuur('geef', { uid })} />
            </>
          ) : (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">
                {ctx.naam(aanZet)} deelt uit… ({s.uitdeelIndex + 1}/{s.uitdeelVolgorde.length})
              </span>
            </Kaartje>
          )}
          {ctx.benIkHost && aanZet !== ctx.ik && (
            <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('sla-over')}>
              Sla over
            </GroteKnop>
          )}
        </div>
      )}
    </>
  )
}

function BoomPlaatje({ s }: { s: BussenState }) {
  // Van boven naar beneden tekenen: rij 5, 4, 3, 2, 1.
  const rijen: BoomPlek[][] = []
  let i = 0
  for (const aantal of BOOM_RIJEN) {
    rijen.push(s.boom.slice(i, i + aantal))
    i += aantal
  }
  rijen.reverse()

  let index = s.boom.length
  return (
    <div className="boom">
      {rijen.map((rij, r) => {
        index -= rij.length
        return (
          <div className="boom-rij" key={r}>
            {rij.map((plek, k) => {
              const echteIndex = index + k
              return (
                <div
                  key={echteIndex}
                  className={[
                    'boom-plek',
                    plek.horizontaal ? 'dubbel' : '',
                    echteIndex === s.boomIndex ? 'nu' : '',
                  ].join(' ')}
                >
                  <Speelkaart kaart={plek.kaart} maat="klein" dicht={!plek.kaart} />
                  {plek.horizontaal && <span className="badge">×2</span>}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function MijnHand({ hand, raak }: { hand: Kaart[]; raak?: number }) {
  if (hand.length === 0) {
    return <div className="klein zacht" style={{ textAlign: 'center' }}>Je hand is leeg 🎉</div>
  }
  return (
    <div>
      <div className="kop-klein" style={{ textAlign: 'center', marginBottom: 4 }}>
        Jouw hand — alleen jij ziet dit
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {hand.map((k) => (
          <div
            key={k.id}
            style={{
              outline: raak === k.waarde ? '3px solid var(--goud)' : 'none',
              outlineOffset: 2,
              borderRadius: 14,
            }}
          >
            <Speelkaart kaart={k} maat="klein" />
          </div>
        ))}
      </div>
    </div>
  )
}

function SpelerKnoppen({
  ctx,
  bijKeuze,
}: {
  ctx: KijkContext
  bijKeuze: (uid: string) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {ctx.spelers
        .filter((p) => p.uid !== ctx.ik)
        .map((p) => (
          <GroteKnop key={p.uid} kleur="goud" bijTik={() => bijKeuze(p.uid)}>
            {p.emoji} {p.naam}
          </GroteKnop>
        ))}
    </div>
  )
}

/* ── Fase 3 ─────────────────────────────────────────────────── */

function Bus({ s, ctx }: { s: BussenState; ctx: KijkContext }) {
  const ikRij = ctx.ik === s.chauffeur
  const chauffeur = ctx.speler(s.chauffeur ?? '')

  return (
    <>
      <div style={{ textAlign: 'center' }}>
        <div className="kop-klein">
          De bus · poging {s.busPoging} · {s.busLengte} kaarten
        </div>
        <h2>
          🚌 {chauffeur?.emoji} {chauffeur?.naam}
        </h2>
      </div>

      <div className="midden" style={{ gap: 16 }}>
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
          {Array.from({ length: s.busLengte }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 26,
                height: 36,
                borderRadius: 6,
                background: i < s.busPositie ? 'var(--groen)' : 'var(--vlak-hoog)',
                border: i === s.busPositie ? '2px solid var(--goud)' : '1px solid var(--rand)',
              }}
            />
          ))}
        </div>

        <Speelkaart kaart={s.busOpen} maat="groot" />
      </div>

      {ikRij ? (
        <div className="onderaan">
          <div className="rij">
            <GroteKnop kleur="groen" enorm bijTik={() => ctx.stuur('hoger')}>
              ▲ Hoger
            </GroteKnop>
            <GroteKnop kleur="rood" enorm bijTik={() => ctx.stuur('lager')}>
              ▼ Lager
            </GroteKnop>
          </div>
          <div className="klein zacht" style={{ textAlign: 'center' }}>
            Fout? Je drinkt wat je al goed had, en de bus wordt één kaart korter.
          </div>
        </div>
      ) : (
        <Kaartje style={{ textAlign: 'center' }}>
          <span className="zacht">Kijken en genieten.</span>
        </Kaartje>
      )}
    </>
  )
}

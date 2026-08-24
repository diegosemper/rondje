import {
  isRood,
  kaartKort,
  leggAf,
  nieuweStapel,
  trek,
  waardeVoluit,
  type Kaart,
  type Stapel,
} from '../../engine/deck'
import { volgende } from '../../engine/beurten'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, startKlok, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { Balkje, GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   BUSSEN — de variant van Diego's vriendengroep

   1. DE VIER VRAGEN, per vraag de kring rond. Eerst doet iedereen zijn
      eerste kaart (rood of zwart), dan is iedereen aan de beurt voor hoger
      of lager, enzovoort. Fout kost 1, 2, 3 of 4 slokken; gelijk kost dubbel.
      Je vier kaarten worden je hand.

   2. DE BOOM. Elf kaarten, van onder naar boven 1-2-3-4-1, waard 1 t/m 5
      slokken. Ligt een kaart horizontaal, dan telt hij dubbel.

      Gaat er één open, dan is het een RACE. Heb je die waarde, dan tik je hem
      aan en hij ligt. Wie als eerste legt, deelt als LAATSTE uit — en dat is
      de goede plek, want dan weet je al wat de rest gedaan heeft. Te laat is
      pech: je houdt de kaart, en met de meeste kaarten over moet jij de bus in.

   3. DE BUS. Een willekeurige kaart bepaalt de lengte, minimaal 6. Hoger of
      lager tot je hem helemaal uit hebt. Een waarde die al in de bus ligt komt
      niet nog eens — dan wordt er een nieuwe kaart getrokken. Vanaf 9 kaarten
      ligt er een checkpoint één over de helft, en daar herstart je voortaan.
   ───────────────────────────────────────────────────────────── */

/** Aantal kaarten per rij van de boom, van onder naar boven. */
const BOOM_RIJEN = [1, 2, 3, 4, 1]
const KANS_HORIZONTAAL = 0.4
const RACE_SEC = 8
/** Hoe lang een kaart die niemand heeft in beeld blijft. */
const LEEG_SEC = 2.5

const VRAAG_INZET = [1, 2, 3, 4]

const BUS_MIN = 6
/** Er zijn maar 13 verschillende waarden, en de startkaart pakt er één.
 *  Langer dan 12 kan dus niet zonder herhaling. */
const BUS_MAX = 12
/** Vanaf deze lengte krijgt de bus een checkpoint. */
const BUS_CHECKPOINT_VANAF = 9

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

type Uitkomst = 'goed' | 'fout' | 'gelijk'

interface BoomPlek {
  rij: number
  waarde: number
  horizontaal: boolean
  kaart: Kaart | null
}

interface Legging {
  uid: string
  aantal: number
  /** wanneer hij als eerste tikte — bepaalt de volgorde */
  ts: number
}

interface BussenState {
  fase: 'vragen' | 'boom' | 'bus' | 'klaar'
  stapel: Stapel

  _geheim: {
    handen: Record<string, Kaart[]>
    boomKaarten: Kaart[]
  }

  /** hoeveel kaarten iedereen nog heeft — dit mag iedereen zien */
  handGrootte: Record<string, number>

  /* fase 1 — per vraag de kring rond */
  vraagNr: number
  vraagBeurt: string
  gedaanDezeVraag: string[]
  laatste: { uid: string; keuze: Keuze; kaart: Kaart; uitkomst: Uitkomst } | null
  bonus: string | null

  /* fase 2 */
  boom: BoomPlek[]
  boomIndex: number
  boomFase: 'race' | 'uitdelen' | 'leeg'
  klok: Klok | null
  gelegd: Legging[]
  uitdeelVolgorde: string[]
  uitdeelIndex: number

  /* fase 3 */
  chauffeur: string | null
  busLengteKaart: Kaart | null
  busLengte: number
  busStart: Kaart | null
  busRij: (Kaart | null)[]
  busPositie: number
  checkpointIndex: number
  checkpointGehaald: boolean
  busPoging: number
  busFoutKaart: Kaart | null
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
    return (keuze === 'hoger') === (nieuw.waarde > eerste.waarde) ? 'goed' : 'fout'
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

/** Klaar met deze vraag? Dan iedereen door naar de volgende. */
function volgendeVrager(s: BussenState, ctx: SpelContext, volgorde: string[], uid: string) {
  if (!s.gedaanDezeVraag.includes(uid)) s.gedaanDezeVraag.push(uid)

  if (s.gedaanDezeVraag.length < volgorde.length) {
    s.vraagBeurt = volgende(volgorde, s.vraagBeurt)
    return
  }

  s.gedaanDezeVraag = []
  s.vraagNr++
  s.vraagBeurt = volgorde[0]

  if (s.vraagNr >= 4) {
    s.fase = 'boom'
    opentVolgendeBoomkaart(s, ctx)
  }
}

function opentVolgendeBoomkaart(s: BussenState, ctx: SpelContext) {
  const plek = s.boom[s.boomIndex]
  plek.kaart = s._geheim.boomKaarten[s.boomIndex]
  s.gelegd = []
  s.uitdeelVolgorde = []
  s.uitdeelIndex = 0

  // Heeft niemand deze waarde? Dan hoeft er niet acht seconden gewacht te
  // worden op een race die niet komt. Even laten zien, dan door.
  const waarde = plek.kaart.waarde
  const iemandHeeftHem = ctx.spelers.some((p) => aantalInHand(s, p.uid, waarde) > 0)
  if (!iemandHeeftHem) {
    ctx.log(`Niemand had een ${waardeVoluit(waarde)}`)
    s.boomFase = 'leeg'
    s.klok = startKlok(LEEG_SEC, ctx.nu)
    return
  }

  s.boomFase = 'race'
  s.klok = startKlok(RACE_SEC, ctx.nu)
}

/** Hoeveel van deze waarde heeft deze speler nog? */
function aantalInHand(s: BussenState, uid: string, waarde: number): number {
  return (s._geheim.handen[uid] ?? []).filter((k) => k.waarde === waarde).length
}

/** De race is voorbij zodra iedereen die de kaart heeft, alles gelegd heeft. */
function iedereenGelegd(s: BussenState, ctx: SpelContext, waarde: number): boolean {
  return ctx.spelers.every((p) => {
    const over = aantalInHand(s, p.uid, waarde)
    return over === 0
  })
}

function sluitRace(s: BussenState, ctx: SpelContext) {
  if (s.gelegd.length === 0) {
    ctx.log('Iedereen was te traag — niemand legde op')
    volgendePlek(s, ctx)
    return
  }

  // Wie het eerst legde, deelt als laatste uit.
  s.gelegd.sort((a, b) => a.ts - b.ts)
  const volgordeUit: string[] = []
  for (const legging of [...s.gelegd].reverse()) {
    for (let i = 0; i < legging.aantal; i++) volgordeUit.push(legging.uid)
  }

  s.uitdeelVolgorde = volgordeUit
  s.uitdeelIndex = 0
  s.boomFase = 'uitdelen'
  s.klok = null
}

function volgendePlek(s: BussenState, ctx: SpelContext) {
  s.boomIndex++
  s.gelegd = []
  s.uitdeelVolgorde = []
  s.uitdeelIndex = 0
  s.klok = null

  if (s.boomIndex >= s.boom.length) {
    startBus(s, ctx)
    return
  }
  opentVolgendeBoomkaart(s, ctx)
}

/* ── De bus ─────────────────────────────────────────────────── */

/** Welke waarden liggen er al in de bus? Die komen niet nog een keer. */
function gezienInBus(s: BussenState): number[] {
  const uit: number[] = []
  if (s.busStart) uit.push(s.busStart.waarde)
  for (let i = 0; i < s.busPositie; i++) {
    const k = s.busRij[i]
    if (k) uit.push(k.waarde)
  }
  return uit
}

/** Trekt een kaart met een waarde die nog niet in de bus ligt. */
function trekUniek(s: BussenState, ctx: SpelContext, gezien: number[]): Kaart {
  const opzij: Kaart[] = []
  let kaart = trek(s.stapel, ctx.rng)
  let pogingen = 0
  while (gezien.includes(kaart.waarde) && pogingen < 80) {
    opzij.push(kaart)
    kaart = trek(s.stapel, ctx.rng)
    pogingen++
  }
  // De afgekeurde kaarten terug op de aflegstapel, zodat het deck niet opraakt.
  if (opzij.length) leggAf(s.stapel, ...opzij)
  return kaart
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

  // Een willekeurige kaart bepaalt de lengte van de bus.
  const lengteKaart = trek(s.stapel, ctx.rng)
  s.busLengteKaart = lengteKaart
  s.busLengte = Math.min(BUS_MAX, Math.max(BUS_MIN, lengteKaart.waarde))
  s.checkpointIndex = s.busLengte >= BUS_CHECKPOINT_VANAF ? Math.floor(s.busLengte / 2) : 0
  s.checkpointGehaald = false

  s.busRij = new Array(s.busLengte).fill(null)
  s.busPositie = 0
  s.busPoging = 1
  s.busFoutKaart = null
  s.busStart = trek(s.stapel, ctx.rng)

  // Handen zijn nu betekenisloos, dus weg ermee. Per speler wissen en niet met
  // wisPrive(): in dezelfde zet kunnen er net handen bijgewerkt zijn, en die
  // zouden een algehele wis overleven.
  for (const p of ctx.spelers) ctx.zetPrive(p.uid, null)

  ctx.log(
    `${ctx.naam(s.chauffeur)} rijdt de bus — ${kaartKort(lengteKaart)} geeft ${s.busLengte} kaarten` +
      (s.checkpointIndex > 0 ? `, checkpoint op ${s.checkpointIndex + 1}` : ''),
  )
}

/* ── Het spel ───────────────────────────────────────────────── */

export const bussen: GameModule<BussenState> = {
  id: 'bussen',
  naam: 'Bussen',
  uitleg: 'Vier vragen, de boom als race, en dan rijdt de verliezer de bus.',
  regels: [
    'Vier vragen om de beurt: fout kost 1, 2, 3 of 4 slokken.',
    'Dan de boom: heb je de kaart, tik hem aan. Snelheid telt.',
    'Wie als eerste legt, deelt als laatste uit.',
    'Meeste kaarten over? Jij rijdt de bus.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'lang',
  tags: ['kaarten', 'geheim', 'reflex'],
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

      vraagNr: 0,
      vraagBeurt: ctx.spelers[0].uid,
      gedaanDezeVraag: [],
      laatste: null,
      bonus: null,

      boom,
      boomIndex: 0,
      boomFase: 'race',
      klok: null,
      gelegd: [],
      uitdeelVolgorde: [],
      uitdeelIndex: 0,

      chauffeur: null,
      busLengteKaart: null,
      busLengte: BUS_MIN,
      busStart: null,
      busRij: [],
      busPositie: 0,
      checkpointIndex: 0,
      checkpointGehaald: false,
      busPoging: 1,
      busFoutKaart: null,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    /* ── Fase 1: de vier vragen ─────────────────────────────── */

    if (s.fase === 'vragen' && actie.type === 'antwoord') {
      if (actie.uid !== s.vraagBeurt) return
      if (s.bonus) return // eerst je bonus uitdelen
      const keuze: Keuze = actie.payload?.keuze
      if (!keuze) return

      const hand = s._geheim.handen[actie.uid] ?? []
      const nieuw = trek(s.stapel, ctx.rng)
      const uitkomst = beoordeel(hand, nieuw, s.vraagNr, keuze)
      const inzet = VRAAG_INZET[s.vraagNr]

      hand.push(nieuw)
      s._geheim.handen[actie.uid] = hand
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
      if (!s.bonus) volgendeVrager(s, ctx, volgorde, actie.uid)
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
      const waarde = plek.kaart!.waarde

      if (s.boomFase === 'leeg') {
        if (actie.type === 'volgende-plek') volgendePlek(s, ctx)
        return
      }

      if (s.boomFase === 'race') {
        if (actie.type === 'legop') {
          const hand = s._geheim.handen[actie.uid] ?? []
          const idx = hand.findIndex((k) => k.waarde === waarde)
          if (idx < 0) return // je hebt hem niet; bluffen bestaat hier niet

          hand.splice(idx, 1)
          s._geheim.handen[actie.uid] = hand
          duwHand(s, ctx, actie.uid)

          const bestaand = s.gelegd.find((g) => g.uid === actie.uid)
          if (bestaand) bestaand.aantal++
          else s.gelegd.push({ uid: actie.uid, aantal: 1, ts: actie.ts })

          if (iedereenGelegd(s, ctx, waarde)) sluitRace(s, ctx)
          return
        }

        if (actie.type === 'sluit-race') {
          // Tijd om. Wie te laat was houdt zijn kaart — en dus meer kans
          // om straks de bus in te moeten.
          sluitRace(s, ctx)
          return
        }
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

        ctx.deelUit(
          actie.uid,
          doel,
          inzet,
          `boom rij ${plek.rij}${plek.horizontaal ? ' (dubbel)' : ''}`,
        )
        s.uitdeelIndex++
        if (s.uitdeelIndex >= s.uitdeelVolgorde.length) volgendePlek(s, ctx)
        return
      }
    }

    /* ── Fase 3: de bus ─────────────────────────────────────── */

    if (s.fase === 'bus' && (actie.type === 'hoger' || actie.type === 'lager')) {
      if (actie.uid !== s.chauffeur) return

      const vorige = s.busPositie === 0 ? s.busStart! : s.busRij[s.busPositie - 1]!
      const nieuw = trekUniek(s, ctx, gezienInBus(s))
      const goed = (actie.type === 'hoger') === (nieuw.waarde > vorige.waarde)

      if (goed) {
        s.busRij[s.busPositie] = nieuw
        s.busPositie++
        s.busFoutKaart = null

        if (s.checkpointIndex > 0 && s.busPositie > s.checkpointIndex) {
          s.checkpointGehaald = true
        }

        if (s.busPositie >= s.busLengte) {
          ctx.log(`${ctx.naam(s.chauffeur)} is uit de bus! 🎉`)
          s.fase = 'klaar'
          ctx.klaar()
        }
        return
      }

      // Fout. Je drinkt zoveel kaarten als je in déze poging deed.
      const herstart = s.checkpointGehaald ? s.checkpointIndex : 0
      const straf = s.busPositie - herstart + 1
      ctx.drink(s.chauffeur, straf, `strandde op kaart ${s.busPositie + 1}`)

      s.busFoutKaart = nieuw
      leggAf(s.stapel, nieuw)
      for (let i = herstart; i < s.busLengte; i++) s.busRij[i] = null
      s.busPositie = herstart
      s.busPoging++
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

/* ── Fase 1 ─────────────────────────────────────────────────── */

const VRAAG_TEKST = ['Rood of zwart?', 'Hoger of lager?', 'Binnen of buiten?', 'Het patroon?']

function Vragen({ s, ctx }: { s: BussenState; ctx: KijkContext }) {
  const mijnBeurt = ctx.ik === s.vraagBeurt
  const speler = ctx.speler(s.vraagBeurt)
  const magUitdelen = s.bonus === ctx.ik
  const hand: Kaart[] = ctx.prive?.hand ?? []

  return (
    <>
      <SpelerBalk spelers={ctx.spelers} actief={s.vraagBeurt} />

      <div className="midden" style={{ gap: 12 }}>
        <div className="kop-klein">
          Vraag {s.vraagNr + 1} van 4 · fout kost {ctx.slok(VRAAG_INZET[s.vraagNr])}
        </div>

        <div>
          <div className="kop-klein" style={{ marginBottom: 4 }}>
            Jouw kaarten
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {[0, 1, 2, 3].map((i) => (
              <Speelkaart key={i} kaart={hand[i] ?? null} maat="klein" dicht={!hand[i]} />
            ))}
          </div>
        </div>

        {s.laatste && <Uitslagje laatste={s.laatste} ctx={ctx} />}

        <h2>{mijnBeurt ? VRAAG_TEKST[s.vraagNr] : `${speler?.emoji} ${speler?.naam} is aan zet`}</h2>
        <div className="klein zacht">
          {s.gedaanDezeVraag.length} van {ctx.spelers.length} deze ronde gehad
        </div>
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
          <span className="zacht">Wachten tot jij weer aan de beurt bent</span>
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
  const passend = plek.kaart ? hand.filter((k) => k.waarde === plek.kaart!.waarde).length : 0

  useHostKlok(ctx, s.boomFase === 'race', s.klok?.eind ?? 0, 'sluit-race')
  useHostKlok(ctx, s.boomFase === 'leeg', s.klok?.eind ?? 0, 'volgende-plek')

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

      {s.klok && <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />}

      {s.boomFase === 'leeg' && (
        <div className="midden">
          <div style={{ fontSize: 44 }}>🤷</div>
          <h2 className="zacht">Niemand heeft hem</h2>
        </div>
      )}

      {s.boomFase === 'race' && (
        <>
          <div className="midden" style={{ gap: 10 }}>
            {s.gelegd.length > 0 && (
              <div className="klein zacht">
                {s.gelegd.map((g, i) => `${i + 1}. ${ctx.naam(g.uid)}`).join('  ·  ')}
              </div>
            )}
            <div className="reusachtig" style={{ fontSize: 'clamp(36px,12vw,64px)' }}>
              {klokTekst(s.klok, ctx.nu)}
            </div>
          </div>

          <div className="onderaan">
            <div className="kop-klein" style={{ textAlign: 'center' }}>
              {passend > 0
                ? `Je hebt er ${passend} — tik erop, snel!`
                : 'Jouw hand — je hebt hem niet'}
            </div>
            <HandKnoppen
              hand={hand}
              raak={plek.kaart?.waarde}
              bijTik={() => ctx.stuur('legop')}
            />
            <div className="klein zacht" style={{ textAlign: 'center' }}>
              Wie het eerst legt, deelt als laatste uit. Te laat = je houdt de kaart.
            </div>
          </div>
        </>
      )}

      {s.boomFase === 'uitdelen' && (
        <div className="onderaan" style={{ marginTop: 'auto' }}>
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

/** Je hand als knoppen: de passende kaarten lichten op en zijn tikbaar. */
function HandKnoppen({
  hand,
  raak,
  bijTik,
}: {
  hand: Kaart[]
  raak?: number
  bijTik: () => void
}) {
  if (hand.length === 0) {
    return (
      <div className="klein" style={{ textAlign: 'center', color: 'var(--groen)' }}>
        Je hand is leeg 🎉
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      {hand.map((k) => {
        const past = raak === k.waarde
        return (
          <button
            key={k.id}
            onClick={past ? bijTik : undefined}
            disabled={!past}
            style={{
              padding: 0,
              borderRadius: 14,
              outline: past ? '3px solid var(--goud)' : 'none',
              outlineOffset: 3,
              opacity: past ? 1 : 0.45,
              transform: past ? 'translateY(-4px)' : 'none',
              transition: 'transform .1s ease',
            }}
          >
            <Speelkaart kaart={k} maat="midden" />
          </button>
        )
      })}
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
  const vorige = s.busPositie === 0 ? s.busStart : s.busRij[s.busPositie - 1]
  const herstart = s.checkpointGehaald ? s.checkpointIndex : 0
  const straf = s.busPositie - herstart + 1

  return (
    <>
      <div style={{ textAlign: 'center' }}>
        <div className="kop-klein">
          De bus · {s.busLengte} kaarten · poging {s.busPoging}
        </div>
        <h2>
          🚌 {chauffeur?.emoji} {chauffeur?.naam}
        </h2>
      </div>

      <BusRij s={s} />

      <div className="midden" style={{ gap: 10 }}>
        {s.busFoutKaart && (
          <div className="klein" style={{ color: 'var(--rood)' }}>
            {kaartKort(s.busFoutKaart)} — mis
          </div>
        )}
        <div className="kop-klein">Hoger of lager dan</div>
        <Speelkaart kaart={vorige} maat="groot" />
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
            Fout kost nu {ctx.slok(straf)}
            {s.checkpointGehaald
              ? ` — je herstart op kaart ${s.checkpointIndex + 1}`
              : s.checkpointIndex > 0
                ? ` — checkpoint op kaart ${s.checkpointIndex + 1}`
                : ''}
            .
            <br />
            Waarden die al liggen komen niet nog eens.
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

function BusRij({ s }: { s: BussenState }) {
  return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
      {Array.from({ length: s.busLengte }).map((_, i) => {
        const gehaald = !!s.busRij[i]
        const nu = i === s.busPositie
        const isCheckpoint = s.checkpointIndex > 0 && i === s.checkpointIndex
        return (
          <div
            key={i}
            title={isCheckpoint ? 'checkpoint' : undefined}
            style={{
              position: 'relative',
              width: 22,
              height: 32,
              borderRadius: 5,
              background: gehaald ? 'var(--groen)' : 'var(--vlak-hoog)',
              border: nu
                ? '2px solid var(--goud)'
                : isCheckpoint
                  ? '2px dashed var(--goud)'
                  : '1px solid var(--rand)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: gehaald ? '#05230f' : 'var(--tekst-zacht)',
            }}
          >
            {isCheckpoint && !gehaald ? '⚑' : i + 1}
          </div>
        )
      })}
    </div>
  )
}

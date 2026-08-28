import { useEffect, useState } from 'react'
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
import { Verdeler } from '../../ui/Verdeler'

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

   3. DE BUS. Eerst pak je blind een van vijf dichte kaarten en draai je hem
      om. De waarde eronder is de lengte: pak je een 10, dan wordt het een bus
      van tien kaarten. Ze liggen allemaal tussen de 6 en de aas, dus korter
      dan zes wordt het nooit en langer dan veertien ook niet.

      Die hele rij komt meteen op tafel te liggen — bij 10 liggen er ook echt
      10 kaarten naast elkaar.

      Dan gooi je een kaart de lucht in. Landt hij op zijn voorkant, dan ligt
      de hele rij open en zie je precies wat je te wachten staat. Landt hij op
      zijn rug, dan ligt alles dicht en ken je alleen de kaart waar je op dat
      moment voor staat.

      Dan ga je kaart voor kaart: hoger of lager dan de kaart die op díé plek
      ligt. Elke getrokken kaart komt bovenop dat stapeltje. Zit je ernaast,
      dan blijft die kaart daar liggen en begin je opnieuw — met die kaart als
      de nieuwe kaart waar je vanaf gaat. Zo stapelt het op en zie je nooit
      twee keer hetzelfde.

      Vanaf 9 kaarten ligt er een checkpoint één over de helft, en daar
      herstart je voortaan.
   ───────────────────────────────────────────────────────────── */

/** Aantal kaarten per rij van de boom, van onder naar boven. */
const BOOM_RIJEN = [1, 2, 3, 4, 1]
const KANS_HORIZONTAAL = 0.4
const RACE_SEC = 8
/** Hoe lang een kaart die niemand heeft in beeld blijft. */
const LEEG_SEC = 2.5
/** Steen-papier-schaar: kiezen, en hoe lang de uitslag blijft staan. */
const SPS_SEC = 10
const SPS_TOON_SEC = 3.5

const VRAAG_INZET = [1, 2, 3, 4]

/** De lengtekaart ligt altijd tussen deze twee: een 6 tot en met een aas. */
const BUS_MIN = 6
const BUS_MAX = 14
/** Hoeveel dichte kaarten je te kiezen krijgt voor die lengte. */
const BUS_KEUZES = 5
/** Vanaf deze lengte krijgt de bus een checkpoint. */
const BUS_CHECKPOINT_VANAF = 9
/** Hoe lang een kaart erover doet om op tafel te vallen. */
const BUS_LEG_MS = 620
/** Hoe lang de opgegooide kaart door de lucht tolt. */
const WORP_MS = 1500
/** En hoe lang de uitslag daarna blijft staan voordat de rij verschijnt. */
const WORP_TOON_MS = 2400
/** Hoe lang de gepakte lengtekaart erover doet om om te draaien. */
const TREK_MS = 700
/** En hoe lang hij daarna in beeld blijft. */
const TREK_TOON_MS = 2300

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

interface SpsRonde {
  kandidaten: string[]
  /** wie er al gekozen heeft — het gebaar zelf blijft geheim tot de onthulling */
  gekozen: string[]
  ronde: number
  uitslag: { keuzes: Record<string, Gebaar>; veilig: string[]; gelijkspel: boolean } | null
}

interface BussenState {
  fase: 'vragen' | 'boom' | 'sps' | 'bus' | 'klaar'
  stapel: Stapel

  _geheim: {
    handen: Record<string, Kaart[]>
    boomKaarten: Kaart[]
    spsKeuzes: Record<string, Gebaar>
  }

  sps: SpsRonde | null

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
  /** eerst een lengtekaart pakken, dan gooien, dan pas rijden */
  busSubfase: 'trekken' | 'gooien' | 'rijden'
  /** de dichte kaarten waar je er blind een uit pakt */
  busKeuzes: Kaart[]
  /** welke daarvan je pakte, of null zolang je nog moet kiezen */
  busGekozen: number | null
  /** wanneer je hem pakte, in servertijd — omdraaien duurt even */
  busTrekOp: number
  /** de kaart die je opgooide; kop of munt bepaalt open of dicht */
  busWorp: Kaart | null
  /** wanneer hij de lucht in ging, in servertijd — de worp duurt even */
  busWorpOp: number
  /** ligt de rij open (je ziet alles) of dicht (alleen tot waar je bent)? */
  busOpen: boolean
  /**
   * De stapeltjes op tafel, één per plek in de rij. De laatste kaart van een
   * stapeltje ligt bovenop, en dát is de kaart waar je vanaf gaat.
   */
  busStapels: Kaart[][]
  busPositie: number
  checkpointIndex: number
  checkpointGehaald: boolean
  busPoging: number
  /**
   * De kaart die er als laatste bij gelegd is, met de kaart waar hij bovenop
   * ging. Staat in de spelstand en niet in het scherm, zodat iedereen aan
   * tafel dezelfde kaart ziet vallen en niet alleen de chauffeur.
   */
  busLaatste: { kaart: Kaart; vorige: Kaart; goed: boolean; plek: number; nr: number } | null
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

/**
 * Verwerkt een verdeling van de Verdeler. De aantallen zijn al omgerekend
 * naar de zwaarte-instelling, dus deelUitPrecies en niet deelUit.
 */
function verdeel(
  ctx: SpelContext,
  actie: Actie,
  volgorde: string[],
  reden: string,
): boolean {
  const verdeling: Record<string, number> = actie.payload?.verdeling
  if (!verdeling || typeof verdeling !== 'object') return false
  for (const [uid, aantal] of Object.entries(verdeling)) {
    if (!volgorde.includes(uid) || uid === actie.uid) continue
    ctx.deelUitPrecies(actie.uid, uid, aantal, reden)
  }
  return true
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
    bepaalChauffeur(s, ctx)
    return
  }
  opentVolgendeBoomkaart(s, ctx)
}

/* ── De bus ─────────────────────────────────────────────────── */

/** De kaart die bovenop een stapeltje ligt — daar gaat je gok vanaf. */
function bovenop(s: BussenState, plek: number): Kaart | null {
  const stapel = s.busStapels?.[plek]
  return stapel && stapel.length ? stapel[stapel.length - 1] : null
}

/**
 * Trekt een kaart waarvan de waarde binnen een bereik valt.
 *
 * Voor de lengte van de bus: die moet tussen de 6 en de aas liggen. Vroeger
 * werd er gewoon een kaart getrokken en het getal daarna platgeslagen tussen
 * 6 en 12, maar dan is een 2 net zo goed een 6 en klopt "de kaart die je pakt
 * is de lengte" niet meer.
 */
function trekTussen(stapel: Stapel, rng: () => number, min: number, max: number): Kaart {
  const opzij: Kaart[] = []
  let kaart = trek(stapel, rng)
  let pogingen = 0
  while ((kaart.waarde < min || kaart.waarde > max) && pogingen < 80) {
    opzij.push(kaart)
    kaart = trek(stapel, rng)
    pogingen++
  }
  if (opzij.length) leggAf(stapel, ...opzij)
  return kaart
}

/**
 * Trekt een kaart met een andere waarde dan die ene.
 *
 * Zo kan het nooit gelijk uitkomen, en hoeft er geen regel te bestaan voor
 * "even hoog" midden in de bus. Je weet dus dat het altijd een echte hoger of
 * lager wordt.
 */
function trekAnders(stapel: Stapel, rng: () => number, nietDeze: number): Kaart {
  const opzij: Kaart[] = []
  let kaart = trek(stapel, rng)
  let pogingen = 0
  while (kaart.waarde === nietDeze && pogingen < 80) {
    opzij.push(kaart)
    kaart = trek(stapel, rng)
    pogingen++
  }
  if (opzij.length) leggAf(stapel, ...opzij)
  return kaart
}

/**
 * Trekt een kaart met een waarde die er nog niet ligt.
 *
 * Gebruikt bij het opbouwen van de boom: elf verschillende waarden, zodat er
 * bijna altijd wel iemand kan opleggen.
 */
function trekUniek(stapel: Stapel, rng: () => number, gezien: number[]): Kaart {
  const opzij: Kaart[] = []
  let kaart = trek(stapel, rng)
  let pogingen = 0
  while (gezien.includes(kaart.waarde) && pogingen < 80) {
    opzij.push(kaart)
    kaart = trek(stapel, rng)
    pogingen++
  }
  // De afgekeurde kaarten terug op de aflegstapel, zodat het deck niet opraakt.
  if (opzij.length) leggAf(stapel, ...opzij)
  return kaart
}

/* ── Steen, papier, schaar ──────────────────────────────────── */

type Gebaar = 'steen' | 'papier' | 'schaar'

const GEBAREN: Gebaar[] = ['steen', 'papier', 'schaar']
const GEBAAR_EMOJI: Record<Gebaar, string> = { steen: '✊', papier: '✋', schaar: '✌️' }

/** Slaat a het gebaar b? */
function slaat(a: Gebaar, b: Gebaar): boolean {
  return (
    (a === 'steen' && b === 'schaar') ||
    (a === 'schaar' && b === 'papier') ||
    (a === 'papier' && b === 'steen')
  )
}

/** Wie houdt de meeste kaarten over? Bij gelijkspel: steen-papier-schaar. */
function bepaalChauffeur(s: BussenState, ctx: SpelContext) {
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

  if (kandidaten.length === 1) {
    s.chauffeur = kandidaten[0]
    ctx.log(`${ctx.naam(s.chauffeur)} houdt ${meeste} kaarten over`)
    startBus(s, ctx)
    return
  }

  ctx.log(
    `Gelijk met ${meeste} kaarten: ${kandidaten.map(ctx.naam).join(', ')} — steen, papier, schaar!`,
  )
  startSps(s, ctx, kandidaten)
}

function startSps(s: BussenState, ctx: SpelContext, kandidaten: string[]) {
  s.fase = 'sps'
  s.sps = { kandidaten, gekozen: [], ronde: (s.sps?.ronde ?? 0) + 1, uitslag: null }
  s._geheim.spsKeuzes = {}
  s.klok = startKlok(SPS_SEC, ctx.nu)
}

function beslisSps(s: BussenState, ctx: SpelContext) {
  const sps = s.sps!
  const keuzes = s._geheim.spsKeuzes

  // Wie niet op tijd koos, krijgt er een van het lot.
  for (const uid of sps.kandidaten) {
    if (!keuzes[uid]) keuzes[uid] = GEBAREN[Math.floor(ctx.rng() * 3)]
  }

  const gebruikt = [...new Set(sps.kandidaten.map((u) => keuzes[u]))]

  // Allemaal hetzelfde, of alle drie de gebaren: niemand wint. Opnieuw.
  if (gebruikt.length !== 2) {
    sps.uitslag = { keuzes: { ...keuzes }, veilig: [], gelijkspel: true }
  } else {
    const [a, b] = gebruikt
    const winnend = slaat(a, b) ? a : b
    const veilig = sps.kandidaten.filter((u) => keuzes[u] === winnend)
    sps.uitslag = { keuzes: { ...keuzes }, veilig, gelijkspel: false }
  }

  s.klok = startKlok(SPS_TOON_SEC, ctx.nu)
}

function naSps(s: BussenState, ctx: SpelContext) {
  const sps = s.sps!
  const uitslag = sps.uitslag!

  if (uitslag.gelijkspel) {
    startSps(s, ctx, sps.kandidaten)
    return
  }

  const over = sps.kandidaten.filter((u) => !uitslag.veilig.includes(u))
  for (const veilig of uitslag.veilig) ctx.log(`${ctx.naam(veilig)} is de bus ontlopen`)

  if (over.length === 1) {
    s.chauffeur = over[0]
    s.sps = null
    startBus(s, ctx)
    return
  }
  if (over.length === 0) {
    // Kan niet, maar voor de zekerheid: dan doen we het gewoon opnieuw.
    startSps(s, ctx, sps.kandidaten)
    return
  }
  startSps(s, ctx, over)
}

function startBus(s: BussenState, ctx: SpelContext) {
  s.fase = 'bus'

  // Een paar dichte kaarten om uit te kiezen. Ze liggen allemaal tussen de 6
  // en de aas, dus welke je ook pakt, het wordt een bus van 6 tot 14 kaarten.
  // Je ziet ze niet: je pakt er blind een en draait hem daarna om.
  s.busKeuzes = []
  for (let i = 0; i < BUS_KEUZES; i++) {
    s.busKeuzes.push(trekTussen(s.stapel, ctx.rng, BUS_MIN, BUS_MAX))
  }

  s.busSubfase = 'trekken'
  s.busGekozen = null
  s.busTrekOp = 0
  s.busLengteKaart = null
  s.busLengte = BUS_MIN
  s.checkpointIndex = 0
  s.checkpointGehaald = false
  s.busStapels = []
  s.busWorp = null
  s.busWorpOp = 0
  s.busOpen = false
  s.busPositie = 0
  s.busPoging = 1
  s.busLaatste = null

  // Handen zijn nu betekenisloos, dus weg ermee. Per speler wissen en niet met
  // wisPrive(): in dezelfde zet kunnen er net handen bijgewerkt zijn, en die
  // zouden een algehele wis overleven.
  for (const p of ctx.spelers) ctx.zetPrive(p.uid, null)

  ctx.log(`${ctx.naam(s.chauffeur!)} moet de bus in en pakt een kaart voor de lengte`)
}

/** Legt de rij neer zodra de lengte bekend is. */
function bouwBusRij(s: BussenState, ctx: SpelContext, lengteKaart: Kaart) {
  s.busLengteKaart = lengteKaart
  s.busLengte = lengteKaart.waarde
  s.checkpointIndex = s.busLengte >= BUS_CHECKPOINT_VANAF ? Math.floor(s.busLengte / 2) : 0
  s.checkpointGehaald = false

  // De hele rij ligt er meteen: één kaart per plek. Daar ga je straks
  // overheen stapelen, en het is dus niet één kaart die steeds opschuift.
  s.busStapels = []
  for (let i = 0; i < s.busLengte; i++) s.busStapels.push([trek(s.stapel, ctx.rng)])

  ctx.log(
    `${kaartKort(lengteKaart)} — een bus van ${s.busLengte} kaarten` +
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

    // Elke boomkaart een andere waarde. Ligt er al een 9, dan wordt er
    // doorgetrokken tot er iets anders komt — zo dekt de boom bijna alle
    // waarden en kan er veel vaker iemand opleggen.
    const boomKaarten: Kaart[] = []
    const gebruikteWaarden: number[] = []
    for (let i = 0; i < boom.length; i++) {
      const kaart = trekUniek(stapel, ctx.rng, gebruikteWaarden)
      boomKaarten.push(kaart)
      gebruikteWaarden.push(kaart.waarde)
    }

    const handen: Record<string, Kaart[]> = {}
    const handGrootte: Record<string, number> = {}
    for (const p of ctx.spelers) {
      handen[p.uid] = []
      handGrootte[p.uid] = 0
    }

    return {
      fase: 'vragen',
      stapel,
      _geheim: { handen, boomKaarten, spsKeuzes: {} },
      sps: null,
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
      busSubfase: 'trekken',
      busKeuzes: [],
      busGekozen: null,
      busTrekOp: 0,
      busWorp: null,
      busWorpOp: 0,
      busOpen: false,
      busStapels: [],
      busPositie: 0,
      checkpointIndex: 0,
      checkpointGehaald: false,
      busPoging: 1,
      busLaatste: null,
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
      if (!verdeel(ctx, actie, volgorde, 'zebra/regenboog goed')) return
      s.bonus = null
      volgendeVrager(s, ctx, volgorde, actie.uid)
      return
    }

    /* ── Fase 2: de boom ────────────────────────────────────── */

    if (s.fase === 'boom') {
      const plek = s.boom[s.boomIndex]
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
        const gelukt = verdeel(
          ctx,
          actie,
          volgorde,
          `boom rij ${plek.rij}${plek.horizontaal ? ' (dubbel)' : ''}`,
        )
        if (!gelukt) return

        s.uitdeelIndex++
        if (s.uitdeelIndex >= s.uitdeelVolgorde.length) volgendePlek(s, ctx)
        return
      }
    }

    /* ── Tussenstap: steen, papier, schaar ──────────────────── */

    if (s.fase === 'sps' && s.sps) {
      const sps = s.sps

      if (sps.uitslag) {
        if (actie.type === 'sps-verder') naSps(s, ctx)
        return
      }

      if (actie.type === 'sps-kies') {
        if (!sps.kandidaten.includes(actie.uid)) return
        const gebaar: Gebaar = actie.payload?.gebaar
        if (!GEBAREN.includes(gebaar)) return

        s._geheim.spsKeuzes[actie.uid] = gebaar
        if (!sps.gekozen.includes(actie.uid)) sps.gekozen.push(actie.uid)

        if (sps.kandidaten.every((u) => sps.gekozen.includes(u))) beslisSps(s, ctx)
        return
      }

      if (actie.type === 'sps-sluit') {
        beslisSps(s, ctx)
        return
      }
      return
    }

    /* ── Fase 3: de bus ─────────────────────────────────────── */

    if (s.fase === 'bus') {
      if (actie.uid !== s.chauffeur) return

      // Een potje dat begon vóór de nieuwe bus mist velden. Zonder dit zou zo'n
      // potje op een leeg scherm blijven staan.
      if (
        !s.busSubfase ||
        !s.busKeuzes?.length ||
        (s.busSubfase === 'rijden' && (!s.busStapels || s.busStapels.length !== s.busLengte))
      ) {
        startBus(s, ctx)
      }

      // Blind een kaart pakken; die bepaalt hoe lang de bus wordt.
      if (s.busSubfase === 'trekken') {
        if (actie.type !== 'trek') return
        // Eerst op type controleren en dan pas op waarde: Number(null) is 0,
        // dus zonder die eerste stap zou een lege keuze stilletjes de eerste
        // kaart pakken.
        const i = actie.payload?.index
        if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= s.busKeuzes.length) {
          return
        }

        const gepakt = s.busKeuzes[i]
        s.busGekozen = i
        s.busTrekOp = ctx.nu
        bouwBusRij(s, ctx, gepakt)

        // De kaarten die je liet liggen gaan terug, zodat het deck klopt.
        s.busKeuzes.forEach((k, j) => {
          if (j !== i) leggAf(s.stapel, k)
        })

        s.busSubfase = 'gooien'
        return
      }

      // De kaart de lucht in: landt hij open, dan zie je de hele rij liggen.
      if (s.busSubfase === 'gooien') {
        if (actie.type !== 'gooi') return
        const worp = trek(s.stapel, ctx.rng)
        s.busWorp = worp
        s.busWorpOp = ctx.nu
        s.busOpen = ctx.rng() < 0.5
        s.busSubfase = 'rijden'
        leggAf(s.stapel, worp)
        ctx.log(
          `${ctx.naam(s.chauffeur)} gooit ${kaartKort(worp)} — de rij ligt ${s.busOpen ? 'open' : 'dicht'}`,
        )
        return
      }

      if (actie.type !== 'hoger' && actie.type !== 'lager') return

      const plek = s.busPositie
      const onder = bovenop(s, plek)
      if (!onder) return

      const nieuwe = trekAnders(s.stapel, ctx.rng, onder.waarde)
      const goed = (actie.type === 'hoger') === (nieuwe.waarde > onder.waarde)

      // De kaart gaat op het stapeltje waar je nu staat, goed of fout. Zit je
      // ernaast, dan ligt hij daar dus bovenop en is hij bij je volgende
      // poging de kaart waar je vanaf gaat.
      s.busStapels[plek].push(nieuwe)
      s.busLaatste = {
        kaart: nieuwe,
        vorige: onder,
        goed,
        plek,
        nr: (s.busLaatste?.nr ?? 0) + 1,
      }

      if (goed) {
        s.busPositie++

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
      ctx.drink(s.chauffeur, plek - herstart + 1, `strandde op kaart ${plek + 1}`)

      s.busPositie = herstart
      s.busPoging++
      return
    }
  },

  isKlaar: (s) => s.fase === 'klaar',

  /**
   * Alleen in de bus wachten: daar moet je de kaart zien vallen voordat je
   * gaat drinken. In de boom moet de melding juist meteen komen, anders ligt
   * de volgende kaart er al voordat je weet dat je aan de beurt bent.
   */
  drinkVertraging: (s) => (s.fase === 'bus' ? BUS_LEG_MS + 420 : 0),

  View({ state: s, ctx }) {
    if (s.fase === 'vragen') return <Vragen s={s} ctx={ctx} />
    if (s.fase === 'boom') return <Boom s={s} ctx={ctx} />
    if (s.fase === 'sps') return <Sps s={s} ctx={ctx} />
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
          <Verdeler
            totaal={ctx.slokAantal(VRAAG_INZET[3])}
            ctx={ctx}
            titel="Goed geraden — deel uit"
            bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
          />
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
            <Verdeler
              // Nieuwe sleutel per beurt, zodat het verdeelscherm leeg begint
              // als dezelfde speler twee kaarten achter elkaar legde.
              key={`${s.boomIndex}-${s.uitdeelIndex}`}
              totaal={ctx.slokAantal(inzet)}
              ctx={ctx}
              titel={`Rij ${plek.rij}${plek.horizontaal ? ' · dubbel' : ''} — deel uit`}
              bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
            />
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


/* ── Steen, papier, schaar ──────────────────────────────────── */

function Sps({ s, ctx }: { s: BussenState; ctx: KijkContext }) {
  const sps = s.sps!
  const uitslag = sps.uitslag
  const doeMee = sps.kandidaten.includes(ctx.ik)
  const ikGekozen = sps.gekozen.includes(ctx.ik)

  useHostKlok(ctx, !uitslag, s.klok?.eind ?? 0, 'sps-sluit')
  useHostKlok(ctx, !!uitslag, s.klok?.eind ?? 0, 'sps-verder')

  return (
    <>
      <div style={{ textAlign: 'center' }}>
        <div className="kop-klein">Gelijkspel — wie moet de bus in?</div>
        <h1>Steen, papier, schaar</h1>
        {sps.ronde > 1 && <div className="klein zacht">ronde {sps.ronde}</div>}
      </div>

      {uitslag ? (
        <>
          <div className="midden" style={{ gap: 10, alignItems: 'stretch' }}>
            {sps.kandidaten.map((uid) => {
              const veilig = uitslag.veilig.includes(uid)
              return (
                <div
                  key={uid}
                  className="kaartje balk"
                  style={{
                    borderColor: uitslag.gelijkspel
                      ? undefined
                      : veilig
                        ? 'var(--groen)'
                        : 'var(--rood)',
                    background: uitslag.gelijkspel
                      ? undefined
                      : veilig
                        ? 'var(--groen-donker)'
                        : 'var(--rood-donker)',
                  }}
                >
                  <span style={{ fontSize: 34 }}>{GEBAAR_EMOJI[uitslag.keuzes[uid]]}</span>
                  <strong>{ctx.naam(uid)}</strong>
                  <span className="klein">
                    {uitslag.gelijkspel ? '' : veilig ? 'vrij' : 'blijft'}
                  </span>
                </div>
              )
            })}
          </div>
          <Kaartje style={{ textAlign: 'center' }}>
            <h2>{uitslag.gelijkspel ? 'Gelijkspel — nog een keer' : 'Volgende ronde…'}</h2>
          </Kaartje>
        </>
      ) : (
        <>
          <div className="midden" style={{ gap: 12 }}>
            <div className="reusachtig" style={{ fontSize: 'clamp(36px,12vw,64px)' }}>
              {klokTekst(s.klok, ctx.nu)}
            </div>
            <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />
            <div className="klein zacht">
              {sps.gekozen.length} van {sps.kandidaten.length} gekozen
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {sps.kandidaten.map((uid) => (
                <span
                  key={uid}
                  className="kaartje"
                  style={{
                    padding: '6px 12px',
                    opacity: sps.gekozen.includes(uid) ? 1 : 0.4,
                    borderColor: sps.gekozen.includes(uid) ? 'var(--goud)' : undefined,
                  }}
                >
                  {ctx.speler(uid)?.emoji} {ctx.naam(uid)}
                </span>
              ))}
            </div>
          </div>

          <div className="onderaan">
            {doeMee ? (
              ikGekozen ? (
                <Kaartje style={{ textAlign: 'center' }}>
                  <h2 className="zacht">🤫 Je keuze staat vast</h2>
                </Kaartje>
              ) : (
                <div className="rij">
                  {GEBAREN.map((g) => (
                    <GroteKnop
                      key={g}
                      enorm
                      bijTik={() => ctx.stuur('sps-kies', { gebaar: g })}
                    >
                      {GEBAAR_EMOJI[g]}
                    </GroteKnop>
                  ))}
                </div>
              )
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">Jij bent veilig. Kijken maar.</span>
              </Kaartje>
            )}
          </div>
        </>
      )}
    </>
  )
}

/* ── Fase 3 ─────────────────────────────────────────────────── */

function Bus({ s, ctx }: { s: BussenState; ctx: KijkContext }) {
  const ikRij = ctx.ik === s.chauffeur
  const chauffeur = ctx.speler(s.chauffeur ?? '')

  // Eerst de lengtekaart pakken en omdraaien.
  const sindsTrek = s.busTrekOp > 0 ? ctx.nu - s.busTrekOp : Infinity
  if (s.busSubfase === 'trekken' || sindsTrek < TREK_TOON_MS) {
    return <BusTrek s={s} ctx={ctx} sindsTrek={sindsTrek} />
  }

  // De worp duurt even, en zolang hij duurt is er niets anders te zien. Dat
  // moment is de helft van de lol: je weet nog niet of je rij open of dicht
  // komt te liggen.
  const sindsWorp = s.busWorpOp > 0 ? ctx.nu - s.busWorpOp : Infinity
  if (s.busSubfase === 'gooien' || sindsWorp < WORP_TOON_MS) {
    return <BusWorp s={s} ctx={ctx} sindsWorp={sindsWorp} />
  }

  const herstart = s.checkpointGehaald ? s.checkpointIndex : 0
  const straf = s.busPositie - herstart + 1

  return (
    <>
      <div style={{ textAlign: 'center' }}>
        <div className="kop-klein">
          De bus · {s.busLengte} kaarten · {s.busOpen ? 'open' : 'dicht'} · poging {s.busPoging}
        </div>
        <h2>
          🚌 {chauffeur?.emoji} {chauffeur?.naam}
        </h2>
      </div>

      <BusRij s={s} />

      <div className="midden" style={{ gap: 10 }}>
        <div className="kop-klein">
          Kaart {s.busPositie + 1} van {s.busLengte} — hoger of lager dan
        </div>
        <BusLeg s={s} />
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
            Zit je ernaast, dan blijft die kaart hier bovenop liggen.
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

/**
 * Blind een kaart pakken; die bepaalt hoe lang de bus wordt.
 *
 * Ze liggen allemaal dicht, dus je kiest écht blind. De waarde die eronder
 * zit is meteen het aantal kaarten: pak je een 10, dan wordt het een bus van
 * tien. Alle vijf liggen ze tussen de 6 en de aas, dus hoe je ook kiest, het
 * wordt nooit korter dan zes.
 */
function BusTrek({
  s,
  ctx,
  sindsTrek,
}: {
  s: BussenState
  ctx: KijkContext
  sindsTrek: number
}) {
  const ikRij = ctx.ik === s.chauffeur
  const chauffeur = ctx.speler(s.chauffeur ?? '')
  const gepakt = s.busGekozen !== null
  const om = gepakt && sindsTrek >= TREK_MS

  return (
    <>
      <div style={{ textAlign: 'center' }}>
        <div className="kop-klein">De bus</div>
        <h2>
          🚌 {chauffeur?.emoji} {chauffeur?.naam}
        </h2>
      </div>

      <div className="midden" style={{ gap: 14 }}>
        <div className="kop-klein">
          {gepakt ? 'Zoveel kaarten wordt het' : 'Pak een kaart — die bepaalt de lengte'}
        </div>

        <div className="trek-rij">
          {(s.busKeuzes ?? []).map((kaart, i) => {
            const dezeGepakt = s.busGekozen === i
            const weg = gepakt && !dezeGepakt
            return (
              <button
                key={i}
                className={`trek-kaart${dezeGepakt ? ' gepakt' : ''}${weg ? ' weg' : ''}${
                  dezeGepakt && om ? ' om' : ''
                }`}
                disabled={!ikRij || gepakt}
                onClick={() => ctx.stuur('trek', { index: i })}
                aria-label={`Kaart ${i + 1}`}
              >
                <span className="trek-kant trek-voor">
                  <Speelkaart maat="klein" dicht />
                </span>
                <span className="trek-kant trek-achter">
                  <Speelkaart kaart={kaart} maat="klein" />
                </span>
              </button>
            )
          })}
        </div>

        {om && s.busLengteKaart && (
          <div style={{ textAlign: 'center' }}>
            <div className="lint">{s.busLengte} KAARTEN</div>
            {s.checkpointIndex > 0 && (
              <div className="klein zacht" style={{ marginTop: 6 }}>
                Lang genoeg voor een checkpoint op kaart {s.checkpointIndex + 1}.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="onderaan">
        <Kaartje style={{ textAlign: 'center' }}>
          <span className="zacht">
            {gepakt
              ? om
                ? 'Zo lang wordt de rit…'
                : 'Omdraaien…'
              : ikRij
                ? 'Kies er een. Je ziet ze niet.'
                : `${chauffeur?.naam} pakt een kaart…`}
          </span>
        </Kaartje>
      </div>
    </>
  )
}

/**
 * De kaart de lucht in.
 *
 * Landt hij op zijn voorkant, dan ligt de hele rij open en zie je waar je aan
 * begint. Landt hij op zijn rug, dan ligt alles dicht en ken je alleen de
 * kaart waar je op dat moment voor staat. Dat is het verschil tussen een rit
 * die je kunt uitrekenen en een die je maar moet ondergaan.
 */
function BusWorp({
  s,
  ctx,
  sindsWorp,
}: {
  s: BussenState
  ctx: KijkContext
  sindsWorp: number
}) {
  const ikRij = ctx.ik === s.chauffeur
  const chauffeur = ctx.speler(s.chauffeur ?? '')
  const vliegt = s.busSubfase === 'rijden'
  const geland = vliegt && sindsWorp >= WORP_MS

  return (
    <>
      <div style={{ textAlign: 'center' }}>
        <div className="kop-klein">De bus · {s.busLengte} kaarten</div>
        <h2>
          🚌 {chauffeur?.emoji} {chauffeur?.naam}
        </h2>
      </div>

      <div className="midden" style={{ gap: 14 }}>
        {vliegt ? (
          <>
            {/* De kaart tolt door de lucht en landt op zijn voorkant of op
                zijn rug. Welke van de twee het wordt staat allang vast; de
                animatie draait alleen zoveel halve slagen dat hij op de
                goede kant uitkomt. */}
            <div className={`worp ${s.busOpen ? 'open' : 'dicht'}`}>
              <div className="worp-kaart">
                <div className="worp-kant worp-voor">
                  <Speelkaart kaart={s.busWorp} maat="groot" />
                </div>
                <div className="worp-kant worp-achter">
                  <Speelkaart maat="groot" dicht />
                </div>
              </div>
            </div>

            <div className={`worp-uitslag${geland ? ' er' : ''}`}>
              <div className="lint">{s.busOpen ? 'OPEN' : 'DICHT'}</div>
              <div className="klein zacht" style={{ marginTop: 6, textAlign: 'center' }}>
                {s.busOpen
                  ? 'De hele rij ligt open — je ziet wat je te wachten staat.'
                  : 'Alles dicht — je ziet alleen de kaart waar je voor staat.'}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 56 }}>🃏</div>
            <Kaartje style={{ textAlign: 'center', maxWidth: 320 }}>
              Gooi een kaart de lucht in.
              <br />
              <strong>Voorkant boven</strong> — de hele rij ligt open en je ziet alles.
              <br />
              <strong>Op zijn rug</strong> — alles dicht, je ziet alleen waar je staat.
            </Kaartje>
          </>
        )}
      </div>

      <div className="onderaan">
        {vliegt ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">{geland ? 'Daar gaan we…' : 'Hij tolt…'}</span>
          </Kaartje>
        ) : ikRij ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('gooi')}>
            GOOI DE KAART
          </GroteKnop>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">{chauffeur?.naam} gooit…</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

/**
 * De kaart valt van de stapel op het stapeltje waar je staat.
 *
 * Hiervoor sprong het scherm in één klap naar de nieuwe kaart en stond je al
 * te drinken voordat je gezien had wát je had omgedraaid. Nu zie je eerst de
 * kaart vallen; het slokkenscherm wacht daarop (zie BUS_LEG_MS).
 *
 * Zolang hij valt tonen we eronder de kaart waar hij overheen gaat, want het
 * stapeltje wijst dan al naar de nieuwe.
 */
function BusLeg({ s }: { s: BussenState }) {
  const laatste = s.busLaatste
  const [klaarNr, zetKlaarNr] = useState(() => laatste?.nr ?? 0)

  useEffect(() => {
    if (!laatste || laatste.nr <= klaarNr) return
    const id = setTimeout(() => zetKlaarNr(laatste.nr), BUS_LEG_MS)
    return () => clearTimeout(id)
  }, [laatste?.nr, klaarNr])

  // De kaart valt alleen op de plek waar hij hoort; sta je alweer een
  // stapeltje verder, dan zie je hier gewoon de nieuwe kaart.
  const valt = !!laatste && laatste.nr > klaarNr && laatste.plek === s.busPositie
  const onder = valt ? laatste!.vorige : bovenop(s, s.busPositie)

  return (
    <div className="bus-tafel">
      <Speelkaart kaart={onder} maat="groot" />
      {valt && (
        <div key={laatste!.nr} className={`bus-leg ${laatste!.goed ? 'goed' : 'mis'}`}>
          <Speelkaart kaart={laatste!.kaart} maat="groot" />
        </div>
      )}
    </div>
  )
}

/**
 * De hele rij op tafel, met per plek het bovenste kaartje.
 *
 * Ligt de rij dicht, dan zie je alleen tot waar je gekomen bent — de rest
 * blijft op zijn rug liggen.
 */
function BusRij({ s }: { s: BussenState }) {
  const lengte = s.busLengte

  return (
    <div className="bus-rij">
      {Array.from({ length: lengte }).map((_, i) => {
        const stapel = s.busStapels?.[i] ?? []
        const kaart = stapel.length ? stapel[stapel.length - 1] : null
        const gehaald = i < s.busPositie
        const nu = i === s.busPositie
        const zichtbaar = s.busOpen || i <= s.busPositie
        const isCheckpoint = s.checkpointIndex > 0 && i === s.checkpointIndex

        return (
          <div
            key={i}
            className={`bus-plek${nu ? ' nu' : ''}${gehaald ? ' gehaald' : ''}`}
            title={isCheckpoint ? 'checkpoint' : undefined}
          >
            <Speelkaart kaart={kaart} maat="klein" dicht={!zichtbaar} />
            {stapel.length > 1 && <span className="bus-hoogte">{stapel.length}</span>}
            {isCheckpoint && <span className="bus-vlag">⚑</span>}
          </div>
        )
      })}
    </div>
  )
}

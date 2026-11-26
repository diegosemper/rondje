import { useEffect, useRef } from 'react'
import {
  ref,
  onChildAdded,
  get,
  update,
  remove,
  push,
  increment,
} from 'firebase/database'
import { db, nu } from './firebase'
import { pad, padRuw, stuurActie } from './kamer'
import { geefSpel, kiesWillekeurig } from '../engine/registry'
import { draaiVolgorde } from '../engine/beurten'
import { stripGeheim, kopie } from '../engine/geheim'
import { maakRng, nieuweSeed } from '../engine/random'
import { vers, bijgewerktGeheugen } from '../engine/vers'
import {
  CYCLUS,
  INZETTEN,
  MAX_SPELERS as POWERUP_MAX,
  geefPowerup,
  heeftZinZonderUitdelen,
  legeStand,
  omkeringUitdelen,
  pasDrinkAan,
  pasUitdelenAan,
  trekKaarten,
  werkzaam,
  type PowerupStand,
} from '../engine/powerups'
import { berekenSlokken, slokTekst, werkwoord } from '../engine/slokken'
import { meldFout } from '../ui/Fout'
import type { Actie, Kamer, SpelContext, Speler } from '../engine/types'

/* ─────────────────────────────────────────────────────────────
   De host-telefoon is de spelleider.

   Gasten sturen alleen "ik druk op deze knop". Deze lus leest die acties,
   draait de spellogica, en schrijft de nieuwe stand terug. Zo kunnen twee
   telefoons het nooit oneens worden over wie er aan de beurt is.
   ───────────────────────────────────────────────────────────── */

interface Effecten {
  gedronken: Record<string, number>
  uitgedeeld: Record<string, number>
  prive: Record<string, any | null>
  priveWisAlles: boolean
  logs: string[]
  klaar: boolean
  /** per lijst het bijgewerkte geheugen van wat er al geweest is */
  gezien: Record<string, string[]>
  /** de powerupstand, als die tijdens deze zet veranderd is */
  powerups: PowerupStand | null
}

function leegEffect(): Effecten {
  return {
    gedronken: {},
    uitgedeeld: {},
    prive: {},
    priveWisAlles: false,
    logs: [],
    klaar: false,
    gezien: {},
    powerups: null,
  }
}

/**
 * Wat deze host al heeft uitgedeeld, nog voordat de database het terugmeldt.
 *
 * Wegschrijven gaat via het net, en de kamer die deze lus leest komt uit de
 * luisteraar. Tussen twee zetten door kan die dus nog de oude stand hebben --
 * en dan trekt de ronde erna dezelfde categorie als de ronde ervoor. Precies
 * de herhaling waar dit hele geheugen voor bedoeld is.
 *
 * De host is de enige die hieraan schrijft, dus zijn eigen aantekening is
 * altijd minstens zo nieuw als wat er in de kamer staat. Staat er niets in --
 * host net opgestart, of een andere telefoon die het overneemt -- dan is de
 * database alsnog de waarheid.
 *
 * Op kamercode, zodat een volgende lobby op dezelfde telefoon schoon begint.
 */
const geheugenBuffer = new Map<string, Record<string, string[]>>()

/**
 * Mogen er in deze kamer überhaupt powerups zijn?
 *
 * Boven de vier spelers staan ze uit. Met meer mensen zitten er te veel kaarten
 * tegelijk op tafel en is niet meer te volgen waarom iemand wat drinkt.
 */
export function powerupsMogelijk(kamer: Kamer): boolean {
  if (kamer.instelling.powerups === false) return false
  return Object.keys(kamer.spelers).length <= POWERUP_MAX
}

/** Doen ze op dit moment ook echt mee -- is er al getrokken? */
export function powerupsAan(kamer: Kamer): boolean {
  return powerupsMogelijk(kamer) && kamer.powerups.ronde > 0
}

/**
 * Is er iemand die nog een sterke powerup kan inzetten?
 *
 * Zo niet, dan hoeft er geen inzetronde te komen en gaat het spel meteen van
 * start. Een scherm met "jij hoeft niets te kiezen" voor iedereen is alleen
 * een extra tik.
 */
export function iemandKanInzetten(kamer: Kamer): boolean {
  if (!powerupsAan(kamer)) return false
  return kamer.volgorde.some((uid) => {
    if (!kamer.spelers[uid]) return false
    const p = geefPowerup(kamer.powerups.kaarten[uid] ?? '')
    return !!p?.sterk && (kamer.powerups.inzetten[uid] ?? 0) > 0
  })
}

/** Bouwt het gereedschap dat init() en reduce() van een spel mogen gebruiken. */
function maakContext(
  kamer: Kamer,
  seed: number,
  eff: Effecten,
  spelSeed: number,
): SpelContext {
  const zwaarte = kamer.instelling.zwaarte
  const spelers: Speler[] = draaiVolgorde(kamer.volgorde, spelSeed)
    .map((uid) => kamer.spelers[uid])
    .filter(Boolean)
  const rng = maakRng(seed)
  const naam = (uid: string) => kamer.spelers[uid]?.naam ?? '?'

  /*
   * De powerups grijpen hier in, op één plek, en daarom werken ze in elk spel.
   * Een spel meldt "deze speler drinkt drie", en wat er daarna werkelijk
   * gebeurt kan heel iets anders zijn: bij iemand anders, dubbel, of nergens.
   *
   * De stand gaat in een kopie, want Sneeuwbal telt uitdelingen en de teruggave
   * van een inzet moet weten of er dit spel iets uitgedeeld is. Verandert er
   * iets, dan gaat die kopie mee naar de database.
   */
  const pAan = powerupsAan(kamer)
  const pStand: PowerupStand = pAan
    ? { ...kamer.powerups, uitdelingen: { ...kamer.powerups.uitdelingen } }
    : legeStand()
  const beurtVolgorde = spelers.map((p) => p.uid)

  /** Eén regel wegschrijven, zonder er nog powerups op los te laten. */
  const rauwDrink = (uid: string, aantal: number, reden?: string) => {
    if (aantal <= 0) return
    eff.gedronken[uid] = (eff.gedronken[uid] ?? 0) + aantal
    eff.logs.push(
      `${naam(uid)} ${werkwoord(zwaarte)} ${slokTekst(aantal, zwaarte)}${reden ? ` — ${reden}` : ''}`,
    )
  }

  const drink = (uid: string, ruw: number, reden?: string) => {
    const aantal = berekenSlokken(ruw, zwaarte)
    if (aantal <= 0) return

    if (!pAan) {
      rauwDrink(uid, aantal, reden)
      return
    }

    const regels = pasDrinkAan(pStand, beurtVolgorde, uid, aantal)
    for (const r of regels) {
      const waarom =
        r.uid === uid ? reden : `${reden ?? 'powerup'} · via ${naam(uid)}`
      rauwDrink(r.uid, r.aantal, waarom)
    }
    // Omkering maakt van jouw drinken een uitdeling aan de rest.
    const omgekeerd = omkeringUitdelen(pStand, beurtVolgorde, uid, aantal)
    for (const r of omgekeerd) {
      rauwDrink(r.uid, r.aantal, `omkering van ${naam(uid)}`)
    }

    /*
     * Viel alles weg? Dan moet er toch iets in het logboek komen te staan.
     * Zonder regel gebeurt er op het scherm helemaal niets en snapt niemand
     * waarom die slokken niet aankwamen.
     */
    if (regels.length === 0 && omgekeerd.length === 0) {
      const kaart = werkzaam(pStand, uid)
      eff.logs.push(
        `${naam(uid)} ontloopt ${slokTekst(aantal, zwaarte)}${kaart ? ` — ${kaart.naam}` : ''}`,
      )
    }
    eff.powerups = pStand
  }

  const geef = (van: string, naar: string, aantal: number, reden?: string) => {
    if (aantal <= 0) return

    if (!pAan) {
      eff.uitgedeeld[van] = (eff.uitgedeeld[van] ?? 0) + aantal
      eff.gedronken[naar] = (eff.gedronken[naar] ?? 0) + aantal
      eff.logs.push(
        `${naam(van)} geeft ${naam(naar)} ${slokTekst(aantal, zwaarte)}${reden ? ` — ${reden}` : ''}`,
      )
      return
    }

    pStand.uitgedeeld = true
    const regels = pasUitdelenAan(pStand, beurtVolgorde, van, naar, aantal)
    /*
     * Op het scorebord blijft staan wat hij uitdeelde. Wie het opdrinkt kan door
     * een powerup iemand anders zijn, maar uitgedeeld heeft hij het wel.
     */
    const totaal = regels.reduce((a, r) => a + r.aantal, 0)
    if (totaal > 0) eff.uitgedeeld[van] = (eff.uitgedeeld[van] ?? 0) + totaal

    for (const r of regels) {
      eff.gedronken[r.uid] = (eff.gedronken[r.uid] ?? 0) + r.aantal
      eff.logs.push(
        `${naam(van)} geeft ${naam(r.uid)} ${slokTekst(r.aantal, zwaarte)}${reden ? ` — ${reden}` : ''}`,
      )
    }

    // Ook hier: een uitdeling die nergens aankomt hoort wel te zien te zijn.
    if (regels.length === 0) {
      const kaart = werkzaam(pStand, van)
      eff.logs.push(
        `${naam(van)} deelt niets uit${kaart ? ` — ${kaart.naam}` : ''}`,
      )
    }
    eff.powerups = pStand
  }

  return {
    spelers,
    zwaarte,
    rng,
    nu: nu(),

    /*
     * Firebase weigert sleutels met een punt, een slash of een haakje erin, en
     * een slash zou van `slechtantwoord/zinnen` bovendien twee lagen maken in
     * plaats van één sleutel. Alles wat niet mag wordt daarom een streepje.
     */
    vers(sleutel, lijst, aantal, tekstVan = (x) => String(x)) {
      const naam = sleutel.replace(/[^a-zA-Z0-9_-]/g, '-')
      const buffer = geheugenBuffer.get(kamer.meta.code) ?? {}
      const alGehad = eff.gezien[naam] ?? buffer[naam] ?? kamer.gezien[naam] ?? []
      const keuze = vers(rng, lijst, aantal, alGehad, tekstVan)

      const bijgewerkt = bijgewerktGeheugen(alGehad, keuze)
      eff.gezien[naam] = bijgewerkt
      buffer[naam] = bijgewerkt
      geheugenBuffer.set(kamer.meta.code, buffer)
      return keuze.keuze
    },

    drink,

    deelUit(van, naar, ruw, reden) {
      geef(van, naar, berekenSlokken(ruw, zwaarte), reden)
    },

    deelUitPrecies(van, naar, aantal, reden) {
      geef(van, naar, Math.max(0, Math.round(aantal)), reden)
    },

    iedereenDrinkt(ruw, reden, behalve = []) {
      const aantal = berekenSlokken(ruw, zwaarte)
      if (aantal <= 0) return

      eff.logs.push(
        `Iedereen ${werkwoord(zwaarte)} ${slokTekst(aantal, zwaarte)}${reden ? ` — ${reden}` : ''}`,
      )

      if (!pAan) {
        for (const s of spelers) {
          if (behalve.includes(s.uid)) continue
          eff.gedronken[s.uid] = (eff.gedronken[s.uid] ?? 0) + aantal
        }
        return
      }

      /*
       * Per speler door de laag, zodat Schild en Vlucht hier ook gelden -- en
       * zodat Omkering zijn deel alsnog rondstuurt. Zonder dat laatste zouden
       * die slokken stilletjes verdwijnen: pasDrinkAan levert bij Omkering
       * niets op, want het wordt een uitdeling.
       */
      for (const s of spelers) {
        if (behalve.includes(s.uid)) continue
        for (const r of pasDrinkAan(pStand, beurtVolgorde, s.uid, aantal)) {
          eff.gedronken[r.uid] = (eff.gedronken[r.uid] ?? 0) + r.aantal
        }
        for (const r of omkeringUitdelen(pStand, beurtVolgorde, s.uid, aantal)) {
          eff.gedronken[r.uid] = (eff.gedronken[r.uid] ?? 0) + r.aantal
        }
      }
      eff.powerups = pStand
    },

    zetPrive(uid, data) {
      eff.prive[uid] = data
    },

    wisPrive(uid) {
      if (uid) eff.prive[uid] = null
      else eff.priveWisAlles = true
    },

    log(tekst) {
      eff.logs.push(tekst)
    },

    klaar() {
      eff.klaar = true
    },

    speler: (uid) => kamer.spelers[uid],
    naam,
  }
}

/** Schrijft alles wat een zet opleverde in één klap weg. */
async function schrijfWeg(
  kamer: Kamer,
  state: any,
  eff: Effecten,
  extra: Record<string, any> = {},
): Promise<void> {
  const code = kamer.meta.code

  // Een "wis alles" en een "zet deze" in dezelfde update botsen bij Firebase,
  // dus dat doen we los en eerst.
  if (eff.priveWisAlles) {
    await remove(ref(db(), padRuw(code, 'prive')))
  }

  const u: Record<string, any> = { ...extra }

  if (state !== undefined) {
    u[pad(code, 'spel/stateJson')] = JSON.stringify(stripGeheim(state))
    u[padRuw(code, 'hostState')] = JSON.stringify(state)
  }
  if (eff.klaar) u[pad(code, 'spel/klaar')] = true

  // increment() laat de server optellen — zo raakt de stand niet in de war
  // als er twee acties vlak achter elkaar binnenkomen.
  for (const [uid, n] of Object.entries(eff.gedronken)) {
    u[pad(code, 'score', uid, 'gedronken')] = increment(n)
  }
  for (const [uid, n] of Object.entries(eff.uitgedeeld)) {
    u[pad(code, 'score', uid, 'uitgedeeld')] = increment(n)
  }

  for (const [uid, data] of Object.entries(eff.prive)) {
    u[padRuw(code, 'prive', uid)] = data === null ? null : JSON.stringify(data)
  }

  // Wat deze lobby gehad heeft, zodat het volgende potje andere zinnen pakt.
  for (const [sleutel, merken] of Object.entries(eff.gezien)) {
    u[pad(code, 'gezien', sleutel)] = merken.join(',')
  }

  // De powerupstand, als er tijdens deze zet iets aan veranderd is.
  if (eff.powerups) {
    u[pad(code, 'powerups/standJson')] = JSON.stringify(eff.powerups)
  }

  // Vallen er slokken? Dan gaat het spel op pauze tot iedereen die moet
  // drinken heeft bevestigd. Loopt er al een pauze, dan tellen we erbij op.
  const drinkers = Object.keys(eff.gedronken)
  if (drinkers.length > 0 && kamer.meta.fase === 'spel') {
    const lopend = kamer.drinkgate
    const wachtOp: Record<string, number> = { ...(lopend?.wachtOp ?? {}) }
    for (const [uid, n] of Object.entries(eff.gedronken)) {
      wachtOp[uid] = (wachtOp[uid] ?? 0) + n
    }
    u[pad(code, 'drinkgate')] = {
      // Altijd een nieuwe id, ook als we bij een lopende pauze optellen. De
      // host gebruikt de id om te onthouden dat hij al "iedereen klaar" heeft
      // gemeld; bij dezelfde id zou hij dat na een aanvulling niet nog eens doen.
      id: push(ref(db(), pad(code, 'log'))).key!,
      wachtOpJson: JSON.stringify(wachtOp),
      sinds: lopend?.sinds ?? nu(),
      // Wie al bevestigd had moet opnieuw: er zijn slokken bijgekomen.
      klaar: null,
    }
  }

  const t = nu()
  eff.logs.forEach((tekst, i) => {
    const sleutel = push(ref(db(), pad(code, 'log'))).key!
    u[pad(code, 'log', sleutel)] = { tekst, ts: t + i }
  })

  // Het logboek kort houden.
  const teveel = kamer.log.length + eff.logs.length - 40
  if (teveel > 0) {
    for (const oud of kamer.log.slice(0, teveel)) {
      u[pad(code, 'log', oud.id)] = null
    }
  }

  controleerPaden(u)
  await update(ref(db()), u)
}

/**
 * Firebase weigert een update die tegelijk een map beschrijft én iets binnen
 * die map. De foutmelding daarvan is cryptisch, dus vangen we het hier af met
 * een tekst waar je wat aan hebt. Kost niets en scheelt zoeken bij elk nieuw
 * spel dat we toevoegen.
 */
function controleerPaden(u: Record<string, any>): void {
  const paden = Object.keys(u)
  for (const a of paden) {
    for (const b of paden) {
      if (a !== b && b.startsWith(a + '/')) {
        throw new Error(
          `Kan niet tegelijk "${a}" en "${b}" schrijven — de een zit in de ander. ` +
            `Schrijf de losse velden van "${a}", of ruim "${a}" eerst apart op.`,
        )
      }
    }
  }
}

/**
 * Schuift elke aftelklok in een spelstand op met de tijd dat er gedronken is.
 *
 * Zonder dit zou de race in Bussen al afgelopen zijn tegen de tijd dat
 * iedereen zijn slokken op heeft. Werkt op elk object dat eruitziet als een
 * Klok, waar het ook in de toestand zit — dus elk spel krijgt dit gratis.
 */
function schuifKlokken(waarde: any, ms: number): void {
  if (!waarde || typeof waarde !== 'object') return
  if (Array.isArray(waarde)) {
    for (const item of waarde) schuifKlokken(item, ms)
    return
  }
  if (typeof waarde.eind === 'number' && typeof waarde.duurMs === 'number') {
    waarde.eind += ms
    return
  }
  for (const kind of Object.values(waarde)) schuifKlokken(kind, ms)
}

/* ── Commando's die de host kan geven ───────────────────────── */

/** Zet een spel klaar en ga naar het uitlegscherm. */
export async function startSpel(kamer: Kamer, gameId: string): Promise<void> {
  const mod = geefSpel(gameId)
  if (!mod) throw new Error(`Onbekend spel: ${gameId}`)

  const code = kamer.meta.code
  const seed = nieuweSeed()
  const eff = leegEffect()
  // Hetzelfde startgetal voor het draaien als straks bij elke zet: init() en
  // reduce() moeten dezelfde kring zien, anders begint het spel bij de een en
  // gaat de beurt verder bij de ander.
  const ctx = maakContext(kamer, seed, eff, seed)
  const state = mod.init(ctx)

  // Eerst het oude spel helemaal weg. Dat moet los, want Firebase weigert een
  // update die tegelijk een map wist én iets binnen die map schrijft.
  await remove(ref(db(), padRuw(code, 'prive')))
  await remove(ref(db(), padRuw(code, 'acties')))
  await remove(ref(db(), pad(code, 'spel')))

  const geschiedenis = [...kamer.geschiedenis.filter((g) => g !== gameId), gameId]

  /*
   * De cyclus een spel verder, en de keuzes van de spelers vastleggen.
   *
   * De stand die hier binnenkomt heeft de losse keuzes er al bovenop (zie
   * leesPowerups in kamer.ts); hier worden ze echt vastgelegd. Wie ja zei
   * raakt zijn inzet kwijt, en daarna kunnen de losse sleutels weg.
   *
   * `actief` blijft dus juist staan: dat is net in de inzetronde gekozen,
   * vóórdat dit spel bekend was. Dat is het hele punt van blind inzetten.
   *
   * Wat per spel geteld wordt gaat op nul: de uitdelingen voor Sneeuwbal, en
   * of er dit spel iets uitgedeeld is -- dat laatste bepaalt of een inzet
   * teruggegeven wordt.
   */
  const pExtra: Record<string, unknown> = {}
  if (powerupsAan(kamer)) {
    const inzetten = { ...kamer.powerups.inzetten }
    for (const uid of kamer.powerups.actief) {
      inzetten[uid] = Math.max(0, (inzetten[uid] ?? 0) - 1)
    }

    const stand: PowerupStand = {
      ...kamer.powerups,
      over: Math.max(0, kamer.powerups.over - 1),
      inzetten,
      uitdelingen: {},
      uitgedeeld: false,
      wacht: null,
    }
    pExtra[pad(code, 'powerups/standJson')] = JSON.stringify(stand)
    pExtra[pad(code, 'powerups/keuze')] = null
  }

  // Om dezelfde reden schrijven we de velden van `spel` los, en niet het blok
  // in één keer: schrijfWeg zet er `spel/stateJson` bij.
  await schrijfWeg(kamer, state, eff, {
    [pad(code, 'spel/gameId')]: gameId,
    [pad(code, 'spel/ronde')]: 0,
    [pad(code, 'spel/seed')]: seed,
    [pad(code, 'spel/begonOp')]: nu(),
    [pad(code, 'spel/klaar')]: false,
    [pad(code, 'meta/fase')]: 'uitleg',
    [pad(code, 'skip')]: null,
    [pad(code, 'gereed')]: null,
    [pad(code, 'geschiedenis')]: geschiedenis.join(','),
    ...pExtra,
  })
}

/**
 * Een willekeurig spel starten.
 *
 * Staat hier en niet op het scherm, omdat het op twee plekken nodig is: de
 * dobbelknop in de spelkiezer, en de onthulling na de inzetronde.
 */
export async function startWillekeurig(kamer: Kamer): Promise<void> {
  const spelers = Object.keys(kamer.spelers).length
  const rng = maakRng(nieuweSeed())
  const keuze = kiesWillekeurig(rng, spelers, kamer.instelling.uit, kamer.geschiedenis)
  if (keuze) await startSpel(kamer, keuze.id)
}

/* ── Powerups: de cyclus ─────────────────────────────────────── */

/**
 * De stand wegschrijven, en de losse keuzes opruimen.
 *
 * Die twee horen bij elkaar: wat in de stand staat is vastgelegd, dus moeten de
 * losse keuzes weg -- anders zouden ze er bij het lezen nog een keer bovenop
 * komen.
 */
async function schrijfStand(code: string, stand: PowerupStand): Promise<void> {
  await update(ref(db(), pad(code, 'powerups')), {
    standJson: JSON.stringify(stand),
    keuze: null,
  })
}

/**
 * Een nieuwe trekronde uitdelen.
 *
 * Levert alleen de nieuwe stand op; het wegschrijven gebeurt bij de aanroeper.
 * Dat is nodig omdat dit op twee momenten gebeurt: bij de start vanuit de
 * lobby, en meteen bij het afsluiten van het laatste spel van een cyclus. In
 * dat tweede geval gaat het in dezelfde schrijfbeurt mee als de rest.
 */
function nieuweRonde(kamer: Kamer): PowerupStand {
  const spelers = kamer.volgorde.filter((u) => kamer.spelers[u])
  const rng = maakRng(nieuweSeed())
  const kaarten = trekKaarten(rng, spelers, kamer.powerups.kaarten)

  const inzetten: Record<string, number> = {}
  for (const uid of spelers) {
    const p = geefPowerup(kaarten[uid])
    if (p?.sterk) inzetten[uid] = INZETTEN
  }

  return {
    ...legeStand(),
    ronde: kamer.powerups.ronde + 1,
    over: CYCLUS,
    kaarten,
    inzetten,
  }
}

/**
 * Nieuwe kaarten, en iedereen krijgt ze te zien.
 *
 * De fase blijft daarna op 'powerups' staan, want wie een kaart heeft die om
 * een doelwit vraagt moet die eerst kiezen. Pas als iedereen klaar is gaat het
 * door naar de spelkiezer.
 */
export async function trekPowerups(kamer: Kamer): Promise<void> {
  const code = kamer.meta.code
  await schrijfStand(code, nieuweRonde(kamer))
  await update(ref(db(), pad(code, 'meta')), { fase: 'powerups' })
}

/**
 * Van de spelkiezer naar de inzetronde.
 *
 * `gameId` is het spel dat de host aanwees, of null als het dobbelsteentje
 * beslist. Bij null weet niemand waar hij op wedt -- dat is precies de
 * bedoeling van een sterke powerup.
 */
export async function naarInzet(kamer: Kamer, gameId: string | null): Promise<void> {
  const stand: PowerupStand = {
    ...kamer.powerups,
    actief: [],
    gereed: [],
    wacht: gameId,
  }
  await schrijfStand(kamer.meta.code, stand)
  await update(ref(db(), pad(kamer.meta.code, 'meta')), { fase: 'inzet' })
}

/** Iedereen heeft gekozen: het spel komt tevoorschijn en begint. */
export async function onthul(kamer: Kamer): Promise<void> {
  const gameId = kamer.powerups.wacht
  if (gameId) await startSpel(kamer, gameId)
  else await startWillekeurig(kamer)
}

/** Van het uitlegscherm naar het spel zelf. */
export async function beginSpel(code: string): Promise<void> {
  await update(ref(db(), pad(code, 'meta')), { fase: 'spel' })
}

/** Spel afgelopen of overgeslagen → terug naar de spelkiezer. */
export async function stopSpel(kamer: Kamer): Promise<void> {
  const code = kamer.meta.code
  await remove(ref(db(), padRuw(code, 'prive')))
  await remove(ref(db(), padRuw(code, 'acties')))
  await remove(ref(db(), padRuw(code, 'hostState')))

  const extra: Record<string, unknown> = {}
  let volgendeFase = 'kiezen'

  if (powerupsAan(kamer)) {
    /*
     * Een inzet teruggeven die niets kon doen. Je koos blind, en als het spel
     * niet eens uitdeelt kan Dubbel uitdelen niets -- dan is het zonde om je
     * inzet daaraan kwijt te zijn.
     */
    const inzetten = { ...kamer.powerups.inzetten }
    for (const uid of kamer.powerups.actief) {
      const id = kamer.powerups.kaarten[uid]
      if (!id) continue
      if (kamer.powerups.uitgedeeld) continue
      if (heeftZinZonderUitdelen(id)) continue
      inzetten[uid] = (inzetten[uid] ?? 0) + 1
    }

    // Inzetten en doelwitten van sterke kaarten gelden maar één spel.
    const doelwit: Record<string, string> = {}
    for (const [uid, doel] of Object.entries(kamer.powerups.doelwit)) {
      const p = geefPowerup(kamer.powerups.kaarten[uid] ?? '')
      if (p && !p.sterk) doelwit[uid] = doel
    }

    let stand: PowerupStand = {
      ...kamer.powerups,
      inzetten,
      doelwit,
      actief: [],
      gereed: [],
      uitdelingen: {},
      uitgedeeld: false,
      wacht: null,
    }

    /*
     * Cyclus voorbij? Meteen nieuwe kaarten erbij, in dezelfde schrijfbeurt.
     * Anders zou je even op het trekscherm staan met je oude kaart in beeld.
     */
    if (stand.over <= 0) {
      stand = nieuweRonde(kamer)
      volgendeFase = 'powerups'
    }

    extra[pad(code, 'powerups/standJson')] = JSON.stringify(stand)
    extra[pad(code, 'powerups/keuze')] = null
  }

  await update(ref(db()), {
    [pad(code, 'meta/fase')]: volgendeFase,
    [pad(code, 'spel')]: null,
    [pad(code, 'skip')]: null,
    [pad(code, 'gereed')]: null,
    ...extra,
  })
}

export async function naarFase(code: string, fase: string): Promise<void> {
  await update(ref(db(), pad(code, 'meta')), { fase })
}

/* ── De lus zelf ────────────────────────────────────────────── */

export function useHostLoop(kamer: Kamer | null, uid: string | null): void {
  const kamerRef = useRef<Kamer | null>(kamer)
  kamerRef.current = kamer

  const stateRef = useRef<any>(null)
  const wachtrij = useRef<Promise<void>>(Promise.resolve())

  const code = kamer?.meta.code ?? null
  const benHost = !!kamer && !!uid && kamer.meta.hostUid === uid
  const gameId = kamer?.spel?.gameId ?? null

  // De volledige toestand (inclusief geheimen) uit de database halen, zodat
  // de host een refresh of tabwissel overleeft.
  useEffect(() => {
    if (!benHost || !code) return
    let levend = true
    get(ref(db(), padRuw(code, 'hostState')))
      .then((snap) => {
        if (!levend) return
        const ruw = snap.val()
        stateRef.current = ruw ? JSON.parse(ruw) : null
      })
      .catch(() => {})
    return () => {
      levend = false
    }
  }, [benHost, code, gameId])

  // Acties van gasten verwerken, netjes één voor één.
  useEffect(() => {
    if (!benHost || !code) return

    const stop = onChildAdded(ref(db(), padRuw(code, 'acties')), (snap) => {
      wachtrij.current = wachtrij.current
        .then(() => verwerk(snap.key!, snap.val()))
        .catch(meldFout)
    })

    async function verwerk(sleutel: string, ruw: any) {
      const huidig = kamerRef.current
      const wisActie = () => remove(ref(db(), padRuw(code!, 'acties', sleutel)))

      if (!huidig) {
        await wisActie()
        return
      }

      const actie: Actie = {
        id: sleutel,
        uid: ruw.uid,
        type: ruw.type,
        payload: ruw.payloadJson ? JSON.parse(ruw.payloadJson) : undefined,
        ts: ruw.ts ?? nu(),
      }

      // Iedereen heeft gedronken: pauze eruit en de klokken bijstellen.
      //
      // Dit moet vóór alle andere controles staan. Viel de laatste slok van
      // een spel, dan is `spel.klaar` al waar — en zou een controle erboven
      // dit wegfilteren en de pauze voor eeuwig laten staan.
      if (actie.type === '_hervat') {
        const speeltNog = !!huidig.spel && stateRef.current != null
        let hervat: any
        if (speeltNog) {
          hervat = kopie(stateRef.current)
          schuifKlokken(hervat, Math.max(0, actie.payload?.pauzeMs ?? 0))
          stateRef.current = hervat
        }
        await schrijfWeg(huidig, speeltNog ? hervat : undefined, leegEffect(), {
          [pad(code!, 'drinkgate')]: null,
        })
        await wisActie()
        return
      }

      // Zolang er gedronken wordt, ligt het spel stil.
      if (huidig.drinkgate) {
        await wisActie()
        return
      }

      if (!huidig.spel || huidig.spel.klaar || huidig.meta.fase !== 'spel') {
        await wisActie()
        return
      }

      const mod = geefSpel(huidig.spel.gameId)
      if (!mod) {
        await wisActie()
        return
      }

      // Nog geen toestand in het geheugen (host is net herstart)? Haal 'm op.
      if (stateRef.current == null) {
        const snap = await get(ref(db(), padRuw(code!, 'hostState')))
        stateRef.current = snap.val() ? JSON.parse(snap.val()) : huidig.spel.state
      }

      const werk = kopie(stateRef.current)
      const eff = leegEffect()

      // Elke zet een vers startgetal. Deed hij dat niet, dan begon de
      // toevalsgenerator bij iedere actie opnieuw bij hetzelfde punt en gaf
      // hij dus steeds hetzelfde getal terug — dan gooi je een hele avond
      // alleen maar vijven.
      //
      // Reproduceerbaarheid verliezen we daarmee, en dat geeft niet: alleen
      // de host gebruikt deze generator, en de spellen die wél een gedeelde
      // baan nodig hebben (Flappy en de rest) krijgen hun eigen startgetal
      // meegestuurd in de spelstand.
      const ctx = maakContext(huidig, nieuweSeed(), eff, huidig.spel?.seed ?? 0)

      mod.reduce(werk, actie, ctx)
      if (!eff.klaar && mod.isKlaar?.(werk)) eff.klaar = true

      await schrijfWeg(huidig, werk, eff)
      stateRef.current = werk
      await wisActie()
    }

    return () => {
      stop()
    }
  }, [benHost, code])

  // De host zet zijn eigen bouwstempel in de lobby, zodat iedereen kan zien of
  // hij dezelfde versie draait.
  useEffect(() => {
    if (!benHost || !code || !kamer) return
    if (kamer.meta.versie === __BUILD__) return
    update(ref(db(), pad(code, 'meta')), { versie: __BUILD__ }).catch(() => {})
  }, [benHost, code, kamer])

  // Drinkpauze bewaken: is iedereen klaar met drinken, dan gaat het spel door.
  const gateGedaan = useRef<string | null>(null)
  useEffect(() => {
    if (!benHost || !code || !kamer || !uid) return
    const gate = kamer.drinkgate
    if (!gate) {
      gateGedaan.current = null
      return
    }
    // Alleen wie de lobby echt verlaten heeft slaan we over. Op `online` werd
    // hier eerst ook gefilterd, en dat liet de melding wegflitsen: een telefoon
    // die even op slot gaat of een tel wifi mist staat kort op offline, dan
    // bleef er niemand over om op te wachten en ging het spel meteen door —
    // voordat de drinker zijn scherm ook maar gezien had. Is iemand echt weg,
    // dan heeft de host "Toch doorgaan".
    const nodig = Object.keys(gate.wachtOp).filter((u) => kamer.spelers[u])
    const klaar = nodig.every((u) => gate.klaar[u])
    if (!klaar || gateGedaan.current === gate.id) return

    gateGedaan.current = gate.id
    stuurActie(code, uid, '_hervat', { pauzeMs: nu() - gate.sinds }).catch(meldFout)
  }, [benHost, code, kamer, uid])

  // Skip: de host skipt meteen, een gast stelt voor en bij meer dan de helft
  // gaat de app door.
  useEffect(() => {
    if (!benHost || !code || !kamer) return
    if (kamer.meta.fase !== 'spel' && kamer.meta.fase !== 'uitleg') return

    const stemmen = Object.keys(kamer.skip).filter((u) => kamer.spelers[u]).length
    const aanwezig = Object.keys(kamer.spelers).length
    if (stemmen === 0) return

    if (kamer.skip[kamer.meta.hostUid] || stemmen * 2 > aanwezig) {
      stopSpel(kamer).catch(meldFout)
    }
  }, [benHost, code, kamer])
}

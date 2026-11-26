/**
 * De powerups: twintig kaarten die ingrijpen op wat je drinkt en uitdeelt.
 *
 * HOE DIT WERKT, EN WAAROM HET ZO KAN. Elk spel meldt alleen gebeurtenissen:
 * "deze speler drinkt drie", "deze deelt er twee uit aan die", "iedereen drinkt
 * vier". Die lopen allemaal door één plek in de host-lus. Een powerup is niets
 * anders dan een wijziging op zo'n gebeurtenis, en daarom werkt elke powerup
 * automatisch in alle spellen -- ook in spellen die er nog niet zijn.
 *
 * WAT HIER NIET IN KAN, EN WAAROM. Vier van de gevraagde kaarten gaan over iets
 * wat de gebeurtenissen niet weten:
 *
 *  · Last Call ("de laatste die reageert deelt alles uit") -- er is geen
 *    gebeurtenis "iemand reageerde", en in de helft van de spellen is er niets
 *    om op te reageren.
 *  · Tweede kans ("neem een verkeerde beurt terug") -- een beurt terugdraaien
 *    moet het spel zelf kunnen; de slokkenlaag kan niet terug in de tijd.
 *  · Ruil en Vrijbrief ("ruil je slokken" / "bepaal iemands totaal") -- die
 *    moeten het hele spel afwachten en dan achteraf ingrijpen, maar slokken
 *    worden meteen afgerekend zodra ze vallen.
 *  · Dubbele pot en Gedeelde pot gaan over een pot, en die bestaat alleen in
 *    Opbouwen en De Lift. Als slokkenregel zijn ze hetzelfde als Dubbel
 *    uitdelen, dus die staan er één keer in.
 *
 * Bonusrondje ("als je wint, dubbel uitdelen") is weggelaten om dezelfde reden:
 * uitdelen gebeurt in de praktijk alleen als je iets gewonnen hebt, dus het was
 * een tweede Dubbel uitdelen.
 *
 * Eén ding dat de gebeurtenissen wél weten en niet weten: bij uitdelen is er
 * een van-en-naar, bij een gewone straf ("je drinkt drie omdat je fout gokte")
 * is er geen afzender. Powerups die iets terugkaatsen werken daarom alleen op
 * uitdelen.
 */

export interface Powerup {
  id: string
  naam: string
  /** het plaatje op de kaart */
  teken: string
  /** één regel, zoals hij op je eigen scherm staat */
  uitleg: string
  /** sterk = je zet hem zelf in, en hoogstens één keer per spel */
  sterk: boolean
  /** vraagt deze powerup om een speler om op te richten? */
  doelwit?: boolean
}

/** Hoeveel spellen een trekronde meegaat. */
export const CYCLUS = 2
/** Hoe vaak je een sterke powerup in die cyclus kunt inzetten: één per spel. */
export const INZETTEN = CYCLUS
/** Boven dit aantal spelers doen powerups niet mee. */
export const MAX_SPELERS = 4

export const POWERUPS: Powerup[] = [
  /* ── klein: werkt automatisch, in elk spel van de cyclus ── */
  { id: 'schild', naam: 'Schild', teken: '🛡️', sterk: false, uitleg: 'Alle slokken die jij zou drinken, slaan over.' },
  { id: 'doorgeefluik', naam: 'Doorgeefluik', teken: '📮', sterk: false, doelwit: true, uitleg: 'Alles wat jij moet drinken, drinkt jouw gekozen speler.' },
  { id: 'dubbeluit', naam: 'Dubbel uitdelen', teken: '✌️', sterk: false, uitleg: 'Alles wat jij uitdeelt telt dubbel.' },
  { id: 'halvestraf', naam: 'Halve straf', teken: '🪶', sterk: false, uitleg: 'Alles wat jij drinkt wordt gehalveerd, naar beneden afgerond.' },
  { id: 'spiegel', naam: 'Spiegel', teken: '🪞', sterk: false, uitleg: 'Alles wat jou treft gaat naar de speler links van je.' },
  { id: 'bodyguard', naam: 'Bodyguard', teken: '🦺', sterk: false, doelwit: true, uitleg: 'Alles wat jouw gekozen speler moet drinken, drink jij.' },
  { id: 'stiltegebod', naam: 'Stiltegebod', teken: '🤫', sterk: false, doelwit: true, uitleg: 'Alles wat jouw gekozen speler uitdeelt, drink jij.' },
  { id: 'vlucht', naam: 'Vlucht', teken: '🏃', sterk: false, uitleg: 'Je drinkt niets en je deelt niets uit.' },
  { id: 'kopjeonder', naam: 'Kopje onder', teken: '🌊', sterk: false, doelwit: true, uitleg: 'Jouw slokken drinkt jouw gekozen speler — en dan nog eens hetzelfde erbij.' },
  { id: 'kurk', naam: 'Kurk', teken: '🍾', sterk: false, uitleg: 'Elke drinkopdracht is er twee minder.' },

  /* ── sterk: jij kiest wanneer, hoogstens één keer per spel ── */
  { id: 'veto', naam: 'Veto', teken: '🚫', sterk: true, doelwit: true, uitleg: 'De powerup van jouw gekozen speler doet dit spel niets.' },
  { id: 'drinkbuddy', naam: 'Drinkbuddy', teken: '🤝', sterk: true, doelwit: true, uitleg: 'Alles wat jij drinkt, drinkt jouw gekozen speler er ook bij.' },
  { id: 'omkering', naam: 'Omkering', teken: '🔄', sterk: true, uitleg: 'Dit spel drink je wat je zou uitdelen, en deel je uit wat je zou drinken.' },
  { id: 'groepsbeschermer', naam: 'Groepsbeschermer', teken: '🫂', sterk: true, uitleg: 'De groep betaalt alles wat jij dit spel zou drinken.' },
  { id: 'dubbelestraf', naam: 'Dubbele straf', teken: '💥', sterk: true, doelwit: true, uitleg: 'Alles wat jouw gekozen speler dit spel drinkt is dubbel.' },
  { id: 'scherprechter', naam: 'Scherprechter', teken: '⚖️', sterk: true, uitleg: 'Dit spel drinkt iedereen behalve jij twee extra per opdracht.' },
  { id: 'belasting', naam: 'Belasting', teken: '🧾', sterk: true, uitleg: 'Elke keer dat iemand anders uitdeelt, drinkt hij er zelf twee.' },
  { id: 'sneeuwbal', naam: 'Sneeuwbal', teken: '❄️', sterk: true, uitleg: 'Je uitdelingen groeien dit spel: eerst twee meer, dan vier, dan zes.' },
  { id: 'gullehand', naam: 'Gulle hand', teken: '🎁', sterk: true, uitleg: 'Alles wat je dit spel uitdeelt is er zes meer.' },
  { id: 'kaatsmuur', naam: 'Kaatsmuur', teken: '🧱', sterk: true, uitleg: 'Wie jou dit spel uitdeelt, drinkt datzelfde aantal er zelf bij.' },
]

export const PER_ID = new Map(POWERUPS.map((p) => [p.id, p]))

export function geefPowerup(id: string): Powerup | undefined {
  return PER_ID.get(id)
}

/* ─────────────────────────────────────────────────────────────
   De stand van de powerups in een kamer.
   ───────────────────────────────────────────────────────────── */

export interface PowerupStand {
  /** de hoeveelste trekronde we zijn; 0 betekent nog niet getrokken */
  ronde: number
  /** hoeveel spellen er van deze cyclus nog komen, het lopende meegerekend */
  over: number
  /** uid → powerup-id */
  kaarten: Record<string, string>
  /** uid → hoeveel inzetten er nog over zijn (alleen sterke) */
  inzetten: Record<string, number>
  /** uid's die hun sterke powerup in het lopende spel hebben ingezet */
  actief: string[]
  /**
   * uid's die hun inzetkeuze gemaakt hebben, ja of nee.
   *
   * Nodig naast `actief`, want "nee" is ook een antwoord. Zonder dit zou de
   * inzetronde nooit weten of iemand nog moet kiezen of gewoon nee zei.
   */
  gereed: string[]
  /** uid → op wie hij zijn powerup richt */
  doelwit: Record<string, string>
  /** hoe vaak iemand dit spel al uitdeelde, voor Sneeuwbal */
  uitdelingen: Record<string, number>
  /** is er dit spel al iets uitgedeeld? voor het teruggeven van een inzet */
  uitgedeeld: boolean
  /**
   * Het spel dat na de inzetronde begint, of null voor een willekeurig spel.
   *
   * Koos de host zelf een spel, dan staat het hier en zie je bij het inzetten
   * waar je op wedt. Bij het dobbelsteentje blijft het null: dan beslis je
   * blind, en pas als iedereen gekozen heeft rolt de steen.
   */
  wacht: string | null
}

export function legeStand(): PowerupStand {
  return {
    ronde: 0,
    over: 0,
    kaarten: {},
    inzetten: {},
    actief: [],
    gereed: [],
    doelwit: {},
    uitdelingen: {},
    uitgedeeld: false,
    wacht: null,
  }
}

/**
 * De keuzes van de spelers bovenop de stand leggen.
 *
 * WAAROM DIT APART MOET. De stand is één tekst die alleen de host schrijft.
 * Maar op wie je je kaart richt en of je hem inzet, dat schrijf je zelf -- en
 * als twee telefoons tegelijk in diezelfde tekst zouden schrijven, wint de
 * laatste en is de keuze van de ander weg. Daarom krijgt iedereen zijn eigen
 * plekje, en worden die hier samengevoegd. De host legt ze vast zodra het spel
 * begint.
 */
export interface Keuze {
  doel?: string
  inzet?: 'ja' | 'nee'
}

export function voegKeuzesSamen(
  stand: PowerupStand,
  keuzes: Record<string, Keuze>,
): PowerupStand {
  const doelwit = { ...stand.doelwit }
  const gereed = [...stand.gereed]
  const actief = [...stand.actief]

  for (const [uid, keuze] of Object.entries(keuzes)) {
    if (keuze?.doel) doelwit[uid] = keuze.doel
    if (!keuze?.inzet) continue

    if (!gereed.includes(uid)) gereed.push(uid)
    // Ja zeggen kan alleen zolang je nog een inzet over hebt.
    const over = stand.inzetten[uid] ?? 0
    if (keuze.inzet === 'ja' && over > 0 && !actief.includes(uid)) actief.push(uid)
  }

  return { ...stand, doelwit, gereed, actief }
}

/**
 * Nieuwe kaarten voor iedereen.
 *
 * Elke kaart maar één keer, en je mag je eigen kaart van de vorige ronde niet
 * opnieuw krijgen. Als er niets anders meer te geven valt krijg je hem alsnog:
 * liever dezelfde kaart dan geen kaart.
 */
export function trekKaarten(
  rng: () => number,
  spelers: string[],
  vorige: Record<string, string>,
): Record<string, string> {
  const stapel = POWERUPS.map((p) => p.id)
  for (let i = stapel.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = stapel[i]
    stapel[i] = stapel[j]
    stapel[j] = t
  }

  const uit: Record<string, string> = {}
  for (const uid of spelers) {
    let gekozen = stapel.findIndex((id) => id !== vorige[uid])
    if (gekozen < 0) gekozen = 0
    uit[uid] = stapel.splice(gekozen, 1)[0]
  }
  return uit
}

/**
 * Welke powerup werkt er voor deze speler in het lopende spel?
 *
 * Een kleine werkt altijd. Een sterke alleen als hij hem heeft ingezet. En als
 * iemand een veto op je gelegd heeft, werkt er niets.
 */
export function werkzaam(stand: PowerupStand, uid: string): Powerup | null {
  const id = stand.kaarten[uid]
  if (!id) return null

  for (const [ander, doel] of Object.entries(stand.doelwit)) {
    if (ander === uid || doel !== uid) continue
    if (stand.kaarten[ander] !== 'veto') continue
    if (!stand.actief.includes(ander)) continue
    return null
  }

  const p = PER_ID.get(id)
  if (!p) return null
  if (p.sterk && !stand.actief.includes(uid)) return null
  return p
}

/** Wie heeft er een werkende powerup met dit id, en op wie richt hij zich? */
function metPowerup(stand: PowerupStand, id: string): { uid: string; doel: string }[] {
  const uit: { uid: string; doel: string }[] = []
  for (const uid of Object.keys(stand.kaarten)) {
    const p = werkzaam(stand, uid)
    if (p?.id === id) uit.push({ uid, doel: stand.doelwit[uid] ?? '' })
  }
  return uit
}

/* ─────────────────────────────────────────────────────────────
   De gebeurtenissen aanpassen.

   Zuiver rekenwerk: erin gaat wat het spel wilde laten gebeuren, eruit komt
   wat er werkelijk gebeurt. Geen scherm, geen database.
   ───────────────────────────────────────────────────────────── */

export interface Slok {
  uid: string
  aantal: number
}

/** De speler links van deze, in de tafelvolgorde. */
function links(volgorde: string[], uid: string): string | null {
  const i = volgorde.indexOf(uid)
  if (i < 0 || volgorde.length < 2) return null
  return volgorde[(i + 1) % volgorde.length]
}

/**
 * Eén drinkopdracht omzetten in wat er echt gebeurt.
 *
 * Het kan meer dan één regel worden (Drinkbuddy, Kopje onder), of nul
 * (Schild, Vlucht). `diep` stopt een kringetje: stuurt A alles door naar B en
 * B alles naar A, dan zou dit zonder grens eeuwig doorgaan.
 */
export function pasDrinkAan(
  stand: PowerupStand,
  volgorde: string[],
  uid: string,
  aantal: number,
  diep = 0,
  /**
   * Zijn eigen powerup overslaan.
   *
   * Nodig voor Omkering: die maakt van uitdelen drinken, en zonder dit zou dat
   * drinken door dezelfde Omkering weer uitdelen worden -- en dan verdwijnt
   * het. Je hebt maar één kaart, dus als die al gewerkt heeft mag hij niet nog
   * een keer meedoen. De powerups van anderen gelden hier wel gewoon.
   */
  negeerEigen = false,
): Slok[] {
  if (aantal <= 0) return []
  if (diep > 3) return [{ uid, aantal }]

  const eigen = negeerEigen ? null : werkzaam(stand, uid)
  let n = aantal

  /* ── Eerst: gaat dit drinken helemaal ergens anders heen? ── */
  if (eigen) {
    if (eigen.id === 'schild' || eigen.id === 'vlucht' || eigen.id === 'teflon') return []

    if (eigen.id === 'groepsbeschermer') {
      // De groep betaalt: iedereen behalve hij drinkt het.
      const anderen = volgorde.filter((u) => u !== uid)
      if (anderen.length === 0) return []
      return anderen.flatMap((u) => pasDrinkAan(stand, volgorde, u, n, diep + 1))
    }

    if (eigen.id === 'doorgeefluik' || eigen.id === 'kopjeonder') {
      const doel = stand.doelwit[uid]
      if (doel && doel !== uid) {
        // Kopje onder legt er bij de ander nog eens hetzelfde bij.
        const keer = eigen.id === 'kopjeonder' ? 2 : 1
        return pasDrinkAan(stand, volgorde, doel, n * keer, diep + 1)
      }
    }

    if (eigen.id === 'spiegel') {
      const buur = links(volgorde, uid)
      if (buur && buur !== uid) return pasDrinkAan(stand, volgorde, buur, n, diep + 1)
    }

    if (eigen.id === 'omkering') {
      // Drinken wordt uitdelen; de laag erboven handelt dat af.
      return []
    }

    /* ── Daarna: korting of opslag op wat hij zelf drinkt ── */
    if (eigen.id === 'kurk') n -= 2
    if (eigen.id === 'halvestraf') n = Math.floor(n / 2)
  }

  const uit: Slok[] = []

  /* ── Powerups van anderen die op dit drinken ingrijpen ── */
  for (const { doel } of metPowerup(stand, 'dubbelestraf')) {
    if (doel === uid && n > 0) n *= 2
  }
  for (const { uid: ander } of metPowerup(stand, 'scherprechter')) {
    if (ander !== uid && n > 0) n += 2
  }

  // Bodyguard: een ander neemt jouw slokken over.
  const wacht = metPowerup(stand, 'bodyguard').find((b) => b.doel === uid && b.uid !== uid)
  if (wacht && n > 0) {
    return pasDrinkAan(stand, volgorde, wacht.uid, n, diep + 1)
  }

  if (n > 0) uit.push({ uid, aantal: n })

  // Drinkbuddy: jouw gekozen speler drinkt hetzelfde er bovenop.
  for (const { uid: ander, doel } of metPowerup(stand, 'drinkbuddy')) {
    if (ander !== uid || !doel || doel === uid || n <= 0) continue
    uit.push(...pasDrinkAan(stand, volgorde, doel, n, diep + 1))
  }

  return uit
}

/**
 * Eén uitdeling omzetten in wie er drinkt.
 *
 * De uitdeler kan er zelf bij staan: Belasting en Kaatsmuur laten hem drinken,
 * en Omkering draait het hele ding om.
 */
export function pasUitdelenAan(
  stand: PowerupStand,
  volgorde: string[],
  van: string,
  naar: string,
  aantal: number,
): Slok[] {
  if (aantal <= 0) return []

  const eigen = werkzaam(stand, van)
  let n = aantal

  if (eigen) {
    if (eigen.id === 'vlucht') return []

    if (eigen.id === 'omkering') {
      // Uitdelen wordt drinken, bij de uitdeler zelf. Zijn eigen Omkering mag
      // daar niet nog een keer op ingrijpen.
      return pasDrinkAan(stand, volgorde, van, n, 1, true)
    }

    if (eigen.id === 'dubbeluit') n *= 2
    if (eigen.id === 'gullehand') n += 6
    if (eigen.id === 'sneeuwbal') {
      stand.uitdelingen[van] = (stand.uitdelingen[van] ?? 0) + 1
      n += 2 * Math.min(stand.uitdelingen[van], 3)
    }
  }

  if (n <= 0) return []

  const uit: Slok[] = []

  /*
   * Stiltegebod: iemand anders vangt deze uitdeling op en drinkt hem zelf.
   * Dat gaat vóór de ontvanger, want de slokken komen daar nooit aan.
   */
  const vanger = metPowerup(stand, 'stiltegebod').find((s) => s.doel === van && s.uid !== van)
  if (vanger) {
    uit.push(...pasDrinkAan(stand, volgorde, vanger.uid, n))
  } else {
    uit.push(...pasDrinkAan(stand, volgorde, naar, n))
  }

  // Kaatsmuur bij de ontvanger: de uitdeler drinkt hetzelfde er zelf bij.
  const ontvanger = werkzaam(stand, naar)
  if (ontvanger?.id === 'kaatsmuur') {
    uit.push(...pasDrinkAan(stand, volgorde, van, n, 1))
  }

  // Belasting van iemand anders: wie uitdeelt drinkt er zelf twee.
  if (metPowerup(stand, 'belasting').some((b) => b.uid !== van)) {
    uit.push(...pasDrinkAan(stand, volgorde, van, 2, 1))
  }

  return uit
}

/**
 * Levert deze omkering iets op om uit te delen?
 *
 * Omkering draait drinken en uitdelen om. Het drinken valt bij pasDrinkAan weg,
 * en hier komt het als uitdeling terug -- gelijk verdeeld over de anderen,
 * want het spel heeft geen doelwit meegegeven.
 */
export function omkeringUitdelen(
  stand: PowerupStand,
  volgorde: string[],
  uid: string,
  aantal: number,
): Slok[] {
  if (aantal <= 0) return []
  const eigen = werkzaam(stand, uid)
  if (eigen?.id !== 'omkering') return []

  const anderen = volgorde.filter((u) => u !== uid)
  if (anderen.length === 0) return []

  // Zo gelijk als het kan; de rest valt bij de eersten.
  const basis = Math.floor(aantal / anderen.length)
  const rest = aantal % anderen.length
  const uit: Slok[] = []
  anderen.forEach((u, i) => {
    const n = basis + (i < rest ? 1 : 0)
    if (n > 0) uit.push(...pasDrinkAan(stand, volgorde, u, n, 1))
  })
  return uit
}

/**
 * Kan deze powerup iets doen in een spel waarin niet wordt uitgedeeld?
 *
 * Gebruikt om een inzet terug te geven: zet je een sterke powerup in en blijkt
 * hij niets te kunnen, dan krijg je hem terug. Je koos blind, dus daar kun je
 * niets aan doen.
 */
export function heeftZinZonderUitdelen(id: string): boolean {
  /*
   * Deze vijf hangen alleen aan uitdelen. Omkering staat er met opzet niet
   * bij: die grijpt ook in op gewoon drinken, en maakt daar een uitdeling van.
   * Hij heeft dus altijd iets te doen.
   */
  return !['dubbeluit', 'sneeuwbal', 'gullehand', 'belasting', 'kaatsmuur'].includes(id)
}

import type { ReactNode } from 'react'

/* ─────────────────────────────────────────────────────────────
   De vaste vorm van alles in DORST!
   Elk van de 40 spellen praat via deze typen met de app.
   ───────────────────────────────────────────────────────────── */

export type Zwaarte = 'zacht' | 'normaal' | 'hard' | 'droog'
/**
 * lobby     → wachten tot iedereen binnen is
 * kiezen    → welk spel doen we nu (met tussenstand erboven)
 * uitleg    → 3 regels + "Snap ik"
 * spel      → spelen
 * scorebord → eindstand van de avond
 */
export type Fase = 'lobby' | 'kiezen' | 'uitleg' | 'spel' | 'scorebord'
export type Duur = 'kort' | 'middel' | 'lang'

export type Tag =
  | 'kaarten'
  | 'bluf'
  | 'geheim'
  | 'reflex'
  | 'praten'
  | 'geluk'
  | 'chaos'
  | 'geheugen'

export interface Speler {
  uid: string
  naam: string
  emoji: string
  online: boolean
  laatstGezien: number
}

export interface Score {
  uitgedeeld: number
  gedronken: number
}

export interface LogRegel {
  id: string
  tekst: string
  ts: number
}

export interface Instelling {
  zwaarte: Zwaarte
  /**
   * Spellen die de lobby heeft uitgezet.
   *
   * Bewust een lijst van wat er ÚIT staat, en niet van wat er aan staat: er
   * komen nog tientallen spellen bij, en met een aan-lijst zou elk nieuw spel
   * onzichtbaar blijven in lobby's die ooit iets hebben aangevinkt.
   */
  uit: string[]
  /**
   * Met hoeveel mensen je van plan bent te spelen.
   *
   * Puur om de lijst te filteren: op 2 verdwijnen de spellen die er meer nodig
   * hebben helemaal uit beeld, in plaats van dat je ze grijs ziet staan. Boven
   * de 2 zie je alles. Wie er écht in de lobby zit bepaalt daarnaast nog steeds
   * of een spel te starten is — anders begin je Kingsen met z'n tweeën en loopt
   * het vast.
   */
  verwacht: number
}

export interface SpelBlok {
  gameId: string
  ronde: number
  seed: number
  /** spel-eigen toestand; vorm bepaalt het spel zelf */
  state: any
  klaar: boolean
  /** wanneer dit spel begon (voor de duur op het scorebord) */
  begonOp: number
}

/**
 * De drinkpauze.
 *
 * Zodra er slokken vallen, staat het spel stil tot iedereen die moet drinken
 * op "Gedronken" heeft getikt. Zonder dit heeft niemand tijd om ook echt te
 * drinken — je moet meteen weer opletten of de volgende kaart van jou is.
 */
export interface Drinkgate {
  id: string
  /** uid → hoeveel slokken, al omgerekend naar de zwaarte-instelling */
  wachtOp: Record<string, number>
  klaar: Record<string, boolean>
  /** wanneer de pauze begon, om de klokken van het spel op te schuiven */
  sinds: number
}

export interface Kamer {
  meta: {
    code: string
    hostUid: string
    fase: Fase
    gemaaktOp: number
    /**
     * De bouw waarmee de host draait. Telefoons die een andere versie hebben
     * krijgen een balk met "herlaad" te zien — anders speel je samen een spel
     * waarvan de helft een oudere uitvoering heeft en snapt niemand waarom het
     * bij de een anders gaat dan bij de ander.
     */
    versie: string | null
  }
  instelling: Instelling
  spelers: Record<string, Speler>
  /** tafelvolgorde: uid's in de volgorde waarin de beurt rondgaat */
  volgorde: string[]
  spel: SpelBlok | null
  /** staat het spel stil omdat er gedronken wordt? */
  drinkgate: Drinkgate | null
  score: Record<string, Score>
  log: LogRegel[]
  /** uid's die op skip hebben gedrukt bij het huidige spel */
  skip: Record<string, boolean>
  /** uid's die op het uitlegscherm "Snap ik" hebben getikt */
  gereed: Record<string, boolean>
  /** gameId's die deze avond al gespeeld zijn */
  geschiedenis: string[]
}

/** Wat een gast naar de host stuurt. */
export interface Actie<P = any> {
  id?: string
  uid: string
  type: string
  payload?: P
  ts: number
}

/* ─────────────────────────────────────────────────────────────
   SpelContext — beschikbaar in init() en reduce().
   Draait ALLEEN op de telefoon van de host.
   ───────────────────────────────────────────────────────────── */

export interface SpelContext {
  /** alle spelers in tafelvolgorde */
  spelers: Speler[]
  zwaarte: Zwaarte
  /** toevalsgenerator; gebruik deze, niet Math.random() */
  rng: () => number
  /** de tijd nu (server-gecorrigeerd) */
  nu: number

  /** laat iemand drinken. `aantal` is vóór de zwaarte-instelling. */
  drink(uid: string, aantal: number, reden?: string): void
  /** speler `van` deelt slokken uit aan `naar` */
  deelUit(van: string, naar: string, aantal: number, reden?: string): void
  /**
   * Zelfde, maar het aantal is al omgerekend naar de zwaarte-instelling.
   * Nodig bij het verdelen: de speler verdeelt op zijn scherm de aantallen
   * die hij ziet, dus die mogen niet nóg een keer omgerekend worden.
   */
  deelUitPrecies(van: string, naar: string, aantal: number, reden?: string): void
  /** iedereen drinkt, optioneel behalve een paar uid's */
  iedereenDrinkt(aantal: number, reden?: string, behalve?: string[]): void

  /** geef deze speler iets dat alleen hij mag zien */
  zetPrive(uid: string, data: any): void
  /** wis het privéscherm van één speler, of van iedereen */
  wisPrive(uid?: string): void

  /** zet een regel in het gedeelde logboek */
  log(tekst: string): void
  /** meld dat dit spel afgelopen is */
  klaar(): void

  speler(uid: string): Speler | undefined
  naam(uid: string): string
}

/* ─────────────────────────────────────────────────────────────
   KijkContext — beschikbaar in de View van een spel.
   Draait op ELKE telefoon.
   ───────────────────────────────────────────────────────────── */

export interface KijkContext {
  /** mijn eigen uid */
  ik: string
  benIkHost: boolean
  /**
   * De lobbycode. Alleen nodig voor spellen die buiten de host-lus om naar de
   * database schrijven — zoals het tekenveld, dat tientallen strepen per
   * tekening verstuurt en die niet door de spellogica hoeft te halen.
   */
  kamerCode: string
  spelers: Speler[]
  zwaarte: Zwaarte
  /** wat alleen ik mag zien; undefined als ik niets geheims heb */
  prive: any
  /** de tijd nu (server-gecorrigeerd), tikt elke 100ms door */
  nu: number

  /** stuur een actie naar de host */
  stuur(type: string, payload?: any): void

  /** "3 slokken" of, in droge modus, "3 punten" */
  slok(n: number): string
  /** korte variant: "3 slok" / "3 pt" */
  slokKort(n: number): string
  /** hetzelfde getal, maar dan als getal — om mee te rekenen bij het verdelen */
  slokAantal(n: number): number

  naam(uid: string): string
  speler(uid: string): Speler | undefined
  ik_speler(): Speler | undefined
}

/* ─────────────────────────────────────────────────────────────
   Een spel.
   ───────────────────────────────────────────────────────────── */

export interface GameModule<S = any> {
  /** uniek, kleine letters, geen spaties — komt in de database */
  id: string
  naam: string
  /** één zin, staat op de spelkiezer */
  uitleg: string
  /** max 4 korte regels, staan op het uitlegscherm vóór het spel */
  regels: string[]
  minSpelers: number
  maxSpelers: number
  duur: Duur
  tags: Tag[]
  /** heeft dit spel geheime informatie per speler? */
  privescherm: boolean

  /** maak de beginstand */
  init(ctx: SpelContext): S

  /**
   * Verwerk één actie. Je mag `state` gewoon aanpassen (muteren) —
   * de host heeft er al een kopie van gemaakt.
   */
  reduce(state: S, actie: Actie, ctx: SpelContext): void

  /** wat er op het scherm komt */
  View(props: { state: S; ctx: KijkContext }): ReactNode

  /** optioneel: extra check of het spel klaar is */
  isKlaar?(state: S): boolean

  /**
   * Optioneel: hoeveel milliseconden het slokkenscherm wacht voordat het
   * eroverheen komt. Voor spellen die eerst nog iets willen laten zien —
   * Bussen laat de kaart vallen, en het is flauw als je al staat te drinken
   * voordat je gezien hebt wát je omdraaide.
   *
   * Het is met opzet een functie van de stand en geen vast getal: binnen één
   * spel kan het per fase verschillen. In de boom van Bussen moet de melding
   * juist meteen komen, want anders ligt de volgende kaart er al voordat je
   * weet dat je moet drinken.
   *
   * Geef je niets terug, of laat je hem weg, dan komt het scherm meteen.
   */
  drinkVertraging?(state: S): number
}

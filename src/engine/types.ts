import type { ReactNode } from 'react'

/* ─────────────────────────────────────────────────────────────
   De vaste vorm van alles in Rondje.
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
  /** null = alle spellen doen mee */
  spellen: string[] | null
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

export interface Kamer {
  meta: {
    code: string
    hostUid: string
    fase: Fase
    gemaaktOp: number
  }
  instelling: Instelling
  spelers: Record<string, Speler>
  /** tafelvolgorde: uid's in de volgorde waarin de beurt rondgaat */
  volgorde: string[]
  spel: SpelBlok | null
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
}

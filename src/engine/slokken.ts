import type { Zwaarte } from './types'

/**
 * De zwaarte-instelling uit de lobby werkt als vermenigvuldiger op élk
 * slok-aantal in de app. In droge modus blijven de getallen gelijk, maar
 * heten het punten in plaats van slokken — zo kan iemand die rijdt gewoon
 * meespelen.
 */
export const MULTIPLIER: Record<Zwaarte, number> = {
  zacht: 0.5,
  normaal: 1,
  hard: 2,
  droog: 1,
}

export const ZWAARTE_LABEL: Record<Zwaarte, string> = {
  zacht: 'Zacht',
  normaal: 'Normaal',
  hard: 'Hard',
  droog: 'Droog (geen alcohol)',
}

export const ZWAARTE_UITLEG: Record<Zwaarte, string> = {
  zacht: 'Halve aantallen. Lange avond, weinig schade.',
  normaal: 'Zoals bedoeld.',
  hard: 'Dubbele aantallen. Korte, heftige avond.',
  droog: 'Geen alcohol — je verzamelt strafpunten. Iedereen kan meespelen.',
}

/** Rekent een ruw aantal om naar wat er echt gedronken wordt. Nooit onder 1. */
export function berekenSlokken(ruw: number, zwaarte: Zwaarte): number {
  if (ruw <= 0) return 0
  return Math.max(1, Math.round(ruw * MULTIPLIER[zwaarte]))
}

export function isDroog(zwaarte: Zwaarte): boolean {
  return zwaarte === 'droog'
}

/** "3 slokken" · "1 slok" · "3 punten" */
export function slokTekst(n: number, zwaarte: Zwaarte): string {
  if (isDroog(zwaarte)) return `${n} ${n === 1 ? 'punt' : 'punten'}`
  return `${n} ${n === 1 ? 'slok' : 'slokken'}`
}

/** "3 slok" · "3 pt" — voor krappe plekken zoals het scorebord */
export function slokKort(n: number, zwaarte: Zwaarte): string {
  return isDroog(zwaarte) ? `${n} pt` : `${n} slok`
}

/** "slokken" of "punten", zonder getal */
export function eenheid(zwaarte: Zwaarte, meervoud = true): string {
  if (isDroog(zwaarte)) return meervoud ? 'punten' : 'punt'
  return meervoud ? 'slokken' : 'slok'
}

/** Het werkwoord: "drinkt" of, droog, "krijgt". */
export function werkwoord(zwaarte: Zwaarte): string {
  return isDroog(zwaarte) ? 'krijgt' : 'drinkt'
}

/** Hoofdletter-variant voor het grote rode scherm. */
export function drinkKreet(zwaarte: Zwaarte): string {
  return isDroog(zwaarte) ? 'JIJ KRIJGT' : 'JIJ DRINKT'
}

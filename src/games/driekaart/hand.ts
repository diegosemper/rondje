/**
 * Het waarderen van een hand van drie kaarten.
 *
 * Los van het spel en los van het scherm, want dit is het enige stuk van
 * 3 Card Poker waar je echt iets fout kunt rekenen -- en dan verliest iemand
 * een ronde die hij had moeten winnen zonder dat iemand aan tafel snapt waarom.
 *
 * LET OP DE RANGORDE. Die is hier níet dezelfde als bij gewone poker met vijf
 * kaarten: drie gelijk is hier sterker dan een straat, en een straat is sterker
 * dan een kleur. Dat komt doordat de kansen met drie kaarten omdraaien -- drie
 * dezelfde uit drie kaarten is zeldzamer dan drie op een rij. Wie het van
 * gewone poker kent gaat dit mis hebben, dus het staat ook in de spelregels op
 * het scherm.
 */
import type { Kaart } from '../../engine/deck'

/** Hoger is beter. */
export const SOORT = {
  hoogsteKaart: 1,
  paar: 2,
  kleur: 3,
  straat: 4,
  drieGelijk: 5,
  straatflush: 6,
} as const

export type Soort = (typeof SOORT)[keyof typeof SOORT]

export const SOORT_NAAM: Record<Soort, string> = {
  1: 'hoogste kaart',
  2: 'een paar',
  3: 'kleur',
  4: 'straat',
  5: 'drie gelijk',
  6: 'straatflush',
}

export interface Waardering {
  soort: Soort
  naam: string
  /**
   * Waar je op vergelijkt als twee handen dezelfde soort hebben, van zwaar
   * naar licht. Bij een paar staat de waarde van het paar vooraan en daarna de
   * losse kaart; bij een straat alleen de bovenste kaart.
   */
  sleutels: number[]
}

/**
 * De bovenste kaart van een straat.
 *
 * Aas-2-3 is een straat, en dan is de aas de láágste kaart: die straat is drie
 * hoog en verliest dus van elke andere. Vergeet je dat, dan wint aas-2-3 van
 * heer-vrouw-boer en dat is precies verkeerd om.
 */
function straatTop(waarden: number[]): number | null {
  const [a, b, c] = [...waarden].sort((x, y) => y - x)
  if (a === 14 && b === 3 && c === 2) return 3
  if (a - b === 1 && b - c === 1) return a
  return null
}

export function waardeer(kaarten: Kaart[]): Waardering {
  const waarden = kaarten.map((k) => k.waarde).sort((a, b) => b - a)
  const kleuren = new Set(kaarten.map((k) => k.kleur))
  const isKleur = kleuren.size === 1
  const top = straatTop(waarden)

  const maak = (soort: Soort, sleutels: number[]): Waardering => ({
    soort,
    naam: SOORT_NAAM[soort],
    sleutels,
  })

  if (top !== null && isKleur) return maak(SOORT.straatflush, [top])
  if (waarden[0] === waarden[2]) return maak(SOORT.drieGelijk, [waarden[0]])
  if (top !== null) return maak(SOORT.straat, [top])
  if (isKleur) return maak(SOORT.kleur, waarden)

  // Een paar: de twee gelijke eerst, dan de losse kaart. Op de sortering kun
  // je hier niet bouwen -- het paar kan de laagste of de hoogste zijn.
  if (waarden[0] === waarden[1]) return maak(SOORT.paar, [waarden[0], waarden[2]])
  if (waarden[1] === waarden[2]) return maak(SOORT.paar, [waarden[1], waarden[0]])

  return maak(SOORT.hoogsteKaart, waarden)
}

/** 1 als a wint, -1 als b wint, 0 bij gelijk. */
export function vergelijk(a: Waardering, b: Waardering): number {
  if (a.soort !== b.soort) return a.soort > b.soort ? 1 : -1
  for (let i = 0; i < Math.max(a.sleutels.length, b.sleutels.length); i++) {
    const x = a.sleutels[i] ?? 0
    const y = b.sleutels[i] ?? 0
    if (x !== y) return x > y ? 1 : -1
  }
  return 0
}

/**
 * Doet de dealer mee?
 *
 * In het echte spel moet de dealer minstens vrouw hoog hebben, anders doet hij
 * niet mee en krijgt iedereen die gespeeld heeft gewoon uitbetaald. Dat is wat
 * meedoen aantrekkelijk maakt: je kunt ook winnen zonder een goede hand, zolang
 * de dealer niks heeft.
 */
export function dealerDoetMee(w: Waardering): boolean {
  if (w.soort > SOORT.hoogsteKaart) return true
  return w.sleutels[0] >= 12
}

/**
 * De bonus voor een mooie hand.
 *
 * Die staat los van de dealer: heb je drie azen en heeft de dealer een
 * straatflush, dan heb je verloren maar krijg je de bonus nog steeds. Anders
 * zou de mooiste hand van de avond helemaal niets opleveren, en daar wordt een
 * tafel terecht boos om.
 */
export const BONUS: Record<Soort, number> = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 5,
  6: 8,
}

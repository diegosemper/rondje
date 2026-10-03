/**
 * De regels van Toepen, los van het scherm en los van de spelstand.
 *
 * Alles wat je fout kunt rekenen zit hier: de rangorde van de kaarten, wie een
 * slag pakt, en welke kaarten je mag spelen. Dat staat apart zodat het na te
 * rekenen is zonder het spel te spelen.
 */
import { nieuwDeck, type Kaart, type Kleur } from '../../engine/deck'

/**
 * De rangorde, en die is niet wat je verwacht.
 *
 * Bij toepen is de negen de hoogste kaart en de tien de laagste. Van laag naar
 * hoog: 10, boer, vrouw, heer, aas, 7, 8, 9. Dat is geen vergissing maar hoort
 * zo bij dit spel, en het is precies waarom iedereen de eerste ronde verliest
 * met een aas in zijn hand.
 */
const RANG: Record<number, number> = {
  10: 1,
  11: 2,
  12: 3,
  13: 4,
  14: 5,
  7: 6,
  8: 7,
  9: 8,
}

/** Hoe hoog deze kaart staat bij toepen. Hoger is sterker. */
export function rang(kaart: Kaart): number {
  return RANG[kaart.waarde] ?? 0
}

/** Het toepdeck: tweeëndertig kaarten, van de zeven tot de aas. */
export function toepDeck(): Kaart[] {
  return nieuwDeck().filter((k) => k.waarde >= 7)
}

export interface Gelegd {
  uid: string
  kaart: Kaart
}

/**
 * Wie pakt deze slag?
 *
 * De kleur die als eerste gelegd is bepaalt alles: kaarten van een andere
 * kleur kunnen niet winnen, hoe hoog ze ook zijn. Er is geen troef.
 */
export function slagWinnaar(tafel: Gelegd[]): string | null {
  if (tafel.length === 0) return null
  const kleur = tafel[0].kaart.kleur
  let beste = tafel[0]
  for (const g of tafel) {
    if (g.kaart.kleur !== kleur) continue
    if (rang(g.kaart) > rang(beste.kaart)) beste = g
  }
  return beste.uid
}

/**
 * Welke kaarten mag je nu leggen?
 *
 * Kleur bekennen is verplicht: heb je de gevraagde kleur, dan moet je die
 * spelen. Heb je hem niet, dan mag alles. Zonder die regel is er niets aan --
 * dan gooit iedereen zijn laagste kaart weg en valt er niets te spelen.
 */
export function mogelijk(hand: Kaart[], tafel: Gelegd[]): Kaart[] {
  if (tafel.length === 0) return hand
  const kleur: Kleur = tafel[0].kaart.kleur
  const zelfdeKleur = hand.filter((k) => k.kleur === kleur)
  return zelfdeKleur.length > 0 ? zelfdeKleur : hand
}

export function magLeggen(hand: Kaart[], tafel: Gelegd[], kaart: Kaart): boolean {
  if (!hand.some((k) => k.id === kaart.id)) return false
  return mogelijk(hand, tafel).some((k) => k.id === kaart.id)
}

/**
 * Wie heeft de ronde gewonnen?
 *
 * De meeste slagen wint. Bij gelijk aantal slagen wint wie de laatste slag
 * pakte -- dat is de gewoonte aan tafel en het voorkomt dat er niemand wint,
 * wat met vier slagen en twee spelers zomaar kan gebeuren.
 */
export function rondeWinnaar(
  slagen: Record<string, number>,
  actief: string[],
  laatsteSlag: string | null,
): string | null {
  if (actief.length === 0) return null
  if (actief.length === 1) return actief[0]

  let hoogste = -1
  for (const uid of actief) hoogste = Math.max(hoogste, slagen[uid] ?? 0)
  const top = actief.filter((uid) => (slagen[uid] ?? 0) === hoogste)
  if (top.length === 1) return top[0]
  if (laatsteSlag && top.includes(laatsteSlag)) return laatsteSlag
  return top[0]
}

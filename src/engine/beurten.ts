/** Wie is er aan de beurt, en wie daarna. */

/**
 * Dezelfde kring, maar met een ander beginpunt.
 *
 * Bijna elk spel begint bij de eerste speler uit de volgorde, en dat was
 * altijd de host — die staat vooraan omdat hij de kamer heeft gemaakt. Bij een
 * spel als Perudo is dat geen kleinigheid: wie opent bepaalt het bod waar de
 * rest overheen moet, en dan zit dezelfde persoon een hele avond in het
 * voordeel. Ook bij Bussen, Opbouwen en de rest wil je niet dat steeds
 * dezelfde mag beginnen.
 *
 * Husselen zou hier fout zijn. De volgorde is de kring zoals mensen echt aan
 * tafel zitten; door elkaar gehusseld springt de beurt van links naar rechts
 * naar de overkant en raakt iedereen kwijt wie er aan is. Draaien laat de
 * kring heel en verzet alleen waar hij begint — `volgende()` geeft daardoor
 * precies dezelfde antwoorden als eerst.
 *
 * `startgetal` moet het hele potje hetzelfde blijven (het startgetal van het
 * spel, niet dat van een losse zet). Draaide het per actie mee, dan schoof de
 * kring onder de beurt door.
 */
export function draaiVolgorde(volgorde: string[], startgetal: number): string[] {
  if (volgorde.length < 2) return volgorde
  if (!Number.isFinite(startgetal)) return volgorde
  const stap = Math.abs(Math.floor(startgetal)) % volgorde.length
  return [...volgorde.slice(stap), ...volgorde.slice(0, stap)]
}

export function index(volgorde: string[], uid: string): number {
  return volgorde.indexOf(uid)
}

export function volgende(volgorde: string[], huidige: string): string {
  const i = volgorde.indexOf(huidige)
  if (i === -1) return volgorde[0]
  return volgorde[(i + 1) % volgorde.length]
}

export function vorige(volgorde: string[], huidige: string): string {
  const i = volgorde.indexOf(huidige)
  if (i === -1) return volgorde[0]
  return volgorde[(i - 1 + volgorde.length) % volgorde.length]
}

/** De hele kring, beginnend bij `start` (inclusief). */
export function kringVanaf(volgorde: string[], start: string): string[] {
  const i = Math.max(0, volgorde.indexOf(start))
  return [...volgorde.slice(i), ...volgorde.slice(0, i)]
}

/** Iedereen behalve deze uid's. */
export function behalve(volgorde: string[], ...uids: string[]): string[] {
  return volgorde.filter((u) => !uids.includes(u))
}

/**
 * Volgende beurt, maar sla spelers over die er niet meer in zitten
 * (bijv. iemand die al af is).
 */
export function volgendeActieve(
  volgorde: string[],
  huidige: string,
  isActief: (uid: string) => boolean,
): string | null {
  let kandidaat = huidige
  for (let i = 0; i < volgorde.length; i++) {
    kandidaat = volgende(volgorde, kandidaat)
    if (isActief(kandidaat)) return kandidaat
  }
  return null
}

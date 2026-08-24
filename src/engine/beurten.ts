/** Wie is er aan de beurt, en wie daarna. */

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

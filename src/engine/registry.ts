import { ALLE_SPELLEN } from '../games'
import { pak } from './random'
import type { GameModule } from './types'

export const SPELLEN = ALLE_SPELLEN

const perId = new Map(SPELLEN.map((s) => [s.id, s]))

export function geefSpel(id: string): GameModule | undefined {
  return perId.get(id)
}

/**
 * Past dit spel bij het aantal waarmee je van plan bent te spelen?
 *
 * Dit is het filter dat de lijst kort houdt: kies je 2, dan zie je de spellen
 * die er meer nodig hebben helemaal niet meer. Los daarvan kijkt waaromNiet()
 * nog naar wie er écht in de lobby zit.
 */
export function pastBijGroep(spel: GameModule, verwacht: number): boolean {
  return spel.minSpelers <= verwacht
}

/** Waarom een spel nu niet kan. `null` betekent: het kan gewoon. */
export function waaromNiet(
  spel: GameModule,
  aantalSpelers: number,
  uit: string[],
): string | null {
  if (uit.includes(spel.id)) return 'uitgezet in de lobby'
  if (aantalSpelers < spel.minSpelers) {
    const tekort = spel.minSpelers - aantalSpelers
    return `vanaf ${spel.minSpelers} spelers — nog ${tekort} nodig`
  }
  if (aantalSpelers > spel.maxSpelers) return `hoogstens ${spel.maxSpelers} spelers`
  return null
}

/** Spellen die nu écht gespeeld kunnen worden. */
export function speelbaar(aantalSpelers: number, uit: string[]): GameModule[] {
  return SPELLEN.filter((s) => waaromNiet(s, aantalSpelers, uit) === null)
}

/**
 * Laat het lot beslissen. Spellen die deze avond al aan bod kwamen komen
 * pas terug als alles een keer geweest is.
 */
export function kiesWillekeurig(
  rng: () => number,
  aantalSpelers: number,
  uit: string[],
  geschiedenis: string[],
): GameModule | null {
  const kandidaten = speelbaar(aantalSpelers, uit)
  if (kandidaten.length === 0) return null

  const vers = kandidaten.filter((s) => !geschiedenis.includes(s.id))
  return pak(rng, vers.length > 0 ? vers : kandidaten)
}

export const DUUR_TEKST: Record<string, string> = {
  kort: '~5 min',
  middel: '~10 min',
  lang: '~15 min',
}

export const TAG_EMOJI: Record<string, string> = {
  kaarten: '🂠',
  bluf: '🎭',
  geheim: '🤫',
  reflex: '⚡',
  praten: '💬',
  geluk: '🎲',
  chaos: '🌀',
  geheugen: '🧠',
}

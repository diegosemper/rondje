import { ALLE_SPELLEN } from '../games'
import { pak } from './random'
import type { GameModule } from './types'

export const SPELLEN = ALLE_SPELLEN

const perId = new Map(SPELLEN.map((s) => [s.id, s]))

export function geefSpel(id: string): GameModule | undefined {
  return perId.get(id)
}

/** Spellen die met dit aantal spelers te doen zijn, en die de lobby toestaat. */
export function speelbaar(aantalSpelers: number, toegestaan: string[] | null): GameModule[] {
  return SPELLEN.filter((s) => {
    if (s.id === 'testspel') return toegestaan?.includes('testspel') ?? false
    if (aantalSpelers < s.minSpelers || aantalSpelers > s.maxSpelers) return false
    if (toegestaan && !toegestaan.includes(s.id)) return false
    return true
  })
}

/**
 * Laat het lot beslissen. Spellen die deze avond al aan bod kwamen komen
 * pas terug als alles een keer geweest is.
 */
export function kiesWillekeurig(
  rng: () => number,
  aantalSpelers: number,
  toegestaan: string[] | null,
  geschiedenis: string[],
): GameModule | null {
  const kandidaten = speelbaar(aantalSpelers, toegestaan)
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

import { ALLE_SPELLEN } from '../games'
import { husselen, maakRng, pak } from './random'
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

/**
 * Een eigen teken per spel.
 *
 * Hiervoor stonden er de tekens van de tags, en die zeiden niets: de helft van
 * de lijst was een kaartsymbool dat op veel telefoons als leeg hokje aankwam,
 * en drie spellen naast elkaar zagen er identiek uit. Nu herken je een spel
 * aan zijn plaatje voordat je de naam gelezen hebt.
 *
 * Staat er geen teken bij een spel, dan valt hij terug op een dobbelsteen --
 * beter een saai teken dan een gat in de rij.
 */
export const SPEL_EMOJI: Record<string, string> = {
  alfabet: '🔤',
  bierpong: '🥤',
  blindekaart: '🙈',
  bom: '💣',
  bussen: '🚌',
  dealer: '🃏',
  dertig: '⏳',
  duel: '⚔️',
  eenentwintig: '🛟',
  ezelen: '🐴',
  flappy: '🐤',
  gelijkdenken: '👯',
  golflengte: '📻',
  hilo: '📈',
  hitster: '📅',
  imposter: '🕵️',
  jetpack: '🚀',
  ketting: '🔗',
  kingsen: '👑',
  kleurenklap: '🌈',
  mexicanen: '🎲',
  nognooit: '🙊',
  nummers: '🎵',
  opbouwen: '🎰',
  pijlen: '➡️',
  pyramide: '🔺',
  roodzwart: '♦️',
  roulette: '💥',
  sabotage: '🤐',
  schudden: '📳',
  snelstevinger: '🟢',
  snelweg: '🚗',
  spiegel: '🪞',
  springen: '🦘',
  stapeltoren: '🏗️',
  stellingen: '⚖️',
  tekenen: '🎨',
  testspel: '🧪',
  tienseconden: '⏱️',
  tweewaarheden: '🤥',
  verbodenwoord: '🚫',
  waterval: '🌊',
  wiebenik: '🎭',
  wievanons: '🗳️',
  wiskunde: '➗',
  zwaartekracht: '📐',
}

export function spelEmoji(id: string): string {
  return SPEL_EMOJI[id] ?? '🎲'
}

/** Een getal uit een tekst, zodat dezelfde lobby altijd dezelfde volgorde krijgt. */
function zaadUit(tekst: string): number {
  let h = 2166136261
  for (let i = 0; i < tekst.length; i++) {
    h ^= tekst.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * De spellijst door elkaar, maar wel steeds dezelfde volgorde binnen één lobby.
 *
 * In de bronlijst staan ze op soort gegroepeerd -- eerst de kaartspellen, dan
 * de arcade, dan het praatwerk -- en dat betekent dat je een hele lap saaie
 * bij elkaar krijgt en verderop een lap drukke. Door hem te husselen staat er
 * overal wat.
 *
 * Het startgetal komt uit de lobbycode en niet uit de klok: de lijst mag niet
 * onder je vingers verspringen terwijl je aan het kiezen bent, maar hij mag
 * bij het volgende potje wel anders liggen.
 *
 * Alleen husselen is niet genoeg. Toeval klontert -- dan sta je alsnog naar
 * zes kaartspellen op rij te kijken. Daarom wordt er na het husselen bewust
 * uit elkaar getrokken: er wordt steeds de eerste gepakt die van een andere
 * soort is dan de vorige.
 */
export function gehusseldeSpellen(code: string): GameModule[] {
  const rng = maakRng(zaadUit(code || 'dorst'))
  // Het testspel is geen spel; die blijft onderaan staan.
  const echt = husselen(rng, SPELLEN.filter((s) => s.id !== 'testspel'))
  const staart = SPELLEN.filter((s) => s.id === 'testspel')

  const uit: GameModule[] = []
  while (echt.length > 0) {
    const vorige = uit[uit.length - 1]
    let i = vorige ? echt.findIndex((s) => s.tags[0] !== vorige.tags[0]) : 0
    // Alleen nog dezelfde soort over? Dan houdt het op en pakken we de eerste.
    if (i < 0) i = 0
    uit.push(echt.splice(i, 1)[0])
  }

  return [...uit, ...staart]
}

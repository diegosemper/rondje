import { husselen } from './random'

/* Een gewoon kaartspel van 52 kaarten. */

export type Kleur = 'harten' | 'ruiten' | 'klaveren' | 'schoppen'

export const KLEUREN: Kleur[] = ['harten', 'ruiten', 'klaveren', 'schoppen']

export const KLEUR_TEKEN: Record<Kleur, string> = {
  harten: '♥',
  ruiten: '♦',
  klaveren: '♣',
  schoppen: '♠',
}

export interface Kaart {
  /** bijv. "harten-14" */
  id: string
  kleur: Kleur
  /** 2 t/m 14, waarbij 11=Boer, 12=Vrouw, 13=Heer, 14=Aas */
  waarde: number
}

export function isRood(k: Kaart): boolean {
  return k.kleur === 'harten' || k.kleur === 'ruiten'
}

export function waardeTekst(waarde: number): string {
  if (waarde === 11) return 'B'
  if (waarde === 12) return 'V'
  if (waarde === 13) return 'H'
  if (waarde === 14) return 'A'
  return String(waarde)
}

export function waardeVoluit(waarde: number): string {
  if (waarde === 11) return 'boer'
  if (waarde === 12) return 'vrouw'
  if (waarde === 13) return 'heer'
  if (waarde === 14) return 'aas'
  return String(waarde)
}

/** "A♥" */
export function kaartKort(k: Kaart): string {
  return waardeTekst(k.waarde) + KLEUR_TEKEN[k.kleur]
}

/** "harten aas" */
export function kaartNaam(k: Kaart): string {
  return `${k.kleur} ${waardeVoluit(k.waarde)}`
}

export function nieuwDeck(): Kaart[] {
  const kaarten: Kaart[] = []
  for (const kleur of KLEUREN) {
    for (let waarde = 2; waarde <= 14; waarde++) {
      kaarten.push({ id: `${kleur}-${waarde}`, kleur, waarde })
    }
  }
  return kaarten
}

/* ── Stapel: het deck zoals het op tafel ligt ───────────────── */

export interface Stapel {
  /** waar je uit trekt, bovenste kaart is het laatste element */
  trek: Kaart[]
  /** aflegstapel; wordt hergebruikt als `trek` op is */
  af: Kaart[]
}

export function nieuweStapel(rng: () => number): Stapel {
  return { trek: husselen(rng, nieuwDeck()), af: [] }
}

/**
 * Trek de bovenste kaart. Is de trekstapel op, dan wordt de aflegstapel
 * opnieuw geschud. Past de stapel aan (muteert), zoals de reducers doen.
 */
export function trek(stapel: Stapel, rng: () => number): Kaart {
  if (stapel.trek.length === 0) {
    if (stapel.af.length === 0) {
      // Niets meer over: begin met een vers deck.
      stapel.trek = husselen(rng, nieuwDeck())
    } else {
      stapel.trek = husselen(rng, stapel.af)
      stapel.af = []
    }
  }
  return stapel.trek.pop()!
}

/** Trek `n` kaarten. */
export function trekMeerdere(stapel: Stapel, rng: () => number, n: number): Kaart[] {
  const uit: Kaart[] = []
  for (let i = 0; i < n; i++) uit.push(trek(stapel, rng))
  return uit
}

export function leggAf(stapel: Stapel, ...kaarten: Kaart[]): void {
  stapel.af.push(...kaarten)
}

export function kaartenOver(stapel: Stapel): number {
  return stapel.trek.length + stapel.af.length
}

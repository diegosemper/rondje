/* ─────────────────────────────────────────────────────────────
   De rekenregels van Perudo, los van het scherm en los van de spelstand.

   Alles hier is een gewone functie zonder geheugen: je stopt er een bod in
   en er komt een antwoord uit. Dat is met opzet — het bied-verkeer van
   Perudo zit vol randgevallen (enen zijn joker, en overstappen naar enen
   halveert het aantal), en die wil je op één plek kunnen nalezen in plaats
   van verspreid door een scherm vol knoppen.

   Het scherm en de controle op de host gebruiken allebei dezelfde functies,
   dus een knop die aan staat kán niet geweigerd worden.
   ───────────────────────────────────────────────────────────── */

/** Een bod: zo vaak ligt dit oog volgens jou aan tafel, bij iedereen samen. */
export interface Bod {
  aantal: number
  /** 1 t/m 6 */
  ogen: number
}

/** Het oog dat joker is: de paco. */
export const JOKER = 1

/** Waar iedereen mee begint. */
export const START_STENEN = 5

/**
 * Telt deze steen mee voor een bod op `ogen`?
 *
 * Enen tellen bij elk oog mee — behalve in een palifico-ronde, want daar is
 * de joker uitgeschakeld, en behalve als er op enen zelf geboden is.
 */
export function telt(steen: number, ogen: number, palifico: boolean): boolean {
  if (steen === ogen) return true
  if (palifico) return false
  if (ogen === JOKER) return false
  return steen === JOKER
}

/** Hoe vaak `ogen` werkelijk aan tafel ligt, jokers meegerekend. */
export function telOgen(
  worpen: Record<string, number[]>,
  ogen: number,
  palifico: boolean,
): number {
  let n = 0
  for (const worp of Object.values(worpen)) {
    for (const steen of worp) {
      if (telt(steen, ogen, palifico)) n++
    }
  }
  return n
}

/**
 * Het laagste aantal waarmee je op dit oog mag bieden.
 *
 * `null` betekent: op dit oog mag je nu helemaal niet bieden. Dat gebeurt
 * alleen in een palifico-ronde, waar het oog van het eerste bod de hele
 * ronde vaststaat.
 *
 * De vier gevallen:
 *
 * - zelfde oog        → één meer
 * - hoger oog         → hetzelfde aantal mag blijven staan
 * - lager oog         → dan moet het aantal wél omhoog
 * - naar enen         → de helft, naar boven afgerond (jokers zijn dubbel
 *                       zo veel waard, dus tellen ze dubbel zo zwaar)
 * - van enen af       → het dubbele, plus één
 */
export function minimumAantal(
  oud: Bod | null,
  ogen: number,
  palifico: boolean,
): number | null {
  if (ogen < 1 || ogen > 6) return null
  if (!oud) return 1

  if (palifico) {
    // De joker is uit en het oog ligt vast; alleen het aantal mag omhoog.
    if (ogen !== oud.ogen) return null
    return oud.aantal + 1
  }

  if (ogen === oud.ogen) return oud.aantal + 1
  if (ogen === JOKER) return Math.max(1, Math.ceil(oud.aantal / 2))
  if (oud.ogen === JOKER) return oud.aantal * 2 + 1
  return ogen > oud.ogen ? oud.aantal : oud.aantal + 1
}

/**
 * Mag dit bod na het vorige?
 *
 * `maxAantal` is het aantal stenen dat er in totaal ligt. Hoger bieden dan
 * dat mag aan een echte tafel wel, maar het is een gegarandeerd verlies —
 * en op een telefoon is het vooral een vergissing van een dikke duim.
 */
export function magBieden(
  oud: Bod | null,
  nieuw: Bod,
  palifico: boolean,
  maxAantal: number,
): boolean {
  const min = minimumAantal(oud, nieuw.ogen, palifico)
  if (min === null) return false
  if (!Number.isInteger(nieuw.aantal)) return false
  return nieuw.aantal >= min && nieuw.aantal <= maxAantal
}

/** Op welke ogen valt er überhaupt nog te bieden? */
export function mogelijkeOgen(
  oud: Bod | null,
  palifico: boolean,
  maxAantal: number,
): number[] {
  const uit: number[] = []
  for (let ogen = 1; ogen <= 6; ogen++) {
    const min = minimumAantal(oud, ogen, palifico)
    if (min !== null && min <= maxAantal) uit.push(ogen)
  }
  return uit
}

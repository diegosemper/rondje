/**
 * Een aftelklok die op alle telefoons gelijk loopt.
 *
 * De truc: we slaan geen "nog 12 seconden" op, maar een eindtijd in
 * server-tijd. Elke telefoon rekent zelf uit hoeveel er nog over is. Zo maakt
 * het niet uit of iemands klok verkeerd staat of het scherm even uit was.
 */

export interface Klok {
  /** eindtijd in milliseconden (server-tijd) */
  eind: number
  /** hoe lang de klok in totaal loopt, voor de voortgangsbalk */
  duurMs: number
}

export function startKlok(secondes: number, nu: number): Klok {
  return { eind: nu + secondes * 1000, duurMs: secondes * 1000 }
}

/** Milliseconden die nog over zijn (nooit negatief). */
export function resterendMs(klok: Klok | null, nu: number): number {
  if (!klok) return 0
  return Math.max(0, klok.eind - nu)
}

/** Hele seconden die nog over zijn, naar boven afgerond. */
export function resterendSec(klok: Klok | null, nu: number): number {
  return Math.ceil(resterendMs(klok, nu) / 1000)
}

export function isAfgelopen(klok: Klok | null, nu: number): boolean {
  if (!klok) return false
  return nu >= klok.eind
}

/** 0 tot 1 — hoeveel van de klok is verstreken. */
export function voortgang(klok: Klok | null, nu: number): number {
  if (!klok || klok.duurMs <= 0) return 0
  return Math.min(1, Math.max(0, 1 - resterendMs(klok, nu) / klok.duurMs))
}

/** "1:05" of "12" */
export function klokTekst(klok: Klok | null, nu: number): string {
  const sec = resterendSec(klok, nu)
  if (sec < 60) return String(sec)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

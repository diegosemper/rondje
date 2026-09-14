/**
 * Onthouden wat er al langs is geweest.
 *
 * Elk spel pakte zijn vragen, zinnen en woorden met een vers startgetal uit de
 * hele lijst. Dat is netjes willekeurig, maar willekeurig is niet hetzelfde als
 * afwisselend: dit spel trekt tien zinnen uit zestig, dus na drie potjes
 * heb je de helft van de lijst gehad en herken je bijna elke zin. Precies waar
 * de lol uit gaat.
 *
 * Daarom houdt de kamer per lijst bij wat er al gebruikt is, en pakt de
 * volgende keuze eerst uit wat nog niet geweest is. Is de lijst rond, dan begint
 * hij gewoon opnieuw -- dat is beter dan halverwege niets meer hebben.
 *
 * Er worden vingerafdrukken bewaard en geen hele zinnen. Twee redenen: het
 * scheelt een hoop in de database (zestig zinnen zijn zo vier kilobyte), en een
 * vingerafdruk blijft gelden als ik later een zin ergens anders in de lijst zet.
 * Op de plek in de lijst kun je niet bouwen: zodra ik er iets tussenvoeg,
 * verschuift alles en zou de kamer denken dat hij dingen gehad heeft die hij
 * nooit gezien heeft.
 */
import { husselen } from './random'

/** Hoeveel vingerafdrukken we per lijst hoogstens bewaren. */
export const ONTHOUD_MAX = 400

/**
 * Een kort, stabiel merkteken voor een stuk tekst (FNV-1a, base36).
 *
 * Botsingen zijn hier niet erg: twee zinnen met hetzelfde merkteken betekent
 * hooguit dat er eentje een keer wordt overgeslagen omdat de kamer denkt dat
 * hij hem gehad heeft. Bij lijsten van een paar honderd komt dat vrijwel nooit
 * voor, en het gevolg is een andere zin -- niet een kapot spel.
 */
export function vingerafdruk(tekst: string): string {
  let h = 2166136261
  for (let i = 0; i < tekst.length; i++) {
    h ^= tekst.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

export interface VerseKeuze<T> {
  /** wat je mag gebruiken, al door elkaar */
  keuze: T[]
  /** de vingerafdrukken die hierbij horen */
  merken: string[]
  /** was de lijst rond, zodat het geheugen opnieuw begint? */
  opnieuw: boolean
}

/**
 * Pak `aantal` stuks, en het liefst dingen die nog niet geweest zijn.
 *
 * Eerst wordt de hele lijst geschud, en pas daarna gesplitst in nieuw en oud.
 * Andersom -- eerst splitsen, dan schudden -- zou hetzelfde lijken, maar dan
 * loopt het oude deel altijd in dezelfde volgorde door zodra de lijst rond is.
 *
 * Is er te weinig nieuw, dan wordt er aangevuld met oud. Liever een paar
 * bekende erbij dan een spel dat halverwege zonder zinnen zit.
 */
export function vers<T>(
  rng: () => number,
  lijst: readonly T[],
  aantal: number,
  alGehad: readonly string[],
  tekstVan: (item: T) => string,
): VerseKeuze<T> {
  const gehad = new Set(alGehad)
  const geschud = husselen(rng, lijst)

  const nieuw: T[] = []
  const oud: T[] = []
  for (const item of geschud) {
    if (gehad.has(vingerafdruk(tekstVan(item)))) oud.push(item)
    else nieuw.push(item)
  }

  const keuze = [...nieuw, ...oud].slice(0, Math.max(0, aantal))
  return {
    keuze,
    merken: keuze.map((item) => vingerafdruk(tekstVan(item))),
    // Waren er niet genoeg onbekende, dan is de lijst rond geweest en mag het
    // geheugen leeg: anders staat hij vanaf nu voorgoed vol en heeft bijhouden
    // geen enkel nut meer.
    opnieuw: nieuw.length < keuze.length,
  }
}

/**
 * Het nieuwe geheugen voor deze lijst.
 *
 * De oudste merken vallen eraf als het er te veel worden. Dat is met opzet
 * geen harde grens per lijst maar een schuivende: zo blijft wat je net gehad
 * hebt altijd bekend, en vervaagt wat van weken geleden is.
 */
export function bijgewerktGeheugen(
  alGehad: readonly string[],
  keuze: VerseKeuze<unknown>,
): string[] {
  const basis = keuze.opnieuw ? [] : alGehad
  const samen = [...basis]
  for (const m of keuze.merken) if (!samen.includes(m)) samen.push(m)
  return samen.slice(-ONTHOUD_MAX)
}

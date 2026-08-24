/**
 * Gedeelde toevalsgenerator.
 *
 * Met dezelfde seed komt er altijd dezelfde reeks uit. Dat is handig om een
 * potje exact na te spelen als er iets misgaat, en het voorkomt dat twee
 * telefoons het oneens worden als we ooit besluiten de logica te dupliceren.
 */
export function maakRng(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function nieuweSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

/** Willekeurig geheel getal van min t/m max (beide meegerekend). */
export function tussen(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

/** Pak één willekeurig element. */
export function pak<T>(rng: () => number, lijst: readonly T[]): T {
  return lijst[Math.floor(rng() * lijst.length)]
}

/** Pak `n` verschillende elementen. */
export function pakMeerdere<T>(rng: () => number, lijst: readonly T[], n: number): T[] {
  return husselen(rng, lijst).slice(0, n)
}

/** Nieuwe, gehusselde kopie (Fisher-Yates). */
export function husselen<T>(rng: () => number, lijst: readonly T[]): T[] {
  const kopie = [...lijst]
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[kopie[i], kopie[j]] = [kopie[j], kopie[i]]
  }
  return kopie
}

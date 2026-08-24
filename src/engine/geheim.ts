/**
 * Alles wat in een spel-toestand onder de sleutel `_geheim` staat, blijft op
 * de telefoon van de host en gaat NIET naar de andere telefoons.
 *
 * Eén afspraak, geldig voor alle 40 spellen:
 *
 *     state = {
 *       beurt: 'abc',
 *       _geheim: { keuzes: {...} }   ← niemand anders krijgt dit ooit te zien
 *     }
 */
export function stripGeheim<T>(waarde: T): T {
  if (Array.isArray(waarde)) {
    return waarde.map((v) => stripGeheim(v)) as unknown as T
  }
  if (waarde && typeof waarde === 'object') {
    const uit: Record<string, unknown> = {}
    for (const [sleutel, v] of Object.entries(waarde as Record<string, unknown>)) {
      if (sleutel === '_geheim') continue
      uit[sleutel] = stripGeheim(v)
    }
    return uit as unknown as T
  }
  return waarde
}

/** Diepe kopie die veilig is om te muteren. */
export function kopie<T>(waarde: T): T {
  return JSON.parse(JSON.stringify(waarde ?? null))
}

import type { Speler } from './types'

/**
 * Simultaan geheim stemmen.
 *
 * Iedereen tikt tegelijk op zijn eigen scherm. Niemand ziet wat een ander
 * kiest tot alle stemmen binnen zijn — dat is precies wat je aan een echte
 * tafel niet voor elkaar krijgt.
 *
 * Let op de sleutel `_geheim`: alles onder die naam blijft op de telefoon van
 * de host en wordt NIET naar de andere telefoons gestuurd. Zo kan niemand de
 * uitslag vooraf uitlezen.
 */

export interface Optie {
  id: string
  label: string
  emoji?: string
}

export interface Uitslag {
  per: Record<string, { aantal: number; stemmers: string[] }>
  /** optie-id's met de meeste stemmen (meerdere bij gelijkspel) */
  top: string[]
  gelijkspel: boolean
  totaal: number
}

export interface Stemming {
  vraag: string
  opties: Optie[]
  /** wie er al gestemd heeft — dit mag iedereen zien */
  gestemd: string[]
  /** de keuzes zelf — blijft bij de host */
  _geheim: { keuzes: Record<string, string> }
  uitslag: Uitslag | null
}

export function nieuweStemming(vraag: string, opties: Optie[]): Stemming {
  return { vraag, opties, gestemd: [], _geheim: { keuzes: {} }, uitslag: null }
}

/** Maak van elke speler een stemoptie. `behalve` sluit spelers uit (meestal jezelf). */
export function spelerOpties(spelers: Speler[], behalve: string[] = []): Optie[] {
  return spelers
    .filter((s) => !behalve.includes(s.uid))
    .map((s) => ({ id: s.uid, label: s.naam, emoji: s.emoji }))
}

/** Stem uitbrengen. Overschrijven mag zolang de uitslag nog niet onthuld is. */
export function stem(s: Stemming, uid: string, optieId: string): void {
  if (s.uitslag) return
  if (!s.opties.some((o) => o.id === optieId)) return
  s._geheim.keuzes[uid] = optieId
  if (!s.gestemd.includes(uid)) s.gestemd.push(uid)
}

export function heeftGestemd(s: Stemming, uid: string): boolean {
  return s.gestemd.includes(uid)
}

export function iedereenGestemd(s: Stemming, uids: string[]): boolean {
  return uids.every((u) => s.gestemd.includes(u))
}

/** Tel de stemmen en zet de uitslag vast. */
export function onthul(s: Stemming): Uitslag {
  const per: Uitslag['per'] = {}
  for (const optie of s.opties) per[optie.id] = { aantal: 0, stemmers: [] }

  for (const [uid, optieId] of Object.entries(s._geheim.keuzes)) {
    if (!per[optieId]) per[optieId] = { aantal: 0, stemmers: [] }
    per[optieId].aantal++
    per[optieId].stemmers.push(uid)
  }

  const hoogste = Math.max(0, ...Object.values(per).map((v) => v.aantal))
  const top = Object.entries(per)
    .filter(([, v]) => v.aantal === hoogste && hoogste > 0)
    .map(([id]) => id)

  s.uitslag = {
    per,
    top,
    gelijkspel: top.length > 1,
    totaal: Object.keys(s._geheim.keuzes).length,
  }
  return s.uitslag
}

/** Wie in de minderheid zat (handig voor Stellingen). */
export function minderheid(uitslag: Uitslag): string[] {
  const aantallen = Object.values(uitslag.per)
    .map((v) => v.aantal)
    .filter((n) => n > 0)
  if (aantallen.length < 2) return []
  const laagste = Math.min(...aantallen)
  return Object.values(uitslag.per)
    .filter((v) => v.aantal === laagste)
    .flatMap((v) => v.stemmers)
}

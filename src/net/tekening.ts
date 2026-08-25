import { useEffect, useState } from 'react'
import { ref, onValue, push, remove } from 'firebase/database'
import { db } from './firebase'
import { pad } from './kamer'

/* ─────────────────────────────────────────────────────────────
   Live tekenen.

   De lijnen lopen bewust NIET langs de host-lus. Spellogica hoort daar thuis,
   maar een streep is geen zet — het zou de host tientallen keren per seconde
   laten rekenen en schrijven voor niets.

   In plaats daarvan schrijft de tekenaar zijn strepen rechtstreeks naar
   rooms/<code>/publiek/tekening, en luistert iedereen daar zelf naar. Elke
   streep is één schrijfactie, verstuurd op het moment dat je je vinger
   optilt.

   Punten staan in verhoudingen van 0 tot 1, zodat het op elk schermformaat
   klopt.
   ───────────────────────────────────────────────────────────── */

export interface Streep {
  id: string
  /** ronde waar deze streep bij hoort, zodat oude krabbels niet blijven staan */
  r: number
  kleur: number
  dikte: number
  punten: number[]
}

/** "0.123,0.456,0.789,..." — kort houden scheelt verkeer. */
function pakIn(punten: number[]): string {
  return punten.map((p) => p.toFixed(3)).join(',')
}

function pakUit(tekst: string): number[] {
  return tekst
    .split(',')
    .map(Number)
    .filter((n) => Number.isFinite(n))
}

export async function stuurStreep(
  code: string,
  ronde: number,
  kleur: number,
  dikte: number,
  punten: number[],
): Promise<void> {
  if (punten.length < 2) return
  await push(ref(db(), pad(code, 'tekening')), {
    r: ronde,
    k: kleur,
    d: dikte,
    p: pakIn(punten),
  })
}

/** De laatste streep van deze speler terugnemen. */
export async function wisLaatsteStreep(code: string, id: string): Promise<void> {
  await remove(ref(db(), pad(code, 'tekening', id)))
}

export async function wisTekening(code: string): Promise<void> {
  await remove(ref(db(), pad(code, 'tekening')))
}

export function useTekening(code: string | null, ronde: number): Streep[] {
  const [strepen, zetStrepen] = useState<Streep[]>([])

  useEffect(() => {
    if (!code) return
    return onValue(ref(db(), pad(code, 'tekening')), (snap) => {
      const ruw = snap.val() ?? {}
      const lijst: Streep[] = Object.entries<any>(ruw).map(([id, v]) => ({
        id,
        r: v.r ?? 0,
        kleur: v.k ?? 0,
        dikte: v.d ?? 1,
        punten: pakUit(v.p ?? ''),
      }))
      zetStrepen(lijst)
    })
  }, [code])

  // Alleen de strepen van de ronde die nu bezig is.
  return strepen.filter((s) => s.r === ronde)
}

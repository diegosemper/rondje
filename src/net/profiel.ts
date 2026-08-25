import { EMOJIS } from './kamer'

/* Wat deze telefoon onthoudt tussen sessies: je naam, je emoji, je lobby. */

const SLEUTEL = {
  naam: 'rondje:naam',
  emoji: 'rondje:emoji',
  code: 'rondje:code',
}

function lees(sleutel: string): string | null {
  try {
    return localStorage.getItem(sleutel)
  } catch {
    return null
  }
}

function schrijf(sleutel: string, waarde: string | null): void {
  try {
    if (waarde === null) localStorage.removeItem(sleutel)
    else localStorage.setItem(sleutel, waarde)
  } catch {
    /* privémodus blokkeert dit soms — dan werkt de app gewoon zonder geheugen */
  }
}

/* ─────────────────────────────────────────────────────────────
   Je lobby onthouden we in sessionStorage en niet in localStorage.

   Dat is precies het verschil tussen "ik ververs even" en "ik ben klaar":

   · Pagina verversen, telefoon op slot, even naar een andere app →
     hetzelfde tabblad blijft leven, dus je komt terug waar je was.
   · Tabblad of app helemaal afsluiten → sessionStorage is leeg, dus je
     begint netjes op het beginscherm.

   Je naam en emoji blijven wél in localStorage staan; die wil je juist niet
   elke keer opnieuw invullen.
   ───────────────────────────────────────────────────────────── */

function leesSessie(sleutel: string): string | null {
  try {
    return sessionStorage.getItem(sleutel)
  } catch {
    return null
  }
}

function schrijfSessie(sleutel: string, waarde: string | null): void {
  try {
    if (waarde === null) sessionStorage.removeItem(sleutel)
    else sessionStorage.setItem(sleutel, waarde)
  } catch {
    /* niet erg */
  }
}

export function leesNaam(): string {
  return lees(SLEUTEL.naam) ?? ''
}

export function leesEmoji(): string {
  return lees(SLEUTEL.emoji) ?? EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
}

export function bewaarProfiel(naam: string, emoji: string): void {
  schrijf(SLEUTEL.naam, naam)
  schrijf(SLEUTEL.emoji, emoji)
}

export function leesCode(): string | null {
  return leesSessie(SLEUTEL.code)
}

export function bewaarCode(code: string | null): void {
  schrijfSessie(SLEUTEL.code, code)
  // De code uit de link halen zodra je binnen bent. Anders stapt iemand die
  // de app later opnieuw opent zomaar weer een oude lobby in, alleen omdat
  // de browser het adres met #CODE onthouden had.
  try {
    history.replaceState(null, '', location.pathname + location.search)
  } catch {
    /* niet erg */
  }
}

/** Code uit de link, bijv. https://…/#KRAB */
export function codeUitUrl(): string | null {
  const h = location.hash.replace('#', '').trim().toUpperCase()
  return /^[A-Z]{4}$/.test(h) ? h : null
}

/** De link die je in de groepsapp plakt. */
export function deelLink(code: string): string {
  return `${location.origin}${location.pathname}#${code}`
}

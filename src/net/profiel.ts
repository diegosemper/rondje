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
  return lees(SLEUTEL.code)
}

export function bewaarCode(code: string | null): void {
  schrijf(SLEUTEL.code, code)
  try {
    if (code) history.replaceState(null, '', `#${code}`)
    else history.replaceState(null, '', location.pathname + location.search)
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

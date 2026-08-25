import {
  ref,
  get,
  set,
  update,
  remove,
  push,
  onDisconnect,
  serverTimestamp,
} from 'firebase/database'
import { db, nu } from './firebase'
import type { Kamer, Instelling, Speler, Zwaarte, LogRegel, Fase } from '../engine/types'

export const MAX_SPELERS = 8
export const MIN_SPELERS = 2

/** Geen I, O, 1 of 0 — die worden verkeerd overgetypt in een donkere kroeg. */
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

export const EMOJIS = [
  '🍺', '🍷', '🥃', '🍸', '🦆', '🐙', '🦖', '🐸',
  '🦩', '🐧', '🦊', '🐨', '👻', '🤖', '🎃', '🦄',
]

export function maakCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]
  }
  return code
}

/* ─────────────────────────────────────────────────────────────
   Waarom "publiek" en "prive" naast elkaar staan

   Firebase kan een onderdeel niet verbergen voor iemand die de map erboven
   mag lezen. Zou `prive` ónder de gewone kamerdata hangen, dan kon iedereen
   die de kamer leest ook alle geheime kaarten uitlezen. Daarom:

     rooms/ABCD/publiek/...   iedereen in de kamer mag lezen
     rooms/ABCD/prive/<uid>   alleen die speler (en de host)
     rooms/ABCD/hostState     alleen de host
     rooms/ABCD/acties        gasten schrijven, host leest

   Zo is bluffen in Bussen ook echt bluffen.
   ───────────────────────────────────────────────────────────── */

/** Pad binnen het publieke deel van de kamer. */
export function pad(code: string, ...rest: string[]): string {
  return ['rooms', code, 'publiek', ...rest].join('/')
}

/** Pad op kamerniveau (voor prive, acties, hostState). */
export function padRuw(code: string, ...rest: string[]): string {
  return ['rooms', code, ...rest].join('/')
}

/* ── Lezen: van de ruwe Firebase-vorm naar onze Kamer ────────── */

function lijst(s: string | undefined | null): string[] {
  if (!s) return []
  return s.split(',').filter(Boolean)
}

export function leesKamer(ruw: any, code: string): Kamer | null {
  if (!ruw || !ruw.meta) return null

  const spelers: Record<string, Speler> = {}
  for (const [uid, s] of Object.entries<any>(ruw.spelers ?? {})) {
    spelers[uid] = {
      uid,
      naam: s.naam ?? '?',
      emoji: s.emoji ?? '🍺',
      online: !!s.online,
      laatstGezien: s.laatstGezien ?? 0,
    }
  }

  const log: LogRegel[] = Object.entries<any>(ruw.log ?? {})
    .map(([id, r]) => ({ id, tekst: r.tekst, ts: r.ts ?? 0 }))
    .sort((a, b) => a.ts - b.ts)

  const instelling: Instelling = {
    zwaarte: (ruw.instelling?.zwaarte ?? 'normaal') as Zwaarte,
    spellen: ruw.instelling?.spellen ? lijst(ruw.instelling.spellen) : null,
  }

  return {
    meta: {
      code,
      hostUid: ruw.meta.hostUid,
      fase: (ruw.meta.fase ?? 'lobby') as Fase,
      gemaaktOp: ruw.meta.gemaaktOp ?? 0,
    },
    instelling,
    spelers,
    volgorde: lijst(ruw.volgorde).filter((uid) => spelers[uid]),
    spel: ruw.spel
      ? {
          gameId: ruw.spel.gameId,
          ronde: ruw.spel.ronde ?? 0,
          seed: ruw.spel.seed ?? 1,
          begonOp: ruw.spel.begonOp ?? 0,
          klaar: !!ruw.spel.klaar,
          state: ruw.spel.stateJson ? JSON.parse(ruw.spel.stateJson) : null,
        }
      : null,
    drinkgate: ruw.drinkgate
      ? {
          id: ruw.drinkgate.id ?? '?',
          wachtOp: ruw.drinkgate.wachtOpJson ? JSON.parse(ruw.drinkgate.wachtOpJson) : {},
          klaar: ruw.drinkgate.klaar ?? {},
          sinds: ruw.drinkgate.sinds ?? 0,
        }
      : null,
    score: ruw.score ?? {},
    log,
    skip: ruw.skip ?? {},
    gereed: ruw.gereed ?? {},
    geschiedenis: lijst(ruw.geschiedenis),
  }
}

/* ── Schrijven ──────────────────────────────────────────────── */

export async function maakKamer(uid: string, naam: string, emoji: string): Promise<string> {
  // Probeer een paar codes; de kans op botsing is klein maar niet nul.
  for (let poging = 0; poging < 8; poging++) {
    const code = maakCode()
    const bestaat = await get(ref(db(), pad(code, 'meta')))
    if (bestaat.exists()) continue

    await set(ref(db(), pad(code)), {
      meta: { code, hostUid: uid, fase: 'lobby', gemaaktOp: serverTimestamp() },
      instelling: { zwaarte: 'normaal' },
      spelers: { [uid]: { naam, emoji, online: true, laatstGezien: serverTimestamp() } },
      volgorde: uid,
      score: { [uid]: { uitgedeeld: 0, gedronken: 0 } },
    })
    return code
  }
  throw new Error('Kon geen vrije lobbycode vinden. Probeer het nog eens.')
}

export type JoinFout = 'bestaat-niet' | 'vol'

export async function joinKamer(
  code: string,
  uid: string,
  naam: string,
  emoji: string,
): Promise<JoinFout | null> {
  const snap = await get(ref(db(), pad(code)))
  if (!snap.exists()) return 'bestaat-niet'

  const ruw = snap.val()
  const spelers = ruw.spelers ?? {}
  const zatErAl = !!spelers[uid]

  if (!zatErAl && Object.keys(spelers).length >= MAX_SPELERS) return 'vol'

  const volgorde = lijst(ruw.volgorde)
  if (!volgorde.includes(uid)) volgorde.push(uid)

  const wijziging: Record<string, any> = {
    [`spelers/${uid}`]: { naam, emoji, online: true, laatstGezien: serverTimestamp() },
    volgorde: volgorde.join(','),
  }
  if (!ruw.score?.[uid]) wijziging[`score/${uid}`] = { uitgedeeld: 0, gedronken: 0 }

  await update(ref(db(), pad(code)), wijziging)
  return null
}

/** Meld dat je online bent, en laat Firebase je afmelden als je wegvalt. */
export async function meldAanwezig(code: string, uid: string): Promise<void> {
  const mij = ref(db(), pad(code, 'spelers', uid))
  await onDisconnect(mij).update({ online: false, laatstGezien: serverTimestamp() })
  await update(mij, { online: true, laatstGezien: serverTimestamp() })
}

export async function verlaatKamer(code: string, uid: string): Promise<void> {
  const snap = await get(ref(db(), pad(code)))
  if (!snap.exists()) return
  const ruw = snap.val()
  const volgorde = lijst(ruw.volgorde).filter((u) => u !== uid)

  await update(ref(db(), pad(code)), {
    [`spelers/${uid}`]: null,
    [`skip/${uid}`]: null,
    volgorde: volgorde.join(','),
  })
  await remove(ref(db(), padRuw(code, 'prive', uid)))

  // Was de host weg en zit er nog iemand? Geef het stokje door.
  if (ruw.meta?.hostUid === uid && volgorde.length > 0) {
    await update(ref(db(), pad(code, 'meta')), { hostUid: volgorde[0] })
  }
}

export async function zetZwaarte(code: string, zwaarte: Zwaarte): Promise<void> {
  await update(ref(db(), pad(code, 'instelling')), { zwaarte })
}

export async function zetSpellen(code: string, ids: string[] | null): Promise<void> {
  await update(ref(db(), pad(code, 'instelling')), { spellen: ids ? ids.join(',') : null })
}

export async function zetFase(code: string, fase: Fase): Promise<void> {
  await update(ref(db(), pad(code, 'meta')), { fase })
}

export async function zetNaam(
  code: string,
  uid: string,
  naam: string,
  emoji: string,
): Promise<void> {
  await update(ref(db(), pad(code, 'spelers', uid)), { naam, emoji })
}

/* ── Acties: van gast naar host ─────────────────────────────── */

export async function stuurActie(
  code: string,
  uid: string,
  type: string,
  payload?: any,
): Promise<void> {
  await push(ref(db(), padRuw(code, 'acties')), {
    uid,
    type,
    payloadJson: payload === undefined ? null : JSON.stringify(payload),
    ts: nu(),
  })
}

/* ── Skip ───────────────────────────────────────────────────── */

export async function zetSkip(code: string, uid: string, aan: boolean): Promise<void> {
  const r = ref(db(), pad(code, 'skip', uid))
  if (aan) await set(r, true)
  else await remove(r)
}

export async function wisSkip(code: string): Promise<void> {
  await remove(ref(db(), pad(code, 'skip')))
}

/* ── Drinkpauze ─────────────────────────────────────────────── */

/** "Ik heb gedronken" — het spel gaat pas door als iedereen dit getikt heeft. */
export async function zetGedronken(code: string, uid: string): Promise<void> {
  await set(ref(db(), pad(code, 'drinkgate', 'klaar', uid)), true)
}

/* ── "Snap ik" op het uitlegscherm ──────────────────────────── */

export async function zetGereed(code: string, uid: string): Promise<void> {
  await set(ref(db(), pad(code, 'gereed', uid)), true)
}

export async function wisGereed(code: string): Promise<void> {
  await remove(ref(db(), pad(code, 'gereed')))
}

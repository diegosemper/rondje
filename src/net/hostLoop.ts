import { useEffect, useRef } from 'react'
import {
  ref,
  onChildAdded,
  get,
  update,
  remove,
  push,
  increment,
} from 'firebase/database'
import { db, nu } from './firebase'
import { pad, padRuw } from './kamer'
import { geefSpel } from '../engine/registry'
import { stripGeheim, kopie } from '../engine/geheim'
import { maakRng, nieuweSeed } from '../engine/random'
import { berekenSlokken, slokTekst, werkwoord } from '../engine/slokken'
import { meldFout } from '../ui/Fout'
import type { Actie, Kamer, SpelContext, Speler } from '../engine/types'

/* ─────────────────────────────────────────────────────────────
   De host-telefoon is de spelleider.

   Gasten sturen alleen "ik druk op deze knop". Deze lus leest die acties,
   draait de spellogica, en schrijft de nieuwe stand terug. Zo kunnen twee
   telefoons het nooit oneens worden over wie er aan de beurt is.
   ───────────────────────────────────────────────────────────── */

interface Effecten {
  gedronken: Record<string, number>
  uitgedeeld: Record<string, number>
  prive: Record<string, any | null>
  priveWisAlles: boolean
  logs: string[]
  klaar: boolean
}

function leegEffect(): Effecten {
  return {
    gedronken: {},
    uitgedeeld: {},
    prive: {},
    priveWisAlles: false,
    logs: [],
    klaar: false,
  }
}

/** Bouwt het gereedschap dat init() en reduce() van een spel mogen gebruiken. */
function maakContext(kamer: Kamer, seed: number, eff: Effecten): SpelContext {
  const zwaarte = kamer.instelling.zwaarte
  const spelers: Speler[] = kamer.volgorde.map((uid) => kamer.spelers[uid]).filter(Boolean)
  const rng = maakRng(seed)
  const naam = (uid: string) => kamer.spelers[uid]?.naam ?? '?'

  const drink = (uid: string, ruw: number, reden?: string) => {
    const aantal = berekenSlokken(ruw, zwaarte)
    if (aantal <= 0) return
    eff.gedronken[uid] = (eff.gedronken[uid] ?? 0) + aantal
    eff.logs.push(
      `${naam(uid)} ${werkwoord(zwaarte)} ${slokTekst(aantal, zwaarte)}${reden ? ` — ${reden}` : ''}`,
    )
  }

  return {
    spelers,
    zwaarte,
    rng,
    nu: nu(),

    drink,

    deelUit(van, naar, ruw, reden) {
      const aantal = berekenSlokken(ruw, zwaarte)
      if (aantal <= 0) return
      eff.uitgedeeld[van] = (eff.uitgedeeld[van] ?? 0) + aantal
      eff.gedronken[naar] = (eff.gedronken[naar] ?? 0) + aantal
      eff.logs.push(
        `${naam(van)} geeft ${naam(naar)} ${slokTekst(aantal, zwaarte)}${reden ? ` — ${reden}` : ''}`,
      )
    },

    iedereenDrinkt(ruw, reden, behalve = []) {
      const aantal = berekenSlokken(ruw, zwaarte)
      if (aantal <= 0) return
      for (const s of spelers) {
        if (behalve.includes(s.uid)) continue
        eff.gedronken[s.uid] = (eff.gedronken[s.uid] ?? 0) + aantal
      }
      eff.logs.push(
        `Iedereen ${werkwoord(zwaarte)} ${slokTekst(aantal, zwaarte)}${reden ? ` — ${reden}` : ''}`,
      )
    },

    zetPrive(uid, data) {
      eff.prive[uid] = data
    },

    wisPrive(uid) {
      if (uid) eff.prive[uid] = null
      else eff.priveWisAlles = true
    },

    log(tekst) {
      eff.logs.push(tekst)
    },

    klaar() {
      eff.klaar = true
    },

    speler: (uid) => kamer.spelers[uid],
    naam,
  }
}

/** Schrijft alles wat een zet opleverde in één klap weg. */
async function schrijfWeg(
  kamer: Kamer,
  state: any,
  eff: Effecten,
  extra: Record<string, any> = {},
): Promise<void> {
  const code = kamer.meta.code

  // Een "wis alles" en een "zet deze" in dezelfde update botsen bij Firebase,
  // dus dat doen we los en eerst.
  if (eff.priveWisAlles) {
    await remove(ref(db(), padRuw(code, 'prive')))
  }

  const u: Record<string, any> = { ...extra }

  if (state !== undefined) {
    u[pad(code, 'spel/stateJson')] = JSON.stringify(stripGeheim(state))
    u[padRuw(code, 'hostState')] = JSON.stringify(state)
  }
  if (eff.klaar) u[pad(code, 'spel/klaar')] = true

  // increment() laat de server optellen — zo raakt de stand niet in de war
  // als er twee acties vlak achter elkaar binnenkomen.
  for (const [uid, n] of Object.entries(eff.gedronken)) {
    u[pad(code, 'score', uid, 'gedronken')] = increment(n)
  }
  for (const [uid, n] of Object.entries(eff.uitgedeeld)) {
    u[pad(code, 'score', uid, 'uitgedeeld')] = increment(n)
  }

  for (const [uid, data] of Object.entries(eff.prive)) {
    u[padRuw(code, 'prive', uid)] = data === null ? null : JSON.stringify(data)
  }

  const t = nu()
  eff.logs.forEach((tekst, i) => {
    const sleutel = push(ref(db(), pad(code, 'log'))).key!
    u[pad(code, 'log', sleutel)] = { tekst, ts: t + i }
  })

  // Het logboek kort houden.
  const teveel = kamer.log.length + eff.logs.length - 40
  if (teveel > 0) {
    for (const oud of kamer.log.slice(0, teveel)) {
      u[pad(code, 'log', oud.id)] = null
    }
  }

  controleerPaden(u)
  await update(ref(db()), u)
}

/**
 * Firebase weigert een update die tegelijk een map beschrijft én iets binnen
 * die map. De foutmelding daarvan is cryptisch, dus vangen we het hier af met
 * een tekst waar je wat aan hebt. Kost niets en scheelt zoeken bij elk nieuw
 * spel dat we toevoegen.
 */
function controleerPaden(u: Record<string, any>): void {
  const paden = Object.keys(u)
  for (const a of paden) {
    for (const b of paden) {
      if (a !== b && b.startsWith(a + '/')) {
        throw new Error(
          `Kan niet tegelijk "${a}" en "${b}" schrijven — de een zit in de ander. ` +
            `Schrijf de losse velden van "${a}", of ruim "${a}" eerst apart op.`,
        )
      }
    }
  }
}

/* ── Commando's die de host kan geven ───────────────────────── */

/** Zet een spel klaar en ga naar het uitlegscherm. */
export async function startSpel(kamer: Kamer, gameId: string): Promise<void> {
  const mod = geefSpel(gameId)
  if (!mod) throw new Error(`Onbekend spel: ${gameId}`)

  const code = kamer.meta.code
  const seed = nieuweSeed()
  const eff = leegEffect()
  const ctx = maakContext(kamer, seed, eff)
  const state = mod.init(ctx)

  // Eerst het oude spel helemaal weg. Dat moet los, want Firebase weigert een
  // update die tegelijk een map wist én iets binnen die map schrijft.
  await remove(ref(db(), padRuw(code, 'prive')))
  await remove(ref(db(), padRuw(code, 'acties')))
  await remove(ref(db(), pad(code, 'spel')))

  const geschiedenis = [...kamer.geschiedenis.filter((g) => g !== gameId), gameId]

  // Om dezelfde reden schrijven we de velden van `spel` los, en niet het blok
  // in één keer: schrijfWeg zet er `spel/stateJson` bij.
  await schrijfWeg(kamer, state, eff, {
    [pad(code, 'spel/gameId')]: gameId,
    [pad(code, 'spel/ronde')]: 0,
    [pad(code, 'spel/seed')]: seed,
    [pad(code, 'spel/begonOp')]: nu(),
    [pad(code, 'spel/klaar')]: false,
    [pad(code, 'meta/fase')]: 'uitleg',
    [pad(code, 'skip')]: null,
    [pad(code, 'gereed')]: null,
    [pad(code, 'geschiedenis')]: geschiedenis.join(','),
  })
}

/** Van het uitlegscherm naar het spel zelf. */
export async function beginSpel(code: string): Promise<void> {
  await update(ref(db(), pad(code, 'meta')), { fase: 'spel' })
}

/** Spel afgelopen of overgeslagen → terug naar de spelkiezer. */
export async function stopSpel(code: string): Promise<void> {
  await remove(ref(db(), padRuw(code, 'prive')))
  await remove(ref(db(), padRuw(code, 'acties')))
  await remove(ref(db(), padRuw(code, 'hostState')))
  await update(ref(db()), {
    [pad(code, 'meta/fase')]: 'kiezen',
    [pad(code, 'spel')]: null,
    [pad(code, 'skip')]: null,
    [pad(code, 'gereed')]: null,
  })
}

export async function naarFase(code: string, fase: string): Promise<void> {
  await update(ref(db(), pad(code, 'meta')), { fase })
}

/* ── De lus zelf ────────────────────────────────────────────── */

export function useHostLoop(kamer: Kamer | null, uid: string | null): void {
  const kamerRef = useRef<Kamer | null>(kamer)
  kamerRef.current = kamer

  const stateRef = useRef<any>(null)
  const wachtrij = useRef<Promise<void>>(Promise.resolve())

  const code = kamer?.meta.code ?? null
  const benHost = !!kamer && !!uid && kamer.meta.hostUid === uid
  const gameId = kamer?.spel?.gameId ?? null

  // De volledige toestand (inclusief geheimen) uit de database halen, zodat
  // de host een refresh of tabwissel overleeft.
  useEffect(() => {
    if (!benHost || !code) return
    let levend = true
    get(ref(db(), padRuw(code, 'hostState')))
      .then((snap) => {
        if (!levend) return
        const ruw = snap.val()
        stateRef.current = ruw ? JSON.parse(ruw) : null
      })
      .catch(() => {})
    return () => {
      levend = false
    }
  }, [benHost, code, gameId])

  // Acties van gasten verwerken, netjes één voor één.
  useEffect(() => {
    if (!benHost || !code) return

    const stop = onChildAdded(ref(db(), padRuw(code, 'acties')), (snap) => {
      wachtrij.current = wachtrij.current
        .then(() => verwerk(snap.key!, snap.val()))
        .catch(meldFout)
    })

    async function verwerk(sleutel: string, ruw: any) {
      const huidig = kamerRef.current
      const wisActie = () => remove(ref(db(), padRuw(code!, 'acties', sleutel)))

      if (!huidig?.spel || huidig.spel.klaar || huidig.meta.fase !== 'spel') {
        await wisActie()
        return
      }

      const mod = geefSpel(huidig.spel.gameId)
      if (!mod) {
        await wisActie()
        return
      }

      // Nog geen toestand in het geheugen (host is net herstart)? Haal 'm op.
      if (stateRef.current == null) {
        const snap = await get(ref(db(), padRuw(code!, 'hostState')))
        stateRef.current = snap.val() ? JSON.parse(snap.val()) : huidig.spel.state
      }

      const actie: Actie = {
        id: sleutel,
        uid: ruw.uid,
        type: ruw.type,
        payload: ruw.payloadJson ? JSON.parse(ruw.payloadJson) : undefined,
        ts: ruw.ts ?? nu(),
      }

      const werk = kopie(stateRef.current)
      const eff = leegEffect()
      const ctx = maakContext(huidig, huidig.spel.seed + (huidig.spel.ronde ?? 0), eff)

      mod.reduce(werk, actie, ctx)
      if (!eff.klaar && mod.isKlaar?.(werk)) eff.klaar = true

      await schrijfWeg(huidig, werk, eff)
      stateRef.current = werk
      await wisActie()
    }

    return () => {
      stop()
    }
  }, [benHost, code])

  // Skip: de host skipt meteen, een gast stelt voor en bij meer dan de helft
  // gaat de app door.
  useEffect(() => {
    if (!benHost || !code || !kamer) return
    if (kamer.meta.fase !== 'spel' && kamer.meta.fase !== 'uitleg') return

    const stemmen = Object.keys(kamer.skip).filter((u) => kamer.spelers[u]).length
    const aanwezig = Object.keys(kamer.spelers).length
    if (stemmen === 0) return

    if (kamer.skip[kamer.meta.hostUid] || stemmen * 2 > aanwezig) {
      stopSpel(code).catch(meldFout)
    }
  }, [benHost, code, kamer])
}

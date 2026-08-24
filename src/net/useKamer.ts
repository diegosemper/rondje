import { useEffect, useRef, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db, login, volgServerTijd, nu as serverNu, isIngesteld } from './firebase'
import { leesKamer, meldAanwezig, pad, padRuw } from './kamer'
import type { Kamer } from '../engine/types'

/** Logt anoniem in en geeft je eigen uid terug. */
export function useUid(): { uid: string | null; fout: string | null } {
  const [uid, zetUid] = useState<string | null>(null)
  const [fout, zetFout] = useState<string | null>(null)

  useEffect(() => {
    if (!isIngesteld()) return
    let levend = true
    const stopKlok = volgServerTijd()
    login()
      .then((u) => levend && zetUid(u))
      .catch((e) => levend && zetFout(String(e?.message ?? e)))
    return () => {
      levend = false
      stopKlok()
    }
  }, [])

  return { uid, fout }
}

/**
 * Een klok die doortikt, zodat aftellers vanzelf bijwerken.
 * Alleen gebruiken op schermen die het echt nodig hebben.
 */
export function useNu(intervalMs = 250): number {
  const [t, zetT] = useState(() => (isIngesteld() ? serverNu() : Date.now()))
  useEffect(() => {
    const id = setInterval(() => zetT(isIngesteld() ? serverNu() : Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return t
}

export interface KamerHaak {
  kamer: Kamer | null
  /** wat alleen ik mag zien in het huidige spel */
  prive: any
  laden: boolean
  /** de kamer bestaat niet (meer) */
  weg: boolean
}

export function useKamer(code: string | null, uid: string | null): KamerHaak {
  const [kamer, zetKamer] = useState<Kamer | null>(null)
  const [prive, zetPrive] = useState<any>(null)
  const [laden, zetLaden] = useState(true)
  const [weg, zetWeg] = useState(false)

  useEffect(() => {
    if (!code || !uid) {
      zetKamer(null)
      zetPrive(null)
      zetLaden(false)
      return
    }

    zetLaden(true)
    zetWeg(false)

    const stopKamer = onValue(ref(db(), pad(code)), (snap) => {
      const ruw = snap.val()
      const gelezen = leesKamer(ruw, code)
      zetKamer(gelezen)
      zetWeg(!gelezen)
      zetLaden(false)
    })

    const stopPrive = onValue(ref(db(), padRuw(code, 'prive', uid)), (snap) => {
      const ruw = snap.val()
      zetPrive(ruw ? JSON.parse(ruw) : null)
    })

    return () => {
      stopKamer()
      stopPrive()
    }
  }, [code, uid])

  // Aanwezigheid: meld dat ik er ben en laat Firebase me afmelden als ik wegval.
  const gemeld = useRef<string | null>(null)
  useEffect(() => {
    if (!code || !uid) return
    const sleutel = `${code}:${uid}`
    if (gemeld.current === sleutel) return
    gemeld.current = sleutel
    meldAanwezig(code, uid).catch(() => {})

    // Terugkomen uit de achtergrond (scherm was uit) → opnieuw melden.
    const bijZichtbaar = () => {
      if (document.visibilityState === 'visible') meldAanwezig(code, uid).catch(() => {})
    }
    document.addEventListener('visibilitychange', bijZichtbaar)
    return () => {
      document.removeEventListener('visibilitychange', bijZichtbaar)
      gemeld.current = null
    }
  }, [code, uid])

  return { kamer, prive, laden, weg }
}

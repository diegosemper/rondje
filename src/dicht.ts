import { useEffect, useState } from 'react'
import type { Beheer } from './net/beheer'
import { leesBeheer } from './net/beheer'

/* -----------------------------------------------------------------
   OPEN OF DICHT?

   Er zijn twee knoppen die hetzelfde doen, omdat er twee manieren zijn om
   eraan te draaien:

   1. public/status.json -- omgezet vanaf de laptop en meegepubliceerd.
   2. /beheer in de database -- omgezet vanaf de telefoon, via het
      beheerscherm. Werkt meteen, zonder wachten op publiceren.

   Welke wint? Degene waar het laatst aan gedraaid is. Beide dragen een
   tijdstip met zich mee, en het nieuwste tijdstip geldt. Dat is de enige
   regel die je hoeft te onthouden, en hij klopt met wat je verwacht: wat je
   als laatste hebt gezegd, is wat er staat.

   Waarom status.json en niet alleen de code: GitHub Pages laat de browser
   index.html tien minuten bewaren (Cache-Control: max-age=600). Zat de
   schakelaar in de code, dan laadde een telefoon die de app al eens geopend
   had in die tien minuten nog gewoon de oude versie -- de app stond dan
   dicht, maar je kon vrolijk doorspelen. status.json wordt daarom apart
   opgehaald met een uniek getal achter het adres en cache: 'no-store'.

   Alle twee worden alleen bij het opstarten gelezen, niet doorlopend. Wie de
   app al open heeft staan speelt zijn potje uit en merkt het pas bij de
   volgende keer openen. Een lopend spel hoort niet halverwege dood te vallen.
   ----------------------------------------------------------------- */

export interface Status {
  dicht: boolean
  titel: string
  tekst: string
  /** wanneer er voor het laatst aan gedraaid is */
  sinds: number
}

/** Waar we op terugvallen als er niets op te halen valt. */
export const OPEN: Status = {
  dicht: false,
  titel: 'Even dicht',
  tekst: 'DORST! is nu even niet open. Probeer het later nog eens.',
  sinds: 0,
}

/** Zo lang wachten we op status.json. Daarna gaat de deur gewoon open. */
const GEDULD_MS = 4000

export async function haalStatus(): Promise<Status> {
  const stop = new AbortController()
  const klok = setTimeout(() => stop.abort(), GEDULD_MS)
  try {
    const adres = `${import.meta.env.BASE_URL}status.json?t=${Date.now()}`
    const antwoord = await fetch(adres, { cache: 'no-store', signal: stop.signal })
    if (!antwoord.ok) return OPEN

    // Met de hand uitpakken, want dit bestand zet ik zelf in elkaar en een
    // typefout erin mag niet betekenen dat de app niet meer opstart.
    const rauw = (await antwoord.json()) as Partial<Status>
    return {
      dicht: rauw.dicht === true,
      titel: typeof rauw.titel === 'string' && rauw.titel ? rauw.titel : OPEN.titel,
      tekst: typeof rauw.tekst === 'string' && rauw.tekst ? rauw.tekst : OPEN.tekst,
      sinds: Number(rauw.sinds) || 0,
    }
  } catch {
    // Geen internet, of het duurde te lang. Dan maar open: een haperende
    // verbinding hoort niet iedereen buiten te sluiten.
    return OPEN
  } finally {
    clearTimeout(klok)
  }
}

/** Van de twee standen degene waar het laatst aan gedraaid is. */
export function nieuwste(bestand: Status, live: Beheer | null): Status {
  if (!live) return bestand
  if (live.sinds <= bestand.sinds) return bestand
  return {
    dicht: live.dicht,
    titel: live.titel || bestand.titel,
    tekst: live.tekst || bestand.tekst,
    sinds: live.sinds,
  }
}

/**
 * null zolang we het nog niet weten.
 *
 * `uid` mag null zijn zolang het aanmelden loopt; dan wachten we daarop.
 * Is Firebase helemaal niet beschikbaar, geef dan `firebaseOverslaan` mee,
 * anders blijft de app op het opstartscherm hangen.
 */
export function useStatus(uid: string | null, firebaseOverslaan = false): Status | null {
  const [bestand, zetBestand] = useState<Status | null>(null)
  const [live, zetLive] = useState<Beheer | null | undefined>(undefined)

  useEffect(() => {
    let levend = true
    haalStatus().then((s) => levend && zetBestand(s))
    return () => {
      levend = false
    }
  }, [])

  useEffect(() => {
    if (firebaseOverslaan) return zetLive(null)
    if (!uid) return
    let levend = true
    leesBeheer()
      .then((b) => levend && zetLive(b))
      .catch(() => levend && zetLive(null))
    return () => {
      levend = false
    }
  }, [uid, firebaseOverslaan])

  if (!bestand || live === undefined) return null
  return nieuwste(bestand, live)
}

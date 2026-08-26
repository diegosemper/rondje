import { useEffect, useState } from 'react'

/* -----------------------------------------------------------------
   DE SCHAKELAAR

   Of DORST! open of dicht is staat in public/status.json, niet hier in de
   code. Dat is met opzet, en het was eerst andersom.

   Waarom het verhuisd is: GitHub Pages laat de browser index.html tien
   minuten bewaren (Cache-Control: max-age=600). Zat de schakelaar in de
   code, dan laadde een telefoon die de app al eens geopend had in die tien
   minuten nog gewoon de oude versie. De app stond dan dicht, maar op je
   telefoon kon je vrolijk verder spelen. Precies het gat waar we in liepen:
   de ene dag werkte het, de andere dag niet, puur afhankelijk van hoeveel
   minuten er tussen zaten.

   status.json wordt bij elke start opgehaald met een uniek getal achter het
   adres en cache: 'no-store'. Daarmee kan noch de browser, noch het netwerk
   van GitHub er een bewaard antwoord tussen schuiven.

   Alleen bij het opstarten, niet doorlopend. Wie de app al open heeft staan
   speelt gewoon uit en merkt het pas bij de volgende keer openen. Dat is de
   bedoeling: een lopend potje hoort niet halverwege dood te vallen.
   ----------------------------------------------------------------- */

export interface Status {
  dicht: boolean
  titel: string
  tekst: string
}

/** Waar we op terugvallen als status.json niet op te halen is. */
const OPEN: Status = {
  dicht: false,
  titel: 'Even dicht',
  tekst: 'DORST! is nu even niet open. Probeer het later nog eens.',
}

/** Zo lang wachten we op antwoord. Daarna gaat de deur gewoon open. */
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
    }
  } catch {
    // Geen internet, of het duurde te lang. Dan maar open: een haperende
    // verbinding hoort niet iedereen buiten te sluiten.
    return OPEN
  } finally {
    clearTimeout(klok)
  }
}

/** null zolang we het nog niet weten. */
export function useStatus(): Status | null {
  const [status, zetStatus] = useState<Status | null>(null)

  useEffect(() => {
    let levend = true
    haalStatus().then((s) => {
      if (levend) zetStatus(s)
    })
    return () => {
      levend = false
    }
  }, [])

  return status
}

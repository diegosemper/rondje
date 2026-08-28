/* -----------------------------------------------------------------
   DRAAIEN WE WEL DE NIEUWSTE VERSIE?

   GitHub Pages stuurt index.html mee met Cache-Control: max-age=600. Een
   telefoon mag die dus tien minuten bewaren, en een app die op je beginscherm
   staat houdt hem soms nog veel langer vast. Het gevolg is dat een wijziging
   op de laptop wél te zien is en op de telefoon niet -- en dat je je scheel
   zoekt naar een fout die er niet meer is.

   Bij elke bouw komt er een versie.json naast de app te staan met het stempel
   van die bouw. Dat bestand halen we op met een uniek getal erachter en
   cache: 'no-store', dus daar kan niets tussen zitten. Verschilt het van het
   stempel dat in deze code zit, dan draaien we iets ouds en halen we de
   pagina opnieuw op onder een ander adres -- want gewoon herladen levert
   precies dezelfde kopie uit het geheugen op.

   Het adres onthoudt welk stempel we probeerden te halen. Lukt het dan nog
   niet, dan blijft het daarbij: liever een oude versie dan een telefoon die
   zichzelf eindeloos blijft herladen.
   ----------------------------------------------------------------- */

const PARAM = 'v'
const GEDULD_MS = 4000

/**
 * Waar we heen moeten, of null als we kunnen blijven waar we zijn.
 *
 * Apart gehouden van het ophalen, want dit is het stukje dat stuk kan: een
 * telefoon die zichzelf eindeloos herlaadt is erger dan een telefoon met een
 * oude versie.
 */
export function bepaalHerlaadAdres(
  pad: string,
  zoek: string,
  hash: string,
  hier: string,
  nieuwste: string | null,
): string | null {
  if (!nieuwste || nieuwste === hier) return null

  const params = new URLSearchParams(zoek)
  // Al een keer geprobeerd onder dit stempel? Dan houdt het hier op.
  if (params.get(PARAM) === nieuwste) return null

  params.set(PARAM, nieuwste)
  return `${pad}?${params.toString()}${hash}`
}

export async function controleerVersie(): Promise<void> {
  try {
    const stop = new AbortController()
    const klok = setTimeout(() => stop.abort(), GEDULD_MS)
    let nieuwste: string | null = null
    try {
      const adres = `${import.meta.env.BASE_URL}versie.json?t=${Date.now()}`
      const antwoord = await fetch(adres, { cache: 'no-store', signal: stop.signal })
      if (!antwoord.ok) return
      const rauw = (await antwoord.json()) as { build?: unknown }
      nieuwste = typeof rauw.build === 'string' && rauw.build ? rauw.build : null
    } finally {
      clearTimeout(klok)
    }

    const heen = bepaalHerlaadAdres(
      location.pathname,
      location.search,
      location.hash,
      __BUILD__,
      nieuwste,
    )
    if (heen) location.replace(heen)
  } catch {
    // Geen verbinding, of het duurde te lang. Dan spelen we door met wat we
    // hebben; buitensluiten om een versiecontrole is erger dan de kwaal.
  }
}

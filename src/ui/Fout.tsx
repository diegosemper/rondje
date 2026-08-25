import { useEffect, useState } from 'react'

/* ─────────────────────────────────────────────────────────────
   Zichtbare fouten.

   Zonder dit ziet een geweigerde schrijfactie van Firebase eruit als "de knop
   doet niks" — en dan zoek je je scheel. Alles wat mis kan gaan loopt hier
   langs en komt bovenaan het scherm te staan.
   ───────────────────────────────────────────────────────────── */

type Luisteraar = (tekst: string) => void
const luisteraars = new Set<Luisteraar>()

export function meldFout(e: unknown): void {
  const ruw = (e as any)?.message ?? String(e)
  luisteraars.forEach((l) => l(vertaal(ruw)))
  console.error('[dorst]', e)
}

/** Firebase-taal omzetten naar iets waar je wat aan hebt. */
function vertaal(bericht: string): string {
  if (/permission_denied|PERMISSION_DENIED/i.test(bericht)) {
    return 'Firebase weigert dit. Staan de databaseregels uit database.rules.json goed gepubliceerd?'
  }
  if (/operation-not-allowed/i.test(bericht)) {
    return 'Anonieme login staat uit in Firebase (Authentication → Sign-in method → Anoniem).'
  }
  if (/network|offline|unavailable/i.test(bericht)) {
    return 'Geen verbinding met Firebase. Check je internet.'
  }
  return bericht
}

/** Handig als afsluiter van een belofte: .catch(meldFout) */
export function FoutBanner() {
  const [tekst, zetTekst] = useState<string | null>(null)

  useEffect(() => {
    const l: Luisteraar = (t) => zetTekst(t)
    luisteraars.add(l)
    return () => {
      luisteraars.delete(l)
    }
  }, [])

  if (!tekst) return null

  return (
    <div
      onClick={() => zetTekst(null)}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        left: 8,
        right: 8,
        zIndex: 200,
        padding: '12px 14px',
        borderRadius: 'var(--straal-klein)',
        background: 'var(--rood)',
        color: '#fff',
        fontSize: 14,
        lineHeight: 1.35,
        boxShadow: '0 8px 24px rgba(0,0,0,.5)',
      }}
    >
      <strong>Er ging iets mis</strong>
      <div style={{ marginTop: 4 }}>{tekst}</div>
      <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>tik om weg te halen</div>
    </div>
  )
}

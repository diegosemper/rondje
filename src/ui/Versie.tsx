/* ─────────────────────────────────────────────────────────────
   Versiewaarschuwing.

   Telefoons bewaren een geopende webpagina soms hardnekkig lang, zeker als je
   hem op je beginscherm hebt gezet. Je kunt dan met z'n vijven in dezelfde
   lobby zitten terwijl er iemand een oudere uitvoering draait — en dan werkt
   een spel bij hem net anders zonder dat iemand snapt waarom.

   Deze balk vergelijkt de bouw van deze telefoon met die van de host en biedt
   aan om te herladen. Met een tijdstempel erachter, want zonder dat haalt de
   telefoon gewoon opnieuw hetzelfde uit zijn geheugen.
   ───────────────────────────────────────────────────────────── */

export function Versiebalk({ hostVersie }: { hostVersie: string | null }) {
  if (!hostVersie || hostVersie === __BUILD__) return null

  return (
    <div
      onClick={() => {
        location.href = `${location.pathname}?v=${Date.now()}`
      }}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        left: 8,
        right: 8,
        zIndex: 150,
        padding: '10px 14px',
        borderRadius: 'var(--straal-klein)',
        background: 'var(--goud)',
        color: '#1a1205',
        fontSize: 14,
        fontWeight: 700,
        textAlign: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,.5)',
      }}
    >
      Je draait een oude versie — tik om te herladen
    </div>
  )
}

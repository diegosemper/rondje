import { useMemo } from 'react'

/* ─────────────────────────────────────────────────────────────
   De kroegachtergrond van het beginscherm.

   Warm hout, een lamp die van bovenaf schijnt, donkere randen en wat
   lichtvlekken die traag omhoog drijven. Allemaal met verlopen gemaakt en
   zonder plaatjes: dat laadt meteen en past zich aan elk scherm aan.

   Staat alleen op het start- en opstartscherm. De spelschermen blijven donker
   en rustig — daar moet je een kaart kunnen aflezen.
   ───────────────────────────────────────────────────────────── */

const VLEKKEN = 10

export function Kroeg() {
  const vlekken = useMemo(
    () =>
      Array.from({ length: VLEKKEN }, (_, i) => ({
        id: i,
        links: Math.random() * 100,
        maat: 26 + Math.random() * 70,
        duur: 16 + Math.random() * 16,
        wacht: -Math.random() * 26,
      })),
    [],
  )

  return (
    <div className="kroeg" aria-hidden="true">
      {vlekken.map((v) => (
        <span
          key={v.id}
          className="vlek"
          style={{
            left: `${v.links}%`,
            width: v.maat,
            height: v.maat,
            animationDuration: `${v.duur}s`,
            animationDelay: `${v.wacht}s`,
          }}
        />
      ))}
    </div>
  )
}

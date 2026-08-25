import { useMemo } from 'react'

/* ─────────────────────────────────────────────────────────────
   Feestelijke achtergrond: opstijgende belletjes en een warme gloed.

   Staat alleen op het start- en opstartscherm. De spelschermen houden we
   rustig — daar moet je iets kunnen aflezen, en dan is bewegend behang
   alleen maar in de weg.

   De belletjes worden één keer uitgerekend en daarna nooit meer, zodat ze
   niet bij elke hertekening opnieuw beginnen.
   ───────────────────────────────────────────────────────────── */

const AANTAL = 14

export function Feest() {
  const bellen = useMemo(
    () =>
      Array.from({ length: AANTAL }, (_, i) => {
        const maat = 8 + Math.random() * 26
        return {
          id: i,
          links: Math.random() * 100,
          maat,
          duur: 9 + Math.random() * 11,
          wacht: -Math.random() * 16,
        }
      }),
    [],
  )

  return (
    <div className="feest" aria-hidden="true">
      {bellen.map((b) => (
        <span
          key={b.id}
          className="bel"
          style={{
            left: `${b.links}%`,
            width: b.maat,
            height: b.maat,
            animationDuration: `${b.duur}s`,
            animationDelay: `${b.wacht}s`,
          }}
        />
      ))}
    </div>
  )
}

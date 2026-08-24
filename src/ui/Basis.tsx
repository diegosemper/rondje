import type { ReactNode } from 'react'
import type { Speler } from '../engine/types'

/* De handvol bouwsteentjes die in bijna elk scherm terugkomen. */

export function GroteKnop({
  children,
  kleur = 'grijs',
  enorm = false,
  klein = false,
  uit = false,
  bijTik,
}: {
  children: ReactNode
  kleur?: 'grijs' | 'goud' | 'rood' | 'groen' | 'leeg'
  enorm?: boolean
  klein?: boolean
  uit?: boolean
  bijTik?: () => void
}) {
  const klassen = ['knop']
  if (kleur !== 'grijs') klassen.push(kleur)
  if (enorm) klassen.push('enorm')
  if (klein) klassen.push('klein')

  return (
    <button
      className={klassen.join(' ')}
      disabled={uit}
      onClick={() => {
        if (uit) return
        tril(10)
        bijTik?.()
      }}
    >
      {children}
    </button>
  )
}

/** Korte trilling als bevestiging. Werkt niet op iPhone — daar valt hij weg. */
export function tril(ms: number | number[] = 10): void {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* niet elke telefoon kan dit */
  }
}

export function SpelerBalk({
  spelers,
  actief,
  score,
  bijTik,
}: {
  spelers: Speler[]
  actief?: string | string[]
  score?: Record<string, { gedronken: number }>
  bijTik?: (uid: string) => void
}) {
  const actieveLijst = Array.isArray(actief) ? actief : actief ? [actief] : []
  return (
    <div className="spelers geen-selectie">
      {spelers.map((s) => (
        <button
          key={s.uid}
          className={[
            'speler',
            actieveLijst.includes(s.uid) ? 'actief' : '',
            s.online ? '' : 'offline',
          ].join(' ')}
          onClick={() => bijTik?.(s.uid)}
          disabled={!bijTik}
        >
          <span className="gezicht">{s.emoji}</span>
          <span className="naam">{s.naam}</span>
          {score && <span className="zacht">{score[s.uid]?.gedronken ?? 0}</span>}
        </button>
      ))}
    </div>
  )
}

export function Kaartje({ children, ...rest }: { children: ReactNode } & Record<string, any>) {
  return (
    <div className="kaartje" {...rest}>
      {children}
    </div>
  )
}

export function Balkje({ waarde }: { waarde: number }) {
  return (
    <div className="balkje">
      <div style={{ width: `${Math.round(Math.min(1, Math.max(0, waarde)) * 100)}%` }} />
    </div>
  )
}

export function Wachten({ tekst }: { tekst: string }) {
  return (
    <div className="midden">
      <div style={{ fontSize: 48 }}>⏳</div>
      <h2 className="zacht">{tekst}</h2>
    </div>
  )
}

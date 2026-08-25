import { useEffect, useRef, useState } from 'react'
import type { Streep } from '../net/tekening'

/* ─────────────────────────────────────────────────────────────
   Het tekenveld.

   Punten worden opgeslagen als verhoudingen van 0 tot 1, dus wat de tekenaar
   op een kleine telefoon maakt, komt op een grote net zo aan.

   De tekenaar tekent lokaal met een losse "bezig"-lijn, en pas als hij zijn
   vinger optilt gaat de streep de lucht in. Dat scheelt honderden
   schrijfacties per tekening.
   ───────────────────────────────────────────────────────────── */

export const KLEUREN = ['#f4f4f8', '#f5b942', '#e8453c', '#35c46b', '#4c8dff', '#9b6cf0']

/** Punten dichter dan dit op elkaar slaan we niet op. */
const MIN_AFSTAND = 0.012

export function Tekenveld({
  strepen,
  magTekenen,
  kleur,
  bijStreep,
}: {
  strepen: Streep[]
  magTekenen: boolean
  kleur: number
  bijStreep: (punten: number[]) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const doosRef = useRef<HTMLDivElement>(null)
  const [bezig, zetBezig] = useState<number[]>([])
  const bezigRef = useRef<number[]>([])

  /* Tekenen: alles opnieuw, elke keer. Simpel en snel genoeg. */
  useEffect(() => {
    const canvas = canvasRef.current
    const doos = doosRef.current
    if (!canvas || !doos) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const b = doos.clientWidth
    const h = doos.clientHeight
    if (canvas.width !== b * dpr || canvas.height !== h * dpr) {
      canvas.width = b * dpr
      canvas.height = h * dpr
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, b, h)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(3, b * 0.012)

    const tekenPunten = (punten: number[], kleurIndex: number) => {
      if (punten.length < 4) {
        // Eén tik: een puntje.
        if (punten.length === 2) {
          ctx.fillStyle = KLEUREN[kleurIndex] ?? KLEUREN[0]
          ctx.beginPath()
          ctx.arc(punten[0] * b, punten[1] * h, ctx.lineWidth / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        return
      }
      ctx.strokeStyle = KLEUREN[kleurIndex] ?? KLEUREN[0]
      ctx.beginPath()
      ctx.moveTo(punten[0] * b, punten[1] * h)
      for (let i = 2; i < punten.length; i += 2) {
        ctx.lineTo(punten[i] * b, punten[i + 1] * h)
      }
      ctx.stroke()
    }

    for (const s of strepen) tekenPunten(s.punten, s.kleur)
    if (bezig.length > 0) tekenPunten(bezig, kleur)
  }, [strepen, bezig, kleur])

  /* Vinger volgen */
  function positie(e: React.PointerEvent): [number, number] {
    const doos = doosRef.current!
    const r = doos.getBoundingClientRect()
    return [
      Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    ]
  }

  function omlaag(e: React.PointerEvent) {
    if (!magTekenen) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = positie(e)
    bezigRef.current = [x, y]
    zetBezig([x, y])
  }

  function beweeg(e: React.PointerEvent) {
    if (!magTekenen || bezigRef.current.length === 0) return
    const [x, y] = positie(e)
    const punten = bezigRef.current
    const vx = punten[punten.length - 2]
    const vy = punten[punten.length - 1]
    if (Math.hypot(x - vx, y - vy) < MIN_AFSTAND) return
    punten.push(x, y)
    zetBezig([...punten])
  }

  function omhoog() {
    if (!magTekenen || bezigRef.current.length === 0) return
    bijStreep([...bezigRef.current])
    bezigRef.current = []
    zetBezig([])
  }

  return (
    <div
      ref={doosRef}
      onPointerDown={omlaag}
      onPointerMove={beweeg}
      onPointerUp={omhoog}
      onPointerCancel={omhoog}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4 / 3',
        background: '#14141f',
        border: '1px solid var(--rand)',
        borderRadius: 'var(--straal)',
        overflow: 'hidden',
        touchAction: 'none',
        cursor: magTekenen ? 'crosshair' : 'default',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
}

export function Kleurkiezer({
  kleur,
  zetKleur,
}: {
  kleur: number
  zetKleur: (i: number) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {KLEUREN.map((k, i) => (
        <button
          key={k}
          onClick={() => zetKleur(i)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 99,
            background: k,
            border: i === kleur ? '3px solid var(--tekst)' : '2px solid var(--rand)',
            transform: i === kleur ? 'scale(1.1)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

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

export const KLEUREN = [
  '#f4f4f8', // wit
  '#111118', // zwart
  '#e8453c', // rood
  '#f5b942', // goud
  '#35c46b', // groen
  '#4c8dff', // blauw
  '#9b6cf0', // paars
  '#ff7ab8', // roze
  '#25c8c8', // turquoise
  '#a06a3c', // bruin
]

/** Lijndiktes, als deel van de breedte van het veld. */
export const DIKTES = [0.006, 0.013, 0.028]

/** Punten dichter dan dit op elkaar slaan we niet op. */
const MIN_AFSTAND = 0.012

export function Tekenveld({
  strepen,
  magTekenen,
  kleur,
  dikte = 1,
  bijStreep,
}: {
  strepen: Streep[]
  magTekenen: boolean
  kleur: number
  dikte?: number
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

    const tekenPunten = (punten: number[], kleurIndex: number, dikteIndex: number) => {
      const breedte = Math.max(2, b * (DIKTES[dikteIndex] ?? DIKTES[1]))
      ctx.lineWidth = breedte
      if (punten.length < 4) {
        // Eén tik: een puntje.
        if (punten.length === 2) {
          ctx.fillStyle = KLEUREN[kleurIndex] ?? KLEUREN[0]
          ctx.beginPath()
          ctx.arc(punten[0] * b, punten[1] * h, breedte / 2, 0, Math.PI * 2)
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

    for (const s of strepen) tekenPunten(s.punten, s.kleur, s.dikte)
    if (bezig.length > 0) tekenPunten(bezig, kleur, dikte)
  }, [strepen, bezig, kleur, dikte])

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

/** Kleuren en penseeldiktes. Staat bewust bóven het tekenveld: daar zoek je het. */
export function Tekenbalk({
  kleur,
  zetKleur,
  dikte,
  zetDikte,
}: {
  kleur: number
  zetKleur: (i: number) => void
  dikte: number
  zetDikte: (i: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 5,
        }}
      >
        {KLEUREN.map((k, i) => (
          <button
            key={k}
            onClick={() => zetKleur(i)}
            aria-label={`kleur ${i + 1}`}
            style={{
              aspectRatio: '1',
              borderRadius: 99,
              background: k,
              border: i === kleur ? '3px solid var(--goud)' : '2px solid var(--rand)',
              boxShadow: i === kleur ? '0 0 0 2px rgba(245,185,66,.25)' : 'none',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {DIKTES.map((d, i) => (
          <button
            key={i}
            onClick={() => zetDikte(i)}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 'var(--straal-klein)',
              background: i === dikte ? 'var(--vlak-hoog)' : 'transparent',
              border: `1px solid ${i === dikte ? 'var(--goud)' : 'var(--rand)'}`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <span
              style={{
                display: 'block',
                width: `${18 + i * 10}px`,
                height: `${2 + i * 5}px`,
                borderRadius: 99,
                background: KLEUREN[kleur],
              }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

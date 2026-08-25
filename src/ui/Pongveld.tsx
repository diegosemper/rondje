import { useEffect, useRef, useState } from 'react'

/* ─────────────────────────────────────────────────────────────
   Het bierpong-tafeltje.

   Je veegt vanaf het balletje omhoog: de richting van je veeg bepaalt waar
   hij heen gaat, de lengte hoe ver. Loslaten is gooien.

   Er zit geen toeval in. Dezelfde veeg geeft altijd dezelfde landing, want
   anders voelt missen als pech in plaats van als jouw schuld — en dan is er
   niks aan.

   De tafel is in verhoudingen: x van 0 tot 1 over de breedte, diepte van 0
   (bij jou) tot 1 (achterin). Op het scherm loopt dat samen, zodat het lijkt
   alsof je over een tafel kijkt.
   ───────────────────────────────────────────────────────────── */

export interface Beker {
  id: number
  x: number
  diepte: number
  weg: boolean
}

/** Hoe ver een veeg van boven naar beneden je brengt. */
const KRACHT = 1.35
/** Hoe sterk zijwaarts vegen doorwerkt. */
const ZIJWAARTS = 1.15
const BEKER_STRAAL = 0.062
/** Zo dicht mag je landen om hem erin te krijgen. */
const RAAK_MARGE = 0.055

export interface Worp {
  x: number
  diepte: number
}

/** Waar landt deze veeg? */
export function berekenWorp(dx: number, dy: number): Worp {
  const kracht = Math.max(0, dy) * KRACHT
  return {
    x: Math.min(1.3, Math.max(-0.3, 0.5 + dx * ZIJWAARTS)),
    diepte: Math.min(1.25, kracht),
  }
}

/** Welke beker is geraakt? `null` als het mis was. */
export function zoekRaak(worp: Worp, bekers: Beker[]): Beker | null {
  let beste: Beker | null = null
  let besteAfstand = RAAK_MARGE
  for (const b of bekers) {
    if (b.weg) continue
    const af = Math.hypot(b.x - worp.x, (b.diepte - worp.diepte) * 0.8)
    if (af < besteAfstand) {
      besteAfstand = af
      beste = b
    }
  }
  return beste
}

/* Scherm-plek van een punt op tafel. */
function opScherm(x: number, diepte: number, b: number, h: number) {
  const y = h * (0.9 - diepte * 0.66)
  const krimp = 1 - diepte * 0.34
  return { sx: b / 2 + (x - 0.5) * b * krimp, sy: y, krimp }
}

export function Pongveld({
  bekers,
  magGooien,
  vlucht,
  bijWorp,
}: {
  bekers: Beker[]
  magGooien: boolean
  /** een lopende worp om te laten zien, of null */
  vlucht: Worp | null
  bijWorp: (worp: Worp) => void
}) {
  const doosRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sleep = useRef<{ x: number; y: number } | null>(null)
  const [mik, zetMik] = useState<Worp | null>(null)
  const [animatie, zetAnimatie] = useState(0)

  // De vlucht van de bal afspelen.
  useEffect(() => {
    if (!vlucht) {
      zetAnimatie(0)
      return
    }
    let start = 0
    let id = 0
    const stap = (t: number) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / 750)
      zetAnimatie(p)
      if (p < 1) id = requestAnimationFrame(stap)
    }
    id = requestAnimationFrame(stap)
    return () => cancelAnimationFrame(id)
  }, [vlucht])

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
    const c = canvas.getContext('2d')
    if (!c) return
    c.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Tafel
    const grond = c.createLinearGradient(0, 0, 0, h)
    grond.addColorStop(0, '#0e1a12')
    grond.addColorStop(1, '#16261a')
    c.fillStyle = grond
    c.fillRect(0, 0, b, h)

    const linksAchter = opScherm(0, 1.05, b, h)
    const rechtsAchter = opScherm(1, 1.05, b, h)
    const linksVoor = opScherm(0, -0.05, b, h)
    const rechtsVoor = opScherm(1, -0.05, b, h)
    c.fillStyle = '#1d3324'
    c.beginPath()
    c.moveTo(linksAchter.sx, linksAchter.sy)
    c.lineTo(rechtsAchter.sx, rechtsAchter.sy)
    c.lineTo(rechtsVoor.sx, rechtsVoor.sy)
    c.lineTo(linksVoor.sx, linksVoor.sy)
    c.closePath()
    c.fill()

    // Bekers, van achter naar voren zodat ze goed overlappen.
    const gesorteerd = [...bekers].sort((a, b2) => b2.diepte - a.diepte)
    for (const beker of gesorteerd) {
      const { sx, sy, krimp } = opScherm(beker.x, beker.diepte, b, h)
      const r = BEKER_STRAAL * b * krimp
      if (beker.weg) {
        c.strokeStyle = 'rgba(255,255,255,.12)'
        c.lineWidth = 1
        c.beginPath()
        c.ellipse(sx, sy, r, r * 0.45, 0, 0, Math.PI * 2)
        c.stroke()
        continue
      }
      // Beker
      c.fillStyle = '#d8443b'
      c.beginPath()
      c.moveTo(sx - r, sy)
      c.lineTo(sx - r * 0.72, sy + r * 1.5)
      c.lineTo(sx + r * 0.72, sy + r * 1.5)
      c.lineTo(sx + r, sy)
      c.closePath()
      c.fill()
      // Bier
      c.fillStyle = '#e8b23c'
      c.beginPath()
      c.ellipse(sx, sy, r * 0.86, r * 0.4, 0, 0, Math.PI * 2)
      c.fill()
      c.strokeStyle = '#f4f4f8'
      c.lineWidth = 2
      c.beginPath()
      c.ellipse(sx, sy, r, r * 0.45, 0, 0, Math.PI * 2)
      c.stroke()
    }

    // Mikstip terwijl je sleept
    if (mik && magGooien) {
      const { sx, sy, krimp } = opScherm(mik.x, mik.diepte, b, h)
      c.strokeStyle = 'rgba(245,185,66,.8)'
      c.lineWidth = 2
      c.setLineDash([5, 5])
      c.beginPath()
      c.ellipse(sx, sy, 16 * krimp, 8 * krimp, 0, 0, Math.PI * 2)
      c.stroke()
      c.setLineDash([])

      const start = opScherm(0.5, -0.02, b, h)
      c.strokeStyle = 'rgba(245,185,66,.35)'
      c.beginPath()
      c.moveTo(start.sx, start.sy)
      c.quadraticCurveTo((start.sx + sx) / 2, Math.min(start.sy, sy) - h * 0.22, sx, sy)
      c.stroke()
    }

    // De bal
    const balStart = opScherm(0.5, -0.02, b, h)
    if (vlucht && animatie > 0) {
      const p = animatie
      const doel = opScherm(vlucht.x, vlucht.diepte, b, h)
      const bx = balStart.sx + (doel.sx - balStart.sx) * p
      const by = balStart.sy + (doel.sy - balStart.sy) * p - Math.sin(p * Math.PI) * h * 0.3
      c.fillStyle = '#f4f4f8'
      c.beginPath()
      c.arc(bx, by, 9 * (1 - p * 0.35), 0, Math.PI * 2)
      c.fill()
    } else if (magGooien) {
      c.fillStyle = '#f4f4f8'
      c.beginPath()
      c.arc(balStart.sx, balStart.sy, 11, 0, Math.PI * 2)
      c.fill()
    }
  }, [bekers, mik, magGooien, vlucht, animatie])

  function plek(e: React.PointerEvent) {
    const r = doosRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }

  return (
    <div
      ref={doosRef}
      onPointerDown={(e) => {
        if (!magGooien || vlucht) return
        e.currentTarget.setPointerCapture(e.pointerId)
        sleep.current = plek(e)
      }}
      onPointerMove={(e) => {
        if (!sleep.current || !magGooien) return
        const nu = plek(e)
        zetMik(berekenWorp(nu.x - sleep.current.x, sleep.current.y - nu.y))
      }}
      onPointerUp={(e) => {
        if (!sleep.current || !magGooien) return
        const nu = plek(e)
        const worp = berekenWorp(nu.x - sleep.current.x, sleep.current.y - nu.y)
        sleep.current = null
        zetMik(null)
        if (worp.diepte > 0.05) bijWorp(worp)
      }}
      onPointerCancel={() => {
        sleep.current = null
        zetMik(null)
      }}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '3 / 4',
        borderRadius: 'var(--straal)',
        overflow: 'hidden',
        border: '1px solid var(--rand)',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

/** De klassieke driehoek van tien, of een kleinere. */
export function maakBekers(aantal: number): Beker[] {
  const rijen = aantal >= 10 ? [4, 3, 2, 1] : aantal >= 6 ? [3, 2, 1] : [2, 1]
  const bekers: Beker[] = []
  let id = 0
  const diepteStart = 0.58
  const diepteStap = 0.115
  rijen.forEach((n, r) => {
    for (let i = 0; i < n; i++) {
      bekers.push({
        id: id++,
        x: 0.5 + (i - (n - 1) / 2) * 0.135,
        diepte: diepteStart + r * diepteStap,
        weg: false,
      })
    }
  })
  return bekers
}

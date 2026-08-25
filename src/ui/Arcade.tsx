import { useEffect, useRef, useState } from 'react'
import { maakRng } from '../engine/random'

/* ─────────────────────────────────────────────────────────────
   Het arcade-speelveld.

   Gedeeld door alle behendigheidsspellen. Regelt het canvas, de vaste
   tijdstap, het aftellen, en de vinger op het scherm. Een spel hoeft alleen
   te zeggen hoe zijn wereld eruitziet, hoe die per stap verandert en hoe je
   hem tekent.

   Twee dingen zijn met opzet zo gebouwd:

   · Iedereen krijgt dezelfde baan. De hindernissen komen uit één toevalsgetal
     dat de host meestuurt, dus niemand heeft mazzel of pech met zijn parcours.
   · Iedereen begint op dezelfde seconde, op server-tijd. Anders start degene
     met de traagste telefoon een halve seconde later en dat scheelt zo maar
     tien meter.
   ───────────────────────────────────────────────────────────── */

export type Richting = 'links' | 'rechts' | 'boven' | 'onder'

export interface Invoer {
  ingedrukt: boolean
  /** eenmalig waar op de stap direct na een tik */
  netGetikt: boolean
  /** waar op het veld je het laatst tikte, van 0 tot 1 */
  x: number
  y: number
  /** eenmalig gezet op de stap direct na een afgeronde veeg */
  veeg: Richting | null
}

/** Hoe ver je moet vegen voordat het als veeg telt, als deel van de breedte. */
const VEEG_DREMPEL = 0.07

export interface ArcadeSpel<W> {
  /** de beginwereld, met een toevalsgenerator die voor iedereen gelijk is */
  maak(rng: () => number): W
  /** één stap. Geef `true` terug als de speler dood is. */
  stap(wereld: W, dt: number, invoer: Invoer): boolean
  teken(wereld: W, c: CanvasRenderingContext2D, breedte: number, hoogte: number): void
  /** de score, in gehele getallen */
  afstand(wereld: W): number
  /** wat er achter de score staat. Standaard meters. */
  eenheid?: string
}

/** Vaste stap van 120 keer per seconde: zelfde uitkomst op elke telefoon. */
const STAP = 1 / 120
const MAX_INHAAL = 0.25

export function Arcadeveld<W>({
  spel,
  seed,
  startOp,
  nu,
  maxSeconden,
  bijDood,
}: {
  spel: ArcadeSpel<W>
  seed: number
  /** server-tijd waarop het spel begint */
  startOp: number
  nu: number
  maxSeconden: number
  bijDood: (afstand: number) => void
}) {
  const doosRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [afstand, zetAfstand] = useState(0)
  const [dood, zetDood] = useState(false)

  const ingedrukt = useRef(false)
  const tikBuffer = useRef(false)
  const doodGemeld = useRef(false)
  const plek = useRef({ x: 0.5, y: 0.5 })
  const veegStart = useRef<{ x: number; y: number } | null>(null)
  const veegBuffer = useRef<Richting | null>(null)

  const aftellen = Math.max(0, Math.ceil((startOp - nu) / 1000))

  useEffect(() => {
    const canvas = canvasRef.current
    const doos = doosRef.current
    if (!canvas || !doos) return

    const rng = maakRng(seed)
    let wereld = spel.maak(rng)
    let stop = false
    let vorige = performance.now()
    let schuld = 0
    let begonnen = false
    let speeltijd = 0

    // Het verschil tussen de klok van deze telefoon en de server-tijd, zodat
    // we lokaal met performance.now() kunnen werken maar wel samen starten.
    const verschil = startOp - nu

    function lus(tijd: number) {
      if (stop) return
      const canvas2 = canvasRef.current
      const doos2 = doosRef.current
      if (!canvas2 || !doos2) return

      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const b = doos2.clientWidth
      const h = doos2.clientHeight
      if (canvas2.width !== b * dpr || canvas2.height !== h * dpr) {
        canvas2.width = b * dpr
        canvas2.height = h * dpr
      }

      let dt = (tijd - vorige) / 1000
      vorige = tijd
      if (dt > MAX_INHAAL) dt = MAX_INHAAL

      if (!begonnen) {
        // Nog aan het aftellen.
        speeltijd += dt
        if (speeltijd * 1000 >= verschil) {
          begonnen = true
          schuld = 0
          speeltijd = 0
        }
      } else {
        schuld += dt
        speeltijd += dt
        while (schuld >= STAP) {
          const netGetikt = tikBuffer.current
          tikBuffer.current = false
          const veeg = veegBuffer.current
          veegBuffer.current = null
          const isDood = spel.stap(wereld, STAP, {
            ingedrukt: ingedrukt.current,
            netGetikt,
            x: plek.current.x,
            y: plek.current.y,
            veeg,
          })
          schuld -= STAP
          if (isDood || speeltijd > maxSeconden) {
            if (!doodGemeld.current) {
              doodGemeld.current = true
              const eind = Math.round(spel.afstand(wereld))
              zetAfstand(eind)
              zetDood(true)
              bijDood(eind)
            }
            stop = true
            break
          }
        }
      }

      const c = canvas2.getContext('2d')
      if (c) {
        c.setTransform(dpr, 0, 0, dpr, 0, 0)
        spel.teken(wereld, c, b, h)

        // De teller staat op het canvas en niet in React: die zestig keer per
        // seconde laten hertekenen zou het spel juist haperend maken.
        const score = Math.round(spel.afstand(wereld))
        const tekst = `${score} ${spel.eenheid ?? 'm'}`
        c.font = `700 ${Math.round(h * 0.075)}px system-ui, sans-serif`
        c.textBaseline = 'top'
        c.fillStyle = 'rgba(0,0,0,.45)'
        c.fillText(tekst, 13, 11)
        c.fillStyle = '#f5b942'
        c.fillText(tekst, 12, 10)
      }

      if (!stop) requestAnimationFrame(lus)
    }

    const id = requestAnimationFrame(lus)
    return () => {
      stop = true
      cancelAnimationFrame(id)
    }
    // Bewust alleen deze: de lus mag niet opnieuw beginnen als de klok tikt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, startOp])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      <div
        ref={doosRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          const r = e.currentTarget.getBoundingClientRect()
          plek.current = {
            x: (e.clientX - r.left) / r.width,
            y: (e.clientY - r.top) / r.height,
          }
          ingedrukt.current = true
          tikBuffer.current = true
          veegStart.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerUp={(e) => {
          ingedrukt.current = false
          const start = veegStart.current
          veegStart.current = null
          if (!start) return

          const r = e.currentTarget.getBoundingClientRect()
          const dx = (e.clientX - start.x) / r.width
          const dy = (e.clientY - start.y) / r.height
          if (Math.hypot(dx, dy) < VEEG_DREMPEL) return

          // De grootste van de twee bepaalt de richting: schuin vegen wordt
          // dus altijd op één kant afgerond in plaats van genegeerd.
          veegBuffer.current =
            Math.abs(dx) > Math.abs(dy)
              ? dx > 0
                ? 'rechts'
                : 'links'
              : dy > 0
                ? 'onder'
                : 'boven'
        }}
        onPointerCancel={() => {
          ingedrukt.current = false
          veegStart.current = null
        }}
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 260,
          borderRadius: 'var(--straal)',
          overflow: 'hidden',
          border: '1px solid var(--rand)',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

        {aftellen > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(11,11,16,.75)',
            }}
          >
            <div className="reusachtig klopt">{aftellen}</div>
          </div>
        )}

        {dood && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(109,29,25,.85)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44 }}>💥</div>
              <h2>
                {afstand} {spel.eenheid ?? 'm'}
              </h2>
              <div className="klein">wachten op de rest…</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

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

export interface ArcadeSpel<W> {
  /** de beginwereld, met een toevalsgenerator die voor iedereen gelijk is */
  maak(rng: () => number): W
  /** één stap. Geef `true` terug als de speler dood is. */
  stap(wereld: W, dt: number, ingedrukt: boolean, netGetikt: boolean): boolean
  teken(wereld: W, c: CanvasRenderingContext2D, breedte: number, hoogte: number): void
  afstand(wereld: W): number
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
          const isDood = spel.stap(wereld, STAP, ingedrukt.current, netGetikt)
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
        const meters = Math.round(spel.afstand(wereld))
        c.font = `700 ${Math.round(h * 0.075)}px system-ui, sans-serif`
        c.textBaseline = 'top'
        c.fillStyle = 'rgba(0,0,0,.45)'
        c.fillText(`${meters} m`, 13, 11)
        c.fillStyle = '#f5b942'
        c.fillText(`${meters} m`, 12, 10)
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
          ingedrukt.current = true
          tikBuffer.current = true
        }}
        onPointerUp={() => {
          ingedrukt.current = false
        }}
        onPointerCancel={() => {
          ingedrukt.current = false
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
              <h2>{afstand} m</h2>
              <div className="klein">wachten op de rest…</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

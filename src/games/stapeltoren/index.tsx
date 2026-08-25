import type { ArcadeSpel } from '../../ui/Arcade'
import { maakArcadeSpel } from '../arcade/maak'

/* ─────────────────────────────────────────────────────────────
   STAPELTOREN

   Een blok schuift heen en weer; tik om hem te laten vallen. Wat over de rand
   steekt valt eraf, dus je toren wordt met elke slordige tik smaller.

   Geen reflexspel maar een timingspel — en dat blijkt na een paar biertjes
   een stuk lastiger dan reflex. Je hoeft niet snel te zijn, je moet precies
   zijn, en dat is precies wat er als eerste weggaat.
   ───────────────────────────────────────────────────────────── */

const START_BREEDTE = 0.55
const BLOK_H = 0.075
/** Zoveel verdiepingen passen er in beeld; daarna schuift de toren omlaag. */
const IN_BEELD = 10
const START_SNELHEID = 0.42
const VERSNELLING = 0.022
const MAX_SNELHEID = 1.5
/** Onder deze breedte pas je nergens meer op en is het klaar. */
const MIN_BREEDTE = 0.035

interface Blok {
  /** linkerrand, van 0 tot 1 */
  x: number
  breedte: number
}

interface Wereld {
  rng: () => number
  toren: Blok[]
  /** het schuivende blok */
  x: number
  breedte: number
  richting: number
  snelheid: number
  dood: boolean
  perfect: number
}

const stapelSpel: ArcadeSpel<Wereld> = {
  maak(rng) {
    const start: Blok = { x: (1 - START_BREEDTE) / 2, breedte: START_BREEDTE }
    return {
      rng,
      toren: [start],
      x: 0,
      breedte: START_BREEDTE,
      richting: 1,
      snelheid: START_SNELHEID,
      dood: false,
      perfect: 0,
    }
  },

  stap(w, dt, invoer) {
    if (w.dood) return true

    if (invoer.netGetikt) {
      const onder = w.toren[w.toren.length - 1]
      const links = Math.max(w.x, onder.x)
      const rechts = Math.min(w.x + w.breedte, onder.x + onder.breedte)
      const overlap = rechts - links

      if (overlap <= MIN_BREEDTE) {
        w.dood = true
        return true
      }

      // Bijna precies? Dan mag je hem houden zoals hij is.
      if (w.breedte - overlap < 0.012) {
        w.perfect++
        w.toren.push({ x: onder.x, breedte: onder.breedte })
      } else {
        w.perfect = 0
        w.toren.push({ x: links, breedte: overlap })
        w.breedte = overlap
      }

      w.snelheid = Math.min(MAX_SNELHEID, w.snelheid + VERSNELLING)
      w.x = w.richting > 0 ? 0 : 1 - w.breedte
      w.richting *= -1
      return false
    }

    w.x += w.richting * w.snelheid * dt
    if (w.x <= 0) {
      w.x = 0
      w.richting = 1
    } else if (w.x + w.breedte >= 1) {
      w.x = 1 - w.breedte
      w.richting = -1
    }
    return false
  },

  teken(w, c, b, h) {
    const lucht = c.createLinearGradient(0, 0, 0, h)
    lucht.addColorStop(0, '#101a2e')
    lucht.addColorStop(1, '#1d1526')
    c.fillStyle = lucht
    c.fillRect(0, 0, b, h)

    const hoogte = BLOK_H * h
    // De toren schuift omlaag zodra hij boven het scherm uit zou komen.
    const verschuiving = Math.max(0, w.toren.length - IN_BEELD + 1)

    w.toren.forEach((blok, i) => {
      const y = h - (i - verschuiving + 1) * hoogte
      if (y < -hoogte || y > h) return
      const kleur = `hsl(${(i * 24) % 360} 62% 55%)`
      c.fillStyle = kleur
      c.fillRect(blok.x * b, y, blok.breedte * b, hoogte - 2)
      c.fillStyle = 'rgba(255,255,255,.18)'
      c.fillRect(blok.x * b, y, blok.breedte * b, 4)
    })

    if (!w.dood) {
      const y = h - (w.toren.length - verschuiving + 1) * hoogte
      c.fillStyle = '#f5b942'
      c.fillRect(w.x * b, y, w.breedte * b, hoogte - 2)

      // Hulplijn: laat zien waar de rand van het blok eronder zit.
      const onder = w.toren[w.toren.length - 1]
      c.strokeStyle = 'rgba(245,185,66,.35)'
      c.lineWidth = 1
      c.setLineDash([4, 4])
      c.beginPath()
      c.moveTo(onder.x * b, 0)
      c.lineTo(onder.x * b, h)
      c.moveTo((onder.x + onder.breedte) * b, 0)
      c.lineTo((onder.x + onder.breedte) * b, h)
      c.stroke()
      c.setLineDash([])
    }

    if (w.perfect >= 2) {
      c.fillStyle = '#35c46b'
      c.font = `700 ${Math.round(h * 0.05)}px system-ui, sans-serif`
      c.textAlign = 'center'
      c.fillText(`${w.perfect}× precies!`, b / 2, h * 0.12)
      c.textAlign = 'start'
    }
  },

  afstand: (w) => w.toren.length - 1,
  eenheid: 'hoog',
}

export const stapeltoren = maakArcadeSpel({
  id: 'stapeltoren',
  naam: 'Stapeltoren',
  uitleg: 'Tik op het goede moment. Elke misser maakt je toren smaller.',
  regels: [
    'Een blok schuift heen en weer.',
    'Tik om hem te laten vallen.',
    'Wat over de rand steekt valt eraf.',
    'Wie het hoogst komt deelt 10 uit. De rest drinkt.',
  ],
  tags: ['reflex', 'chaos'],
  besturing: 'Tik om het blok te laten vallen',
  spel: stapelSpel,
})

import type { ArcadeSpel } from '../../ui/Arcade'
import { maakArcadeSpel } from '../arcade/maak'

/* ─────────────────────────────────────────────────────────────
   SPRINGEN

   Doodle Jump. Je stuitert vanzelf omhoog van platform naar platform; jij
   zorgt alleen dat je op het volgende landt. Mis je alles, dan val je uit
   beeld.

   Sturen doe je door de linker- of rechterkant van het scherm ingedrukt te
   houden, en niet door te kantelen. Kantelen vraagt op iPhone eerst
   toestemming, reageert op elke telefoon net anders, en werkt niet als je
   onderuitgezakt op een bank hangt. Ingedrukt houden werkt overal hetzelfde.

   Je gaat aan de ene kant het scherm uit en komt er aan de andere kant weer
   in, dus je zit nooit vast in een hoek.
   ───────────────────────────────────────────────────────────── */

const ZWAARTEKRACHT = 1.55
const STUITER = -0.92
const STUUR = 0.85
const REM = 0.86
const MAX_ZIJ = 0.75

const SPELER_B = 0.09
const SPELER_H = 0.055
/** Hoe hoog de speler in beeld blijft; daarboven schuift de wereld mee. */
const CAMERA = 0.42

const PLATFORM_B = 0.24
const PLATFORM_H = 0.022
const START_GAT = 0.17
const MAX_GAT = 0.29

interface Platform {
  x: number
  /** hoogte in de wereld; hoger getal is hoger */
  y: number
  /** beweegt heen en weer */
  beweegt: number
}

interface Wereld {
  rng: () => number
  x: number
  y: number
  vy: number
  vx: number
  hoogte: number
  platforms: Platform[]
  volgendeY: number
  dood: boolean
}

function nieuwPlatform(w: Wereld, y: number): Platform {
  const beweegt = w.hoogte > 4 && w.rng() < 0.22 ? (w.rng() < 0.5 ? -1 : 1) * 0.22 : 0
  return { x: PLATFORM_B / 2 + w.rng() * (1 - PLATFORM_B), y, beweegt }
}

const springSpel: ArcadeSpel<Wereld> = {
  maak(rng) {
    const w: Wereld = {
      rng,
      x: 0.5,
      y: 0.2,
      vy: 0,
      vx: 0,
      hoogte: 0,
      platforms: [{ x: 0.5, y: 0.12, beweegt: 0 }],
      volgendeY: 0.12,
      dood: false,
    }
    for (let i = 0; i < 14; i++) {
      w.volgendeY += START_GAT
      w.platforms.push(nieuwPlatform(w, w.volgendeY))
    }
    return w
  },

  stap(w, dt, invoer) {
    if (w.dood) return true

    // Sturen: linkerhelft is links, rechterhelft is rechts.
    if (invoer.ingedrukt) {
      w.vx += (invoer.x < 0.5 ? -STUUR : STUUR) * dt * 6
      w.vx = Math.max(-MAX_ZIJ, Math.min(MAX_ZIJ, w.vx))
    } else {
      w.vx *= Math.pow(REM, dt * 60)
    }
    w.x += w.vx * dt

    // Aan de zijkant het scherm uit en er weer in.
    if (w.x < -SPELER_B) w.x = 1 + SPELER_B
    if (w.x > 1 + SPELER_B) w.x = -SPELER_B

    w.vy += ZWAARTEKRACHT * dt
    w.y -= w.vy * dt

    // Platforms die heen en weer gaan.
    for (const p of w.platforms) {
      if (!p.beweegt) continue
      p.x += p.beweegt * dt
      if (p.x < PLATFORM_B / 2 || p.x > 1 - PLATFORM_B / 2) p.beweegt *= -1
    }

    // Landen kan alleen als je valt.
    if (w.vy > 0) {
      for (const p of w.platforms) {
        const raakX = Math.abs(w.x - p.x) < PLATFORM_B / 2 + SPELER_B / 2
        const voeten = w.y - SPELER_H / 2
        if (!raakX) continue
        if (voeten <= p.y && voeten >= p.y - 0.05) {
          w.vy = STUITER
          break
        }
      }
    }

    // Camera: de wereld zakt mee zodra je boven de lijn komt.
    const boven = w.hoogte + CAMERA
    if (w.y > boven) {
      w.hoogte = w.y - CAMERA
    }

    // Nieuwe platforms erbij, oude weg.
    const gat = Math.min(MAX_GAT, START_GAT + w.hoogte * 0.006)
    while (w.volgendeY < w.hoogte + 1.6) {
      w.volgendeY += gat
      w.platforms.push(nieuwPlatform(w, w.volgendeY))
    }
    w.platforms = w.platforms.filter((p) => p.y > w.hoogte - 0.4)

    // Uit beeld gevallen.
    if (w.y < w.hoogte - 0.2) {
      w.dood = true
      return true
    }
    return false
  },

  teken(w, c, b, h) {
    const lucht = c.createLinearGradient(0, 0, 0, h)
    lucht.addColorStop(0, '#132135')
    lucht.addColorStop(1, '#241a33')
    c.fillStyle = lucht
    c.fillRect(0, 0, b, h)

    // Wereld-y naar scherm-y: hoger in de wereld is hoger op het scherm.
    const naarScherm = (y: number) => h - (y - w.hoogte) * h

    for (const p of w.platforms) {
      const sy = naarScherm(p.y)
      if (sy < -20 || sy > h + 20) continue
      c.fillStyle = p.beweegt ? '#f5b942' : '#35c46b'
      c.beginPath()
      c.roundRect((p.x - PLATFORM_B / 2) * b, sy, PLATFORM_B * b, PLATFORM_H * h, 5)
      c.fill()
    }

    // Speler
    const sx = w.x * b
    const sy = naarScherm(w.y)
    const bw = SPELER_B * b
    const bh = SPELER_H * h
    c.fillStyle = '#f4f4f8'
    c.beginPath()
    c.ellipse(sx, sy - bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#14141c'
    const kijk = w.vx > 0.05 ? 1 : w.vx < -0.05 ? -1 : 0
    c.beginPath()
    c.arc(sx - bw * 0.16 + kijk * bw * 0.08, sy - bh * 0.68, bw * 0.07, 0, Math.PI * 2)
    c.arc(sx + bw * 0.16 + kijk * bw * 0.08, sy - bh * 0.68, bw * 0.07, 0, Math.PI * 2)
    c.fill()

    // Stuurvlakken
    c.fillStyle = 'rgba(255,255,255,.035)'
    c.fillRect(0, h * 0.8, b / 2 - 2, h * 0.2)
    c.fillRect(b / 2 + 2, h * 0.8, b / 2 - 2, h * 0.2)
    c.fillStyle = 'rgba(255,255,255,.28)'
    c.font = `700 ${Math.round(h * 0.045)}px system-ui, sans-serif`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText('◀', b * 0.25, h * 0.9)
    c.fillText('▶', b * 0.75, h * 0.9)
    c.textAlign = 'start'
  },

  afstand: (w) => w.hoogte * 10,
}

export const springen = maakArcadeSpel({
  id: 'springen',
  naam: 'Springen',
  uitleg: 'Stuiter van platform naar platform. Wie het hoogst komt deelt tien uit.',
  regels: [
    'Je stuitert vanzelf omhoog.',
    'Houd links of rechts ingedrukt om te sturen.',
    'Mis je alles, dan val je uit beeld.',
    'Wie het hoogst komt deelt 10 uit. De rest drinkt.',
  ],
  tags: ['reflex', 'chaos'],
  besturing: 'Houd links of rechts ingedrukt om te sturen',
  spel: springSpel,
})

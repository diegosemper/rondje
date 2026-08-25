import type { ArcadeSpel } from '../../ui/Arcade'
import { maakArcadeSpel } from '../arcade/maak'

/* ─────────────────────────────────────────────────────────────
   JETPACK

   Ingedrukt houden om te stijgen, loslaten om te vallen. Tussen de lasers
   door. Anders dan bij Flappy stuur je continu in plaats van met tikjes, wat
   het net wat fijner maakt om te doen en net wat gemener om vol te houden.

   Lasers komen in twee soorten: staande balken waar je omheen moet, en
   liggende balken waar je onder- of overheen moet.
   ───────────────────────────────────────────────────────────── */

const STUWKRACHT = -1.9
const ZWAARTEKRACHT = 1.9
const MAX_VAL = 1.1
const SPELER_X = 0.24
const HOOG = 0.055
const BREED = 0.05

const START_SNELHEID = 0.42
const VERSNELLING = 0.007
const MAX_SNELHEID = 0.95

const LASER_AFSTAND = 0.55

interface Laser {
  x: number
  /** staand: een gat om doorheen te vliegen. liggend: een balk om te ontwijken. */
  staand: boolean
  /** bij staand: midden van het gat. bij liggend: midden van de balk. */
  midden: number
  maat: number
  dikte: number
}

interface Wereld {
  rng: () => number
  y: number
  vy: number
  afstand: number
  snelheid: number
  lasers: Laser[]
  volgendeX: number
  vlam: number
}

function nieuweLaser(w: Wereld, x: number): Laser {
  const staand = w.rng() < 0.55
  if (staand) {
    const krimp = Math.min(0.14, w.afstand * 0.01)
    const maat = 0.36 - krimp
    const marge = maat / 2 + 0.07
    return { x, staand, midden: marge + w.rng() * (1 - marge * 2), maat, dikte: 0.035 }
  }
  const maat = 0.16 + w.rng() * 0.14
  const marge = maat / 2 + 0.06
  return { x, staand, midden: marge + w.rng() * (1 - marge * 2), maat, dikte: 0.16 }
}

function raakt(w: Wereld, l: Laser): boolean {
  const links = l.x
  const rechts = l.x + (l.staand ? l.dikte : l.dikte)
  if (SPELER_X + BREED / 2 < links || SPELER_X - BREED / 2 > rechts) return false

  if (l.staand) {
    // Je moet door het gat.
    const boven = l.midden - l.maat / 2
    const onder = l.midden + l.maat / 2
    return w.y - HOOG / 2 < boven || w.y + HOOG / 2 > onder
  }
  // Liggende balk: je moet erbuiten blijven.
  const boven = l.midden - l.maat / 2
  const onder = l.midden + l.maat / 2
  return w.y + HOOG / 2 > boven && w.y - HOOG / 2 < onder
}

const jetpackSpel: ArcadeSpel<Wereld> = {
  maak(rng) {
    const w: Wereld = {
      rng,
      y: 0.6,
      vy: 0,
      afstand: 0,
      snelheid: START_SNELHEID,
      lasers: [],
      volgendeX: 1.2,
      vlam: 0,
    }
    for (let i = 0; i < 4; i++) {
      w.lasers.push(nieuweLaser(w, w.volgendeX))
      w.volgendeX += LASER_AFSTAND
    }
    return w
  },

  stap(w, dt, ingedrukt) {
    w.vy += (ingedrukt ? STUWKRACHT : ZWAARTEKRACHT) * dt
    w.vy = Math.max(-MAX_VAL, Math.min(MAX_VAL, w.vy))
    w.y += w.vy * dt
    w.vlam = ingedrukt ? Math.min(1, w.vlam + dt * 8) : Math.max(0, w.vlam - dt * 8)

    w.snelheid = Math.min(MAX_SNELHEID, w.snelheid + VERSNELLING * dt)
    const verplaatsing = w.snelheid * dt
    w.afstand += verplaatsing
    for (const l of w.lasers) l.x -= verplaatsing

    w.volgendeX -= verplaatsing
    while (w.volgendeX < 2.2) {
      w.lasers.push(nieuweLaser(w, w.volgendeX))
      w.volgendeX += LASER_AFSTAND
    }
    w.lasers = w.lasers.filter((l) => l.x > -0.5)

    // Plafond en vloer: je stuitert er niet af, je knalt erop.
    if (w.y - HOOG / 2 < 0 || w.y + HOOG / 2 > 1) return true

    for (const l of w.lasers) if (raakt(w, l)) return true
    return false
  },

  teken(w, c, b, h) {
    const lucht = c.createLinearGradient(0, 0, 0, h)
    lucht.addColorStop(0, '#1a1424')
    lucht.addColorStop(1, '#2a1620')
    c.fillStyle = lucht
    c.fillRect(0, 0, b, h)

    // Vloer- en plafondstrepen, zodat je snelheid voelt.
    c.fillStyle = '#3a2a44'
    const streep = ((w.afstand * 100) % 12) - 12
    for (let x = streep; x < b; x += 12) {
      c.fillRect(x, 0, 6, 5)
      c.fillRect(x, h - 5, 6, 5)
    }

    for (const l of w.lasers) {
      const x = l.x * b
      c.fillStyle = '#e8453c'
      c.shadowColor = '#e8453c'
      c.shadowBlur = 12
      if (l.staand) {
        const boven = (l.midden - l.maat / 2) * h
        const onder = (l.midden + l.maat / 2) * h
        const br = l.dikte * b
        c.fillRect(x, 0, br, boven)
        c.fillRect(x, onder, br, h - onder)
      } else {
        const boven = (l.midden - l.maat / 2) * h
        c.fillRect(x, boven, l.dikte * b, l.maat * h)
      }
      c.shadowBlur = 0
    }

    // Speler
    const px = SPELER_X * b
    const py = w.y * h
    const bw = BREED * b
    const bh = HOOG * h

    if (w.vlam > 0.02) {
      c.fillStyle = `rgba(245,185,66,${0.4 + w.vlam * 0.6})`
      c.beginPath()
      c.moveTo(px - bw / 2, py + bh / 2)
      c.lineTo(px, py + bh / 2 + bh * (0.8 + w.vlam))
      c.lineTo(px + bw / 2, py + bh / 2)
      c.closePath()
      c.fill()
    }

    c.fillStyle = '#4c8dff'
    c.fillRect(px - bw / 2, py - bh / 2, bw, bh)
    c.fillStyle = '#f4f4f8'
    c.fillRect(px + bw * 0.1, py - bh * 0.3, bw * 0.3, bh * 0.3)
  },

  afstand: (w) => w.afstand * 10,
}

export const jetpack = maakArcadeSpel({
  id: 'jetpack',
  naam: 'Jetpack',
  uitleg: 'Houd ingedrukt om te stijgen. Ontwijk de lasers, kom zo ver mogelijk.',
  regels: [
    'Houd je vinger op het scherm om te stijgen.',
    'Loslaten is vallen. Blijf van de lasers af.',
    'Het gaat steeds sneller.',
    'Wie het verst komt deelt 10 uit. De rest drinkt.',
  ],
  tags: ['reflex', 'chaos'],
  besturing: 'Ingedrukt houden om te stijgen, loslaten om te vallen',
  spel: jetpackSpel,
})

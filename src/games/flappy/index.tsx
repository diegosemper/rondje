import type { ArcadeSpel } from '../../ui/Arcade'
import { maakArcadeSpel } from '../arcade/maak'

/* ─────────────────────────────────────────────────────────────
   FLAPPY

   Tikken om te fladderen, tussen de buizen door. Hoe verder je komt hoe
   sneller het gaat, dus niemand blijft eeuwig in de lucht.

   Alle maten zijn breuken van de schermhoogte, zodat het op een kleine en een
   grote telefoon precies hetzelfde speelt.
   ───────────────────────────────────────────────────────────── */

const ZWAARTEKRACHT = 2.6
const FLADDER = -0.78
const SPELER_X = 0.28
const STRAAL = 0.032

const START_SNELHEID = 0.38
const VERSNELLING = 0.006
const MAX_SNELHEID = 0.85

const BUIS_AFSTAND = 0.62
const BUIS_BREEDTE = 0.13
const GAT_START = 0.34
const GAT_MIN = 0.2

interface Buis {
  x: number
  /** midden van het gat, als breuk van de hoogte */
  gat: number
  hoogte: number
  gehad: boolean
}

interface Wereld {
  rng: () => number
  y: number
  vy: number
  afstand: number
  snelheid: number
  buizen: Buis[]
  volgendeBuisX: number
  gehaald: number
}

function nieuweBuis(w: Wereld, x: number): Buis {
  const krimp = Math.min(GAT_START - GAT_MIN, w.afstand * 0.012)
  const hoogte = GAT_START - krimp
  const marge = hoogte / 2 + 0.08
  return {
    x,
    gat: marge + w.rng() * (1 - marge * 2),
    hoogte,
    gehad: false,
  }
}

const flappySpel: ArcadeSpel<Wereld> = {
  maak(rng) {
    const w: Wereld = {
      rng,
      y: 0.5,
      vy: 0,
      afstand: 0,
      snelheid: START_SNELHEID,
      buizen: [],
      volgendeBuisX: 1.1,
      gehaald: 0,
    }
    // Een paar buizen vooruit klaarzetten.
    for (let i = 0; i < 4; i++) {
      w.buizen.push(nieuweBuis(w, w.volgendeBuisX))
      w.volgendeBuisX += BUIS_AFSTAND
    }
    return w
  },

  stap(w, dt, invoer) {
    if (invoer.netGetikt) w.vy = FLADDER

    w.vy += ZWAARTEKRACHT * dt
    w.y += w.vy * dt

    w.snelheid = Math.min(MAX_SNELHEID, w.snelheid + VERSNELLING * dt)
    const verplaatsing = w.snelheid * dt
    w.afstand += verplaatsing
    for (const b of w.buizen) b.x -= verplaatsing

    // Nieuwe buizen aanvullen, oude opruimen.
    w.volgendeBuisX -= verplaatsing
    while (w.volgendeBuisX < 2.2) {
      w.buizen.push(nieuweBuis(w, w.volgendeBuisX))
      w.volgendeBuisX += BUIS_AFSTAND
    }
    w.buizen = w.buizen.filter((b) => b.x > -0.5)

    // Plafond en vloer.
    if (w.y - STRAAL < 0 || w.y + STRAAL > 1) return true

    // Botsing met een buis.
    for (const b of w.buizen) {
      const links = b.x
      const rechts = b.x + BUIS_BREEDTE
      if (SPELER_X + STRAAL < links || SPELER_X - STRAAL > rechts) continue
      const boven = b.gat - b.hoogte / 2
      const onder = b.gat + b.hoogte / 2
      if (w.y - STRAAL < boven || w.y + STRAAL > onder) return true
      if (!b.gehad && rechts < SPELER_X) {
        b.gehad = true
        w.gehaald++
      }
    }
    return false
  },

  teken(w, c, b, h) {
    // Lucht
    const lucht = c.createLinearGradient(0, 0, 0, h)
    lucht.addColorStop(0, '#12203a')
    lucht.addColorStop(1, '#1d1230')
    c.fillStyle = lucht
    c.fillRect(0, 0, b, h)

    // Buizen
    for (const p of w.buizen) {
      const x = p.x * b
      const br = BUIS_BREEDTE * b
      const boven = (p.gat - p.hoogte / 2) * h
      const onder = (p.gat + p.hoogte / 2) * h
      c.fillStyle = '#35c46b'
      c.fillRect(x, 0, br, boven)
      c.fillRect(x, onder, br, h - onder)
      c.fillStyle = '#2aa159'
      c.fillRect(x, boven - 10, br, 10)
      c.fillRect(x, onder, br, 10)
    }

    // Speler
    const px = SPELER_X * b
    const py = w.y * h
    const r = STRAAL * h
    c.save()
    c.translate(px, py)
    c.rotate(Math.max(-0.5, Math.min(1.1, w.vy * 0.7)))
    c.fillStyle = '#f5b942'
    c.beginPath()
    c.arc(0, 0, r, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#1a1205'
    c.beginPath()
    c.arc(r * 0.35, -r * 0.25, r * 0.18, 0, Math.PI * 2)
    c.fill()
    c.beginPath()
    c.moveTo(r * 0.6, r * 0.05)
    c.lineTo(r * 1.35, r * 0.25)
    c.lineTo(r * 0.6, r * 0.45)
    c.closePath()
    c.fillStyle = '#e8453c'
    c.fill()
    c.restore()
  },

  afstand: (w) => w.afstand * 10,
}

export const flappy = maakArcadeSpel({
  id: 'flappy',
  naam: 'Flappy',
  uitleg: 'Tik om te fladderen. Wie het verst komt deelt tien slokken uit.',
  regels: [
    'Tik op het scherm om omhoog te fladderen.',
    'Raak de buizen niet, en blijf in beeld.',
    'Het gaat steeds sneller en de gaten worden kleiner.',
    'Wie het verst komt deelt 10 uit. De rest drinkt.',
  ],
  tags: ['reflex', 'chaos'],
  besturing: 'Tik om te fladderen',
  spel: flappySpel,
})

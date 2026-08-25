import type { ArcadeSpel } from '../../ui/Arcade'
import { maakArcadeSpel } from '../arcade/maak'

/* ─────────────────────────────────────────────────────────────
   SNELWEG

   Vier banen, steeds voller verkeer. Tik op de linker- of rechterhelft van
   het scherm om van baan te wisselen.

   Bewust tikken en niet vegen: een veeg werkt op elke telefoon net anders en
   je moet 'm afmaken voor hij telt. Een tik is meteen raak, ook met natte
   vingers en een half oog erop.
   ───────────────────────────────────────────────────────────── */

const BANEN = 4
const SPELER_Y = 0.8
const AUTO_H = 0.13
const AUTO_B = 0.62
const WISSEL_TIJD = 0.12

const START_SNELHEID = 0.5
const VERSNELLING = 0.012
const MAX_SNELHEID = 1.5

const START_GAT = 0.85
const MIN_GAT = 0.4

interface Auto {
  baan: number
  y: number
  kleur: number
}

interface Wereld {
  rng: () => number
  baan: number
  /** waar we vandaan komen, voor het soepel opschuiven */
  vanBaan: number
  wissel: number
  afstand: number
  snelheid: number
  autos: Auto[]
  volgendeY: number
}

const KLEUREN = ['#e8453c', '#f5b942', '#35c46b', '#9b6cf0', '#25c8c8']

function nieuweRij(w: Wereld, y: number): Auto[] {
  // Altijd minstens één baan vrij, anders is het niet te doen.
  const vrij = Math.floor(w.rng() * BANEN)
  const extraVrij = w.afstand < 6 ? Math.floor(w.rng() * BANEN) : vrij
  const rij: Auto[] = []
  for (let b = 0; b < BANEN; b++) {
    if (b === vrij || b === extraVrij) continue
    if (w.rng() < 0.22) continue
    rij.push({ baan: b, y, kleur: Math.floor(w.rng() * KLEUREN.length) })
  }
  return rij
}

const snelwegSpel: ArcadeSpel<Wereld> = {
  maak(rng) {
    const w: Wereld = {
      rng,
      baan: 1,
      vanBaan: 1,
      wissel: 1,
      afstand: 0,
      snelheid: START_SNELHEID,
      autos: [],
      volgendeY: -0.4,
    }
    for (let i = 0; i < 5; i++) {
      w.autos.push(...nieuweRij(w, w.volgendeY))
      w.volgendeY -= START_GAT
    }
    return w
  },

  stap(w, dt, invoer) {
    if (invoer.netGetikt) {
      const doel = invoer.x < 0.5 ? w.baan - 1 : w.baan + 1
      const nieuw = Math.max(0, Math.min(BANEN - 1, doel))
      if (nieuw !== w.baan) {
        w.vanBaan = w.baan
        w.baan = nieuw
        w.wissel = 0
      }
    }
    w.wissel = Math.min(1, w.wissel + dt / WISSEL_TIJD)

    w.snelheid = Math.min(MAX_SNELHEID, w.snelheid + VERSNELLING * dt)
    const stap = w.snelheid * dt
    w.afstand += stap
    for (const a of w.autos) a.y += stap
    w.volgendeY += stap

    const gat = Math.max(MIN_GAT, START_GAT - w.afstand * 0.012)
    while (w.volgendeY > -1.6) {
      w.autos.push(...nieuweRij(w, w.volgendeY))
      w.volgendeY -= gat
    }
    w.autos = w.autos.filter((a) => a.y < 1.4)

    // Botsen? We kijken naar de baan waar je heen gaat én waar je vandaan
    // komt, zolang je nog aan het wisselen bent.
    const mijnBanen = w.wissel >= 1 ? [w.baan] : [w.baan, w.vanBaan]
    for (const a of w.autos) {
      if (!mijnBanen.includes(a.baan)) continue
      if (Math.abs(a.y - SPELER_Y) < AUTO_H * 0.9) return true
    }
    return false
  },

  teken(w, c, b, h) {
    c.fillStyle = '#15151f'
    c.fillRect(0, 0, b, h)

    const baanB = b / BANEN

    // Strepen tussen de banen, die meelopen zodat je snelheid ziet.
    c.strokeStyle = '#3a3a52'
    c.lineWidth = 2
    c.setLineDash([16, 20])
    c.lineDashOffset = -((w.afstand * h) % 36)
    for (let i = 1; i < BANEN; i++) {
      c.beginPath()
      c.moveTo(i * baanB, 0)
      c.lineTo(i * baanB, h)
      c.stroke()
    }
    c.setLineDash([])

    const tekenAuto = (baan: number, y: number, kleur: string) => {
      const x = (baan + 0.5) * baanB
      const br = baanB * AUTO_B
      const ho = h * AUTO_H
      c.fillStyle = kleur
      c.beginPath()
      c.roundRect(x - br / 2, y * h - ho / 2, br, ho, 6)
      c.fill()
      c.fillStyle = 'rgba(255,255,255,.25)'
      c.fillRect(x - br * 0.3, y * h - ho * 0.2, br * 0.6, ho * 0.25)
    }

    for (const a of w.autos) tekenAuto(a.baan, a.y, KLEUREN[a.kleur])

    // Speler: schuift soepel van baan naar baan.
    const mix = w.vanBaan + (w.baan - w.vanBaan) * Math.min(1, w.wissel)
    tekenAuto(mix, SPELER_Y, '#f4f4f8')

    // Tikvlakken, subtiel, zodat je weet waar je moet drukken.
    c.fillStyle = 'rgba(255,255,255,.04)'
    c.fillRect(0, h * 0.86, b / 2 - 2, h * 0.14)
    c.fillRect(b / 2 + 2, h * 0.86, b / 2 - 2, h * 0.14)
    c.fillStyle = 'rgba(255,255,255,.3)'
    c.font = `700 ${Math.round(h * 0.05)}px system-ui, sans-serif`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText('◀', b * 0.25, h * 0.93)
    c.fillText('▶', b * 0.75, h * 0.93)
    c.textAlign = 'start'
  },

  afstand: (w) => w.afstand * 10,
}

export const snelweg = maakArcadeSpel({
  id: 'snelweg',
  naam: 'Snelweg',
  uitleg: 'Stuur tussen het verkeer door. Wie het verst komt deelt tien slokken uit.',
  regels: [
    'Tik links of rechts om van baan te wisselen.',
    'Ram geen auto’s.',
    'Het wordt steeds sneller en voller.',
    'Wie het verst komt deelt 10 uit. De rest drinkt.',
  ],
  tags: ['reflex', 'chaos'],
  besturing: 'Tik links of rechts om van baan te wisselen',
  spel: snelwegSpel,
})

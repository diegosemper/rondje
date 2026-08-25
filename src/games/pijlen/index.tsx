import type { ArcadeSpel, Richting } from '../../ui/Arcade'
import { maakArcadeSpel } from '../arcade/maak'

/* ─────────────────────────────────────────────────────────────
   PIJLEN

   Er verschijnt een pijl. Is hij dichtgemaakt, veeg dan de kant op waar hij
   heen wijst. Is hij alleen omlijnd, veeg dan precies de andere kant op.

   Het gemene is dat je hersenen de richting sneller lezen dan de vorm. Zolang
   het rustig gaat lukt het prima; zodra de klok korter wordt veeg je vanzelf
   mee met de pijl in plaats van ertegenin.

   Elke goede veeg maakt de volgende sneller, tot bijna een halve seconde. Er
   komt dus altijd een moment dat je erin trapt.
   ───────────────────────────────────────────────────────────── */

const START_TIJD = 1.7
const MIN_TIJD = 0.45
/** Hoeveel korter de klok wordt per goede veeg. */
const VERSNELLING = 0.955
/** Hoe vaak de pijl omlijnd is (en je dus de andere kant op moet). */
const KANS_OMGEKEERD = 0.45

const RICHTINGEN: Richting[] = ['boven', 'onder', 'links', 'rechts']

const TEGENOVER: Record<Richting, Richting> = {
  boven: 'onder',
  onder: 'boven',
  links: 'rechts',
  rechts: 'links',
}

const HOEK: Record<Richting, number> = {
  boven: 0,
  rechts: Math.PI / 2,
  onder: Math.PI,
  links: -Math.PI / 2,
}

interface Wereld {
  rng: () => number
  richting: Richting
  /** dichtgemaakt = de kant van de pijl, omlijnd = de andere kant */
  gevuld: boolean
  limiet: number
  tijdOver: number
  goed: number
  /** kort oplichten na een goede veeg */
  flits: number
  dood: boolean
}

function nieuwePijl(w: Wereld) {
  w.richting = RICHTINGEN[Math.floor(w.rng() * 4)]
  w.gevuld = w.rng() > KANS_OMGEKEERD
  w.tijdOver = w.limiet
}

function juisteVeeg(w: Wereld): Richting {
  return w.gevuld ? w.richting : TEGENOVER[w.richting]
}

const pijlenSpel: ArcadeSpel<Wereld> = {
  maak(rng) {
    const w: Wereld = {
      rng,
      richting: 'boven',
      gevuld: true,
      limiet: START_TIJD,
      tijdOver: START_TIJD,
      goed: 0,
      flits: 0,
      dood: false,
    }
    nieuwePijl(w)
    return w
  },

  stap(w, dt, invoer) {
    if (w.dood) return true
    w.flits = Math.max(0, w.flits - dt * 4)

    if (invoer.veeg) {
      if (invoer.veeg !== juisteVeeg(w)) {
        w.dood = true
        return true
      }
      w.goed++
      w.flits = 1
      w.limiet = Math.max(MIN_TIJD, w.limiet * VERSNELLING)
      nieuwePijl(w)
      return false
    }

    w.tijdOver -= dt
    if (w.tijdOver <= 0) {
      w.dood = true
      return true
    }
    return false
  },

  teken(w, c, b, h) {
    const omgekeerd = !w.gevuld
    const lucht = c.createLinearGradient(0, 0, 0, h)
    // Omgekeerde pijlen krijgen een andere ondergrond, als extra waarschuwing
    // die je in de haast alleen half meekrijgt.
    lucht.addColorStop(0, omgekeerd ? '#2a1430' : '#101d2c')
    lucht.addColorStop(1, omgekeerd ? '#1a1024' : '#0f1622')
    c.fillStyle = lucht
    c.fillRect(0, 0, b, h)

    if (w.flits > 0) {
      c.fillStyle = `rgba(53,196,107,${w.flits * 0.18})`
      c.fillRect(0, 0, b, h)
    }

    // Tijdbalk bovenaan.
    const deel = Math.max(0, w.tijdOver / w.limiet)
    c.fillStyle = deel < 0.35 ? '#e8453c' : '#f5b942'
    c.fillRect(0, 0, b * deel, 7)

    // De pijl.
    const m = Math.min(b, h) * 0.3
    c.save()
    c.translate(b / 2, h / 2)
    c.rotate(HOEK[w.richting])
    c.beginPath()
    c.moveTo(0, -m)
    c.lineTo(m * 0.62, -m * 0.18)
    c.lineTo(m * 0.26, -m * 0.18)
    c.lineTo(m * 0.26, m * 0.92)
    c.lineTo(-m * 0.26, m * 0.92)
    c.lineTo(-m * 0.26, -m * 0.18)
    c.lineTo(-m * 0.62, -m * 0.18)
    c.closePath()

    if (w.gevuld) {
      c.fillStyle = '#f4f4f8'
      c.fill()
    } else {
      c.strokeStyle = '#f4f4f8'
      c.lineWidth = Math.max(4, m * 0.09)
      c.lineJoin = 'round'
      c.stroke()
    }
    c.restore()

    // Geheugensteun, klein en onderaan; je hebt geen tijd om het te lezen.
    c.fillStyle = 'rgba(255,255,255,.4)'
    c.font = `600 ${Math.round(h * 0.038)}px system-ui, sans-serif`
    c.textAlign = 'center'
    c.fillText(
      w.gevuld ? 'dicht → veeg mee' : 'omlijnd → veeg tegen',
      b / 2,
      h - h * 0.05,
    )
    c.textAlign = 'start'
  },

  afstand: (w) => w.goed,
  eenheid: 'goed',
}

export const pijlen = maakArcadeSpel({
  id: 'pijlen',
  naam: 'Pijlen',
  uitleg: 'Dichte pijl: veeg mee. Omlijnde pijl: veeg tegen. En het gaat sneller.',
  regels: [
    'Dichtgemaakte pijl: veeg de kant op waar hij wijst.',
    'Alleen omlijnd: veeg precies de andere kant op.',
    'Elke goede veeg maakt de volgende sneller.',
    'Wie de meeste haalt deelt 10 uit. De rest drinkt.',
  ],
  tags: ['reflex', 'chaos'],
  besturing: 'Veeg mee met een dichte pijl, tegen een omlijnde in',
  spel: pijlenSpel,
})

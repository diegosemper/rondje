import { useState } from 'react'
import { husselen } from '../../engine/random'
import type { Actie, GameModule, KijkContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { GELIJK_VRAGEN } from './vragen'

/* ─────────────────────────────────────────────────────────────
   GELIJK DENKEN

   De app stelt een vraag, iedereen typt tegelijk een antwoord. Typte iemand
   anders precies hetzelfde, dan ben je veilig. Sta je alleen, dan drink je.

   Je moet dus juist het meest suffe, voor de hand liggende antwoord geven —
   en dat is moeilijker dan het klinkt, want iedereen die hier wel eens wat
   origineels wil roepen, wordt daarvoor afgestraft.
   ───────────────────────────────────────────────────────────── */

const RONDES = 5
const STRAF_ALLEEN = 3

interface Groep {
  woord: string
  uids: string[]
}

interface GelijkState {
  ronde: number
  vragen: string[]
  _geheim: { antwoorden: Record<string, string> }
  ingeleverd: string[]
  uitslag: Groep[] | null
  klaar: boolean
}

/**
 * "Heineken", " heineken " en "Heinekén" moeten hetzelfde tellen. Anders
 * wint de slordigste typer nooit.
 */
function normaliseer(woord: string): string {
  return woord
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

export const gelijkdenken: GameModule<GelijkState> = {
  id: 'gelijkdenken',
  naam: 'Gelijk Denken',
  uitleg: 'Typ hetzelfde als de rest. Origineel zijn kost je een slok.',
  regels: [
    'Iedereen typt tegelijk een antwoord.',
    'Typte iemand anders hetzelfde? Je bent veilig.',
    'Sta je alleen, dan drink je.',
    'Het suffe antwoord is het goede antwoord.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['praten', 'geheim'],
  privescherm: true,

  init(ctx) {
    return {
      ronde: 1,
      vragen: husselen(ctx.rng, GELIJK_VRAGEN).slice(0, RONDES),
      _geheim: { antwoorden: {} },
      ingeleverd: [],
      uitslag: null,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (!s.uitslag && actie.type === 'antwoord') {
      if (s._geheim.antwoorden[actie.uid]) return
      const woord = String(actie.payload?.woord ?? '').trim().slice(0, 24)
      if (!woord) return

      s._geheim.antwoorden[actie.uid] = woord
      if (!s.ingeleverd.includes(actie.uid)) s.ingeleverd.push(actie.uid)
      if (!iedereen.every((u) => s._geheim.antwoorden[u])) return

      // Alles binnen: op een hoop vegen wat hetzelfde is.
      const perSleutel = new Map<string, Groep>()
      for (const uid of iedereen) {
        const ruw = s._geheim.antwoorden[uid]
        const sleutel = normaliseer(ruw)
        const bestaand = perSleutel.get(sleutel)
        if (bestaand) bestaand.uids.push(uid)
        else perSleutel.set(sleutel, { woord: ruw, uids: [uid] })
      }

      const groepen = [...perSleutel.values()].sort((a, b) => b.uids.length - a.uids.length)
      s.uitslag = groepen

      const alleen = groepen.filter((g) => g.uids.length === 1)
      for (const g of alleen) {
        ctx.drink(g.uids[0], STRAF_ALLEEN, `stond alleen met "${g.woord}"`)
      }
      if (alleen.length === 0) ctx.log('Iedereen zat bij iemand — niemand drinkt')
      return
    }

    if (s.uitslag && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.klaar = true
        ctx.wisPrive()
        ctx.klaar()
        return
      }
      s.ronde++
      s._geheim.antwoorden = {}
      s.ingeleverd = []
      s.uitslag = null
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    const vraag = s.vragen[(s.ronde - 1) % s.vragen.length]

    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Vraag {s.ronde}/{RONDES}
          </span>
          <span className="kop-klein">saai = veilig</span>
        </div>

        <Kaartje style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 28 }}>{vraag}</h1>
        </Kaartje>

        {s.uitslag ? (
          <Uitslag s={s} ctx={ctx} />
        ) : (
          <Typen key={s.ronde} s={s} ctx={ctx} />
        )}
      </>
    )
  },
}

function Typen({ s, ctx }: { s: GelijkState; ctx: KijkContext }) {
  const [tekst, zetTekst] = useState('')
  const ikKlaar = s.ingeleverd.includes(ctx.ik)

  return (
    <>
      <div className="midden" style={{ gap: 10 }}>
        <div style={{ fontSize: 44 }}>{ikKlaar ? '🤫' : '⌨️'}</div>
        <div className="klein zacht">
          {s.ingeleverd.length} van {ctx.spelers.length} ingeleverd
        </div>
        <SpelerBalk spelers={ctx.spelers} actief={s.ingeleverd} />
      </div>

      <div className="onderaan">
        {ikKlaar ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <h2 className="zacht">Ingeleverd — wachten op de rest</h2>
          </Kaartje>
        ) : (
          <>
            <input
              value={tekst}
              onChange={(e) => zetTekst(e.target.value.slice(0, 24))}
              placeholder="jouw antwoord…"
              autoComplete="off"
              autoCorrect="off"
            />
            <GroteKnop
              kleur="goud"
              uit={tekst.trim().length < 1}
              bijTik={() => ctx.stuur('antwoord', { woord: tekst })}
            >
              Inleveren
            </GroteKnop>
            <div className="klein zacht" style={{ textAlign: 'center' }}>
              Denk niet na. Typ wat iedereen typt.
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Uitslag({ s, ctx }: { s: GelijkState; ctx: KijkContext }) {
  const groepen = s.uitslag!

  return (
    <>
      <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
        {groepen.map((g, i) => {
          const alleen = g.uids.length === 1
          return (
            <div
              key={i}
              className="kaartje balk"
              style={{
                borderColor: alleen ? 'var(--rood)' : 'var(--groen)',
                background: alleen ? 'var(--rood-donker)' : undefined,
              }}
            >
              <span>
                <strong style={{ fontSize: 18 }}>{g.woord}</strong>
                <br />
                <span className="klein zacht">{g.uids.map(ctx.naam).join(', ')}</span>
              </span>
              <span style={{ fontSize: 20, fontWeight: 800 }}>
                {alleen ? '🍺' : `×${g.uids.length}`}
              </span>
            </div>
          )
        })}
      </div>

      <div className="onderaan">
        {ctx.benIkHost ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
            {s.ronde >= RONDES ? 'Klaar' : 'Volgende vraag'}
          </GroteKnop>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Wachten op de host…</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

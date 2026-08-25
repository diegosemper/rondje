import { pak } from '../../engine/random'
import { volgende } from '../../engine/beurten'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, startKlok, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { ALFABET_CATEGORIEEN } from './categorieen'

/* ─────────────────────────────────────────────────────────────
   HET ALFABET

   Een categorie, en dan de kring rond op alfabet: A, B, C, D. Jij moet iets
   noemen dat met jouw letter begint, binnen de tijd.

   De klok wordt elke ronde iets korter, en de letters worden vanzelf lastiger.
   Wie vastloopt drinkt zoveel als hoe ver de groep gekomen was — dus hoe
   verder jullie komen, hoe harder de klap.

   Q, X, Y en IJ zitten er gewoon in. Sterkte.
   ───────────────────────────────────────────────────────────── */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const START_SEC = 10
/** Elke letter gaat het een halve seconde sneller. */
const AFNAME = 0.4
const MIN_SEC = 4
const RONDES = 3
const MAX_STRAF = 8

interface AlfabetState {
  ronde: number
  categorie: string
  letterIndex: number
  beurt: string
  klok: Klok | null
  /** welke letters al gehaald zijn, en door wie */
  genoemd: { letter: string; uid: string }[]
  fase: 'bezig' | 'uitslag'
  verliezer: string | null
  hoeverGekomen: number
  klaar: boolean
}

function secondenVoor(index: number): number {
  return Math.max(MIN_SEC, START_SEC - index * AFNAME)
}

function nieuweRonde(s: AlfabetState, ctx: SpelContext) {
  s.categorie = pak(ctx.rng, ALFABET_CATEGORIEEN)
  s.letterIndex = 0
  s.beurt = pak(
    ctx.rng,
    ctx.spelers.map((p) => p.uid),
  )
  s.genoemd = []
  s.fase = 'bezig'
  s.verliezer = null
  s.hoeverGekomen = 0
  s.klok = startKlok(secondenVoor(0), ctx.nu)
}

function struikel(s: AlfabetState, ctx: SpelContext, uid: string, reden: string) {
  s.fase = 'uitslag'
  s.klok = null
  s.verliezer = uid
  s.hoeverGekomen = s.letterIndex
  const straf = Math.min(MAX_STRAF, Math.max(1, s.letterIndex))
  ctx.drink(uid, straf, reden)
}

export const alfabet: GameModule<AlfabetState> = {
  id: 'alfabet',
  naam: 'Het Alfabet',
  uitleg: 'Een categorie, en dan A, B, C de kring rond. Hoe verder, hoe zwaarder.',
  regels: [
    'Noem iets uit de categorie met jouw letter.',
    'De volgende krijgt de letter erna.',
    'De klok wordt elke letter iets korter.',
    'Vastgelopen? Je drinkt zoveel als hoe ver jullie kwamen.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['praten', 'reflex', 'chaos'],
  privescherm: false,

  init(ctx) {
    const s: AlfabetState = {
      ronde: 1,
      categorie: '',
      letterIndex: 0,
      beurt: ctx.spelers[0].uid,
      klok: null,
      genoemd: [],
      fase: 'bezig',
      verliezer: null,
      hoeverGekomen: 0,
      klaar: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'bezig') {
      if (actie.type === 'gezegd') {
        if (actie.uid !== s.beurt) return
        // Je zegt het hardop; de app houdt alleen bij welke letter je had.
        s.genoemd.push({ letter: LETTERS[s.letterIndex], uid: actie.uid })
        s.letterIndex++

        if (s.letterIndex >= LETTERS.length) {
          // Het hele alfabet gehaald. Dat verdient een beloning.
          s.fase = 'uitslag'
          s.klok = null
          s.verliezer = null
          s.hoeverGekomen = LETTERS.length
          ctx.log('Het hele alfabet gehaald — dat gebeurt bijna nooit')
          return
        }

        s.beurt = volgende(volgorde, s.beurt)
        s.klok = startKlok(secondenVoor(s.letterIndex), ctx.nu)
        return
      }

      if (actie.type === 'geef-op') {
        if (actie.uid !== s.beurt) return
        struikel(s, ctx, actie.uid, `wist er geen met de ${LETTERS[s.letterIndex]}`)
        return
      }

      if (actie.type === 'afgekeurd') {
        // Iemand anders keurt het af — de groep is de scheidsrechter.
        if (actie.uid === s.beurt) return
        struikel(s, ctx, s.beurt, 'werd afgekeurd')
        return
      }

      if (actie.type === 'tijd-op') {
        struikel(s, ctx, s.beurt, `was te traag bij de ${LETTERS[s.letterIndex]}`)
        return
      }
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.klaar = true
        ctx.klaar()
        return
      }
      s.ronde++
      nieuweRonde(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

function Scherm({ s, ctx }: { s: AlfabetState; ctx: KijkContext }) {
  useHostKlok(ctx, s.fase === 'bezig', s.klok?.eind ?? 0, 'tijd-op')

  const mijnBeurt = ctx.ik === s.beurt && s.fase === 'bezig'
  const letter = LETTERS[Math.min(s.letterIndex, LETTERS.length - 1)]

  if (s.fase === 'uitslag') {
    return (
      <>
        <div className="midden" style={{ gap: 10 }}>
          <div style={{ fontSize: 54 }}>{s.verliezer ? '💀' : '🏆'}</div>
          <h1>
            {s.verliezer ? `${ctx.naam(s.verliezer)} liep vast` : 'Het hele alfabet!'}
          </h1>
          <div className="zacht">
            Tot en met {LETTERS[Math.max(0, s.hoeverGekomen - 1)]} · {s.categorie}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
            {s.genoemd.map((g, i) => (
              <span key={i} className="kaartje" style={{ padding: '3px 8px', fontSize: 12 }}>
                <strong>{g.letter}</strong> <span className="zacht">{ctx.naam(g.uid)}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="onderaan">
          {ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
              {s.ronde >= RONDES ? 'Klaar' : 'Volgende ronde'}
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

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Ronde {s.ronde}/{RONDES}
        </span>
        <span className="kop-klein">
          fout kost nu {ctx.slokKort(Math.max(1, s.letterIndex))}
        </span>
      </div>

      <Kaartje style={{ textAlign: 'center' }}>
        <div className="kop-klein">Categorie</div>
        <h2>{s.categorie}</h2>
      </Kaartje>

      <SpelerBalk spelers={ctx.spelers} actief={s.beurt} />

      <div className="midden" style={{ gap: 8 }}>
        <div
          className="reusachtig"
          style={{
            fontSize: 'clamp(70px,26vw,140px)',
            color: mijnBeurt ? 'var(--goud)' : 'var(--tekst)',
          }}
        >
          {letter}
        </div>
        <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />
        <div className="klein zacht">{klokTekst(s.klok, ctx.nu)}s</div>

        {s.genoemd.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
            {s.genoemd.slice(-10).map((g, i) => (
              <span key={i} className="kaartje" style={{ padding: '3px 8px', fontSize: 11 }}>
                <strong>{g.letter}</strong> <span className="zacht">{ctx.naam(g.uid)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="onderaan">
        {mijnBeurt ? (
          <>
            <GroteKnop kleur="groen" enorm bijTik={() => ctx.stuur('gezegd')}>
              Gezegd — volgende
            </GroteKnop>
            <GroteKnop kleur="rood" klein bijTik={() => ctx.stuur('geef-op')}>
              Ik weet er geen
            </GroteKnop>
          </>
        ) : (
          <>
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">
                {ctx.speler(s.beurt)?.emoji} {ctx.naam(s.beurt)} moet iets met de {letter}
              </span>
            </Kaartje>
            <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('afgekeurd')}>
              Afgekeurd! ({ctx.naam(s.beurt)} drinkt)
            </GroteKnop>
          </>
        )}
      </div>
    </>
  )
}

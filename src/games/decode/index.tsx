import { useState } from 'react'
import { useHostKlok } from '../../engine/hooks'
import { startKlok, voortgang, klokTekst, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { maakPuzzel, isGoed } from './puzzel'

/* ─────────────────────────────────────────────────────────────
   DE CODE

   Het enige spel in de app waarin de groep niet tegen elkaar speelt maar
   samen tegen de klok.

   Er is een code van vier cijfers. Iedereen krijgt een eigen aanwijzing op
   zijn scherm — "het derde cijfer is even", "de vier cijfers zijn samen 19" —
   en die moet je hardop vertellen. Je scherm laten zien mag niet, want dan is
   er niets te doen: dan legt iemand vier telefoons naast elkaar en is het
   binnen dertig seconden klaar.

   Samen heb je precies genoeg om er één code uit te krijgen. Lukt het binnen
   de tijd, dan drinkt niemand. Lukt het niet, dan drinkt iedereen — en dat is
   waarom het werkt: er is geen winnaar om blij voor te zijn, alleen een tafel
   die het samen verprutst heeft.

   De aanwijzingen worden per potje gemaakt en niet uit een lijst gepakt. Zie
   puzzel.ts: die zoekt net zo lang tot er precies één code overblijft. Een
   vaste lijst zou na drie potjes op zijn, en dan zit er iemand aan tafel die
   het antwoord al kent.
   ───────────────────────────────────────────────────────────── */

const RONDES = 3
const SECONDEN = 180
/** Zoveel keer mag je ernaast zitten voordat het klaar is. */
const POGINGEN = 3
/** Wat iedereen drinkt als de code niet gekraakt wordt. */
const STRAF = 4

interface CodeState {
  fase: 'kraken' | 'uitslag' | 'klaar'
  ronde: number
  klok: Klok | null

  /** wat er al geprobeerd is, met hoeveel er goed stonden */
  pogingen: { gok: string; juist: number }[]
  over: number

  /** gezet zodra de ronde voorbij is */
  afloop: { gelukt: boolean; code: string; door: string | null } | null

  _geheim: { code: number[] }

  klaar: boolean
}

/**
 * Hoeveel cijfers er op de goede plek stonden.
 *
 * Dit is de enige hulp die je krijgt na een misser, en hij is met opzet mager:
 * je hoort wél dat je er twee goed had maar niet welke. Zonder die hulp is een
 * foute gok helemaal niets waard en gokt niemand meer; mét te veel hulp kun je
 * hem eruit brute-forcen en hoef je de aanwijzingen niet te gebruiken.
 */
function juistePlekken(code: number[], gok: string): number {
  return code.filter((c, i) => String(c) === gok[i]).length
}

function nieuweRonde(s: CodeState, ctx: SpelContext) {
  const puzzel = maakPuzzel(ctx.rng, ctx.spelers.length)

  s.fase = 'kraken'
  s._geheim.code = puzzel.code
  s.pogingen = []
  s.over = POGINGEN
  s.afloop = null
  s.klok = startKlok(SECONDEN, ctx.nu)

  // Ieder zijn eigen aanwijzing. Die staat nergens publiek, anders kan je ze
  // van elkaars scherm aflezen en valt er niets te vertellen.
  ctx.spelers.forEach((p, i) => {
    ctx.zetPrive(p.uid, { aanwijzing: puzzel.aanwijzingen[i] ?? '' })
  })

  ctx.log(`Nieuwe code — ${ctx.spelers.length} aanwijzingen verdeeld`)
}

function sluitAf(s: CodeState, ctx: SpelContext, gelukt: boolean, door: string | null) {
  s.fase = 'uitslag'
  s.klok = null
  s.afloop = { gelukt, code: s._geheim.code.join(''), door }

  if (gelukt) {
    ctx.log(`De code was ${s.afloop.code} — gekraakt`)
    return
  }

  for (const p of ctx.spelers) {
    ctx.drink(p.uid, STRAF, `kraakte de code ${s.afloop.code} niet`)
  }
}

export const decode: GameModule<CodeState> = {
  id: 'decode',
  naam: 'De Code',
  uitleg: 'Samen tegen de klok. Ieder heeft één aanwijzing en moet die vertellen.',
  regels: [
    'Er is een code van vier cijfers.',
    'Ieder krijgt één aanwijzing — vertel hem hardop, laat je scherm niet zien.',
    'Samen weet je genoeg om er precies één code uit te krijgen.',
    'Lukt het niet op tijd, dan drinkt iedereen.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['praten', 'geheim'],
  privescherm: true,

  init(ctx) {
    const s: CodeState = {
      fase: 'kraken',
      ronde: 1,
      klok: null,
      pogingen: [],
      over: POGINGEN,
      afloop: null,
      _geheim: { code: [] },
      klaar: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    if (s.fase === 'kraken') {
      if (actie.type === 'gok') {
        const gok = String(actie.payload?.gok ?? '').trim()
        if (!/^\d{4}$/.test(gok)) return
        if (s.pogingen.some((p) => p.gok === gok)) return

        if (isGoed(s._geheim.code, gok)) {
          sluitAf(s, ctx, true, actie.uid)
          return
        }

        s.pogingen.push({ gok, juist: juistePlekken(s._geheim.code, gok) })
        s.over--
        if (s.over <= 0) sluitAf(s, ctx, false, null)
        return
      }

      // De klok is om.
      if (actie.type === 'tijd-om') {
        sluitAf(s, ctx, false, null)
        return
      }
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.fase = 'klaar'
        s.klaar = true
        ctx.wisPrive()
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

/* ── Schermen ───────────────────────────────────────────────── */

function Scherm({ s, ctx }: { s: CodeState; ctx: KijkContext }) {
  useHostKlok(ctx, s.fase === 'kraken', s.klok?.eind ?? 0, 'tijd-om')

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Code {s.ronde}/{RONDES}
        </span>
        <span className="kop-klein">
          {s.fase === 'kraken' ? `nog ${s.over} pogingen` : 'open'}
        </span>
      </div>

      {s.fase === 'uitslag' ? <Uitslag s={s} ctx={ctx} /> : <Kraken s={s} ctx={ctx} />}
    </>
  )
}

function Kraken({ s, ctx }: { s: CodeState; ctx: KijkContext }) {
  const [gok, zetGok] = useState('')
  const aanwijzing: string = ctx.prive?.aanwijzing ?? ''
  const mag = /^\d{4}$/.test(gok) && !s.pogingen.some((p) => p.gok === gok)

  return (
    <>
      <Kaartje style={{ borderColor: 'var(--goud)' }}>
        <div className="kop-klein" style={{ marginBottom: 6 }}>
          🤫 Jouw aanwijzing — vertel hem hardop
        </div>
        <div style={{ fontSize: 17, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
          {aanwijzing || '…'}
        </div>
      </Kaartje>

      {s.klok && <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />}

      <div className="midden" style={{ gap: 8 }}>
        <div className="reusachtig" style={{ fontSize: 'clamp(34px,11vw,56px)' }}>
          {klokTekst(s.klok, ctx.nu)}
        </div>

        {s.pogingen.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
            <div className="kop-klein" style={{ textAlign: 'center' }}>
              Al geprobeerd
            </div>
            {s.pogingen.map((p) => (
              <div key={p.gok} className="kaartje balk" style={{ padding: '6px 10px' }}>
                <strong style={{ letterSpacing: 3, fontSize: 18 }}>{p.gok}</strong>
                <span className="klein zacht">
                  {p.juist} op de goede plek
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="klein zacht" style={{ textAlign: 'center', maxWidth: 320 }}>
            Niemand heeft genoeg aan zijn eigen aanwijzing. Vertel hem hardop en luister
            naar de rest.
          </div>
        )}

        <SpelerBalk spelers={ctx.spelers} actief={[]} />
      </div>

      <div className="onderaan">
        <input
          value={gok}
          onChange={(e) => zetGok(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          placeholder="––––"
          aria-label="De code"
          style={{ textAlign: 'center', letterSpacing: 10, fontSize: 26 }}
        />
        <GroteKnop
          kleur="groen"
          enorm
          uit={!mag}
          bijTik={() => {
            tril(10)
            ctx.stuur('gok', { gok })
            zetGok('')
          }}
        >
          Probeer deze code
        </GroteKnop>
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          Ernaast? Je hoort hoeveel cijfers er goed stonden, niet welke.
        </div>
      </div>
    </>
  )
}

function Uitslag({ s, ctx }: { s: CodeState; ctx: KijkContext }) {
  const a = s.afloop!
  const laatste = s.ronde >= RONDES

  return (
    <>
      <div className="midden" style={{ gap: 12 }}>
        <div style={{ fontSize: 48 }}>{a.gelukt ? '🔓' : '🔒'}</div>
        <h2 style={{ textAlign: 'center' }}>
          {a.gelukt
            ? `${a.door ? ctx.naam(a.door) : 'Iemand'} typte hem in`
            : 'De code is niet gekraakt'}
        </h2>

        <Kaartje
          style={{
            textAlign: 'center',
            borderColor: a.gelukt ? 'var(--groen)' : 'var(--rood)',
          }}
        >
          <div className="kop-klein">De code was</div>
          <div
            className="reusachtig"
            style={{
              letterSpacing: 10,
              fontSize: 44,
              color: a.gelukt ? 'var(--groen)' : 'var(--rood)',
            }}
          >
            {a.code}
          </div>
        </Kaartje>

        <div className="klein zacht" style={{ textAlign: 'center' }}>
          {a.gelukt
            ? 'Samen gelukt — niemand drinkt.'
            : `Iedereen drinkt ${ctx.slok(STRAF)}.`}
        </div>
      </div>

      <div className="onderaan">
        {ctx.benIkHost ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
            {laatste ? 'Klaar' : 'Volgende code'}
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

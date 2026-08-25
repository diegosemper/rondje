import { husselen } from '../../engine/random'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   DE KETTING

   Iedereen krijgt geheim een getal tussen 1 en 100. De groep moet ze op
   volgorde van laag naar hoog neerleggen — zonder te praten. Je weet alleen
   je eigen getal, dus je moet aanvoelen hoe lang je moet wachten.

   Ronde 1 heeft iedereen één getal, ronde 2 twee, ronde 3 drie. Dat wordt
   heel snel heel moeilijk.

   Bestaat niet als drankspel, en kán ook niet bestaan zonder telefoons: er is
   geen manier om aan een tafel iedereen een geheim getal te geven zonder dat
   iemand de boekhouding doet.
   ───────────────────────────────────────────────────────────── */

const MAX_GETAL = 100
const RONDES = 3
/** Een misser van 40 zou de avond beëindigen, dus er zit een dak op. */
const MAX_STRAF = 6

interface Gelegd {
  uid: string
  getal: number
  /** te vroeg gelegd? */
  fout: boolean
}

interface KettingState {
  ronde: number
  fase: 'spelen' | 'rondeklaar' | 'klaar'

  _geheim: { handen: Record<string, number[]> }

  /** hoeveel getallen iedereen nog heeft — dit mag iedereen zien */
  over: Record<string, number>
  gelegd: Gelegd[]

  laatsteFout: { uid: string; getal: number; gemist: number[]; straf: number } | null
  fouten: number
}

function deelUit(s: KettingState, ctx: SpelContext, hoeveel: number) {
  const pot = husselen(
    ctx.rng,
    Array.from({ length: MAX_GETAL }, (_, i) => i + 1),
  )
  let i = 0
  for (const p of ctx.spelers) {
    const hand = pot.slice(i, i + hoeveel).sort((a, b) => a - b)
    i += hoeveel
    s._geheim.handen[p.uid] = hand
    s.over[p.uid] = hand.length
    ctx.zetPrive(p.uid, { getallen: hand })
  }
}

function nieuweRonde(s: KettingState, ctx: SpelContext) {
  s.fase = 'spelen'
  s.gelegd = []
  s.laatsteFout = null
  s.fouten = 0
  deelUit(s, ctx, s.ronde)
}

export const ketting: GameModule<KettingState> = {
  id: 'ketting',
  naam: 'De Ketting',
  uitleg: 'Geheime getallen op volgorde leggen. Zonder te praten.',
  regels: [
    'Je krijgt geheim een getal tussen 1 en 100.',
    'Samen moeten jullie ze van laag naar hoog leggen.',
    'Praten mag niet. Kreunen wel.',
    'Te vroeg gelegd? Je drinkt het verschil.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['geheim', 'chaos', 'geheugen'],
  privescherm: true,

  init(ctx) {
    const s: KettingState = {
      ronde: 1,
      fase: 'spelen',
      _geheim: { handen: {} },
      over: {},
      gelegd: [],
      laatsteFout: null,
      fouten: 0,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    if (s.fase === 'spelen' && actie.type === 'leg') {
      const hand = s._geheim.handen[actie.uid] ?? []
      if (hand.length === 0) return

      const getal = hand.shift()!
      s._geheim.handen[actie.uid] = hand
      s.over[actie.uid] = hand.length
      ctx.zetPrive(actie.uid, { getallen: hand })

      // Had iemand anders nog iets lagers? Dan was dit te vroeg.
      const gemist: number[] = []
      for (const p of ctx.spelers) {
        if (p.uid === actie.uid) continue
        const anderHand = s._geheim.handen[p.uid] ?? []
        const teLaag = anderHand.filter((g) => g < getal)
        if (teLaag.length === 0) continue

        gemist.push(...teLaag)
        // Die getallen zijn verbrand; de ketting loopt door.
        const rest = anderHand.filter((g) => g >= getal)
        s._geheim.handen[p.uid] = rest
        s.over[p.uid] = rest.length
        ctx.zetPrive(p.uid, { getallen: rest })
      }

      const fout = gemist.length > 0
      s.gelegd.push({ uid: actie.uid, getal, fout })

      if (fout) {
        const laagste = Math.min(...gemist)
        const straf = Math.min(MAX_STRAF, Math.max(1, getal - laagste))
        s.laatsteFout = { uid: actie.uid, getal, gemist: gemist.sort((a, b) => a - b), straf }
        s.fouten++
        ctx.drink(actie.uid, straf, `legde ${getal} terwijl ${laagste} nog lag`)
      }

      if (ctx.spelers.every((p) => (s._geheim.handen[p.uid] ?? []).length === 0)) {
        s.fase = 'rondeklaar'
      }
      return
    }

    if (s.fase === 'rondeklaar' && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.fase = 'klaar'
        ctx.wisPrive()
        ctx.klaar()
        return
      }
      s.ronde++
      nieuweRonde(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.fase === 'klaar',

  View({ state: s, ctx }) {
    const mijn: number[] = ctx.prive?.getallen ?? []

    if (s.fase === 'rondeklaar') {
      return (
        <>
          <div className="midden" style={{ gap: 10 }}>
            <div style={{ fontSize: 54 }}>{s.fouten === 0 ? '🏆' : '😬'}</div>
            <h1>Ronde {s.ronde} klaar</h1>
            <h2 className="zacht">
              {s.fouten === 0
                ? 'Foutloos! Hoe dan.'
                : `${s.fouten} keer te vroeg gelegd`}
            </h2>
            <Ketting s={s} ctx={ctx} />
          </div>
          <div className="onderaan">
            {ctx.benIkHost ? (
              <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
                {s.ronde >= RONDES ? 'Klaar' : `Ronde ${s.ronde + 1} — ${s.ronde + 1} getallen elk`}
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
            Ronde {s.ronde}/{RONDES} · {s.ronde} {s.ronde === 1 ? 'getal' : 'getallen'} elk
          </span>
          <span className="kop-klein">🤐 niet praten</span>
        </div>

        <Ketting s={s} ctx={ctx} />

        <div className="midden" style={{ gap: 10 }}>
          {s.laatsteFout && (
            <Kaartje style={{ borderColor: 'var(--rood)', textAlign: 'center' }}>
              <div className="kop-klein">Te vroeg</div>
              <div className="klein">
                {ctx.naam(s.laatsteFout.uid)} legde <strong>{s.laatsteFout.getal}</strong>, maar{' '}
                {s.laatsteFout.gemist.join(', ')} lag er nog
              </div>
            </Kaartje>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {ctx.spelers.map((p) => (
              <span
                key={p.uid}
                className="kaartje"
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  opacity: (s.over[p.uid] ?? 0) === 0 ? 0.35 : 1,
                }}
              >
                {p.emoji} {p.naam} · {s.over[p.uid] ?? 0}
              </span>
            ))}
          </div>
        </div>

        <div className="onderaan">
          <div className="kop-klein" style={{ textAlign: 'center' }}>
            {mijn.length === 0 ? 'Je bent leeg — kijken maar' : '🤫 Jouw getallen'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {mijn.map((g, i) => (
              <span
                key={g}
                className="kaartje"
                style={{
                  padding: '8px 16px',
                  fontSize: 24,
                  fontWeight: 800,
                  color: i === 0 ? 'var(--goud)' : 'var(--tekst-zacht)',
                  borderColor: i === 0 ? 'var(--goud)' : undefined,
                }}
              >
                {g}
              </span>
            ))}
          </div>

          <GroteKnop
            kleur="goud"
            enorm
            uit={mijn.length === 0}
            bijTik={() => ctx.stuur('leg')}
          >
            {mijn.length === 0 ? 'Niets meer' : `LEG ${mijn[0]}`}
          </GroteKnop>
        </div>
      </>
    )
  },
}

function Ketting({ s, ctx }: { s: KettingState; ctx: KijkContext }) {
  if (s.gelegd.length === 0) {
    return (
      <div className="klein zacht" style={{ textAlign: 'center' }}>
        Nog niets gelegd. Wie heeft het laagste getal?
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
      {s.gelegd.map((g, i) => (
        <span
          key={i}
          className="kaartje"
          style={{
            padding: '5px 10px',
            fontSize: 15,
            fontWeight: 700,
            borderColor: g.fout ? 'var(--rood)' : 'var(--groen)',
            background: g.fout ? 'var(--rood-donker)' : undefined,
          }}
          title={ctx.naam(g.uid)}
        >
          {g.getal}
        </span>
      ))}
    </div>
  )
}

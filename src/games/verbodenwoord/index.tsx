import { pak } from '../../engine/random'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, startKlok, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { VERBODEN_WOORDEN, LOKKERTJES } from './woorden'

/* ─────────────────────────────────────────────────────────────
   VERBODEN WOORD

   Er is één woord dat niemand mag zeggen. Iedereen ziet welk woord dat is —
   behalve het slachtoffer. Die weet dus niet waar hij in trapt.

   Drie minuten lang probeert de groep hem het woord te ontlokken. Zegt hij
   het: hij drinkt fors. Zegt de groep het per ongeluk zelf: die persoon
   drinkt. Houdt het slachtoffer het vol, dan mag hij uitdelen.

   Bestaat niet zonder telefoons: je kunt aan een tafel niet aan zeven mensen
   een woord laten zien zonder dat de achtste het merkt.
   ───────────────────────────────────────────────────────────── */

const RONDE_SEC = 180
const STRAF_SLACHTOFFER = 5
const STRAF_VERSPREKING = 2
const VOLGEHOUDEN_UITDELEN = 4
const RONDES = 3

interface VerbodenState {
  ronde: number
  fase: 'bezig' | 'uitslag'
  slachtoffer: string
  woord: string
  /** een hint die de groep helpt het woord te ontlokken */
  lokkertje: string
  klok: Klok | null

  versprekingen: { uid: string }[]
  betrapt: boolean
  magUitdelen: boolean
  klaar: boolean
  /** wie er al slachtoffer is geweest */
  gehad: string[]
}

function nieuweRonde(s: VerbodenState, ctx: SpelContext) {
  const nogNiet = ctx.spelers.map((p) => p.uid).filter((u) => !s.gehad.includes(u))
  const pool = nogNiet.length > 0 ? nogNiet : ctx.spelers.map((p) => p.uid)
  s.slachtoffer = pak(ctx.rng, pool)
  s.gehad.push(s.slachtoffer)

  s.woord = pak(ctx.rng, VERBODEN_WOORDEN)
  s.lokkertje = pak(ctx.rng, LOKKERTJES)
  s.klok = startKlok(RONDE_SEC, ctx.nu)
  s.versprekingen = []
  s.betrapt = false
  s.magUitdelen = false
  s.fase = 'bezig'

  // Iedereen ziet het woord — behalve het slachtoffer.
  for (const p of ctx.spelers) {
    ctx.zetPrive(
      p.uid,
      p.uid === s.slachtoffer ? { slachtoffer: true } : { woord: s.woord, lokkertje: s.lokkertje },
    )
  }
}

export const verbodenwoord: GameModule<VerbodenState> = {
  id: 'verbodenwoord',
  naam: 'Verboden Woord',
  uitleg: 'Eén woord mag niet gezegd worden — en het slachtoffer weet niet welk.',
  regels: [
    'Iedereen ziet het verboden woord. Eén iemand niet.',
    'Probeer hem het te laten zeggen.',
    'Zeg jij het zelf? Dan drink jij.',
    'Houdt hij het drie minuten vol, dan deelt hij uit.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['geheim', 'praten', 'bluf'],
  privescherm: true,

  init(ctx) {
    const s: VerbodenState = {
      ronde: 1,
      fase: 'bezig',
      slachtoffer: '',
      woord: '',
      lokkertje: '',
      klok: null,
      versprekingen: [],
      betrapt: false,
      magUitdelen: false,
      klaar: false,
      gehad: [],
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'bezig') {
      /* Het slachtoffer heeft het gezegd — iedereen mag dat melden. */
      if (actie.type === 'gezegd') {
        if (actie.uid === s.slachtoffer) return
        s.betrapt = true
        s.fase = 'uitslag'
        s.klok = null
        ctx.drink(s.slachtoffer, STRAF_SLACHTOFFER, `zei "${s.woord}"`)
        return
      }

      /* Iemand uit de groep verspreekt zich — dat meld je zelf. */
      if (actie.type === 'versproken') {
        if (actie.uid === s.slachtoffer) return
        s.versprekingen.push({ uid: actie.uid })
        ctx.drink(actie.uid, STRAF_VERSPREKING, 'zei het woord zelf')
        return
      }

      if (actie.type === 'tijd-op' || actie.type === 'stop') {
        s.fase = 'uitslag'
        s.klok = null
        s.betrapt = false
        s.magUitdelen = true
        ctx.log(`${ctx.naam(s.slachtoffer)} hield het vol`)
        return
      }
      return
    }

    if (s.fase === 'uitslag') {
      if (actie.type === 'geef' && s.magUitdelen && actie.uid === s.slachtoffer) {
        const verdeling: Record<string, number> = actie.payload?.verdeling
        if (!verdeling || typeof verdeling !== 'object') return
        for (const [uid, aantal] of Object.entries(verdeling)) {
          if (!iedereen.includes(uid) || uid === actie.uid) continue
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'hield het verboden woord binnen')
        }
        s.magUitdelen = false
        return
      }

      if (actie.type === 'verder') {
        if (s.ronde >= RONDES) {
          s.klaar = true
          ctx.wisPrive()
          ctx.klaar()
          return
        }
        s.ronde++
        nieuweRonde(s, ctx)
        return
      }
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

function Scherm({ s, ctx }: { s: VerbodenState; ctx: KijkContext }) {
  useHostKlok(ctx, s.fase === 'bezig', s.klok?.eind ?? 0, 'tijd-op')

  const ikBenHet = ctx.ik === s.slachtoffer
  const woord: string | undefined = ctx.prive?.woord
  const lokkertje: string | undefined = ctx.prive?.lokkertje
  const slachtoffer = ctx.speler(s.slachtoffer)

  if (s.fase === 'uitslag') {
    return (
      <>
        <div className="midden" style={{ gap: 10 }}>
          <div style={{ fontSize: 54 }}>{s.betrapt ? '🎯' : '🛡️'}</div>
          <h1>{s.betrapt ? 'Erin getrapt!' : 'Volgehouden'}</h1>
          <Kaartje style={{ textAlign: 'center' }}>
            <div className="kop-klein">Het verboden woord was</div>
            <h2 style={{ color: 'var(--goud)' }}>{s.woord}</h2>
            <div className="klein zacht">
              slachtoffer: {slachtoffer?.emoji} {slachtoffer?.naam}
            </div>
          </Kaartje>
          {s.versprekingen.length > 0 && (
            <div className="klein zacht">
              Verspraken zich: {s.versprekingen.map((v) => ctx.naam(v.uid)).join(', ')}
            </div>
          )}
        </div>

        <div className="onderaan">
          {s.magUitdelen && ikBenHet ? (
            <Verdeler
              totaal={ctx.slokAantal(VOLGEHOUDEN_UITDELEN)}
              ctx={ctx}
              titel="Je hield het binnen — deel uit"
              bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
            />
          ) : s.magUitdelen ? (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">{slachtoffer?.naam} deelt uit…</span>
            </Kaartje>
          ) : ctx.benIkHost ? (
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
        <span className="kop-klein">{klokTekst(s.klok, ctx.nu)}</span>
      </div>

      <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />

      {ikBenHet ? (
        <>
          <div className="midden" style={{ gap: 12 }}>
            <div style={{ fontSize: 60 }}>🎭</div>
            <h1>Jij bent het doelwit</h1>
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">
                Er is een woord dat je niet mag zeggen.
                <br />
                Je weet niet welk.
                <br />
                <br />
                Praat gewoon mee — maar let op je woorden.
              </span>
            </Kaartje>
          </div>
          <div className="onderaan">
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="klein zacht">
                Houd je het {Math.ceil(RONDE_SEC / 60)} minuten vol, dan mag jij uitdelen.
              </span>
            </Kaartje>
          </div>
        </>
      ) : (
        <>
          <Kaartje style={{ textAlign: 'center', borderColor: 'var(--rood)' }}>
            <div className="kop-klein">🤫 Verboden woord</div>
            <h1 style={{ margin: '4px 0', color: 'var(--rood)' }}>{woord}</h1>
            <div className="klein zacht">
              {slachtoffer?.emoji} {slachtoffer?.naam} weet dit niet
            </div>
          </Kaartje>

          <Kaartje>
            <div className="kop-klein">Idee om het te ontlokken</div>
            <div className="klein">{lokkertje}</div>
          </Kaartje>

          <div className="midden">
            <div className="klein zacht" style={{ textAlign: 'center' }}>
              Zeg jij het zelf? Meld het eerlijk — dat kost je{' '}
              {ctx.slok(STRAF_VERSPREKING)}.
            </div>
          </div>

          <div className="onderaan">
            <GroteKnop kleur="rood" enorm bijTik={() => ctx.stuur('gezegd')}>
              🎯 Hij zei het!
            </GroteKnop>
            <div className="rij">
              <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('versproken')}>
                Ik zei het zelf
              </GroteKnop>
              {ctx.benIkHost && (
                <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('stop')}>
                  Genoeg — hij hield het vol
                </GroteKnop>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

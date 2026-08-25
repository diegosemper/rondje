import { useEffect, useRef, useState } from 'react'
import { pak } from '../../engine/random'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, startKlok, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   ZWAARTEKRACHT

   Leg je telefoon plat — maar niet op tafel. Op je hoofd. Op je voet. Op de
   rug van je hand. De app meet met de kantelsensor of hij nog vlak ligt.

   Wie het eerst te ver scheefzakt ligt eruit en drinkt. De laatste die het
   volhoudt mag uitdelen.

   Dit wordt vanzelf grappiger naarmate de avond vordert, en dat is precies
   de bedoeling.
   ───────────────────────────────────────────────────────────── */

/** Hoeveel graden scheef mag je zijn voordat je eruit ligt. */
const DREMPEL = 30
const MAX_SEC = 60
const STRAF_EERSTE = 3
const WINST_UITDELEN = 3
const RONDES = 3

const PLEKKEN = [
  'op je hoofd',
  'op de rug van je hand',
  'op je voet',
  'op je knie',
  'op je schouder',
  'op je elleboog',
  'op twee vingers',
  'op je onderarm, arm gestrekt',
  'op je hoofd, staand op één been',
  'op de rug van je hand, arm gestrekt',
]

interface ZwaarteState {
  ronde: number
  plek: string
  fase: 'klaarzetten' | 'bezig' | 'uitslag'
  klok: Klok | null
  /** wie er klaarstaat met de telefoon op zijn plek */
  gereed: string[]
  /** volgorde waarin mensen eruit vielen */
  gevallen: string[]
  winnaar: string | null
  magUitdelen: boolean
  klaar: boolean
}

function nieuweRonde(s: ZwaarteState, ctx: SpelContext) {
  s.plek = pak(ctx.rng, PLEKKEN)
  s.fase = 'klaarzetten'
  s.klok = null
  s.gereed = []
  s.gevallen = []
  s.winnaar = null
  s.magUitdelen = false
}

function rondAf(s: ZwaarteState, ctx: SpelContext) {
  const iedereen = ctx.spelers.map((p) => p.uid)
  const overeind = iedereen.filter((u) => !s.gevallen.includes(u))

  s.fase = 'uitslag'
  s.klok = null

  const eerste = s.gevallen[0]
  if (eerste) ctx.drink(eerste, STRAF_EERSTE, `viel als eerste ${s.plek}`)

  if (overeind.length === 1) {
    s.winnaar = overeind[0]
    s.magUitdelen = true
    ctx.log(`${ctx.naam(overeind[0])} hield 'm als enige vlak`)
  } else if (overeind.length === 0) {
    s.winnaar = s.gevallen[s.gevallen.length - 1] ?? null
    s.magUitdelen = !!s.winnaar
  } else {
    // Tijd op met meerdere overeind: niemand deelt uit.
    s.winnaar = null
    s.magUitdelen = false
  }
}

export const zwaartekracht: GameModule<ZwaarteState> = {
  id: 'zwaartekracht',
  naam: 'Zwaartekracht',
  uitleg: 'Hou je telefoon vlak — op je hoofd, je voet of je knie.',
  regels: [
    'De app zegt waar je je telefoon moet leggen.',
    'Hou hem vlak. De kantelsensor meet het echt.',
    'Te ver scheef en je ligt eruit.',
    'De eerste die valt drinkt, de laatste deelt uit.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['reflex', 'chaos'],
  privescherm: false,

  init(ctx) {
    const s: ZwaarteState = {
      ronde: 1,
      plek: '',
      fase: 'klaarzetten',
      klok: null,
      gereed: [],
      gevallen: [],
      winnaar: null,
      magUitdelen: false,
      klaar: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'klaarzetten') {
      if (actie.type === 'gereed') {
        if (!s.gereed.includes(actie.uid)) s.gereed.push(actie.uid)
        if (!iedereen.every((u) => s.gereed.includes(u))) return
        s.fase = 'bezig'
        s.klok = startKlok(MAX_SEC, ctx.nu)
        return
      }
      if (actie.type === 'forceer-start') {
        s.fase = 'bezig'
        s.klok = startKlok(MAX_SEC, ctx.nu)
        return
      }
      return
    }

    if (s.fase === 'bezig') {
      if (actie.type === 'gevallen') {
        if (s.gevallen.includes(actie.uid)) return
        s.gevallen.push(actie.uid)

        const overeind = iedereen.filter((u) => !s.gevallen.includes(u))
        if (overeind.length <= 1) rondAf(s, ctx)
        return
      }
      if (actie.type === 'tijd-op') {
        rondAf(s, ctx)
        return
      }
      return
    }

    if (s.fase === 'uitslag') {
      if (actie.type === 'geef' && s.magUitdelen && actie.uid === s.winnaar) {
        const verdeling: Record<string, number> = actie.payload?.verdeling
        if (!verdeling || typeof verdeling !== 'object') return
        for (const [uid, aantal] of Object.entries(verdeling)) {
          if (!iedereen.includes(uid) || uid === actie.uid) continue
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'hield hem het langst vlak')
        }
        s.magUitdelen = false
        return
      }

      if (actie.type === 'verder') {
        if (s.ronde >= RONDES) {
          s.klaar = true
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

/* ── De sensor ──────────────────────────────────────────────── */

type SensorStand = 'onbekend' | 'vragen' | 'aan' | 'geweigerd' | 'niet-beschikbaar'

function useKanteling(actief: boolean) {
  const [hoek, zetHoek] = useState(0)
  const [stand, zetStand] = useState<SensorStand>('onbekend')

  const start = async () => {
    const AnyOrientation = (window as any).DeviceOrientationEvent
    if (!AnyOrientation) {
      zetStand('niet-beschikbaar')
      return
    }
    // iOS wil expliciete toestemming, en alleen vanuit een echte tik.
    if (typeof AnyOrientation.requestPermission === 'function') {
      zetStand('vragen')
      try {
        const uitkomst = await AnyOrientation.requestPermission()
        zetStand(uitkomst === 'granted' ? 'aan' : 'geweigerd')
      } catch {
        zetStand('geweigerd')
      }
      return
    }
    zetStand('aan')
  }

  useEffect(() => {
    if (stand !== 'aan') return
    const bij = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0
      const gamma = e.gamma ?? 0
      // Afstand tot perfect vlak, in graden.
      zetHoek(Math.min(90, Math.sqrt(beta * beta + gamma * gamma)))
    }
    window.addEventListener('deviceorientation', bij)
    return () => window.removeEventListener('deviceorientation', bij)
  }, [stand])

  useEffect(() => {
    if (!actief) zetHoek(0)
  }, [actief])

  return { hoek, stand, start }
}

function Scherm({ s, ctx }: { s: ZwaarteState; ctx: KijkContext }) {
  const { hoek, stand, start } = useKanteling(s.fase === 'bezig')
  const ikGevallen = s.gevallen.includes(ctx.ik)
  const ikGereed = s.gereed.includes(ctx.ik)
  const gemeld = useRef(false)

  useHostKlok(ctx, s.fase === 'bezig', s.klok?.eind ?? 0, 'tijd-op')

  // Zodra je te ver scheef gaat, meld je jezelf. Alleen jouw telefoon meet
  // dat, dus alleen jij kunt het doorgeven.
  useEffect(() => {
    if (s.fase !== 'bezig') {
      gemeld.current = false
      return
    }
    if (ikGevallen || gemeld.current) return
    if (stand !== 'aan') return
    if (hoek < DREMPEL) return
    gemeld.current = true
    tril([60, 40, 60])
    ctx.stuur('gevallen')
  }, [hoek, stand, s.fase, ikGevallen, ctx])

  if (s.fase === 'uitslag') {
    return (
      <>
        <div className="midden" style={{ gap: 10, alignItems: 'stretch' }}>
          <h1 style={{ textAlign: 'center' }}>
            {s.winnaar ? `${ctx.naam(s.winnaar)} hield 'm vlak` : 'Iedereen bleef staan'}
          </h1>
          <div className="klein zacht" style={{ textAlign: 'center' }}>
            {s.plek}
          </div>
          {s.gevallen.map((uid, i) => (
            <div
              key={uid}
              className="kaartje balk"
              style={{
                borderColor: i === 0 ? 'var(--rood)' : undefined,
                background: i === 0 ? 'var(--rood-donker)' : undefined,
              }}
            >
              <span>
                {i + 1}e gevallen · {ctx.speler(uid)?.emoji} <strong>{ctx.naam(uid)}</strong>
              </span>
              {i === 0 && <span className="klein">🍺</span>}
            </div>
          ))}
        </div>

        <div className="onderaan">
          {s.magUitdelen && s.winnaar === ctx.ik ? (
            <Verdeler
              totaal={ctx.slokAantal(WINST_UITDELEN)}
              ctx={ctx}
              titel="Je won — deel uit"
              bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
            />
          ) : s.magUitdelen ? (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">{ctx.naam(s.winnaar!)} deelt uit…</span>
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
        <span className="kop-klein">
          {s.fase === 'bezig' ? `${klokTekst(s.klok, ctx.nu)}s` : 'klaarzetten'}
        </span>
      </div>

      <Kaartje style={{ textAlign: 'center', borderColor: 'var(--goud)' }}>
        <div className="kop-klein">Leg je telefoon</div>
        <h1 style={{ margin: '4px 0' }}>{s.plek}</h1>
      </Kaartje>

      <div className="midden" style={{ gap: 12 }}>
        {stand === 'aan' ? (
          <>
            <div
              className="reusachtig"
              style={{
                fontSize: 'clamp(44px,16vw,88px)',
                color: ikGevallen
                  ? 'var(--rood)'
                  : hoek > DREMPEL * 0.7
                    ? 'var(--goud)'
                    : 'var(--groen)',
              }}
            >
              {Math.round(hoek)}°
            </div>
            <div style={{ width: '100%' }}>
              <div className="balkje">
                <div
                  style={{
                    width: `${Math.min(100, (hoek / DREMPEL) * 100)}%`,
                    background: hoek > DREMPEL * 0.7 ? 'var(--rood)' : 'var(--groen)',
                  }}
                />
              </div>
            </div>
            <div className="klein zacht">grens: {DREMPEL}°</div>
          </>
        ) : (
          <div style={{ fontSize: 54 }}>📱</div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
          {ctx.spelers.map((p) => {
            const weg = s.gevallen.includes(p.uid)
            return (
              <span
                key={p.uid}
                className="kaartje"
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  opacity: weg ? 0.35 : 1,
                  borderColor: weg ? 'var(--rood)' : undefined,
                }}
              >
                {p.emoji} {p.naam} {weg ? '💥' : ''}
              </span>
            )
          })}
        </div>
      </div>

      <div className="onderaan">
        {stand !== 'aan' && (
          <>
            <GroteKnop kleur="goud" enorm bijTik={start}>
              📱 Zet de sensor aan
            </GroteKnop>
            {stand === 'geweigerd' && (
              <div className="klein" style={{ color: 'var(--rood)', textAlign: 'center' }}>
                Toestemming geweigerd. Herlaad de pagina en probeer het opnieuw.
              </div>
            )}
            {stand === 'niet-beschikbaar' && (
              <div className="klein" style={{ color: 'var(--rood)', textAlign: 'center' }}>
                Deze telefoon heeft geen kantelsensor. Sla dit spel over.
              </div>
            )}
          </>
        )}

        {stand === 'aan' && s.fase === 'klaarzetten' && (
          <>
            <GroteKnop
              kleur={ikGereed ? 'leeg' : 'groen'}
              enorm={!ikGereed}
              uit={ikGereed}
              bijTik={() => ctx.stuur('gereed')}
            >
              {ikGereed ? `Klaar — ${s.gereed.length}/${ctx.spelers.length}` : 'Ik lig klaar'}
            </GroteKnop>
            {ctx.benIkHost && (
              <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('forceer-start')}>
                Nu beginnen
              </GroteKnop>
            )}
          </>
        )}

        {stand === 'aan' && s.fase === 'bezig' && (
          <Kaartje style={{ textAlign: 'center' }}>
            <h2 className={ikGevallen ? '' : 'zacht'} style={{ color: ikGevallen ? 'var(--rood)' : undefined }}>
              {ikGevallen ? '💥 Je ligt eruit' : 'Niet bewegen…'}
            </h2>
          </Kaartje>
        )}
      </div>
    </>
  )
}

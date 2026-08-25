import { useEffect, useRef, useState } from 'react'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, startKlok, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   SCHUDDEN

   Op het teken schudt iedereen zijn telefoon zo hard mogelijk. De app meet
   het echt, met de bewegingssensor. De slapste drinkt.

   Elke telefoon meet zichzelf en stuurt alleen het eindgetal door — sensordata
   over het netwerk pompen zou nergens op slaan, en zo maakt het ook niet uit
   of iemands verbinding hapert.

   Kanttekening: telefoons meten niet allemaal even gevoelig. Het is dus geen
   eerlijke wedstrijd tot op de komma, maar wel een prima manier om iemand te
   laten drinken.
   ───────────────────────────────────────────────────────────── */

const SCHUD_SEC = 5
const RONDES = 3
const MAX_STRAF = 4
const WINST_UITDELEN = 4

interface SchudState {
  ronde: number
  fase: 'klaarzetten' | 'schudden' | 'uitslag'
  klok: Klok | null
  gereed: string[]
  scores: Record<string, number>
  winnaar: string | null
  magUitdelen: boolean
  klaar: boolean
}

function rondAf(s: SchudState, ctx: SpelContext) {
  const rij = ctx.spelers
    .map((p) => ({ uid: p.uid, n: s.scores[p.uid] ?? 0 }))
    .sort((a, b) => b.n - a.n)

  s.winnaar = rij[0]?.uid ?? null
  s.fase = 'uitslag'
  s.klok = null

  rij.forEach((r, i) => {
    if (i === 0) return
    ctx.drink(r.uid, Math.min(MAX_STRAF, i), `${r.n} punten — plek ${i + 1}`)
  })
  if (s.winnaar) s.magUitdelen = true
}

export const schudden: GameModule<SchudState> = {
  id: 'schudden',
  naam: 'Schudden',
  uitleg: 'Schud je telefoon zo hard mogelijk. De slapste drinkt.',
  regels: [
    'Op het teken schudt iedereen tegelijk.',
    'De app meet het echt met de bewegingssensor.',
    'Vijf seconden, en dan is het klaar.',
    'Wie het minst schudde drinkt het meest.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['reflex', 'chaos'],
  privescherm: false,

  init() {
    return {
      ronde: 1,
      fase: 'klaarzetten',
      klok: null,
      gereed: [],
      scores: {},
      winnaar: null,
      magUitdelen: false,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'klaarzetten') {
      if (actie.type === 'gereed') {
        if (!s.gereed.includes(actie.uid)) s.gereed.push(actie.uid)
        if (!iedereen.every((u) => s.gereed.includes(u))) return
        s.fase = 'schudden'
        s.klok = startKlok(SCHUD_SEC + 3, ctx.nu)
        return
      }
      if (actie.type === 'forceer-start') {
        s.fase = 'schudden'
        s.klok = startKlok(SCHUD_SEC + 3, ctx.nu)
        return
      }
      return
    }

    if (s.fase === 'schudden') {
      if (actie.type === 'score') {
        if (s.scores[actie.uid] !== undefined) return
        const n = Number(actie.payload?.n)
        s.scores[actie.uid] = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
        if (iedereen.every((u) => s.scores[u] !== undefined)) rondAf(s, ctx)
        return
      }
      if (actie.type === 'tijd-op') {
        for (const uid of iedereen) if (s.scores[uid] === undefined) s.scores[uid] = 0
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
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'schudde het hardst')
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
        s.fase = 'klaarzetten'
        s.gereed = []
        s.scores = {}
        s.winnaar = null
        s.magUitdelen = false
        return
      }
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

type Sensor = 'onbekend' | 'aan' | 'geweigerd' | 'niet-beschikbaar'

function Scherm({ s, ctx }: { s: SchudState; ctx: KijkContext }) {
  const [sensor, zetSensor] = useState<Sensor>('onbekend')
  const [kracht, zetKracht] = useState(0)
  const totaal = useRef(0)
  const gestuurd = useRef(false)
  const bezig = useRef(false)

  useHostKlok(ctx, s.fase === 'schudden', s.klok?.eind ?? 0, 'tijd-op')

  async function zetAan() {
    const AnyMotion = (window as any).DeviceMotionEvent
    if (!AnyMotion) {
      zetSensor('niet-beschikbaar')
      return
    }
    if (typeof AnyMotion.requestPermission === 'function') {
      try {
        const uit = await AnyMotion.requestPermission()
        zetSensor(uit === 'granted' ? 'aan' : 'geweigerd')
      } catch {
        zetSensor('geweigerd')
      }
      return
    }
    zetSensor('aan')
  }

  /* Meten zolang de ronde loopt. */
  useEffect(() => {
    if (s.fase !== 'schudden' || sensor !== 'aan') return
    if (s.scores[ctx.ik] !== undefined) return

    totaal.current = 0
    gestuurd.current = false
    bezig.current = true

    let vorige = { x: 0, y: 0, z: 0 }
    const bij = (e: DeviceMotionEvent) => {
      if (!bezig.current) return
      const a = e.accelerationIncludingGravity
      if (!a) return
      const dx = (a.x ?? 0) - vorige.x
      const dy = (a.y ?? 0) - vorige.y
      const dz = (a.z ?? 0) - vorige.z
      vorige = { x: a.x ?? 0, y: a.y ?? 0, z: a.z ?? 0 }
      const beweging = Math.hypot(dx, dy, dz)
      if (beweging > 1.2) totaal.current += beweging
      zetKracht(Math.min(1, beweging / 25))
    }
    window.addEventListener('devicemotion', bij)

    const stop = setTimeout(() => {
      bezig.current = false
      if (!gestuurd.current) {
        gestuurd.current = true
        tril(30)
        ctx.stuur('score', { n: totaal.current })
      }
    }, SCHUD_SEC * 1000)

    return () => {
      window.removeEventListener('devicemotion', bij)
      clearTimeout(stop)
      bezig.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.fase, sensor])

  if (s.fase === 'uitslag') {
    const rij = ctx.spelers
      .map((p) => ({ p, n: s.scores[p.uid] ?? 0 }))
      .sort((a, b) => b.n - a.n)
    const hoogste = Math.max(1, rij[0]?.n ?? 1)
    const magUitdelen = s.magUitdelen && s.winnaar === ctx.ik

    return (
      <>
        <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
          <h1 style={{ textAlign: 'center' }}>💪 Ronde {s.ronde}</h1>
          {rij.map(({ p, n }, i) => (
            <div key={p.uid} className="kaartje" style={{ padding: 8 }}>
              <div className="balk">
                <span>
                  {['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} {p.emoji} <strong>{p.naam}</strong>
                </span>
                <span>
                  <strong>{n}</strong>
                  {i > 0 && <span className="klein zacht"> · {Math.min(MAX_STRAF, i)}🍺</span>}
                </span>
              </div>
              <div className="balkje" style={{ marginTop: 5 }}>
                <div style={{ width: `${Math.round((n / hoogste) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="onderaan">
          {magUitdelen ? (
            <Verdeler
              key={s.ronde}
              totaal={ctx.slokAantal(WINST_UITDELEN)}
              ctx={ctx}
              titel="Je schudde het hardst — deel uit"
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

  const ikGereed = s.gereed.includes(ctx.ik)
  const ikKlaar = s.scores[ctx.ik] !== undefined

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Ronde {s.ronde}/{RONDES}
        </span>
        <span className="kop-klein">
          {s.fase === 'schudden' ? `${klokTekst(s.klok, ctx.nu)}s` : 'klaarzetten'}
        </span>
      </div>

      <div className="midden" style={{ gap: 12 }}>
        <div style={{ fontSize: 64 }} className={s.fase === 'schudden' && !ikKlaar ? 'klopt' : ''}>
          📳
        </div>
        {s.fase === 'schudden' && !ikKlaar && (
          <>
            <h1>SCHUDDEN!</h1>
            <div style={{ width: '100%' }}>
              <Balkje waarde={kracht} />
            </div>
            <div className="klein zacht">{Math.round(totaal.current)} punten</div>
          </>
        )}
        {ikKlaar && <h2 className="zacht">{s.scores[ctx.ik]} punten — wachten op de rest</h2>}
        {s.fase === 'klaarzetten' && (
          <>
            <h2>Telefoon stevig vast</h2>
            <Balkje waarde={s.gereed.length / Math.max(1, ctx.spelers.length)} />
            <div className="klein zacht">
              {s.gereed.length}/{ctx.spelers.length} klaar
            </div>
          </>
        )}
      </div>

      <div className="onderaan">
        {sensor !== 'aan' ? (
          <>
            <GroteKnop kleur="goud" enorm bijTik={zetAan}>
              📳 Zet de sensor aan
            </GroteKnop>
            {sensor === 'geweigerd' && (
              <div className="klein" style={{ color: 'var(--rood)', textAlign: 'center' }}>
                Toestemming geweigerd. Herlaad de pagina en probeer opnieuw.
              </div>
            )}
            {sensor === 'niet-beschikbaar' && (
              <div className="klein" style={{ color: 'var(--rood)', textAlign: 'center' }}>
                Deze telefoon heeft geen bewegingssensor. Sla dit spel over.
              </div>
            )}
          </>
        ) : s.fase === 'klaarzetten' ? (
          <>
            <GroteKnop
              kleur={ikGereed ? 'leeg' : 'groen'}
              enorm={!ikGereed}
              uit={ikGereed}
              bijTik={() => ctx.stuur('gereed')}
            >
              {ikGereed ? 'Klaar — wachten' : 'Ik sta klaar'}
            </GroteKnop>
            {ctx.benIkHost && (
              <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('forceer-start')}>
                Nu beginnen
              </GroteKnop>
            )}
          </>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Niet loslaten.</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

import { nieuweSeed } from '../../engine/random'
import type { Actie, GameModule, KijkContext, SpelContext, Tag } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { Arcadeveld, type ArcadeSpel } from '../../ui/Arcade'

/* ─────────────────────────────────────────────────────────────
   De schil om de behendigheidsspellen.

   Iedereen speelt tegelijk op zijn eigen telefoon, op dezelfde baan. Wie het
   verst komt wint en mag tien slokken uitdelen. De rest drinkt naar hoe
   vroeg ze eraf gingen: wie als eerste knalt, drinkt het meest.

   Flappy en Jetpack delen alles hier; ze leveren alleen hun eigen natuurkunde.
   ───────────────────────────────────────────────────────────── */

const RONDES = 2
const WINST_UITDELEN = 10
const MAX_STRAF = 5
const MAX_SECONDEN = 90
/** Zoveel tijd tussen "iedereen klaar" en de start, zodat het aftellen loopt. */
const AFTEL_MS = 4000

export interface ArcadeState {
  fase: 'klaarstaan' | 'spelen' | 'uitslag'
  ronde: number
  seed: number
  startOp: number
  gereed: string[]
  scores: Record<string, number>
  winnaar: string | null
  magUitdelen: boolean
  klaar: boolean
}

function rondAf(s: ArcadeState, ctx: SpelContext) {
  const rij = ctx.spelers
    .map((p) => ({ uid: p.uid, m: s.scores[p.uid] ?? 0 }))
    .sort((a, b) => b.m - a.m)

  s.winnaar = rij[0]?.uid ?? null
  s.fase = 'uitslag'

  rij.forEach((r, i) => {
    if (i === 0) return
    const straf = Math.min(MAX_STRAF, i)
    ctx.drink(r.uid, straf, `${r.m} m — plek ${i + 1}`)
  })

  if (s.winnaar) {
    s.magUitdelen = true
    ctx.log(`${ctx.naam(s.winnaar)} kwam het verst: ${rij[0].m} m`)
  }
}

function nieuweRonde(s: ArcadeState) {
  s.fase = 'klaarstaan'
  s.seed = nieuweSeed()
  s.startOp = 0
  s.gereed = []
  s.scores = {}
  s.winnaar = null
  s.magUitdelen = false
}

export function maakArcadeSpel<W>(opties: {
  id: string
  naam: string
  uitleg: string
  regels: string[]
  tags: Tag[]
  /** korte uitleg van de besturing, boven het veld */
  besturing: string
  spel: ArcadeSpel<W>
}): GameModule<ArcadeState> {
  return {
    id: opties.id,
    naam: opties.naam,
    uitleg: opties.uitleg,
    regels: opties.regels,
    minSpelers: 2,
    maxSpelers: 8,
    duur: 'kort',
    tags: opties.tags,
    privescherm: false,

    init() {
      const s: ArcadeState = {
        fase: 'klaarstaan',
        ronde: 1,
        seed: nieuweSeed(),
        startOp: 0,
        gereed: [],
        scores: {},
        winnaar: null,
        magUitdelen: false,
        klaar: false,
      }
      return s
    },

    reduce(s, actie: Actie, ctx) {
      const iedereen = ctx.spelers.map((p) => p.uid)

      if (s.fase === 'klaarstaan') {
        if (actie.type === 'gereed') {
          if (!s.gereed.includes(actie.uid)) s.gereed.push(actie.uid)
          if (!iedereen.every((u) => s.gereed.includes(u))) return
          s.startOp = ctx.nu + AFTEL_MS
          s.fase = 'spelen'
          return
        }
        if (actie.type === 'forceer-start') {
          s.startOp = ctx.nu + AFTEL_MS
          s.fase = 'spelen'
          return
        }
        return
      }

      if (s.fase === 'spelen' && actie.type === 'dood') {
        if (s.scores[actie.uid] !== undefined) return
        const m = Number(actie.payload?.afstand)
        s.scores[actie.uid] = Number.isFinite(m) ? Math.max(0, Math.round(m)) : 0
        if (!iedereen.every((u) => s.scores[u] !== undefined)) return
        rondAf(s, ctx)
        return
      }

      if (s.fase === 'uitslag') {
        if (actie.type === 'geef' && s.magUitdelen && actie.uid === s.winnaar) {
          const verdeling: Record<string, number> = actie.payload?.verdeling
          if (!verdeling || typeof verdeling !== 'object') return
          for (const [uid, aantal] of Object.entries(verdeling)) {
            if (!iedereen.includes(uid) || uid === actie.uid) continue
            ctx.deelUitPrecies(actie.uid, uid, aantal, 'kwam het verst')
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
          nieuweRonde(s)
          return
        }
      }
    },

    isKlaar: (s) => s.klaar,

    View({ state: s, ctx }) {
      return <Scherm s={s} ctx={ctx} opties={opties} />
    },
  }
}

function Scherm<W>({
  s,
  ctx,
  opties,
}: {
  s: ArcadeState
  ctx: KijkContext
  opties: { naam: string; besturing: string; spel: ArcadeSpel<W> }
}) {
  const ikGereed = s.gereed.includes(ctx.ik)
  const ikDood = s.scores[ctx.ik] !== undefined

  if (s.fase === 'klaarstaan') {
    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Ronde {s.ronde}/{RONDES}
          </span>
          <span className="kop-klein">iedereen tegelijk</span>
        </div>

        <div className="midden" style={{ gap: 12 }}>
          <div style={{ fontSize: 54 }}>🎮</div>
          <h1>{opties.naam}</h1>
          <Kaartje style={{ textAlign: 'center' }}>
            <div className="kop-klein">Besturing</div>
            <div>{opties.besturing}</div>
          </Kaartje>
          <div className="klein zacht" style={{ textAlign: 'center' }}>
            Iedereen krijgt exact dezelfde baan.
            <br />
            Wie het verst komt deelt {ctx.slok(WINST_UITDELEN)} uit.
            <br />
            Wie als eerste knalt, drinkt het meest.
          </div>
          <SpelerBalk spelers={ctx.spelers} actief={s.gereed} />
        </div>

        <div className="onderaan">
          <GroteKnop
            kleur={ikGereed ? 'leeg' : 'goud'}
            enorm={!ikGereed}
            uit={ikGereed}
            bijTik={() => ctx.stuur('gereed')}
          >
            {ikGereed ? `Klaar — ${s.gereed.length}/${ctx.spelers.length}` : 'Ik ben klaar'}
          </GroteKnop>
          {ctx.benIkHost && !ikGereed && (
            <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('forceer-start')}>
              Nu beginnen
            </GroteKnop>
          )}
        </div>
      </>
    )
  }

  if (s.fase === 'spelen') {
    if (ikDood) {
      const wachten = ctx.spelers.filter((p) => s.scores[p.uid] === undefined)
      return (
        <div className="midden" style={{ gap: 10 }}>
          <div style={{ fontSize: 54 }}>💥</div>
          <h1>{s.scores[ctx.ik]} m</h1>
          <div className="zacht klein">
            nog bezig: {wachten.map((p) => p.naam).join(', ') || 'niemand'}
          </div>
          <div style={{ display: 'grid', gap: 5, width: '100%' }}>
            {ctx.spelers
              .filter((p) => s.scores[p.uid] !== undefined)
              .sort((a, b) => (s.scores[b.uid] ?? 0) - (s.scores[a.uid] ?? 0))
              .map((p) => (
                <div key={p.uid} className="kaartje balk" style={{ padding: 8 }}>
                  <span>
                    {p.emoji} {p.naam}
                  </span>
                  <strong>{s.scores[p.uid]} m</strong>
                </div>
              ))}
          </div>
        </div>
      )
    }

    return (
      <Arcadeveld
        key={`${s.seed}-${s.startOp}`}
        spel={opties.spel}
        seed={s.seed}
        startOp={s.startOp}
        nu={ctx.nu}
        maxSeconden={MAX_SECONDEN}
        bijDood={(afstand) => ctx.stuur('dood', { afstand })}
      />
    )
  }

  /* Uitslag */
  const rij = ctx.spelers
    .map((p) => ({ p, m: s.scores[p.uid] ?? 0 }))
    .sort((a, b) => b.m - a.m)
  const magUitdelen = s.magUitdelen && s.winnaar === ctx.ik

  return (
    <>
      <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
        <h1 style={{ textAlign: 'center' }}>🏁 Uitslag</h1>
        {rij.map(({ p, m }, i) => (
          <div
            key={p.uid}
            className="kaartje balk"
            style={{
              borderColor: i === 0 ? 'var(--goud)' : i === rij.length - 1 ? 'var(--rood)' : undefined,
              background:
                i === 0 ? 'var(--goud-donker)' : i === rij.length - 1 ? 'var(--rood-donker)' : undefined,
            }}
          >
            <span>
              {['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} {p.emoji} <strong>{p.naam}</strong>
            </span>
            <span>
              <strong>{m} m</strong>
              {i > 0 && (
                <span className="klein zacht"> · {Math.min(MAX_STRAF, i)}🍺</span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="onderaan">
        {magUitdelen ? (
          <Verdeler
            totaal={ctx.slokAantal(WINST_UITDELEN)}
            ctx={ctx}
            titel="Je won — deel uit"
            bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
          />
        ) : s.magUitdelen ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">{ctx.naam(s.winnaar!)} deelt {ctx.slok(WINST_UITDELEN)} uit…</span>
          </Kaartje>
        ) : ctx.benIkHost ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
            {s.ronde >= RONDES ? 'Klaar' : 'Nog een ronde'}
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

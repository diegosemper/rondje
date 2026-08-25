import { husselen, pak } from '../../engine/random'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, startKlok, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   KLEURENKLAP

   Het woord ROOD staat er in het blauw. Je moet op de kleur tikken waarin het
   geschreven staat, niet op wat er staat.

   Je hersenen lezen sneller dan ze kijken, en dat blijf je merken. Nuchter is
   het al lastig; na een paar biertjes wordt het slopend — en dat is precies
   waarom het als drankspel werkt.
   ───────────────────────────────────────────────────────────── */

const RONDES = 10
/** De klok loopt elke ronde korter: rustig beginnen, hijgend eindigen. */
const START_SEC = 6
const MIN_SEC = 2
const TOON_SEC = 1.4

function secondenVoor(ronde: number): number {
  return Math.max(MIN_SEC, START_SEC - (ronde - 1) * ((START_SEC - MIN_SEC) / (RONDES - 1)))
}
const PUNT_SNELST = 3
const PUNT_GOED = 1
const MAX_STRAF = 5
const WINST_UITDELEN = 6

const KLEUREN = [
  { naam: 'ROOD', hex: '#e8453c' },
  { naam: 'BLAUW', hex: '#4c8dff' },
  { naam: 'GROEN', hex: '#35c46b' },
  { naam: 'GEEL', hex: '#f5b942' },
  { naam: 'PAARS', hex: '#9b6cf0' },
]

interface KlapState {
  ronde: number
  fase: 'kijken' | 'tonen' | 'uitslag'
  /** het woord dat er staat */
  woord: number
  /** de kleur waarin het geschreven staat — dát is het antwoord */
  inkt: number
  opties: number[]
  klok: Klok | null

  _geheim: { antwoorden: Record<string, { keuze: number; ts: number }> }
  gedaan: string[]
  punten: Record<string, number>
  laatste: Record<string, number> | null

  winnaar: string | null
  magUitdelen: boolean
  klaar: boolean
}

function nieuweRonde(s: KlapState, ctx: SpelContext) {
  const inkt = Math.floor(ctx.rng() * KLEUREN.length)
  // Meestal een ander woord dan de inkt; af en toe hetzelfde, want dan let
  // niemand meer op.
  const gelijk = ctx.rng() < 0.2
  const woord = gelijk
    ? inkt
    : pak(
        ctx.rng,
        KLEUREN.map((_, i) => i).filter((i) => i !== inkt),
      )

  s.woord = woord
  s.inkt = inkt
  s.opties = husselen(
    ctx.rng,
    KLEUREN.map((_, i) => i),
  ).slice(0, 4)
  if (!s.opties.includes(inkt)) s.opties[0] = inkt
  s.opties = husselen(ctx.rng, s.opties)

  s._geheim.antwoorden = {}
  s.gedaan = []
  s.laatste = null
  s.fase = 'kijken'
  s.klok = startKlok(secondenVoor(s.ronde), ctx.nu)
}

function rondAf(s: KlapState, ctx: SpelContext) {
  const goed = Object.entries(s._geheim.antwoorden)
    .filter(([, a]) => a.keuze === s.inkt)
    .sort((a, b) => a[1].ts - b[1].ts)
    .map(([uid]) => uid)

  const per: Record<string, number> = {}
  goed.forEach((uid, i) => {
    const n = i === 0 ? PUNT_SNELST : PUNT_GOED
    per[uid] = n
    s.punten[uid] = (s.punten[uid] ?? 0) + n
  })
  s.laatste = per
  s.fase = 'tonen'
  s.klok = startKlok(TOON_SEC, ctx.nu)
}

function spelAf(s: KlapState, ctx: SpelContext) {
  const rij = ctx.spelers
    .map((p) => ({ uid: p.uid, n: s.punten[p.uid] ?? 0 }))
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

export const kleurenklap: GameModule<KlapState> = {
  id: 'kleurenklap',
  naam: 'Kleurenklap',
  uitleg: 'Tik op de kleur waarin het woord staat, niet op wat er staat.',
  regels: [
    'Er staat een kleurnaam, in een andere kleur.',
    'Tik op de kleur van de letters.',
    'Elke ronde krijg je minder tijd.',
    'Aan het eind drinkt iedereen behalve de winnaar.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['reflex', 'chaos'],
  privescherm: true,

  init(ctx) {
    const s: KlapState = {
      ronde: 1,
      fase: 'kijken',
      woord: 0,
      inkt: 1,
      opties: [],
      klok: null,
      _geheim: { antwoorden: {} },
      gedaan: [],
      punten: {},
      laatste: null,
      winnaar: null,
      magUitdelen: false,
      klaar: false,
    }
    for (const p of ctx.spelers) s.punten[p.uid] = 0
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'kijken') {
      if (actie.type === 'tik') {
        if (s._geheim.antwoorden[actie.uid]) return
        const keuze = Number(actie.payload?.kleur)
        if (!Number.isInteger(keuze)) return
        s._geheim.antwoorden[actie.uid] = { keuze, ts: actie.ts }
        if (!s.gedaan.includes(actie.uid)) s.gedaan.push(actie.uid)
        ctx.zetPrive(actie.uid, { goed: keuze === s.inkt })
        if (iedereen.every((u) => s._geheim.antwoorden[u])) rondAf(s, ctx)
        return
      }
      if (actie.type === 'tijd-op') {
        rondAf(s, ctx)
        return
      }
      return
    }

    if (s.fase === 'tonen' && actie.type === 'volgende') {
      if (s.ronde >= RONDES) {
        spelAf(s, ctx)
        return
      }
      s.ronde++
      for (const p of ctx.spelers) ctx.zetPrive(p.uid, null)
      nieuweRonde(s, ctx)
      return
    }

    if (s.fase === 'uitslag') {
      if (actie.type === 'geef' && s.magUitdelen && actie.uid === s.winnaar) {
        const verdeling: Record<string, number> = actie.payload?.verdeling
        if (!verdeling || typeof verdeling !== 'object') return
        for (const [uid, aantal] of Object.entries(verdeling)) {
          if (!iedereen.includes(uid) || uid === actie.uid) continue
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'won Kleurenklap')
        }
        s.magUitdelen = false
        return
      }
      if (actie.type === 'verder') {
        s.klaar = true
        ctx.wisPrive()
        ctx.klaar()
        return
      }
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

function Scherm({ s, ctx }: { s: KlapState; ctx: KijkContext }) {
  useHostKlok(ctx, s.fase === 'kijken', s.klok?.eind ?? 0, 'tijd-op')
  useHostKlok(ctx, s.fase === 'tonen', s.klok?.eind ?? 0, 'volgende')

  const ikGedaan = s.gedaan.includes(ctx.ik)
  const mijnUitslag: boolean | undefined = ctx.prive?.goed

  if (s.fase === 'uitslag') {
    const rij = ctx.spelers
      .map((p) => ({ p, n: s.punten[p.uid] ?? 0 }))
      .sort((a, b) => b.n - a.n)
    const magUitdelen = s.magUitdelen && s.winnaar === ctx.ik

    return (
      <>
        <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
          <h1 style={{ textAlign: 'center' }}>🎨 Eindstand</h1>
          {rij.map(({ p, n }, i) => (
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
                <strong>{n} pt</strong>
                {i > 0 && <span className="klein zacht"> · {Math.min(MAX_STRAF, i)}🍺</span>}
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
              <span className="zacht">{ctx.naam(s.winnaar!)} deelt uit…</span>
            </Kaartje>
          ) : ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
              Klaar
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

  if (s.fase === 'tonen') {
    return (
      <div className="midden" style={{ gap: 10 }}>
        <div className="kop-klein">Het was</div>
        <h1 style={{ color: KLEUREN[s.inkt].hex, fontSize: 44 }}>{KLEUREN[s.inkt].naam}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
          {ctx.spelers.map((p) => (
            <span
              key={p.uid}
              className="kaartje"
              style={{
                padding: '4px 10px',
                fontSize: 12,
                borderColor: s.laatste?.[p.uid] ? 'var(--groen)' : 'var(--rood)',
              }}
            >
              {p.emoji} {p.naam} {s.laatste?.[p.uid] ? `+${s.laatste[p.uid]}` : '—'}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Ronde {s.ronde}/{RONDES}
        </span>
        <span className="kop-klein">
          {s.gedaan.length}/{ctx.spelers.length} · {klokTekst(s.klok, ctx.nu)}s
        </span>
      </div>

      <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />

      <div className="midden" style={{ gap: 10 }}>
        <div className="kop-klein">Tik op de KLEUR van de letters</div>
        <div
          style={{
            fontSize: 'clamp(46px,17vw,96px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: KLEUREN[s.inkt].hex,
          }}
        >
          {KLEUREN[s.woord].naam}
        </div>
        {ikGedaan && (
          <h2 style={{ color: mijnUitslag ? 'var(--groen)' : 'var(--rood)' }}>
            {mijnUitslag ? '✓ Goed' : '✗ Fout'}
          </h2>
        )}
      </div>

      <div className="onderaan">
        {ikGedaan ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Wachten op de rest…</span>
          </Kaartje>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {s.opties.map((i) => (
              <button
                key={i}
                onClick={() => {
                  tril(8)
                  ctx.stuur('tik', { kleur: i })
                }}
                style={{
                  minHeight: 76,
                  borderRadius: 'var(--straal)',
                  background: KLEUREN[i].hex,
                  border: 'none',
                  color: '#14141c',
                  fontSize: 19,
                  fontWeight: 800,
                }}
              >
                {KLEUREN[i].naam}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

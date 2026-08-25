import { husselen, tussen } from '../../engine/random'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, startKlok, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   SNELLE WISKUNDE

   Tien sommen, iedereen tegelijk, vier knoppen. Goed en snel levert het
   meest op.

   Er wordt pas aan het eind gedronken, niet per som. Tien keer een drinkpauze
   zou het spel elke twaalf seconden stilleggen, en dan is de lol eraf.

   De foute antwoorden zijn met opzet dichtbij het goede — eentje ernaast,
   het teken omgedraaid, dat soort dingen. Zomaar wat getallen zou je er te
   makkelijk uit kunnen strepen.
   ───────────────────────────────────────────────────────────── */

const SOMMEN = 10
const SOM_SEC = 12
const TOON_SEC = 2.5

const PUNT_SNELST = 3
const PUNT_GOED = 1
const MAX_STRAF = 5
const WINST_UITDELEN = 6

interface Som {
  vraag: string
  goed: number
  opties: number[]
}

interface WiskundeState {
  nummer: number
  fase: 'som' | 'tonen' | 'uitslag'
  som: Som
  klok: Klok | null

  _geheim: { antwoorden: Record<string, { keuze: number; ts: number }> }

  /** wie er al geantwoord heeft — dit mag iedereen zien */
  gedaan: string[]
  punten: Record<string, number>
  /** de uitslag van de som die net was */
  laatste: { goed: number; snelste: string | null; perSpeler: Record<string, number> } | null

  winnaar: string | null
  magUitdelen: boolean
  klaar: boolean
}

/** Een som die te doen is uit je hoofd, maar niet gratis. */
function maakSom(rng: () => number, nummer: number): Som {
  const zwaarte = Math.min(3, Math.floor(nummer / 3))
  let vraag = ''
  let goed = 0

  if (zwaarte === 0) {
    const a = tussen(rng, 11, 39)
    const b = tussen(rng, 11, 39)
    const plus = rng() < 0.5
    goed = plus ? a + b : a - b
    vraag = `${a} ${plus ? '+' : '−'} ${b}`
  } else if (zwaarte === 1) {
    const a = tussen(rng, 3, 12)
    const b = tussen(rng, 3, 12)
    goed = a * b
    vraag = `${a} × ${b}`
  } else if (zwaarte === 2) {
    const a = tussen(rng, 4, 14)
    const b = tussen(rng, 3, 9)
    const c = tussen(rng, 5, 25)
    goed = a * b - c
    vraag = `${a} × ${b} − ${c}`
  } else {
    const a = tussen(rng, 6, 15)
    const b = tussen(rng, 4, 11)
    const c = tussen(rng, 2, 9)
    goed = a * b + c * 2
    vraag = `${a} × ${b} + ${c} × 2`
  }

  // Afleiders vlak naast het goede antwoord.
  const kandidaten = new Set<number>([goed])
  const verschuivingen = [1, -1, 2, -2, 10, -10, 5, -5]
  for (const v of husselen(rng, verschuivingen)) {
    if (kandidaten.size >= 4) break
    const optie = goed + v
    if (optie > 0) kandidaten.add(optie)
  }
  while (kandidaten.size < 4) kandidaten.add(goed + kandidaten.size * 3 + 1)

  return { vraag, goed, opties: husselen(rng, [...kandidaten]) }
}

function nieuweSom(s: WiskundeState, ctx: SpelContext) {
  s.som = maakSom(ctx.rng, s.nummer)
  s._geheim.antwoorden = {}
  s.gedaan = []
  s.laatste = null
  s.fase = 'som'
  s.klok = startKlok(SOM_SEC, ctx.nu)
}

function somAf(s: WiskundeState, ctx: SpelContext) {
  const antwoorden = s._geheim.antwoorden
  const goedeSpelers = Object.entries(antwoorden)
    .filter(([, a]) => a.keuze === s.som.goed)
    .sort((a, b) => a[1].ts - b[1].ts)
    .map(([uid]) => uid)

  const perSpeler: Record<string, number> = {}
  goedeSpelers.forEach((uid, i) => {
    const punten = i === 0 ? PUNT_SNELST : PUNT_GOED
    perSpeler[uid] = punten
    s.punten[uid] = (s.punten[uid] ?? 0) + punten
  })

  s.laatste = { goed: s.som.goed, snelste: goedeSpelers[0] ?? null, perSpeler }
  s.fase = 'tonen'
  s.klok = startKlok(TOON_SEC, ctx.nu)
}

function spelAf(s: WiskundeState, ctx: SpelContext) {
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

export const wiskunde: GameModule<WiskundeState> = {
  id: 'wiskunde',
  naam: 'Snelle Wiskunde',
  uitleg: 'Tien sommen, iedereen tegelijk. Snelste goede antwoord wint.',
  regels: [
    'Tien sommen, steeds moeilijker.',
    'Vier knoppen, iedereen tegelijk.',
    'Snelste goed = 3 punten, ook goed = 1.',
    'Aan het eind drinkt iedereen behalve de winnaar.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['reflex', 'chaos'],
  privescherm: true,

  init(ctx) {
    const s: WiskundeState = {
      nummer: 1,
      fase: 'som',
      som: { vraag: '', goed: 0, opties: [] },
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
    nieuweSom(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'som') {
      if (actie.type === 'antwoord') {
        if (s._geheim.antwoorden[actie.uid]) return
        const keuze = Number(actie.payload?.keuze)
        if (!Number.isFinite(keuze)) return

        s._geheim.antwoorden[actie.uid] = { keuze, ts: actie.ts }
        if (!s.gedaan.includes(actie.uid)) s.gedaan.push(actie.uid)
        // Meteen laten weten of het goed was — maar alleen aan jou.
        ctx.zetPrive(actie.uid, { goed: keuze === s.som.goed })

        if (iedereen.every((u) => s._geheim.antwoorden[u])) somAf(s, ctx)
        return
      }
      if (actie.type === 'tijd-op') {
        somAf(s, ctx)
        return
      }
      return
    }

    if (s.fase === 'tonen' && actie.type === 'volgende') {
      if (s.nummer >= SOMMEN) {
        spelAf(s, ctx)
        return
      }
      s.nummer++
      for (const p of ctx.spelers) ctx.zetPrive(p.uid, null)
      nieuweSom(s, ctx)
      return
    }

    if (s.fase === 'uitslag') {
      if (actie.type === 'geef' && s.magUitdelen && actie.uid === s.winnaar) {
        const verdeling: Record<string, number> = actie.payload?.verdeling
        if (!verdeling || typeof verdeling !== 'object') return
        for (const [uid, aantal] of Object.entries(verdeling)) {
          if (!iedereen.includes(uid) || uid === actie.uid) continue
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'won de rekenwedstrijd')
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

function Scherm({ s, ctx }: { s: WiskundeState; ctx: KijkContext }) {
  useHostKlok(ctx, s.fase === 'som', s.klok?.eind ?? 0, 'tijd-op')
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
          <h1 style={{ textAlign: 'center' }}>🧮 Eindstand</h1>
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
    const l = s.laatste!
    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Som {s.nummer}/{SOMMEN}
          </span>
        </div>
        <div className="midden" style={{ gap: 10 }}>
          <div className="kop-klein">{s.som.vraag} =</div>
          <div className="reusachtig" style={{ fontSize: 'clamp(56px,20vw,110px)', color: 'var(--groen)' }}>
            {l.goed}
          </div>
          {l.snelste && (
            <div className="klein zacht">
              snelste: {ctx.speler(l.snelste)?.emoji} {ctx.naam(l.snelste)}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
            {ctx.spelers.map((p) => (
              <span
                key={p.uid}
                className="kaartje"
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  borderColor: l.perSpeler[p.uid] ? 'var(--groen)' : 'var(--rood)',
                }}
              >
                {p.emoji} {p.naam} {l.perSpeler[p.uid] ? `+${l.perSpeler[p.uid]}` : '—'}
              </span>
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Som {s.nummer}/{SOMMEN}
        </span>
        <span className="kop-klein">
          {s.gedaan.length}/{ctx.spelers.length} · {klokTekst(s.klok, ctx.nu)}s
        </span>
      </div>

      <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />

      <div className="midden" style={{ gap: 10 }}>
        <div className="reusachtig" style={{ fontSize: 'clamp(40px,14vw,80px)' }}>
          {s.som.vraag}
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
            {s.som.opties.map((o) => (
              <GroteKnop
                key={o}
                enorm
                bijTik={() => {
                  tril(8)
                  ctx.stuur('antwoord', { keuze: o })
                }}
              >
                {o}
              </GroteKnop>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

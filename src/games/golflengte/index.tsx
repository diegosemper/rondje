import { useState } from 'react'
import { husselen, tussen } from '../../engine/random'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { SCHALEN, type Schaal } from './schalen'

/* ─────────────────────────────────────────────────────────────
   GOLFLENGTE

   Eén speler ziet een geheime plek op een schaal — bijvoorbeeld op 73 tussen
   koud en heet. Hij mag daar precies één woord bij zeggen: "soep".

   De rest schuift een balkje naar waar ze denken dat het zit. Hoe verder je
   ernaast zit, hoe meer je drinkt. En de hinter drinkt mee met het gemiddelde
   van de groep, dus een slechte hint kost hem net zo goed.

   Dit werkt alleen met privéschermen: de hinter moet iets zien dat niemand
   anders mag zien, en iedereen moet tegelijk en zonder overleg kunnen gokken.
   ───────────────────────────────────────────────────────────── */

const RONDES = 6
/** Binnen deze afstand ben je gewoon goed. */
const VRIJ = 8
/** Hoeveel punten afstand één slok kost. */
const PER_SLOK = 10
const MAX_STRAF = 6

interface GolfState {
  ronde: number
  fase: 'hinten' | 'gokken' | 'uitslag'
  hinter: string
  schaal: Schaal

  _geheim: { doel: number; gokken: Record<string, number> }

  /** de schalen van dit potje, door elkaar gehusseld */
  schalen: Schaal[]

  hint: string
  /** wie er al gegokt heeft — dit mag iedereen zien */
  gegokt: string[]

  uitslag: { doel: number; gokken: Record<string, number> } | null
  klaar: boolean
}

function nieuweRonde(s: GolfState, ctx: SpelContext, eersteKeer = false) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  if (!eersteKeer) s.hinter = volgende(volgorde, s.hinter)

  s.schaal = s.schalen[(s.ronde - 1) % s.schalen.length]
  s._geheim.doel = tussen(ctx.rng, 5, 95)
  s._geheim.gokken = {}
  s.hint = ''
  s.gegokt = []
  s.uitslag = null
  s.fase = 'hinten'

  for (const p of ctx.spelers) {
    ctx.zetPrive(p.uid, p.uid === s.hinter ? { doel: s._geheim.doel } : null)
  }
}

export const golflengte: GameModule<GolfState> = {
  id: 'golflengte',
  naam: 'Golflengte',
  uitleg: 'Eén woord als hint, en de rest zoekt de geheime plek op de schaal.',
  regels: [
    'Eén speler ziet een geheime plek op een schaal.',
    'Hij geeft één woord als hint. Meer niet.',
    'De rest schuift naar waar ze denken dat het zit.',
    'Hoe verder ernaast, hoe meer je drinkt.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['geheim', 'praten'],
  privescherm: true,

  init(ctx) {
    const s: GolfState = {
      ronde: 1,
      fase: 'hinten',
      hinter: husselen(
        ctx.rng,
        ctx.spelers.map((p) => p.uid),
      )[0],
      schaal: SCHALEN[0],
      // Eigen, gehusselde kopie: de gedeelde lijst blijft ongemoeid.
      schalen: husselen(ctx.rng, SCHALEN),
      _geheim: { doel: 50, gokken: {} },
      hint: '',
      gegokt: [],
      uitslag: null,
      klaar: false,
    }
    nieuweRonde(s, ctx, true)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'hinten' && actie.type === 'hint') {
      if (actie.uid !== s.hinter) return
      const hint = String(actie.payload?.woord ?? '').trim().slice(0, 24)
      if (hint.length < 2) return
      s.hint = hint
      s.fase = 'gokken'
      return
    }

    if (s.fase === 'gokken' && actie.type === 'gok') {
      if (actie.uid === s.hinter) return
      if (s._geheim.gokken[actie.uid] !== undefined) return
      const waarde = Number(actie.payload?.waarde)
      if (!Number.isFinite(waarde)) return

      s._geheim.gokken[actie.uid] = Math.max(0, Math.min(100, Math.round(waarde)))
      if (!s.gegokt.includes(actie.uid)) s.gegokt.push(actie.uid)

      const gokkers = iedereen.filter((u) => u !== s.hinter)
      if (!gokkers.every((u) => s._geheim.gokken[u] !== undefined)) return

      const doel = s._geheim.doel
      let totaalAfstand = 0
      for (const uid of gokkers) {
        const afstand = Math.abs(s._geheim.gokken[uid] - doel)
        totaalAfstand += afstand
        if (afstand > VRIJ) {
          const straf = Math.min(MAX_STRAF, Math.ceil((afstand - VRIJ) / PER_SLOK))
          ctx.drink(uid, straf, `zat ${afstand} naast`)
        }
      }

      // De hinter deelt in de schade: een vage hint kost hem net zo goed.
      const gemiddeld = Math.round(totaalAfstand / Math.max(1, gokkers.length))
      if (gemiddeld > VRIJ) {
        const straf = Math.min(MAX_STRAF, Math.ceil((gemiddeld - VRIJ) / PER_SLOK))
        ctx.drink(s.hinter, straf, `zijn hint "${s.hint}" was ${gemiddeld} naast`)
      }

      s.uitslag = { doel, gokken: { ...s._geheim.gokken } }
      s.fase = 'uitslag'
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
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
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

/* ── Scherm ─────────────────────────────────────────────────── */

function Schaalbalk({
  schaal,
  markers,
}: {
  schaal: Schaal
  markers: { plek: number; kleur: string; label?: string; groot?: boolean }[]
}) {
  return (
    <div>
      <div className="balk klein zacht" style={{ marginBottom: 4 }}>
        <span>← {schaal.links}</span>
        <span>{schaal.rechts} →</span>
      </div>
      <div
        style={{
          position: 'relative',
          height: 46,
          borderRadius: 'var(--straal-klein)',
          background: 'linear-gradient(90deg, #2a3f66, #6b4d12, #6d1d19)',
          border: '1px solid var(--rand)',
        }}
      >
        {markers.map((m, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${m.plek}%`,
              top: m.groot ? -6 : 4,
              bottom: m.groot ? -6 : 4,
              width: m.groot ? 4 : 3,
              marginLeft: -2,
              background: m.kleur,
              borderRadius: 2,
              boxShadow: '0 0 0 1px rgba(0,0,0,.5)',
            }}
          >
            {m.label && (
              <span
                style={{
                  position: 'absolute',
                  top: -16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 10,
                  whiteSpace: 'nowrap',
                  color: m.kleur,
                  fontWeight: 700,
                }}
              >
                {m.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Scherm({ s, ctx }: { s: GolfState; ctx: KijkContext }) {
  const [hint, zetHint] = useState('')
  const [schuif, zetSchuif] = useState(50)
  const ikHint = ctx.ik === s.hinter
  const doel: number | undefined = ctx.prive?.doel
  const ikGegokt = s.gegokt.includes(ctx.ik)

  /* ── Uitslag ── */
  if (s.fase === 'uitslag' && s.uitslag) {
    const u = s.uitslag
    const rij = ctx.spelers
      .filter((p) => p.uid !== s.hinter)
      .map((p) => ({ p, gok: u.gokken[p.uid] ?? 50, af: Math.abs((u.gokken[p.uid] ?? 50) - u.doel) }))
      .sort((a, b) => a.af - b.af)

    return (
      <>
        <div className="kop-klein" style={{ textAlign: 'center' }}>
          Ronde {s.ronde}/{RONDES} · hint was "{s.hint}"
        </div>

        <Schaalbalk
          schaal={s.schaal}
          markers={[
            { plek: u.doel, kleur: 'var(--goud)', label: `${u.doel}`, groot: true },
            ...rij.map((r) => ({ plek: r.gok, kleur: 'var(--tekst)', label: r.p.naam })),
          ]}
        />

        <div className="midden" style={{ gap: 6, alignItems: 'stretch' }}>
          {rij.map(({ p, gok, af }) => (
            <div
              key={p.uid}
              className="kaartje balk"
              style={{
                padding: 8,
                borderColor: af <= VRIJ ? 'var(--groen)' : af > 30 ? 'var(--rood)' : undefined,
              }}
            >
              <span>
                {p.emoji} <strong>{p.naam}</strong> · {gok}
              </span>
              <span className="klein zacht">{af} naast</span>
            </div>
          ))}
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

  /* ── Hinten ── */
  if (s.fase === 'hinten') {
    return (
      <>
        <div className="kop-klein" style={{ textAlign: 'center' }}>
          Ronde {s.ronde}/{RONDES} · {ctx.naam(s.hinter)} geeft de hint
        </div>

        <Schaalbalk
          schaal={s.schaal}
          markers={ikHint && doel !== undefined ? [{ plek: doel, kleur: 'var(--goud)', label: `${doel}`, groot: true }] : []}
        />

        {ikHint ? (
          <>
            <div className="midden" style={{ gap: 8 }}>
              <div className="kop-klein">🤫 Alleen jij ziet de plek</div>
              <div className="reusachtig" style={{ fontSize: 'clamp(40px,14vw,72px)', color: 'var(--goud)' }}>
                {doel}
              </div>
            </div>
            <div className="onderaan">
              <input
                value={hint}
                onChange={(e) => zetHint(e.target.value.slice(0, 24))}
                placeholder="één woord…"
                autoComplete="off"
              />
              <GroteKnop
                kleur="goud"
                uit={hint.trim().length < 2}
                bijTik={() => ctx.stuur('hint', { woord: hint })}
              >
                Dit is mijn hint
              </GroteKnop>
              <div className="klein zacht" style={{ textAlign: 'center' }}>
                Eén woord. Iets wat precies op die plek zit tussen {s.schaal.links} en{' '}
                {s.schaal.rechts}.
              </div>
            </div>
          </>
        ) : (
          <div className="midden">
            <div style={{ fontSize: 48 }}>💭</div>
            <h2 className="zacht">{ctx.naam(s.hinter)} bedenkt een hint…</h2>
          </div>
        )}
      </>
    )
  }

  /* ── Gokken ── */
  return (
    <>
      <div className="kop-klein" style={{ textAlign: 'center' }}>
        Ronde {s.ronde}/{RONDES}
      </div>

      <Kaartje style={{ textAlign: 'center' }}>
        <div className="kop-klein">De hint van {ctx.naam(s.hinter)}</div>
        <h1>{s.hint}</h1>
      </Kaartje>

      <Schaalbalk
        schaal={s.schaal}
        markers={
          ikHint && doel !== undefined
            ? [{ plek: doel, kleur: 'var(--goud)', label: `${doel}`, groot: true }]
            : ikGegokt
              ? []
              : [{ plek: schuif, kleur: 'var(--tekst)', groot: true }]
        }
      />

      <div className="midden" style={{ gap: 8 }}>
        <div className="klein zacht">
          {s.gegokt.length} van {ctx.spelers.length - 1} gegokt
        </div>
        <SpelerBalk spelers={ctx.spelers.filter((p) => p.uid !== s.hinter)} actief={s.gegokt} />
      </div>

      <div className="onderaan">
        {ikHint ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Zeg niets meer. Laat ze zwoegen.</span>
          </Kaartje>
        ) : ikGegokt ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">🤫 Je gok staat vast</span>
          </Kaartje>
        ) : (
          <>
            <div className="reusachtig" style={{ fontSize: 'clamp(30px,10vw,52px)', textAlign: 'center' }}>
              {schuif}
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={schuif}
              onChange={(e) => zetSchuif(Number(e.target.value))}
              style={{ minHeight: 44, padding: 0 }}
            />
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('gok', { waarde: schuif })}>
              Hier zet ik hem
            </GroteKnop>
            <div className="klein zacht" style={{ textAlign: 'center' }}>
              Binnen {VRIJ} ernaast kost niets. Daarna één slok per {PER_SLOK}.
            </div>
          </>
        )}
      </div>
    </>
  )
}

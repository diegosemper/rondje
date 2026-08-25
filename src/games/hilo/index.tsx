import { kaartKort, nieuweStapel, trek, type Kaart, type Stapel } from '../../engine/deck'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   HiLo — bedacht door Diego

   Zeg hoger of lager dan de kaart die er ligt. Elke keer dat je goed zit
   groeit je streak. Stoppen kan niet: je gaat door tot je fout zit, en dán
   mag je je hele streak uitdelen. Eén goed is één slok, zeventien goed is
   zeventien slokken.

   Je drinkt dus nooit zelf. De spanning zit niet in het risico maar in hoe
   ver je komt — en in dat iedereen zit te wachten tot jij er eindelijk naast
   zit.
   ───────────────────────────────────────────────────────────── */

type Uitkomst = 'goed' | 'fout' | 'gelijk'

interface Laatste {
  van: Kaart
  naar: Kaart
  keuze: 'hoger' | 'lager'
  uitkomst: Uitkomst
  wie: string
}

interface HiLoState {
  stapel: Stapel
  open: Kaart
  beurt: string
  streak: number
  beurtenGespeeld: number
  maxBeurten: number
  laatste: Laatste | null
  /** gezet zodra iemand cashet: wie krijgt de slokken? */
  cashen: number | null
  record: { uid: string; streak: number } | null
}

export const hilo: GameModule<HiLoState> = {
  id: 'hilo',
  naam: 'HiLo',
  uitleg: 'Hoger of lager. Hoe langer je streak, hoe meer je mag uitdelen.',
  regels: [
    'Zeg of de volgende kaart hoger of lager is.',
    'Goed? Je streak groeit en je gaat door.',
    'Stoppen kan niet — je speelt tot je fout zit.',
    'Fout? Je deelt je hele streak uit aan de rest.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['kaarten', 'geluk'],
  privescherm: false,

  init(ctx: SpelContext): HiLoState {
    const stapel = nieuweStapel(ctx.rng)
    return {
      stapel,
      open: trek(stapel, ctx.rng),
      beurt: ctx.spelers[0].uid,
      streak: 0,
      beurtenGespeeld: 0,
      maxBeurten: ctx.spelers.length * 2,
      laatste: null,
      cashen: null,
      record: null,
    }
  },

  reduce(s, actie: Actie, ctx: SpelContext) {
    const volgorde = ctx.spelers.map((p) => p.uid)
    if (actie.uid !== s.beurt) return

    const naarVolgende = () => {
      s.streak = 0
      s.cashen = null
      s.beurtenGespeeld++
      s.beurt = volgende(volgorde, s.beurt)
    }

    if (actie.type === 'hoger' || actie.type === 'lager') {
      if (s.cashen !== null) return

      const oud = s.open
      const nieuw = trek(s.stapel, ctx.rng)
      s.open = nieuw

      let uitkomst: Uitkomst
      if (nieuw.waarde === oud.waarde) {
        uitkomst = 'gelijk'
      } else {
        const hoger = nieuw.waarde > oud.waarde
        uitkomst = (actie.type === 'hoger') === hoger ? 'goed' : 'fout'
      }

      s.laatste = { van: oud, naar: nieuw, keuze: actie.type, uitkomst, wie: s.beurt }

      if (uitkomst === 'gelijk') {
        // Gelijk telt niet mee, in geen van beide richtingen. Je streak blijft
        // staan en je gaat gewoon door.
        return
      }

      if (uitkomst === 'goed') {
        s.streak++
        if (!s.record || s.streak > s.record.streak) {
          s.record = { uid: s.beurt, streak: s.streak }
        }
        return
      }

      // Fout: je beurt is voorbij, maar je deelt wel uit wat je hebt opgebouwd.
      if (s.streak > 0) {
        s.cashen = s.streak
      } else {
        naarVolgende()
      }
      return
    }

    if (actie.type === 'geef') {
      if (s.cashen === null) return
      const verdeling: Record<string, number> = actie.payload?.verdeling
      if (!verdeling || typeof verdeling !== 'object') return

      // De aantallen komen van de Verdeler en zijn al omgerekend naar de
      // zwaarte-instelling, dus niet nog een keer omrekenen.
      for (const [uid, aantal] of Object.entries(verdeling)) {
        if (!volgorde.includes(uid) || uid === s.beurt) continue
        ctx.deelUitPrecies(s.beurt, uid, aantal, `streak van ${s.cashen}`)
      }
      naarVolgende()
      return
    }
  },

  isKlaar: (s) => s.beurtenGespeeld >= s.maxBeurten,

  View({ state: s, ctx }) {
    const mijnBeurt = ctx.ik === s.beurt
    const speler = ctx.speler(s.beurt)

    return (
      <>
        <SpelerBalk spelers={ctx.spelers} actief={s.beurt} />

        <div className="midden">
          <StreakMeter streak={s.streak} ctx={ctx} />
          <Speelkaart kaart={s.open} maat="groot" />
          {s.laatste && <Uitslagje laatste={s.laatste} ctx={ctx} />}
        </div>

        {s.cashen !== null ? (
          <div className="onderaan">
            {mijnBeurt ? (
              <Verdeler
                key={`${s.beurt}-${s.beurtenGespeeld}`}
                totaal={ctx.slokAantal(s.cashen)}
                ctx={ctx}
                titel={`${s.cashen} goed op rij — deel uit`}
                bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
              />
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <h2 className="zacht">
                  {speler?.naam} haalde {s.cashen} en verdeelt {ctx.slok(s.cashen)}…
                </h2>
              </Kaartje>
            )}
          </div>
        ) : mijnBeurt ? (
          <div className="onderaan">
            <div className="rij">
              <GroteKnop kleur="groen" enorm bijTik={() => ctx.stuur('hoger')}>
                ▲ Hoger
              </GroteKnop>
              <GroteKnop kleur="rood" enorm bijTik={() => ctx.stuur('lager')}>
                ▼ Lager
              </GroteKnop>
            </div>
            <div className="klein zacht" style={{ textAlign: 'center' }}>
              {s.streak === 0
                ? 'Zit je fout, dan gebeurt er niets. Bouw eerst iets op.'
                : `Zit je nu fout, dan deel je ${ctx.slok(s.streak)} uit.`}
            </div>
          </div>
        ) : (
          <div className="onderaan">
            <Kaartje style={{ textAlign: 'center' }}>
              <div className="kop-klein">Aan de beurt</div>
              <h2>
                {speler?.emoji} {speler?.naam}
              </h2>
            </Kaartje>
          </div>
        )}
      </>
    )
  },
}

function StreakMeter({ streak, ctx }: { streak: number; ctx: KijkContext }) {
  if (streak === 0) {
    return <div className="kop-klein">Streak 0 — begin maar</div>
  }
  // Hoe hoger de streak, hoe heftiger het scherm.
  const heet = streak >= 5
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="kop-klein">Streak</div>
      <div
        className={`reusachtig ${heet ? 'klopt' : ''}`}
        style={{ color: heet ? 'var(--rood)' : 'var(--goud)', fontSize: 'clamp(48px,16vw,90px)' }}
      >
        {streak}
      </div>
      <div className="zacht klein">nu waard: {ctx.slok(streak)}</div>
    </div>
  )
}

function Uitslagje({ laatste, ctx }: { laatste: Laatste; ctx: KijkContext }) {
  const kleur =
    laatste.uitkomst === 'goed'
      ? 'var(--groen)'
      : laatste.uitkomst === 'fout'
        ? 'var(--rood)'
        : 'var(--goud)'
  const woord =
    laatste.uitkomst === 'goed' ? 'GOED' : laatste.uitkomst === 'fout' ? 'FOUT' : 'GELIJK!'

  return (
    <div className="klein zacht">
      {ctx.naam(laatste.wie)} zei {laatste.keuze} · {kaartKort(laatste.van)} →{' '}
      {kaartKort(laatste.naar)} ·{' '}
      <strong style={{ color: kleur }}>{woord}</strong>
    </div>
  )
}

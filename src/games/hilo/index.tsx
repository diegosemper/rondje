import { kaartKort, nieuweStapel, trek, type Kaart, type Stapel } from '../../engine/deck'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   HiLo — bedacht door Diego

   Zeg hoger of lager dan de kaart die er ligt. Elke keer dat je goed zit
   groeit je streak. Je mag op elk moment cashen: zoveel slokken als je
   streak is, mag je uitdelen. Zit je fout, dan drink je 'm zelf.

   De hele spanning zit in "nog één keer".
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
    'Goed? Je streak groeit. Cash wanneer je wil.',
    'Cashen = je streak aan slokken uitdelen.',
    'Fout? Je drinkt je hele streak zelf.',
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
        // Zeldzaam en zuur, maar je streak blijft staan.
        ctx.drink(s.beurt, 2, `gelijke kaart (${kaartKort(nieuw)})`)
        return
      }

      if (uitkomst === 'goed') {
        s.streak++
        if (!s.record || s.streak > s.record.streak) {
          s.record = { uid: s.beurt, streak: s.streak }
        }
        return
      }

      // Fout: je drinkt wat je had kunnen uitdelen.
      ctx.drink(s.beurt, Math.max(1, s.streak), `zat fout bij ${kaartKort(nieuw)}`)
      naarVolgende()
      return
    }

    if (actie.type === 'cash') {
      if (s.streak <= 0 || s.cashen !== null) return
      s.cashen = s.streak
      return
    }

    if (actie.type === 'geef') {
      const doel: string = actie.payload?.uid
      if (s.cashen === null || !doel || !volgorde.includes(doel)) return
      ctx.deelUit(s.beurt, doel, s.cashen, `streak van ${s.cashen}`)
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
            <h2 style={{ textAlign: 'center' }}>
              {mijnBeurt
                ? `Wie krijgt ${ctx.slok(s.cashen)}?`
                : `${speler?.naam} deelt ${ctx.slok(s.cashen)} uit…`}
            </h2>
            {mijnBeurt && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ctx.spelers
                  .filter((p) => p.uid !== ctx.ik)
                  .map((p) => (
                    <GroteKnop
                      key={p.uid}
                      kleur="goud"
                      bijTik={() => ctx.stuur('geef', { uid: p.uid })}
                    >
                      {p.emoji} {p.naam}
                    </GroteKnop>
                  ))}
              </div>
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
            <GroteKnop kleur="goud" uit={s.streak === 0} bijTik={() => ctx.stuur('cash')}>
              {s.streak === 0
                ? 'Nog niets te cashen'
                : `💰 Cash — deel ${ctx.slok(s.streak)} uit`}
            </GroteKnop>
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
      <div className="zacht klein">te cashen: {ctx.slok(streak)}</div>
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

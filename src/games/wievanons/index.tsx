import {
  iedereenGestemd,
  nieuweStemming,
  onthul,
  spelerOpties,
  stem,
  type Stemming,
} from '../../engine/stemmen'
import { husselen } from '../../engine/random'
import type { Actie, GameModule, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { VRAGEN } from './vragen'

/* ─────────────────────────────────────────────────────────────
   Wie van Ons

   De klassieker "wie van ons zou het eerst…", maar iedereen stemt tegelijk
   en geheim op zijn eigen scherm. De onthulling komt in één klap — dat is
   precies wat aan een echte tafel niet lukt, want daar kijkt iedereen naar
   elkaar voordat hij wijst.
   ───────────────────────────────────────────────────────────── */

interface WieState {
  ronde: number
  maxRondes: number
  vragen: string[]
  stemming: Stemming
  fase: 'stemmen' | 'uitslag'
}

function nieuweRonde(s: WieState, ctx: SpelContext) {
  s.stemming = nieuweStemming(s.vragen[s.ronde % s.vragen.length], spelerOpties(ctx.spelers))
  s.fase = 'stemmen'
}

export const wievanons: GameModule<WieState> = {
  id: 'wievanons',
  naam: 'Wie van Ons',
  uitleg: 'Iedereen stemt tegelijk en geheim. De meeste stemmen drinkt.',
  regels: [
    'Je krijgt een vraag over de groep.',
    'Stem geheim op wie het het meest is.',
    'Als iedereen gestemd heeft, komt de uitslag.',
    'Wie de meeste stemmen krijgt, drinkt er evenveel.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['praten', 'geheim'],
  privescherm: true,

  init(ctx) {
    const s: WieState = {
      ronde: 0,
      maxRondes: 5,
      vragen: husselen(ctx.rng, VRAGEN).slice(0, 5),
      stemming: nieuweStemming('', []),
      fase: 'stemmen',
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    if (actie.type === 'stem' && s.fase === 'stemmen') {
      stem(s.stemming, actie.uid, actie.payload?.uid)

      const iedereen = ctx.spelers.map((p) => p.uid)
      if (!iedereenGestemd(s.stemming, iedereen)) return

      const uitslag = onthul(s.stemming)
      s.fase = 'uitslag'

      for (const uid of uitslag.top) {
        const aantal = uitslag.per[uid].aantal
        ctx.drink(uid, aantal, `${aantal} stemmen`)
      }
      if (uitslag.top.length === 0) ctx.log('Niemand kreeg een stem.')
      return
    }

    if (actie.type === 'verder' && s.fase === 'uitslag') {
      s.ronde++
      if (s.ronde >= s.maxRondes) {
        ctx.klaar()
        return
      }
      nieuweRonde(s, ctx)
      return
    }
  },

  View({ state: s, ctx }) {
    const ikGestemd = s.stemming.gestemd.includes(ctx.ik)

    return (
      <>
        <div className="kop-klein">
          Vraag {s.ronde + 1} van {s.maxRondes}
        </div>

        <Kaartje style={{ textAlign: 'center' }}>
          <h2>{s.stemming.vraag}</h2>
        </Kaartje>

        {s.fase === 'stemmen' ? (
          <>
            <div className="midden" style={{ gap: 10 }}>
              {ikGestemd ? (
                <>
                  <div style={{ fontSize: 48 }}>🤫</div>
                  <h2 className="zacht">Je stem staat vast</h2>
                  <div className="klein zacht">
                    {s.stemming.gestemd.length} van {ctx.spelers.length} gestemd
                  </div>
                </>
              ) : (
                <div className="kop-klein">Kies iemand — niemand ziet het</div>
              )}
              <SpelerBalk spelers={ctx.spelers} actief={s.stemming.gestemd} />
            </div>

            {!ikGestemd && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ctx.spelers.map((p) => (
                  <GroteKnop
                    key={p.uid}
                    kleur={p.uid === ctx.ik ? 'leeg' : 'grijs'}
                    bijTik={() => ctx.stuur('stem', { uid: p.uid })}
                  >
                    {p.emoji} {p.naam}
                  </GroteKnop>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
              {ctx.spelers
                .map((p) => ({ p, aantal: s.stemming.uitslag?.per[p.uid]?.aantal ?? 0 }))
                .sort((a, b) => b.aantal - a.aantal)
                .filter((r) => r.aantal > 0)
                .map(({ p, aantal }) => {
                  const wint = s.stemming.uitslag?.top.includes(p.uid)
                  return (
                    <div
                      key={p.uid}
                      className="kaartje balk"
                      style={{
                        borderColor: wint ? 'var(--rood)' : undefined,
                        background: wint ? 'var(--rood-donker)' : undefined,
                      }}
                    >
                      <span>
                        {p.emoji} <strong>{p.naam}</strong>
                      </span>
                      <span style={{ fontSize: 24, fontWeight: 800 }}>{aantal}</span>
                    </div>
                  )
                })}
            </div>

            <div className="onderaan">
              <GroteKnop kleur="goud" bijTik={() => ctx.stuur('verder')}>
                {s.ronde + 1 >= s.maxRondes ? 'Klaar' : 'Volgende vraag'}
              </GroteKnop>
            </div>
          </>
        )}
      </>
    )
  },
}

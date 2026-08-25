import { husselen } from '../../engine/random'
import type { Actie, GameModule, KijkContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { NOOIT_ZINNEN } from './zinnen'

/* ─────────────────────────────────────────────────────────────
   IK HEB NOG NOOIT

   De klassieker, maar iedereen bekent tegelijk en geheim op zijn eigen
   scherm. De onthulling komt in één klap.

   Dat is het verschil met de tafelversie: daar kijk je eerst even rond wie er
   zijn vingers laat zakken, en dan pas beslis je of je eerlijk bent. Hier kan
   dat niet, en dat maakt het eerlijker én ongemakkelijker.
   ───────────────────────────────────────────────────────────── */

const RONDES = 8
const STRAF = 2

interface NooitState {
  ronde: number
  zinnen: string[]
  _geheim: { keuzes: Record<string, boolean> }
  /** wie er al geantwoord heeft — dit mag iedereen zien */
  gedaan: string[]
  uitslag: { wel: string[]; niet: string[] } | null
  klaar: boolean
}

export const nognooit: GameModule<NooitState> = {
  id: 'nognooit',
  naam: 'Ik Heb Nog Nooit',
  uitleg: 'Iedereen bekent tegelijk en geheim. De onthulling komt in één klap.',
  regels: [
    'Er komt een zin: "Ik heb nog nooit…"',
    'Tik of je het wél of nooit gedaan hebt.',
    'Iedereen antwoordt tegelijk en geheim.',
    'Wie het wél deed, drinkt.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['praten', 'geheim'],
  privescherm: true,

  init(ctx) {
    return {
      ronde: 1,
      zinnen: husselen(ctx.rng, NOOIT_ZINNEN).slice(0, RONDES),
      _geheim: { keuzes: {} },
      gedaan: [],
      uitslag: null,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (!s.uitslag && actie.type === 'beken') {
      if (s._geheim.keuzes[actie.uid] !== undefined) return
      s._geheim.keuzes[actie.uid] = !!actie.payload?.wel
      if (!s.gedaan.includes(actie.uid)) s.gedaan.push(actie.uid)
      if (!iedereen.every((u) => s._geheim.keuzes[u] !== undefined)) return

      const wel = iedereen.filter((u) => s._geheim.keuzes[u])
      const niet = iedereen.filter((u) => !s._geheim.keuzes[u])
      s.uitslag = { wel, niet }

      for (const uid of wel) ctx.drink(uid, STRAF, 'heeft het wél gedaan')
      if (wel.length === 0) ctx.log('Niemand bekende iets. Verdacht.')
      return
    }

    if (s.uitslag && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.klaar = true
        ctx.wisPrive()
        ctx.klaar()
        return
      }
      s.ronde++
      s._geheim.keuzes = {}
      s.gedaan = []
      s.uitslag = null
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    const zin = s.zinnen[(s.ronde - 1) % s.zinnen.length]
    const ikGedaan = s.gedaan.includes(ctx.ik)

    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Ronde {s.ronde}/{RONDES}
          </span>
          <span className="kop-klein">
            {s.gedaan.length}/{ctx.spelers.length}
          </span>
        </div>

        <Kaartje style={{ textAlign: 'center' }}>
          <div className="kop-klein">Ik heb nog nooit…</div>
          <h2 style={{ marginTop: 6 }}>{zin}</h2>
        </Kaartje>

        {s.uitslag ? (
          <>
            <div className="midden" style={{ gap: 10, alignItems: 'stretch' }}>
              <Groepje
                titel="🍺 Wél gedaan"
                uids={s.uitslag.wel}
                ctx={ctx}
                kleur="var(--rood)"
              />
              <Groepje
                titel="😇 Nooit gedaan"
                uids={s.uitslag.niet}
                ctx={ctx}
                kleur="var(--groen)"
              />
            </div>
            <div className="onderaan">
              {ctx.benIkHost ? (
                <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
                  {s.ronde >= RONDES ? 'Klaar' : 'Volgende'}
                </GroteKnop>
              ) : (
                <Kaartje style={{ textAlign: 'center' }}>
                  <span className="zacht">Wachten op de host…</span>
                </Kaartje>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="midden" style={{ gap: 10 }}>
              <div style={{ fontSize: 46 }}>{ikGedaan ? '🤫' : '👀'}</div>
              {ikGedaan && <h2 className="zacht">Je antwoord staat vast</h2>}
              <SpelerBalk spelers={ctx.spelers} actief={s.gedaan} />
            </div>
            <div className="onderaan">
              {ikGedaan ? (
                <Kaartje style={{ textAlign: 'center' }}>
                  <span className="zacht">Wachten op de rest — niemand ziet iets</span>
                </Kaartje>
              ) : (
                <>
                  <div className="rij">
                    <GroteKnop kleur="rood" enorm bijTik={() => ctx.stuur('beken', { wel: true })}>
                      Dat heb ik wel
                    </GroteKnop>
                    <GroteKnop kleur="groen" enorm bijTik={() => ctx.stuur('beken', { wel: false })}>
                      Nooit gedaan
                    </GroteKnop>
                  </div>
                  <div className="klein zacht" style={{ textAlign: 'center' }}>
                    Niemand ziet wat je kiest tot iedereen geantwoord heeft.
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </>
    )
  },
}

function Groepje({
  titel,
  uids,
  ctx,
  kleur,
}: {
  titel: string
  uids: string[]
  ctx: KijkContext
  kleur: string
}) {
  return (
    <div className="kaartje" style={{ borderColor: kleur }}>
      <div className="kop-klein" style={{ color: kleur }}>
        {titel} · {uids.length}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
        {uids.length === 0 ? (
          <span className="klein zacht">niemand</span>
        ) : (
          uids.map((uid) => (
            <span key={uid} className="klein">
              {ctx.speler(uid)?.emoji} {ctx.naam(uid)}
            </span>
          ))
        )}
      </div>
    </div>
  )
}

import { pak, tussen } from '../../engine/random'
import { volgende } from '../../engine/beurten'
import { useHostKlok } from '../../engine/hooks'
import { startKlok, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { BOM_CATEGORIEEN } from './categorieen'

/* ─────────────────────────────────────────────────────────────
   BOM DOORGEVEN

   De app geeft een categorie. Wie de bom heeft noemt er iets uit en geeft
   hem door aan zijn buurman. Ondertussen loopt er een verborgen timer van
   tussen de 30 en 120 seconden. Niemand ziet hoe lang nog.

   Wie hem vasthoudt als het knalt, drinkt.

   Dat de timer onzichtbaar is, is het hele punt: je kunt niet uitrekenen of
   je nog even kunt nadenken. Een zandloper op tafel verraadt zichzelf; dit
   niet.
   ───────────────────────────────────────────────────────────── */

const MIN_SEC = 30
const MAX_SEC = 120
const RONDES = 3
const STRAF_BOEM = 5
const STRAF_GEEN_IDEE = 2

interface BomState {
  ronde: number
  categorie: string
  houder: string
  klok: Klok | null
  /** wat er al genoemd is, zodat je niet in herhaling valt */
  genoemd: { uid: string; woord: string }[]
  doorgegeven: number
  fase: 'lopen' | 'boem'
  slachtoffer: string | null
  klaar: boolean
}

function nieuweRonde(s: BomState, ctx: SpelContext) {
  s.categorie = pak(ctx.rng, BOM_CATEGORIEEN)
  s.houder = pak(
    ctx.rng,
    ctx.spelers.map((p) => p.uid),
  )
  s.klok = startKlok(tussen(ctx.rng, MIN_SEC, MAX_SEC), ctx.nu)
  s.genoemd = []
  s.doorgegeven = 0
  s.fase = 'lopen'
  s.slachtoffer = null
}

export const bom: GameModule<BomState> = {
  id: 'bom',
  naam: 'Bom Doorgeven',
  uitleg: 'Noem er een uit de categorie en geef door. Niemand weet wanneer hij knalt.',
  regels: [
    'De app geeft een categorie.',
    'Heb je de bom? Noem er iets uit en geef door.',
    'De timer is onzichtbaar — tussen 30 en 120 seconden.',
    'Wie hem vasthoudt bij de knal, drinkt 5.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['chaos', 'praten', 'reflex'],
  privescherm: false,

  init(ctx) {
    const s: BomState = {
      ronde: 1,
      categorie: '',
      houder: ctx.spelers[0].uid,
      klok: null,
      genoemd: [],
      doorgegeven: 0,
      fase: 'lopen',
      slachtoffer: null,
      klaar: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'lopen') {
      if (actie.type === 'door') {
        if (actie.uid !== s.houder) return
        const woord = String(actie.payload?.woord ?? '').trim().slice(0, 24)
        if (woord) s.genoemd.push({ uid: actie.uid, woord })
        s.doorgegeven++
        s.houder = volgende(volgorde, s.houder)
        return
      }

      if (actie.type === 'geen-idee') {
        if (actie.uid !== s.houder) return
        ctx.drink(actie.uid, STRAF_GEEN_IDEE, 'wist er geen')
        s.doorgegeven++
        s.houder = volgende(volgorde, s.houder)
        return
      }

      if (actie.type === 'boem') {
        s.fase = 'boem'
        s.slachtoffer = s.houder
        s.klok = null
        ctx.drink(s.houder, STRAF_BOEM, `hield de bom vast bij ${s.categorie}`)
        return
      }
      return
    }

    if (s.fase === 'boem' && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.klaar = true
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
    useHostKlok(ctx, s.fase === 'lopen', s.klok?.eind ?? 0, 'boem')

    if (s.fase === 'boem') {
      const slachtoffer = ctx.speler(s.slachtoffer ?? '')
      return (
        <>
          <div className="midden" style={{ gap: 10 }}>
            <div style={{ fontSize: 72 }} className="klopt">
              💥
            </div>
            <h1>BOEM</h1>
            <h2 className="zacht">
              {slachtoffer?.emoji} {slachtoffer?.naam}
            </h2>
            <div className="klein zacht">
              {s.doorgegeven} keer doorgegeven · categorie: {s.categorie}
            </div>
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

    return <Lopen s={s} ctx={ctx} />
  },
}

function Lopen({ s, ctx }: { s: BomState; ctx: KijkContext }) {
  const ikHeb = ctx.ik === s.houder
  const houder = ctx.speler(s.houder)
  const volgendeNaam = (() => {
    const volgorde = ctx.spelers.map((p) => p.uid)
    return ctx.naam(volgende(volgorde, s.houder))
  })()

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Ronde {s.ronde} · {s.doorgegeven} keer door
        </span>
        <span className="kop-klein">⏱ ???</span>
      </div>

      <Kaartje style={{ textAlign: 'center' }}>
        <div className="kop-klein">Noem een</div>
        <h1>{s.categorie}</h1>
      </Kaartje>

      <SpelerBalk spelers={ctx.spelers} actief={s.houder} />

      {s.genoemd.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
          {s.genoemd.slice(-12).map((g, i) => (
            <span key={i} className="kaartje" style={{ padding: '3px 9px', fontSize: 12 }}>
              {g.woord}
            </span>
          ))}
        </div>
      )}

      <div className="midden">
        {ikHeb ? (
          <div style={{ fontSize: 84 }} className="klopt">
            💣
          </div>
        ) : (
          <>
            <div style={{ fontSize: 48, opacity: 0.35 }}>💣</div>
            <h2 className="zacht">
              {houder?.emoji} {houder?.naam} heeft hem
            </h2>
          </>
        )}
      </div>

      <div className="onderaan">
        {ikHeb ? (
          <>
            <GroteKnop
              kleur="rood"
              enorm
              bijTik={() => {
                tril(20)
                ctx.stuur('door')
              }}
            >
              Gezegd — door naar {volgendeNaam}
            </GroteKnop>
            <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('geen-idee')}>
              Ik weet er geen — drink {ctx.slokKort(STRAF_GEEN_IDEE)}
            </GroteKnop>
          </>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Hij komt jouw kant op…</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

import { nieuweStapel, trek, type Kaart, type Stapel } from '../../engine/deck'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { KaartRij } from '../../ui/Kaart'
import { BONUS, dealerDoetMee, vergelijk, waardeer, type Waardering } from './hand'

/* ─────────────────────────────────────────────────────────────
   3 CARD POKER

   Je speelt niet tegen elkaar maar allemaal tegen de dealer. Je krijgt drie
   kaarten op je eigen telefoon, de dealer krijgt er drie die dicht blijven, en
   dan is er maar één keuze: meedoen of passen.

   Passen kost één slok en je bent er klaar mee. Meedoen is drie slokken waard,
   en welke kant ze op gaan weet je nog niet.

   Waarom tegen de dealer en niet tegen elkaar: dan hoeft er niemand op zijn
   beurt te wachten. Iedereen kijkt tegelijk naar zijn kaarten, tikt tegelijk,
   en de onthulling is voor de hele tafel in één keer. Daardoor duurt een ronde
   een halve minuut in plaats van acht keer een beurt.

   De dealer moet minstens vrouw hoog hebben om mee te doen. Heeft hij dat
   niet, dan wint iedereen die gespeeld heeft -- ook met een beroerde hand. Dat
   is precies de reden dat meedoen vaker goed is dan het voelt.
   ───────────────────────────────────────────────────────────── */

const RONDES = 6
/** Wat passen kost. Laag, want je doet verder niets. */
const INLEG = 1
/** Waar het om gaat als je meedoet. */
const INZET = 3
/** Wint je omdat de dealer niet meedeed, dan is het minder — er was geen strijd. */
const ZONDER_STRIJD = 2

interface Uitslag {
  uid: string
  /** heeft hij meegedaan? */
  mee: boolean
  soort: string
  /** positief: hij mag uitdelen. negatief: hij drinkt. */
  saldo: number
  reden: string
}

interface DriekaartState {
  stapel: Stapel
  ronde: number
  fase: 'kiezen' | 'uitslag'
  /** uid → meedoen (true) of passen (false) */
  keuzes: Record<string, boolean>
  /** open op tafel, pas in de uitslagfase gevuld */
  dealer: Kaart[] | null
  dealerSoort: string
  dealerMee: boolean
  uitslagen: Uitslag[]
  /** wie zijn winst al heeft weggegeven */
  gegeven: string[]
  _geheim: {
    handen: Record<string, Kaart[]>
    dealer: Kaart[]
  }
  klaar: boolean
}

function nieuweRonde(s: DriekaartState, ctx: SpelContext) {
  s.fase = 'kiezen'
  s.keuzes = {}
  s.dealer = null
  s.dealerSoort = ''
  s.dealerMee = false
  s.uitslagen = []
  s.gegeven = []

  s._geheim.handen = {}
  for (const p of ctx.spelers) {
    const hand = [trek(s.stapel, ctx.rng), trek(s.stapel, ctx.rng), trek(s.stapel, ctx.rng)]
    s._geheim.handen[p.uid] = hand
    ctx.zetPrive(p.uid, { hand, waardering: waardeer(hand) })
  }
  s._geheim.dealer = [
    trek(s.stapel, ctx.rng),
    trek(s.stapel, ctx.rng),
    trek(s.stapel, ctx.rng),
  ]
}

/**
 * Alles omdraaien en de rekening maken.
 *
 * Gebeurt in één keer voor de hele tafel: de dealer heeft één hand en die
 * speelt tegen iedereen afzonderlijk. Dat is het verschil met gewone poker,
 * waar jouw winst iemand anders zijn verlies is.
 */
function onthul(s: DriekaartState, ctx: SpelContext) {
  const dealerHand = s._geheim.dealer
  const dealerW = waardeer(dealerHand)
  const doetMee = dealerDoetMee(dealerW)

  s.dealer = dealerHand
  s.dealerSoort = dealerW.naam
  s.dealerMee = doetMee
  s.fase = 'uitslag'
  s.uitslagen = []

  for (const p of ctx.spelers) {
    const hand = s._geheim.handen[p.uid]
    if (!hand) continue
    const mijn = waardeer(hand)
    const mee = s.keuzes[p.uid] === true

    if (!mee) {
      s.uitslagen.push({
        uid: p.uid,
        mee: false,
        soort: mijn.naam,
        saldo: -INLEG,
        reden: 'paste',
      })
      ctx.drink(p.uid, INLEG, 'paste')
      continue
    }

    const bonus = BONUS[mijn.soort]
    let saldo = 0
    let reden = ''

    if (!doetMee) {
      saldo = ZONDER_STRIJD
      reden = 'de dealer deed niet mee'
    } else {
      const uitkomst = vergelijk(mijn, dealerW)
      if (uitkomst > 0) {
        saldo = INZET
        reden = `${mijn.naam} verslaat ${dealerW.naam}`
      } else if (uitkomst < 0) {
        saldo = -INZET
        reden = `${dealerW.naam} verslaat ${mijn.naam}`
      } else {
        reden = 'precies gelijk'
      }
    }

    // De bonus staat los van de dealer: een mooie hand hoort altijd iets op te
    // leveren, ook als je hem verliest.
    saldo += bonus

    s.uitslagen.push({
      uid: p.uid,
      mee: true,
      soort: mijn.naam,
      saldo,
      reden: bonus > 0 ? `${reden} · bonus voor ${mijn.naam}` : reden,
    })

    if (saldo < 0) ctx.drink(p.uid, -saldo, reden)
  }

  const winnaars = s.uitslagen.filter((u) => u.saldo > 0).length
  ctx.log(
    `De dealer had ${dealerW.naam}${doetMee ? '' : ' en deed niet mee'} — ${winnaars} aan tafel wonnen`,
  )
}

export const driekaart: GameModule<DriekaartState> = {
  id: 'driekaart',
  naam: '3 Card Poker',
  uitleg: 'Drie kaarten, en één keuze: meedoen tegen de dealer of passen.',
  regels: [
    'Je krijgt drie kaarten die alleen jij ziet.',
    'Meedoen of passen — passen kost één slok.',
    'Versla je de dealer, dan deel je drie uit. Verlies je, dan drink je ze.',
    'Let op: drie gelijk is hier sterker dan een straat.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['kaarten', 'geluk', 'geheim'],
  privescherm: true,

  init(ctx) {
    const s: DriekaartState = {
      stapel: nieuweStapel(ctx.rng),
      ronde: 1,
      fase: 'kiezen',
      keuzes: {},
      dealer: null,
      dealerSoort: '',
      dealerMee: false,
      uitslagen: [],
      gegeven: [],
      _geheim: { handen: {}, dealer: [] },
      klaar: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'kiezen' && actie.type === 'kies') {
      if (s.keuzes[actie.uid] !== undefined) return
      if (!s._geheim.handen[actie.uid]) return
      s.keuzes[actie.uid] = actie.payload?.mee === true

      // Pas omdraaien als de laatste getikt heeft. Eerder zou betekenen dat
      // wie laat is de kaarten van de dealer al ziet voordat hij kiest.
      if (!iedereen.every((u) => s.keuzes[u] !== undefined)) return
      onthul(s, ctx)
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'geef') {
      const mijn = s.uitslagen.find((u) => u.uid === actie.uid)
      if (!mijn || mijn.saldo <= 0) return
      if (s.gegeven.includes(actie.uid)) return
      const naar = String(actie.payload?.naar ?? '')
      if (!iedereen.includes(naar) || naar === actie.uid) return

      s.gegeven.push(actie.uid)
      ctx.deelUit(actie.uid, naar, mijn.saldo, 'versloeg de dealer')
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
    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Ronde {s.ronde}/{RONDES}
          </span>
          <span className="kop-klein">
            {s.fase === 'kiezen'
              ? `${Object.keys(s.keuzes).length}/${ctx.spelers.length} gekozen`
              : s.dealerMee
                ? `dealer: ${s.dealerSoort}`
                : 'dealer deed niet mee'}
          </span>
        </div>

        <Kaartje style={{ textAlign: 'center' }}>
          <div className="kop-klein">De dealer</div>
          <div className="rij" style={{ justifyContent: 'center', marginTop: 6 }}>
            {s.dealer ? (
              <KaartRij kaarten={s.dealer} maat="midden" />
            ) : (
              <KaartRij kaarten={[null, null, null]} maat="midden" dicht />
            )}
          </div>
          {s.fase === 'uitslag' && (
            <div className="klein zacht" style={{ marginTop: 6 }}>
              {s.dealerSoort}
              {s.dealerMee ? '' : ' — te weinig, iedereen die meedeed wint'}
            </div>
          )}
        </Kaartje>

        {s.fase === 'kiezen' ? <Kiezen s={s} ctx={ctx} /> : <Uitslagen s={s} ctx={ctx} />}
      </>
    )
  },
}

function Kiezen({ s, ctx }: { s: DriekaartState; ctx: KijkContext }) {
  const hand: Kaart[] = ctx.prive?.hand ?? []
  const waardering: Waardering | undefined = ctx.prive?.waardering
  const gekozen = s.keuzes[ctx.ik] !== undefined

  return (
    <>
      <div className="midden" style={{ gap: 8 }}>
        <div className="kop-klein">Jouw kaarten</div>
        <KaartRij kaarten={hand} maat="groot" />
        {waardering && (
          <div className="lint" style={{ marginTop: 2 }}>
            {waardering.naam}
          </div>
        )}
        {BONUS[waardering?.soort ?? 1] > 0 && (
          <div className="klein" style={{ color: 'var(--goud)' }}>
            bonus van {ctx.slok(BONUS[waardering!.soort])} als je meedoet
          </div>
        )}
        <SpelerBalk spelers={ctx.spelers} actief={Object.keys(s.keuzes)} />
      </div>

      <div className="onderaan">
        {gekozen ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">
              {s.keuzes[ctx.ik] ? 'Je doet mee. Wachten op de rest…' : 'Je paste.'}
            </span>
          </Kaartje>
        ) : (
          <div className="rij">
            <GroteKnop
              kleur="grijs"
              enorm
              bijTik={() => {
                tril(8)
                ctx.stuur('kies', { mee: false })
              }}
            >
              Passen · {ctx.slokKort(INLEG)}
            </GroteKnop>
            <GroteKnop
              kleur="goud"
              enorm
              bijTik={() => {
                tril(12)
                ctx.stuur('kies', { mee: true })
              }}
            >
              Meedoen · {ctx.slokKort(INZET)}
            </GroteKnop>
          </div>
        )}
      </div>
    </>
  )
}

function Uitslagen({ s, ctx }: { s: DriekaartState; ctx: KijkContext }) {
  const mijn = s.uitslagen.find((u) => u.uid === ctx.ik)
  const magGeven = !!mijn && mijn.saldo > 0 && !s.gegeven.includes(ctx.ik)
  const laatste = s.ronde >= RONDES

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {s.uitslagen.map((u) => (
          <div
            key={u.uid}
            className="kaartje balk"
            style={{
              borderColor:
                u.saldo > 0 ? 'var(--groen)' : u.saldo < 0 ? 'var(--rood)' : undefined,
            }}
          >
            <span>
              {ctx.speler(u.uid)?.emoji} <strong>{ctx.naam(u.uid)}</strong>
              <span className="klein zacht"> · {u.soort}</span>
            </span>
            <span className="klein">
              {u.saldo > 0 ? `+${ctx.slokKort(u.saldo)}` : u.saldo < 0 ? ctx.slokKort(-u.saldo) : '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="onderaan">
        {magGeven ? (
          <>
            <div className="kop-klein" style={{ textAlign: 'center' }}>
              Je won {ctx.slok(mijn!.saldo)} — aan wie?
            </div>
            <div className="rij" style={{ flexWrap: 'wrap', gap: 6 }}>
              {ctx.spelers
                .filter((p) => p.uid !== ctx.ik)
                .map((p) => (
                  <button
                    key={p.uid}
                    className="knop klein"
                    onClick={() => {
                      tril(8)
                      ctx.stuur('geef', { naar: p.uid })
                    }}
                  >
                    {p.emoji} {p.naam}
                  </button>
                ))}
            </div>
          </>
        ) : ctx.benIkHost ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
            {laatste ? 'Klaar' : 'Volgende ronde'}
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

import { nieuweStapel, trek, type Kaart, type Stapel } from '../../engine/deck'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { KaartRij } from '../../ui/Kaart'
import { SOORT, dealerDoetMee, vergelijk, waardeer, type Waardering } from './hand'

/* ─────────────────────────────────────────────────────────────
   3 CARD POKER

   Je speelt niet tegen elkaar maar allemaal tegen de dealer. Je krijgt drie
   kaarten op je eigen telefoon, de dealer krijgt er drie die dicht blijven, en
   dan is er één keuze: meedoen of passen.

   Passen kost één slok en je bent er klaar mee. Meedoen is drie slokken waard,
   en welke kant ze op gaan weet je nog niet.

   Waarom tegen de dealer en niet tegen elkaar: dan hoeft er niemand op zijn
   beurt te wachten. Iedereen kijkt tegelijk naar zijn kaarten, tikt tegelijk,
   en de onthulling is voor de hele tafel in één keer. Daardoor duurt een ronde
   een halve minuut in plaats van acht keer een beurt.

   De dealer moet minstens vrouw hoog hebben om mee te doen. Heeft hij dat
   niet, dan wint iedereen die gespeeld heeft -- ook met een beroerde hand. Dat
   is precies de reden dat meedoen vaker goed is dan het voelt.

   PAIR PLUS is een tweede weddenschap die los staat van de dealer. Je zet er
   slokken op voordat er gedeeld wordt, en het gaat alleen over je eigen hand:
   een paar of beter en je deelt het dubbele uit, anders drink je er één. Dat
   inzetten gebeurt dus blind -- zou je het mogen doen nadat je je kaarten hebt
   gezien, dan was het geen gok meer maar rekenen.
   ───────────────────────────────────────────────────────────── */

const RONDES = 6
/** Wat passen kost. Laag, want je doet verder niets. */
const INLEG = 1
/** Waar het om gaat als je meedoet. */
const INZET = 3
/** Win je omdat de dealer niet meedeed, dan is het minder — er was geen strijd. */
const ZONDER_STRIJD = 2
/** Hoeveel slokken je hoogstens op Pair Plus mag zetten. */
const MAX_PP = 5
/** Wat een misgelopen Pair Plus kost, los van wat je inzette. */
const PP_STRAF = 1

interface Uitslag {
  uid: string
  /** heeft hij meegedaan tegen de dealer? */
  mee: boolean
  soort: string
  /** wat hij op Pair Plus had staan */
  pp: number
  /** ging die weddenschap goed? null als hij niet meedeed */
  ppGoed: boolean | null
  /** wat hij mag uitdelen */
  uitdelen: number
  /** wat hij moet drinken */
  drinken: number
  reden: string
}

interface DriekaartState {
  stapel: Stapel
  ronde: number
  fase: 'inzetten' | 'kiezen' | 'uitslag'
  /** uid → slokken op Pair Plus, 0 is niet meedoen */
  ppInzetten: Record<string, number>
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
  s.fase = 'inzetten'
  s.ppInzetten = {}
  s.keuzes = {}
  s.dealer = null
  s.dealerSoort = ''
  s.dealerMee = false
  s.uitslagen = []
  s.gegeven = []
  s._geheim.handen = {}
  s._geheim.dealer = []

  // De kaarten van vorige ronde van alle telefoons af. Er is nog niet gedeeld:
  // dat gebeurt pas als iedereen zijn Pair Plus heeft staan.
  ctx.wisPrive()
}

function deelKaarten(s: DriekaartState, ctx: SpelContext) {
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
  s.fase = 'kiezen'
}

/**
 * Alles omdraaien en de rekening maken.
 *
 * Gebeurt in één keer voor de hele tafel: de dealer heeft één hand en die
 * speelt tegen iedereen afzonderlijk. Dat is het verschil met gewone poker,
 * waar jouw winst iemand anders zijn verlies is.
 *
 * Uitdelen en drinken worden apart bijgehouden en niet tegen elkaar
 * weggestreept. Je kunt namelijk de dealer verslaan én je Pair Plus mislopen,
 * en dan hoort er allebei iets te gebeuren -- met één nettobedrag zou dat
 * stilletjes tegen elkaar wegvallen en snapt niemand de uitslag.
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
    const pp = s.ppInzetten[p.uid] ?? 0

    let uitdelen = 0
    let drinken = 0
    let reden = ''

    if (!mee) {
      drinken += INLEG
      reden = 'paste'
      ctx.drink(p.uid, INLEG, 'paste')
    } else if (!doetMee) {
      uitdelen += ZONDER_STRIJD
      reden = 'de dealer deed niet mee'
    } else {
      const uitkomst = vergelijk(mijn, dealerW)
      if (uitkomst > 0) {
        uitdelen += INZET
        reden = `${mijn.naam} verslaat ${dealerW.naam}`
      } else if (uitkomst < 0) {
        drinken += INZET
        reden = `${dealerW.naam} verslaat ${mijn.naam}`
        ctx.drink(p.uid, INZET, reden)
      } else {
        reden = 'precies gelijk'
      }
    }

    /*
     * Pair Plus staat los van alles: ook wie paste heeft zijn slokken al
     * ingezet voordat er gedeeld werd, dus die weddenschap loopt gewoon door.
     */
    let ppGoed: boolean | null = null
    if (pp > 0) {
      ppGoed = mijn.soort >= SOORT.paar
      if (ppGoed) {
        uitdelen += pp * 2
      } else {
        drinken += PP_STRAF
        ctx.drink(p.uid, PP_STRAF, 'Pair Plus misgelopen')
      }
    }

    s.uitslagen.push({
      uid: p.uid,
      mee,
      soort: mijn.naam,
      pp,
      ppGoed,
      uitdelen,
      drinken,
      reden,
    })
  }

  const winnaars = s.uitslagen.filter((u) => u.uitdelen > 0).length
  ctx.log(
    `De dealer had ${dealerW.naam}${doetMee ? '' : ' en deed niet mee'} — ${winnaars} aan tafel mogen uitdelen`,
  )
}

export const driekaart: GameModule<DriekaartState> = {
  id: 'driekaart',
  naam: '3 Card Poker',
  uitleg: 'Drie kaarten tegen de dealer. Meedoen of passen, plus Pair Plus.',
  regels: [
    'Zet eerst blind slokken op Pair Plus, of sla hem over.',
    'Je krijgt drie kaarten die alleen jij ziet: meedoen of passen.',
    'Hoogste hand wint. Heeft de dealer minder dan vrouw hoog, dan win je altijd.',
    'Pair Plus: paar of beter is het dubbele uitdelen, anders één drinken.',
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
      fase: 'inzetten',
      ppInzetten: {},
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

    /* ── Pair Plus, blind en voor het delen ── */
    if (s.fase === 'inzetten' && actie.type === 'zet') {
      if (s.ppInzetten[actie.uid] !== undefined) return
      const ruw = actie.payload?.slokken
      if (typeof ruw !== 'number' || !Number.isFinite(ruw)) return
      s.ppInzetten[actie.uid] = Math.max(0, Math.min(MAX_PP, Math.round(ruw)))

      if (!iedereen.every((u) => s.ppInzetten[u] !== undefined)) return
      deelKaarten(s, ctx)
      return
    }

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
      if (!mijn || mijn.uitdelen <= 0) return
      if (s.gegeven.includes(actie.uid)) return
      const naar = String(actie.payload?.naar ?? '')
      if (!iedereen.includes(naar) || naar === actie.uid) return

      s.gegeven.push(actie.uid)
      ctx.deelUit(actie.uid, naar, mijn.uitdelen, 'versloeg de dealer')
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
            {s.fase === 'inzetten'
              ? `${Object.keys(s.ppInzetten).length}/${ctx.spelers.length} ingezet`
              : s.fase === 'kiezen'
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

        {s.fase === 'inzetten' && <PairPlus s={s} ctx={ctx} />}
        {s.fase === 'kiezen' && <Kiezen s={s} ctx={ctx} />}
        {s.fase === 'uitslag' && <Uitslagen s={s} ctx={ctx} />}
      </>
    )
  },
}

function PairPlus({ s, ctx }: { s: DriekaartState; ctx: KijkContext }) {
  const mijn = s.ppInzetten[ctx.ik]

  if (mijn !== undefined) {
    return (
      <div className="onderaan">
        <Kaartje style={{ textAlign: 'center' }}>
          <span className="zacht">
            {mijn === 0
              ? 'Je doet niet mee met Pair Plus — wachten op de rest…'
              : `${ctx.slok(mijn)} op Pair Plus — wachten op de rest…`}
          </span>
        </Kaartje>
      </div>
    )
  }

  return (
    <>
      <div className="midden" style={{ gap: 8 }}>
        <div style={{ fontSize: 40 }}>🂡</div>
        <div className="kop-klein">Pair Plus</div>
        <div className="klein zacht" style={{ textAlign: 'center', maxWidth: 320 }}>
          Een gok op je eigen hand, los van de dealer. Een paar of beter en je
          deelt het dubbele uit; heb je niets, dan drink je er één. Je zet nu in,
          dus nog voordat je je kaarten ziet.
        </div>
        <SpelerBalk spelers={ctx.spelers} actief={Object.keys(s.ppInzetten)} />
      </div>

      <div className="onderaan" style={{ gap: 6 }}>
        <div className="rij" style={{ gap: 4 }}>
          {Array.from({ length: MAX_PP }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className="knop klein goud"
              style={{ flex: 1 }}
              onClick={() => {
                tril(8)
                ctx.stuur('zet', { slokken: n })
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <GroteKnop
          kleur="grijs"
          bijTik={() => {
            tril(6)
            ctx.stuur('zet', { slokken: 0 })
          }}
        >
          Sla over
        </GroteKnop>
      </div>
    </>
  )
}

function Kiezen({ s, ctx }: { s: DriekaartState; ctx: KijkContext }) {
  const hand: Kaart[] = ctx.prive?.hand ?? []
  const waardering: Waardering | undefined = ctx.prive?.waardering
  const gekozen = s.keuzes[ctx.ik] !== undefined
  const pp = s.ppInzetten[ctx.ik] ?? 0
  const ppGoed = (waardering?.soort ?? 0) >= SOORT.paar

  return (
    <>
      <div className="midden" style={{ gap: 8 }}>
        <div className="kop-klein">Jouw kaarten</div>
        <KaartRij kaarten={hand} maat="groot" />
        {waardering && <div className="lint">{waardering.naam}</div>}
        {pp > 0 && (
          <div
            className="klein"
            style={{ color: ppGoed ? 'var(--groen)' : 'var(--rood)' }}
          >
            Pair Plus van {ctx.slok(pp)}: {ppGoed ? `je deelt ${ctx.slok(pp * 2)} uit` : 'misgelopen'}
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
  const magGeven = !!mijn && mijn.uitdelen > 0 && !s.gegeven.includes(ctx.ik)
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
                u.uitdelen > 0
                  ? 'var(--groen)'
                  : u.drinken > 0
                    ? 'var(--rood)'
                    : undefined,
            }}
          >
            <span>
              {ctx.speler(u.uid)?.emoji} <strong>{ctx.naam(u.uid)}</strong>
              <span className="klein zacht"> · {u.soort}</span>
              {u.pp > 0 && (
                <span className="klein" style={{ color: u.ppGoed ? 'var(--groen)' : 'var(--rood)' }}>
                  {' '}
                  · PP {u.pp}
                </span>
              )}
            </span>
            <span className="klein">
              {u.uitdelen > 0 && <span style={{ color: 'var(--groen)' }}>+{ctx.slokKort(u.uitdelen)} </span>}
              {u.drinken > 0 && <span style={{ color: 'var(--rood)' }}>{ctx.slokKort(u.drinken)}</span>}
              {u.uitdelen === 0 && u.drinken === 0 && '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="onderaan">
        {magGeven ? (
          <>
            <div className="kop-klein" style={{ textAlign: 'center' }}>
              Je deelt {ctx.slok(mijn!.uitdelen)} uit — aan wie?
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

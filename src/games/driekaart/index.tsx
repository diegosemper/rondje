import { nieuweStapel, trek, type Kaart, type Stapel } from '../../engine/deck'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { KaartRij } from '../../ui/Kaart'
import { SOORT, dealerDoetMee, vergelijk, waardeer, type Waardering } from './hand'

/* ─────────────────────────────────────────────────────────────
   3 CARD POKER

   Je speelt niet tegen elkaar maar allemaal tegen de dealer.

   ALLES WAT JE INZET, ZET JE BLIND. Eerst slokken op je hand, dan slokken op
   Pair Plus, en pas daarna zie je je kaarten. Dat is met opzet die kant op:
   mocht je inzetten nadat je je hand kent, dan zet je altijd hoog met een paar
   en laag met niets, en dan is er niets meer te gokken.

   Als je kaarten er liggen is er nog één keuze: meedoen of passen. Meedoen zet
   er nog eenzelfde bedrag bij, dus je riskeert het dubbele van je inzet en je
   kunt ook het dubbele uitdelen. Passen kost je je inzet en je Pair Plus
   vervalt.

   Waarom tegen de dealer en niet tegen elkaar: dan hoeft er niemand op zijn
   beurt te wachten. Iedereen zet tegelijk in, kijkt tegelijk, en de onthulling
   is voor de hele tafel in één keer.

   De dealer moet minstens vrouw hoog hebben om mee te doen. Heeft hij dat
   niet, dan wint iedereen die gespeeld heeft -- ook met een beroerde hand. Dan
   levert het je je inzet op en niet het dubbele: er was geen strijd.
   ───────────────────────────────────────────────────────────── */

const RONDES = 6
/** Hoeveel slokken je hoogstens op je hand of op Pair Plus mag zetten. */
const MAX_INZET = 5
/** Meedoen zet er nog eenzelfde bedrag bij. */
const MEE_FACTOR = 2
/** Wat een misgelopen Pair Plus kost, los van wat je inzette. */
const PP_STRAF = 1

interface Uitslag {
  uid: string
  /** heeft hij meegedaan tegen de dealer? */
  mee: boolean
  soort: string
  /** wat hij blind op zijn hand had gezet */
  inzet: number
  /** wat hij blind op Pair Plus had gezet */
  pp: number
  /** ging die weddenschap goed? null als hij niet liep */
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
  fase: 'inzet' | 'pairplus' | 'kiezen' | 'uitslag'
  /** uid → slokken op de hand, minstens 1 */
  inzetten: Record<string, number>
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
  s.fase = 'inzet'
  s.inzetten = {}
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
  // dat gebeurt pas als beide inzetten staan.
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
 * weggestreept. Je kunt namelijk je hand verliezen én je Pair Plus halen, en
 * dan hoort er allebei iets te gebeuren -- met één nettobedrag zou dat
 * stilletjes wegvallen en snapt niemand de uitslag.
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
    const inzet = s.inzetten[p.uid] ?? 1
    const pp = s.ppInzetten[p.uid] ?? 0

    let uitdelen = 0
    let drinken = 0
    let reden = ''

    if (!mee) {
      drinken += inzet
      reden = 'paste'
      ctx.drink(p.uid, inzet, 'paste')
    } else if (!doetMee) {
      // De dealer deed niet mee, dus er is niets gespeeld: je krijgt je inzet
      // en niet het dubbele.
      uitdelen += inzet
      reden = 'de dealer deed niet mee'
    } else {
      const uitkomst = vergelijk(mijn, dealerW)
      if (uitkomst > 0) {
        uitdelen += inzet * MEE_FACTOR
        reden = `${mijn.naam} verslaat ${dealerW.naam}`
      } else if (uitkomst < 0) {
        drinken += inzet * MEE_FACTOR
        reden = `${dealerW.naam} verslaat ${mijn.naam}`
        ctx.drink(p.uid, inzet * MEE_FACTOR, reden)
      } else {
        reden = 'precies gelijk'
      }
    }

    /*
     * Pair Plus hangt aan meedoen. Pas je, dan vervalt hij helemaal: je deelt
     * niets uit en je drinkt er ook niets voor.
     *
     * Dat maakt passen duurder dan het lijkt. Heb je een paar en pas je toch,
     * dan gooi je je eigen bonus weg -- en dat is precies de twijfel die deze
     * weddenschap moet opleveren.
     */
    let ppGoed: boolean | null = null
    if (pp > 0 && mee) {
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
      inzet,
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

/** Een inzet die van een telefoon komt is een voorstel; hier wordt hij netjes. */
function schoneInzet(ruw: unknown, minimum: number): number | null {
  if (typeof ruw !== 'number' || !Number.isFinite(ruw)) return null
  return Math.max(minimum, Math.min(MAX_INZET, Math.round(ruw)))
}

export const driekaart: GameModule<DriekaartState> = {
  id: 'driekaart',
  naam: '3 Card Poker',
  uitleg: 'Blind inzetten, dan drie kaarten tegen de dealer. Mee of pas.',
  regels: [
    'Zet eerst blind slokken op je hand, dan op Pair Plus.',
    'Dan zie je je drie kaarten: meedoen of passen.',
    'Meedoen verdubbelt je inzet. Hoogste hand wint.',
    'Dealer onder vrouw hoog? Dan win je altijd, maar enkel je inzet.',
    'Pair Plus: paar of beter is het dubbele uitdelen. Pas je, dan vervalt hij.',
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
      fase: 'inzet',
      inzetten: {},
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

    /* ── Blind op je hand ── */
    if (s.fase === 'inzet' && actie.type === 'zet') {
      if (s.inzetten[actie.uid] !== undefined) return
      const n = schoneInzet(actie.payload?.slokken, 1)
      if (n === null) return
      s.inzetten[actie.uid] = n

      if (!iedereen.every((u) => s.inzetten[u] !== undefined)) return
      s.fase = 'pairplus'
      return
    }

    /* ── Blind op Pair Plus, en dan pas delen ── */
    if (s.fase === 'pairplus' && actie.type === 'zetPp') {
      if (s.ppInzetten[actie.uid] !== undefined) return
      const n = schoneInzet(actie.payload?.slokken, 0)
      if (n === null) return
      s.ppInzetten[actie.uid] = n

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
            {s.fase === 'inzet'
              ? `${Object.keys(s.inzetten).length}/${ctx.spelers.length} ingezet`
              : s.fase === 'pairplus'
                ? `${Object.keys(s.ppInzetten).length}/${ctx.spelers.length} op Pair Plus`
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

        {s.fase === 'inzet' && <HandInzet s={s} ctx={ctx} />}
        {s.fase === 'pairplus' && <PairPlus s={s} ctx={ctx} />}
        {s.fase === 'kiezen' && <Kiezen s={s} ctx={ctx} />}
        {s.fase === 'uitslag' && <Uitslagen s={s} ctx={ctx} />}
      </>
    )
  },
}

/** Een rij knoppen van 1 tot 5. */
function Bedragen({
  bijTik,
  vanaf = 1,
}: {
  bijTik: (n: number) => void
  vanaf?: number
}) {
  return (
    <div className="rij" style={{ gap: 4 }}>
      {Array.from({ length: MAX_INZET - vanaf + 1 }, (_, i) => i + vanaf).map((n) => (
        <button
          key={n}
          className="knop klein goud"
          style={{ flex: 1 }}
          onClick={() => {
            tril(8)
            bijTik(n)
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function HandInzet({ s, ctx }: { s: DriekaartState; ctx: KijkContext }) {
  const mijn = s.inzetten[ctx.ik]

  if (mijn !== undefined) {
    return (
      <div className="onderaan">
        <Kaartje style={{ textAlign: 'center' }}>
          <span className="zacht">{ctx.slok(mijn)} op je hand — wachten op de rest…</span>
        </Kaartje>
      </div>
    )
  }

  return (
    <>
      <div className="midden" style={{ gap: 8 }}>
        <div style={{ fontSize: 40 }}>🂠</div>
        <div className="kop-klein">Stap 1 · je hand</div>
        <div className="klein zacht" style={{ textAlign: 'center', maxWidth: 320 }}>
          Hoeveel slokken zet je op je hand? Je hebt je kaarten nog niet gezien.
          Straks kun je meedoen — dat verdubbelt dit bedrag — of passen, en dan
          drink je het.
        </div>
        <SpelerBalk spelers={ctx.spelers} actief={Object.keys(s.inzetten)} />
      </div>
      <div className="onderaan">
        <Bedragen bijTik={(n) => ctx.stuur('zet', { slokken: n })} />
      </div>
    </>
  )
}

function PairPlus({ s, ctx }: { s: DriekaartState; ctx: KijkContext }) {
  const mijn = s.ppInzetten[ctx.ik]
  const inzet = s.inzetten[ctx.ik] ?? 0

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
        <div className="kop-klein">Stap 2 · Pair Plus</div>
        <div className="klein zacht" style={{ textAlign: 'center', maxWidth: 320 }}>
          Een tweede gok, alleen op je eigen hand en los van de dealer. Een paar
          of beter en je deelt het dubbele uit; heb je niets, dan drink je er
          één. Hij geldt alleen als je straks meedoet.
        </div>
        <div className="klein zacht">Je hebt {ctx.slok(inzet)} op je hand staan</div>
        <SpelerBalk spelers={ctx.spelers} actief={Object.keys(s.ppInzetten)} />
      </div>
      <div className="onderaan" style={{ gap: 6 }}>
        <Bedragen bijTik={(n) => ctx.stuur('zetPp', { slokken: n })} />
        <GroteKnop
          kleur="grijs"
          bijTik={() => {
            tril(6)
            ctx.stuur('zetPp', { slokken: 0 })
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
  const inzet = s.inzetten[ctx.ik] ?? 1
  const pp = s.ppInzetten[ctx.ik] ?? 0
  const ppGoed = (waardering?.soort ?? 0) >= SOORT.paar

  return (
    <>
      <div className="midden" style={{ gap: 8 }}>
        <div className="kop-klein">Stap 3 · jouw kaarten</div>
        <KaartRij kaarten={hand} maat="groot" />
        {waardering && <div className="lint">{waardering.naam}</div>}
        {pp > 0 && (
          <div className="klein" style={{ color: ppGoed ? 'var(--groen)' : 'var(--rood)' }}>
            Pair Plus van {ctx.slok(pp)}:{' '}
            {ppGoed
              ? `${ctx.slok(pp * 2)} uitdelen, maar alleen als je meedoet`
              : 'misgelopen'}
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
              Passen · {ctx.slokKort(inzet)}
            </GroteKnop>
            <GroteKnop
              kleur="goud"
              enorm
              bijTik={() => {
                tril(12)
                ctx.stuur('kies', { mee: true })
              }}
            >
              Meedoen · {ctx.slokKort(inzet * MEE_FACTOR)}
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
              <span className="klein zacht">
                {' '}
                · {u.soort} · inzet {u.inzet}
              </span>
              {u.pp > 0 && (
                <span
                  className="klein"
                  style={{
                    color:
                      u.ppGoed === null
                        ? undefined
                        : u.ppGoed
                          ? 'var(--groen)'
                          : 'var(--rood)',
                  }}
                >
                  {' '}
                  · PP {u.pp}
                  {u.ppGoed === null ? ' vervallen' : ''}
                </span>
              )}
            </span>
            <span className="klein">
              {u.uitdelen > 0 && (
                <span style={{ color: 'var(--groen)' }}>+{ctx.slokKort(u.uitdelen)} </span>
              )}
              {u.drinken > 0 && (
                <span style={{ color: 'var(--rood)' }}>{ctx.slokKort(u.drinken)}</span>
              )}
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

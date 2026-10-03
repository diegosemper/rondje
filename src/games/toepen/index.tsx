import { husselen } from '../../engine/random'
import { volgende } from '../../engine/beurten'
import { kaartKort, type Kaart } from '../../engine/deck'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { KaartRij, Speelkaart } from '../../ui/Kaart'
import {
  magLeggen,
  mogelijk,
  rondeWinnaar,
  slagWinnaar,
  toepDeck,
  type Gelegd,
} from './regels'

/* ─────────────────────────────────────────────────────────────
   TOEPEN

   Vier kaarten, vier slagen, en de hele tijd de vraag of je nog meegaat.

   Je speelt om beurten een kaart. De hoogste van de gevraagde kleur pakt de
   slag; kleur bekennen is verplicht. Wie aan het eind de meeste slagen heeft,
   wint de ronde en deelt uit. De rest drinkt de inzet.

   HET SPEL ZIT IN HET TOEPEN. Voordat je een kaart legt mag je de inzet met
   één verhogen. Dan moet iedereen kiezen: meegaan voor het nieuwe bedrag, of
   er nu uitstappen en de oude inzet drinken. Met een beroerde hand toepen werkt
   dus prima, zolang niemand het ziet -- en dat is precies waarom dit spel in
   elke Nederlandse kroeg ligt.

   Let op de rangorde: de negen is de hoogste kaart en de tien de laagste. Dat
   hoort zo bij toepen en kost iedereen de eerste ronde een slok.
   ───────────────────────────────────────────────────────────── */

const RONDES = 4
const START_INZET = 1
/** Hoger dan dit mag de inzet niet worden. */
const MAX_INZET = 5

interface ToepenState {
  ronde: number
  fase: 'spelen' | 'toep' | 'uitslag'
  inzet: number
  /** wie er nog in deze ronde zit */
  actief: string[]
  /** wie er aan de beurt is om te leggen */
  beurt: string
  /** de kaarten van de lopende slag */
  tafel: Gelegd[]
  slagen: Record<string, number>
  laatsteSlag: string | null
  /** hoeveel slagen er al gespeeld zijn */
  slagNr: number

  /** loopt er een toep, en wie moet er nog antwoorden? */
  toep: { door: string; wachtOp: string[] } | null

  winnaar: string | null
  gegeven: boolean
  melding: string

  _geheim: { handen: Record<string, Kaart[]> }
  klaar: boolean
}

function deelUitRonde(s: ToepenState, ctx: SpelContext) {
  const deck = husselen(ctx.rng, toepDeck())
  s._geheim.handen = {}
  ctx.spelers.forEach((p, i) => {
    const hand = deck.slice(i * 4, i * 4 + 4)
    s._geheim.handen[p.uid] = hand
    ctx.zetPrive(p.uid, { hand })
  })
}

function nieuweRonde(s: ToepenState, ctx: SpelContext, beginner: string) {
  s.fase = 'spelen'
  s.inzet = START_INZET
  s.actief = ctx.spelers.map((p) => p.uid)
  s.beurt = s.actief.includes(beginner) ? beginner : s.actief[0]
  s.tafel = []
  s.slagen = {}
  for (const uid of s.actief) s.slagen[uid] = 0
  s.laatsteSlag = null
  s.slagNr = 0
  s.toep = null
  s.winnaar = null
  s.gegeven = false
  s.melding = ''
  deelUitRonde(s, ctx)
}

/** De volgende actieve speler na deze. */
function volgendeActief(s: ToepenState, na: string): string {
  return volgende(s.actief, na)
}

/**
 * De ronde afsluiten: wie de meeste slagen heeft wint, de rest drinkt de inzet.
 */
function sluitRonde(s: ToepenState, ctx: SpelContext) {
  s.fase = 'uitslag'
  s.toep = null
  s.winnaar = rondeWinnaar(s.slagen, s.actief, s.laatsteSlag)

  for (const uid of s.actief) {
    if (uid === s.winnaar) continue
    ctx.drink(uid, s.inzet, 'verloor de ronde')
  }
  if (s.winnaar) {
    ctx.log(`${ctx.naam(s.winnaar)} wint de ronde voor ${s.inzet}`)
  }
}

/**
 * Een kaart leggen, en daarna kijken of de slag vol is.
 *
 * Is de slag vol, dan pakt de hoogste van de gevraagde kleur hem en begint die
 * de volgende. Is het de laatste slag, dan is de ronde voorbij.
 */
function leg(s: ToepenState, ctx: SpelContext, uid: string, kaart: Kaart) {
  const hand = s._geheim.handen[uid] ?? []
  s._geheim.handen[uid] = hand.filter((k) => k.id !== kaart.id)
  ctx.zetPrive(uid, { hand: s._geheim.handen[uid] })
  s.tafel.push({ uid, kaart })
  s.melding = `${ctx.naam(uid)} legt ${kaartKort(kaart)}`

  if (s.tafel.length < s.actief.length) {
    s.beurt = volgendeActief(s, uid)
    return
  }

  const winnaar = slagWinnaar(s.tafel)!
  s.slagen[winnaar] = (s.slagen[winnaar] ?? 0) + 1
  s.laatsteSlag = winnaar
  s.slagNr++
  s.tafel = []
  s.beurt = winnaar
  s.melding = `${ctx.naam(winnaar)} pakt de slag`

  // Vier kaarten per hand, dus na vier slagen is het klaar. Heeft iemand geen
  // kaarten meer over, dan is het ook klaar -- dat kan als er mensen uitstapten.
  const over = s._geheim.handen[winnaar]?.length ?? 0
  if (s.slagNr >= 4 || over === 0) sluitRonde(s, ctx)
}

export const toepen: GameModule<ToepenState> = {
  id: 'toepen',
  naam: 'Toepen',
  uitleg: 'Vier kaarten, vier slagen. Verhoog de inzet of stap eruit.',
  regels: [
    'De hoogste kaart van de gevraagde kleur pakt de slag.',
    'Kleur bekennen is verplicht als je hem hebt.',
    'Toepen verhoogt de inzet; de rest gaat mee of stapt eruit.',
    'Let op: de 9 is de hoogste kaart en de 10 de laagste.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['kaarten', 'bluf', 'geheim'],
  privescherm: true,

  init(ctx) {
    const s: ToepenState = {
      ronde: 1,
      fase: 'spelen',
      inzet: START_INZET,
      actief: [],
      beurt: ctx.spelers[0].uid,
      tafel: [],
      slagen: {},
      laatsteSlag: null,
      slagNr: 0,
      toep: null,
      winnaar: null,
      gegeven: false,
      melding: '',
      _geheim: { handen: {} },
      klaar: false,
    }
    nieuweRonde(s, ctx, ctx.spelers[0].uid)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    /* ── Een kaart leggen ── */
    if (s.fase === 'spelen' && actie.type === 'leg') {
      if (actie.uid !== s.beurt) return
      const hand = s._geheim.handen[actie.uid] ?? []
      const id = String(actie.payload?.id ?? '')
      const kaart = hand.find((k) => k.id === id)
      if (!kaart) return
      if (!magLeggen(hand, s.tafel, kaart)) return
      leg(s, ctx, actie.uid, kaart)
      return
    }

    /* ── Toepen: de inzet omhoog ── */
    if (s.fase === 'spelen' && actie.type === 'toep') {
      if (actie.uid !== s.beurt) return
      if (s.inzet >= MAX_INZET) return
      // Alleen zinvol als er nog iemand anders in zit om mee te gaan.
      if (s.actief.length < 2) return

      /*
       * Alleen aan het begin van een slag, als er nog niets ligt.
       *
       * Midden in een slag toepen zou mogen in de kroeg, maar hier loopt het
       * stuk: wie dan uitstapt heeft al een kaart gelegd, en als die kaart de
       * eerste van de slag was verdwijnt de gevraagde kleur. Dan weet niemand
       * meer wat hij moet bekennen. Met deze grens kan dat niet gebeuren, en
       * rouleert het toepen gewoon met wie de slag opent.
       */
      if (s.tafel.length > 0) return

      s.fase = 'toep'
      s.toep = { door: actie.uid, wachtOp: s.actief.filter((u) => u !== actie.uid) }
      s.melding = `${ctx.naam(actie.uid)} toept naar ${s.inzet + 1}`
      return
    }

    if (s.fase === 'toep' && (actie.type === 'mee' || actie.type === 'weg')) {
      if (!s.toep) return
      if (!s.toep.wachtOp.includes(actie.uid)) return
      s.toep.wachtOp = s.toep.wachtOp.filter((u) => u !== actie.uid)

      if (actie.type === 'weg') {
        /*
         * Uitstappen kost de inzet van vóór de verhoging. Dat is het hele punt
         * van toepen: je koopt je af voor de oude prijs in plaats van mee te
         * gaan voor de nieuwe.
         */
        ctx.drink(actie.uid, s.inzet, 'stapte uit na een toep')
        s.actief = s.actief.filter((u) => u !== actie.uid)
        delete s.slagen[actie.uid]
        // Er ligt niets op tafel: toepen mag alleen bij een lege slag, dus zijn
        // kaarten kunnen gewoon weg zonder dat de slag stukgaat.
        ctx.zetPrive(actie.uid, { hand: [], uit: true })
        s._geheim.handen[actie.uid] = []
      }

      if (s.toep.wachtOp.length > 0) return

      // Iedereen heeft geantwoord.
      const door = s.toep.door
      s.inzet++
      s.toep = null

      if (s.actief.length <= 1) {
        // Alle anderen stapten uit: de toeper wint zonder te spelen.
        s.fase = 'uitslag'
        s.winnaar = s.actief[0] ?? door
        s.melding = 'Iedereen stapte eruit'
        ctx.log(`${ctx.naam(s.winnaar)} wint de ronde omdat de rest uitstapte`)
        return
      }

      s.fase = 'spelen'
      // De toeper is nog steeds aan de beurt: toepen is geen zet.
      s.beurt = s.actief.includes(door) ? door : s.actief[0]
      s.melding = `De inzet staat op ${s.inzet}`
      return
    }

    /* ── Na de ronde ── */
    if (s.fase === 'uitslag' && actie.type === 'geef') {
      if (actie.uid !== s.winnaar || s.gegeven) return
      const naar = String(actie.payload?.naar ?? '')
      if (!iedereen.includes(naar) || naar === actie.uid) return
      s.gegeven = true
      ctx.deelUit(actie.uid, naar, s.inzet, 'won de ronde')
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
      // De winnaar begint de volgende ronde.
      nieuweRonde(s, ctx, s.winnaar ?? ctx.spelers[0].uid)
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    const hand: Kaart[] = ctx.prive?.hand ?? []
    const ikUit = !s.actief.includes(ctx.ik)

    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Ronde {s.ronde}/{RONDES}
          </span>
          <span className="kop-klein" style={{ color: 'var(--goud)' }}>
            inzet {ctx.slokKort(s.inzet)}
          </span>
        </div>

        <Kaartje>
          <div className="balk">
            <span className="kop-klein">Op tafel</span>
            <span className="klein zacht">slag {Math.min(s.slagNr + 1, 4)}/4</span>
          </div>
          <div className="rij" style={{ justifyContent: 'center', marginTop: 6, gap: 6 }}>
            {s.tafel.length === 0 ? (
              <span className="klein zacht">nog niets gelegd</span>
            ) : (
              s.tafel.map((g) => (
                <div key={g.uid} style={{ textAlign: 'center' }}>
                  <Speelkaart kaart={g.kaart} maat="midden" />
                  <div className="klein zacht">{ctx.naam(g.uid)}</div>
                </div>
              ))
            )}
          </div>
          {s.melding && (
            <div className="klein zacht" style={{ textAlign: 'center', marginTop: 6 }}>
              {s.melding}
            </div>
          )}
        </Kaartje>

        <div className="rij" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {ctx.spelers.map((p) => (
            <span
              key={p.uid}
              className="klein"
              style={{
                opacity: s.actief.includes(p.uid) ? 1 : 0.35,
                color: p.uid === s.beurt && s.fase === 'spelen' ? 'var(--goud)' : undefined,
              }}
            >
              {p.emoji} {p.naam} {s.slagen[p.uid] ? `· ${s.slagen[p.uid]}` : ''}
            </span>
          ))}
        </div>

        {s.fase === 'toep' && <ToepVraag s={s} ctx={ctx} />}
        {s.fase === 'spelen' && (
          <Spelen s={s} ctx={ctx} hand={hand} ikUit={ikUit} />
        )}
        {s.fase === 'uitslag' && <Uitslag s={s} ctx={ctx} />}
      </>
    )
  },
}

function Spelen({
  s,
  ctx,
  hand,
  ikUit,
}: {
  s: ToepenState
  ctx: KijkContext
  hand: Kaart[]
  ikUit: boolean
}) {
  const mijnBeurt = s.beurt === ctx.ik && !ikUit
  const magSpelen = mogelijk(hand, s.tafel)

  if (ikUit) {
    return (
      <div className="onderaan">
        <Kaartje style={{ textAlign: 'center' }}>
          <span className="zacht">Je bent uit deze ronde. Kijken dus.</span>
        </Kaartje>
      </div>
    )
  }

  if (!mijnBeurt) {
    return (
      <>
        <div className="midden" style={{ gap: 8 }}>
          <div className="kop-klein">Jouw kaarten</div>
          <KaartRij kaarten={hand} maat="midden" />
        </div>
        <div className="onderaan">
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">{ctx.naam(s.beurt)} is aan de beurt…</span>
          </Kaartje>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="midden" style={{ gap: 6 }}>
        <div className="kop-klein">Jouw beurt</div>
        <div className="rij" style={{ justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          {hand.map((k) => {
            const mag = magSpelen.some((m) => m.id === k.id)
            return (
              <button
                key={k.id}
                onClick={() => {
                  if (!mag) return
                  tril(8)
                  ctx.stuur('leg', { id: k.id })
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  opacity: mag ? 1 : 0.3,
                }}
              >
                <Speelkaart kaart={k} maat="groot" />
              </button>
            )
          })}
        </div>
        {magSpelen.length < hand.length && (
          <div className="klein zacht">Je moet kleur bekennen</div>
        )}
      </div>

      <div className="onderaan">
        {s.inzet < MAX_INZET && s.actief.length > 1 ? (
          <GroteKnop kleur="rood" bijTik={() => ctx.stuur('toep')}>
            Toep! · inzet naar {ctx.slokKort(s.inzet + 1)}
          </GroteKnop>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">De inzet kan niet hoger</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

function ToepVraag({ s, ctx }: { s: ToepenState; ctx: KijkContext }) {
  const moetIk = s.toep?.wachtOp.includes(ctx.ik) ?? false

  return (
    <div className="onderaan" style={{ gap: 8 }}>
      <Kaartje style={{ textAlign: 'center', borderColor: 'var(--rood)' }}>
        <div className="kop-klein">{ctx.naam(s.toep!.door)} toept</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>
          {ctx.slok(s.inzet)} → {ctx.slok(s.inzet + 1)}
        </div>
      </Kaartje>

      {moetIk ? (
        <div className="rij">
          <GroteKnop
            kleur="grijs"
            enorm
            bijTik={() => {
              tril(8)
              ctx.stuur('weg')
            }}
          >
            Eruit · {ctx.slokKort(s.inzet)}
          </GroteKnop>
          <GroteKnop
            kleur="goud"
            enorm
            bijTik={() => {
              tril(10)
              ctx.stuur('mee')
            }}
          >
            Mee
          </GroteKnop>
        </div>
      ) : (
        <Kaartje style={{ textAlign: 'center' }}>
          <span className="zacht">
            Wachten op {s.toep!.wachtOp.map(ctx.naam).join(', ')}
          </span>
        </Kaartje>
      )}
    </div>
  )
}

function Uitslag({ s, ctx }: { s: ToepenState; ctx: KijkContext }) {
  const ikWon = s.winnaar === ctx.ik
  const laatste = s.ronde >= RONDES

  return (
    <>
      <div className="midden" style={{ gap: 8 }}>
        <div style={{ fontSize: 44 }}>🃏</div>
        <h2 style={{ textAlign: 'center' }}>
          {s.winnaar ? `${ctx.naam(s.winnaar)} wint de ronde` : 'Niemand wint'}
        </h2>
        <div className="klein zacht">De inzet was {ctx.slok(s.inzet)}</div>
        <SpelerBalk spelers={ctx.spelers} actief={s.winnaar ? [s.winnaar] : []} />
      </div>

      <div className="onderaan">
        {ikWon && !s.gegeven ? (
          <>
            <div className="kop-klein" style={{ textAlign: 'center' }}>
              Deel {ctx.slok(s.inzet)} uit
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

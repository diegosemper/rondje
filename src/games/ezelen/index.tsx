import { KLEUREN, nieuweStapel, type Kaart, type Stapel } from '../../engine/deck'
import { husselen } from '../../engine/random'
import { useHostKlok } from '../../engine/hooks'
import { startKlok, type Klok } from '../../engine/timer'
import type { Actie, GameModule, SpelContext } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   EZELEN

   Iedereen heeft vier kaarten. Elke ronde kiest iedereen tegelijk één kaart
   om naar links door te schuiven. Wie vier gelijke krijgt legt stilletjes zijn
   duim op tafel, en de rest moet dat zelf zien. Wie als laatste zijn duim
   neerlegt, drinkt.

   HET STAAT ALLEEN OP ZIJN EIGEN SCHERM. Dat is het hele spel: de app zegt
   tegen niemand anders dat er iemand zit te wachten. Er verschijnt geen alarm,
   er verandert geen kleur, de kaarten blijven gewoon doorgaan. Je moet het aan
   tafel opmerken, en dat lukt niet als je naar je telefoon zit te turen.

   Daarom loopt het duimenrondje ook naast het doorschuiven en niet erna: zou
   het spel stilvallen zodra er iemand duim legt, dan wisten de anderen het
   meteen.

   Wie te vroeg duim legt terwijl er nog niemand vier heeft, betaalt daarvoor.
   Zonder die straf zou je gewoon meteen je duim neer kunnen leggen en elke
   ronde winnen.

   Er wordt met opzet niet uit een gewoon dek gedeeld. Bij vier spelers gaan er
   zestien kaarten rond, en die veranderen nooit meer -- je schuift ze alleen
   door. Zaten er toevallig nergens vier gelijke tussen, dan kan niemand er ooit
   uit komen en zit je twintig keer te schuiven voor niets. Daarom wordt er per
   speler één waarde gekozen en gaan alle vier de vormen daarvan het spel in.
   Zo ligt er altijd voor iedereen een setje klaar; de vraag is alleen wie het
   het eerst bij elkaar heeft.
   ───────────────────────────────────────────────────────────── */

const HAND = 4
const RONDES = 3
/** Zo lang krijgt de tafel om het op te merken. */
const RACE_SEC = 8
const STRAF_LAATSTE = 3
/** Duim leggen terwijl er nog niets aan de hand is. */
const STRAF_VALSE_START = 2
const MAX_WISSELS = 20

interface EzelState {
  stapel: Stapel
  ronde: number
  fase: 'wisselen' | 'uitslag'

  _geheim: {
    handen: Record<string, Kaart[]>
    /** wat iedereen deze wissel doorschuift, tot ze allemaal binnen zijn */
    gekozen: Record<string, string>
  }

  /** wie er deze wissel al gekozen heeft — dit mag iedereen zien */
  klaar: string[]
  wissels: number

  /** wie als eerste vier gelijke had en zijn duim neerlegde */
  roeper: string | null
  klok: Klok | null
  /** wanneer ieders duim op tafel ging */
  getikt: Record<string, number>
  /** wie te vroeg was; die weten dat er niets liep */
  telaat: string[]
  verliezer: string | null

  afgelopen: boolean
}

/**
 * Bouwt het dek voor dit potje: per speler één waarde, in alle vier de vormen.
 *
 * Precies zoveel kaarten als er nodig zijn, geen kaart meer. Daarmee is er
 * altijd een oplossing -- iedereen zou in theorie vier gelijke kunnen krijgen
 * -- en dat is niet zo als je zomaar uit een vol dek deelt.
 */
function bouwDek(rng: () => number, aantalSpelers: number): Kaart[] {
  const waarden: number[] = []
  for (let w = 2; w <= 14; w++) waarden.push(w)

  const gekozen = husselen(rng, waarden).slice(0, aantalSpelers)

  const kaarten: Kaart[] = []
  for (const waarde of gekozen) {
    for (const kleur of KLEUREN) kaarten.push({ id: `${kleur}-${waarde}`, kleur, waarde })
  }
  return husselen(rng, kaarten)
}

function deelHanden(s: EzelState, ctx: SpelContext) {
  const dek = bouwDek(ctx.rng, ctx.spelers.length)
  ctx.spelers.forEach((p, i) => {
    const hand = dek.slice(i * HAND, i * HAND + HAND)
    s._geheim.handen[p.uid] = hand
    ctx.zetPrive(p.uid, { hand })
  })
}

function nieuweRonde(s: EzelState, ctx: SpelContext) {
  s.fase = 'wisselen'
  s._geheim.gekozen = {}
  s.klaar = []
  s.wissels = 0
  s.roeper = null
  s.klok = null
  s.getikt = {}
  s.telaat = []
  s.verliezer = null
  deelHanden(s, ctx)
}

function heeftVier(hand: Kaart[]): boolean {
  if (hand.length < HAND) return false
  return hand.every((k) => k.waarde === hand[0].waarde)
}

function rondAf(s: EzelState, ctx: SpelContext) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  s.fase = 'uitslag'
  s.klok = null

  // Wie zijn duim helemaal niet neerlegde heeft het simpelweg gemist. Zijn dat
  // er meerdere, dan drinken ze allemaal -- er is geen reden om er één uit te
  // kiezen die het net iets erger deed dan de rest.
  const gemist = volgorde.filter((uid) => s.getikt[uid] === undefined)
  if (gemist.length > 0) {
    s.verliezer = gemist[gemist.length - 1]
    for (const uid of gemist) ctx.drink(uid, STRAF_LAATSTE, 'had zijn duim er niet op')
    return
  }

  let traagste: string | null = null
  let traagsteTijd = -1
  for (const uid of volgorde) {
    const t = s.getikt[uid] ?? 0
    if (t > traagsteTijd) {
      traagsteTijd = t
      traagste = uid
    }
  }
  s.verliezer = traagste
  if (traagste) ctx.drink(traagste, STRAF_LAATSTE, 'was als laatste met zijn duim')
}

export const ezelen: GameModule<EzelState> = {
  id: 'ezelen',
  naam: 'Ezelen',
  uitleg: 'Schuif door tot je er vier gelijk hebt. Dan stil je duim op tafel.',
  regels: [
    'Iedereen heeft vier kaarten. Kies er één om door te schuiven.',
    'Vier gelijke? Leg stil je duim op tafel — zeg niets.',
    'Alleen jij ziet dat. De rest moet het aan tafel opmerken.',
    'Wie als laatste zijn duim neerlegt, drinkt.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['kaarten', 'reflex', 'chaos'],
  privescherm: true,

  init(ctx) {
    const s: EzelState = {
      stapel: nieuweStapel(ctx.rng),
      ronde: 1,
      fase: 'wisselen',
      _geheim: { handen: {}, gekozen: {} },
      klaar: [],
      wissels: 0,
      roeper: null,
      klok: null,
      getikt: {},
      telaat: [],
      verliezer: null,
      afgelopen: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'wisselen') {
      /* Een kaart kiezen om door te schuiven */
      if (actie.type === 'schuif') {
        const kaartId = String(actie.payload?.id ?? '')
        const hand = s._geheim.handen[actie.uid] ?? []
        if (!hand.some((k) => k.id === kaartId)) return

        s._geheim.gekozen[actie.uid] = kaartId
        if (!s.klaar.includes(actie.uid)) s.klaar.push(actie.uid)
        if (!volgorde.every((u) => s._geheim.gekozen[u])) return

        // Iedereen heeft gekozen: allemaal tegelijk doorschuiven naar links.
        const weg: Record<string, Kaart> = {}
        for (const uid of volgorde) {
          const hand2 = s._geheim.handen[uid] ?? []
          const idx = hand2.findIndex((k) => k.id === s._geheim.gekozen[uid])
          weg[uid] = hand2.splice(idx, 1)[0]
          s._geheim.handen[uid] = hand2
        }
        // Jouw kaart gaat naar de volgende in de kring, dus je krijgt er een
        // van de vorige. Iedereen houdt zo altijd precies vier kaarten.
        volgorde.forEach((uid, i) => {
          const vorige = volgorde[(i - 1 + volgorde.length) % volgorde.length]
          s._geheim.handen[uid].push(weg[vorige])
        })
        for (const uid of volgorde) ctx.zetPrive(uid, { hand: s._geheim.handen[uid] })

        s._geheim.gekozen = {}
        s.klaar = []
        s.wissels++

        // Niemand komt eruit? Dan houdt het een keer op. Loopt er een
        // duimenrondje, dan wachten we dat eerst af.
        if (s.wissels >= MAX_WISSELS && !s.roeper) {
          ctx.log('Twintig keer geschoven en niemand had vier gelijke')
          s.fase = 'uitslag'
          s.verliezer = null
        }
        return
      }

      /* Duim op tafel. Voor wie vier gelijke heeft begint het hiermee; voor de
         rest is dit het moment dat ze het doorhebben. Het doorschuiven gaat
         ondertussen gewoon door, want anders zou het stilvallen van het spel
         verraden dat er iets aan de hand is. */
      if (actie.type === 'duim') {
        if (s.getikt[actie.uid] !== undefined) return

        if (!s.roeper) {
          // Nog niemand met vier gelijke. Heb jij ze wel, dan begint het nu.
          if (heeftVier(s._geheim.handen[actie.uid] ?? [])) {
            s.roeper = actie.uid
            s.klok = startKlok(RACE_SEC, ctx.nu)
            s.getikt[actie.uid] = actie.ts
            return
          }
          // Te vroeg. Dat kost je, anders leg je gewoon meteen je duim neer.
          if (!s.telaat.includes(actie.uid)) s.telaat.push(actie.uid)
          ctx.drink(actie.uid, STRAF_VALSE_START, 'legde zijn duim neer voor niets')
          return
        }

        s.getikt[actie.uid] = actie.ts
        if (volgorde.every((u) => s.getikt[u] !== undefined)) rondAf(s, ctx)
        return
      }

      if (actie.type === 'sluit-race') {
        if (s.roeper) rondAf(s, ctx)
        return
      }
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.afgelopen = true
        ctx.wisPrive()
        ctx.klaar()
        return
      }
      s.ronde++
      nieuweRonde(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.afgelopen,

  View({ state: s, ctx }) {
    // Loopt er een duimenrondje, dan sluit de host het na RACE_SEC af.
    useHostKlok(ctx, s.fase === 'wisselen' && !!s.roeper, s.klok?.eind ?? 0, 'sluit-race')

    const hand: Kaart[] = ctx.prive?.hand ?? []
    const ikKlaar = s.klaar.includes(ctx.ik)
    const vier = heeftVier(hand)
    const ikDuim = s.getikt?.[ctx.ik] !== undefined
    const ikTelaat = (s.telaat ?? []).includes(ctx.ik)

    if (s.fase === 'uitslag') {
      const rij = ctx.spelers
        .map((p) => ({ p, t: s.getikt[p.uid] }))
        .sort((a, b) => (a.t ?? Infinity) - (b.t ?? Infinity))
      const start = s.getikt[s.roeper ?? ''] ?? 0

      return (
        <>
          <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
            <h2 style={{ textAlign: 'center' }}>
              {s.verliezer
                ? `${ctx.naam(s.verliezer)} was als laatste`
                : 'Niemand kreeg er vier'}
            </h2>
            {s.verliezer &&
              rij.map(({ p, t }, i) => (
                <div
                  key={p.uid}
                  className="kaartje balk"
                  style={{
                    borderColor: p.uid === s.verliezer ? 'var(--rood)' : undefined,
                    background: p.uid === s.verliezer ? 'var(--rood-donker)' : undefined,
                  }}
                >
                  <span>
                    {i + 1}. {p.emoji} <strong>{p.naam}</strong>
                    {p.uid === s.roeper && ' 🚨'}
                  </span>
                  <span className="klein zacht">
                    {t === undefined ? 'duim bleef liggen' : `+${Math.max(0, t - start)} ms`}
                  </span>
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

    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Ronde {s.ronde}/{RONDES}
          </span>
          <span className="kop-klein">wissel {s.wissels}</span>
        </div>

        <SpelerBalk spelers={ctx.spelers} actief={s.klaar} />

        <div className="midden" style={{ gap: 10 }}>
          <div className="kop-klein">
            {ikKlaar ? 'Gekozen — wachten op de rest' : 'Kies een kaart om door te schuiven'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {hand.map((k) => (
              <button
                key={k.id}
                disabled={ikKlaar}
                onClick={() => ctx.stuur('schuif', { id: k.id })}
                style={{
                  padding: 0,
                  borderRadius: 14,
                  opacity: ikKlaar ? 0.4 : 1,
                }}
              >
                <Speelkaart kaart={k} maat="midden" />
              </button>
            ))}
          </div>
          <div className="klein zacht">
            {s.klaar.length} van {ctx.spelers.length} gekozen · gaat naar de volgende
          </div>
        </div>

        <div className="onderaan">
          {/* Wat hier staat is alleen voor jou. Heeft iemand anders vier
              gelijke, dan verandert er op dit scherm helemaal niets -- dat is
              precies de bedoeling. */}
          {vier && !ikDuim && (
            <Kaartje style={{ textAlign: 'center', borderColor: 'var(--goud)' }}>
              <strong style={{ color: 'var(--goud)' }}>Je hebt ze alle vier</strong>
              <div className="klein zacht">
                Leg je duim op tafel. Zeg niets — ze moeten het zelf zien.
              </div>
            </Kaartje>
          )}

          <GroteKnop
            kleur={ikDuim ? 'leeg' : vier ? 'goud' : 'grijs'}
            enorm={vier && !ikDuim}
            uit={ikDuim}
            bijTik={() => {
              tril(30)
              ctx.stuur('duim')
            }}
          >
            {ikDuim ? '✓ Je duim ligt' : '✋ Duim op tafel'}
          </GroteKnop>

          <div className="klein zacht" style={{ textAlign: 'center' }}>
            {ikDuim
              ? `De laatste drinkt ${ctx.slok(STRAF_LAATSTE)}.`
              : ikTelaat
                ? 'Er lag nog niemands duim. Kijk naar de tafel, niet naar je scherm.'
                : `Zie je een duim liggen? Leg de jouwe erbij. Te vroeg kost ${ctx.slokKort(STRAF_VALSE_START)}.`}
          </div>
        </div>
      </>
    )
  },
}

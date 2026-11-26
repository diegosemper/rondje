import { berekenSlokken } from '../../engine/slokken'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   STEEN PAPIER SCHAAR

   Vijf rondes, en elke ronde zet de app je tegenover iemand anders. Winnen
   levert twee slokken op om uit te delen, maar je deelt ze pas na de vijfde
   ronde uit.

   ALLEEN MET EEN EVEN AANTAL. Anders blijft er elke ronde iemand over, en wie
   dat is zou de app moeten kiezen -- dan zit er altijd iemand een ronde te
   wachten zonder dat hij iets fout deed.

   De indeling is een rondgaand schema: één speler staat vast en de rest
   schuift elke ronde een plek door. Met zes spelers krijg je zo vijf keer een
   andere tegenstander, precies genoeg voor vijf rondes. Met vier zijn er maar
   drie combinaties, dus dan kom je er twee opnieuw tegen, en met twee speel je
   vijf keer dezelfde. Dat kan niet anders en dat is ook niet erg.

   HET VERDELEN GEBEURT BLIND EN TEGELIJK. Dat is de kern van het eind: wie zijn
   slokken als eerste zou moeten verdelen, loopt er tegenaan dat de rest daarna
   nog op hem kan mikken, en wie als laatste mag weet precies waar het nog niet
   pijn doet. Dus verdeelt iedereen in het geheim, en pas als de laatste klaar
   is komt in één keer in beeld wie wat moet drinken.

   Daarom staat er bij de uitslagen ook niets te lezen voordat alles binnen is:
   de verdelingen liggen tot dat moment in `_geheim` en worden niet eerder
   doorgegeven aan de slokkenteller.
   ───────────────────────────────────────────────────────────── */

const RONDES = 5
/** Wat een gewonnen ronde je oplevert om uit te delen. */
const WINST = 2

type Keuze = 'steen' | 'papier' | 'schaar'

const KEUZES: Keuze[] = ['steen', 'papier', 'schaar']
const TEKEN: Record<Keuze, string> = { steen: '✊', papier: '✋', schaar: '✌️' }
/** Wat deze keuze verslaat. */
const VERSLAAT: Record<Keuze, Keuze> = {
  steen: 'schaar',
  papier: 'steen',
  schaar: 'papier',
}

interface Duel {
  a: string
  b: string
  /** pas gevuld als er onthuld is */
  keuzeA: Keuze | null
  keuzeB: Keuze | null
  /** null bij gelijkspel */
  winnaar: string | null
  /** hoeveel keer dit duel gelijk eindigde */
  gelijk: number
}

interface SteenPapierState {
  ronde: number
  fase: 'kiezen' | 'duel' | 'verdelen' | 'uitslag'
  duels: Duel[]
  /** wie er deze ronde al gekozen heeft; de keuze zelf blijft geheim */
  gekozen: string[]
  /** hoeveel rondes iemand gewonnen heeft */
  gewonnen: Record<string, number>
  /** wie zijn slokken al verdeeld heeft */
  verdeeld: string[]
  /** pas na de laatste verdeling gevuld: wie hoeveel moet drinken */
  totalen: Record<string, number>
  _geheim: {
    keuzes: Record<string, Keuze>
    verdelingen: Record<string, Record<string, number>>
  }
  klaar: boolean
}

/**
 * De indeling van één ronde, volgens het rondgaande schema.
 *
 * Eén speler staat vast en de rest schuift door. Zo kom je bij een even aantal
 * spelers iedereen een keer tegen voordat er iemand terugkomt.
 */
export function parenVoor(volgorde: string[], ronde: number): [string, string][] {
  const n = volgorde.length
  if (n < 2 || n % 2 !== 0) return []
  const vast = volgorde[0]
  const rest = volgorde.slice(1)
  const k = (ronde - 1) % (n - 1)
  const gedraaid = [...rest.slice(k), ...rest.slice(0, k)]
  const rij = [vast, ...gedraaid]

  const paren: [string, string][] = []
  for (let i = 0; i < n / 2; i++) paren.push([rij[i], rij[n - 1 - i]])
  return paren
}

function nieuweRonde(s: SteenPapierState, ctx: SpelContext) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  s.fase = 'kiezen'
  s.gekozen = []
  s._geheim.keuzes = {}
  s.duels = parenVoor(volgorde, s.ronde).map(([a, b]) => ({
    a,
    b,
    keuzeA: null,
    keuzeB: null,
    winnaar: null,
    gelijk: 0,
  }))
}

/** Het duel waarin deze speler zit, als hij er nog in zit. */
function mijnDuel(s: SteenPapierState, uid: string): Duel | undefined {
  return s.duels.find((d) => d.a === uid || d.b === uid)
}

/** Wie er deze ronde nog moet kiezen. */
function moetNogKiezen(s: SteenPapierState): string[] {
  const uit: string[] = []
  for (const d of s.duels) {
    if (d.winnaar) continue
    if (!s.gekozen.includes(d.a)) uit.push(d.a)
    if (!s.gekozen.includes(d.b)) uit.push(d.b)
  }
  return uit
}

/**
 * Alles omdraaien.
 *
 * Pas als iedereen die nog moest kiezen gekozen heeft, want anders ziet wie
 * laat is eerst de uitslag van een ander duel en weet hij wat er al gevallen
 * is.
 */
function onthul(s: SteenPapierState, ctx: SpelContext) {
  for (const d of s.duels) {
    if (d.winnaar) continue
    const ka = s._geheim.keuzes[d.a]
    const kb = s._geheim.keuzes[d.b]
    if (!ka || !kb) continue

    d.keuzeA = ka
    d.keuzeB = kb

    if (ka === kb) {
      d.gelijk++
      d.winnaar = null
    } else if (VERSLAAT[ka] === kb) {
      d.winnaar = d.a
    } else {
      d.winnaar = d.b
    }

    if (d.winnaar) {
      s.gewonnen[d.winnaar] = (s.gewonnen[d.winnaar] ?? 0) + 1
      ctx.log(
        `${ctx.naam(d.winnaar)} wint van ${ctx.naam(d.winnaar === d.a ? d.b : d.a)}` +
          ` — ${TEKEN[ka]} tegen ${TEKEN[kb]}`,
      )
    }
  }
  s.fase = 'duel'
}

/** Begint het verdelen, en slaat iedereen over die niets te verdelen heeft. */
function startVerdelen(s: SteenPapierState, ctx: SpelContext) {
  s.fase = 'verdelen'
  s.verdeeld = ctx.spelers
    .filter((p) => (s.gewonnen[p.uid] ?? 0) === 0)
    .map((p) => p.uid)
}

/**
 * Alle verdelingen in één keer verwerken.
 *
 * Hier gaat het pas naar de slokkenteller. Zou elke verdeling meteen verwerkt
 * worden, dan ziet de tafel bij de eerste al oplopen hoeveel er valt en is het
 * geheim weg.
 */
function rekenAf(s: SteenPapierState, ctx: SpelContext) {
  const totalen: Record<string, number> = {}
  for (const [van, verdeling] of Object.entries(s._geheim.verdelingen)) {
    for (const [naar, aantal] of Object.entries(verdeling)) {
      if (aantal <= 0) continue
      ctx.deelUitPrecies(van, naar, aantal, 'steen papier schaar')
      totalen[naar] = (totalen[naar] ?? 0) + aantal
    }
  }
  s.totalen = totalen
  s.fase = 'uitslag'
}

export const steenpapier: GameModule<SteenPapierState> = {
  id: 'steenpapier',
  naam: 'Steen Papier Schaar',
  uitleg: 'Vijf rondes tegen steeds iemand anders. Op het eind verdeelt iedereen tegelijk.',
  regels: [
    'Vijf rondes, elke ronde tegen een andere tegenstander.',
    'Kies tegelijk steen, papier of schaar. Gelijk? Opnieuw.',
    'Elke gewonnen ronde is 2 slokken om uit te delen.',
    'Na de vijfde ronde verdeelt iedereen in het geheim, en dan pas zie je de uitslag.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['bluf', 'reflex'],
  privescherm: true,

  /*
   * Met een oneven aantal blijft er elke ronde iemand over. De app zou dan
   * moeten kiezen wie er een ronde niets doet, en daar is geen eerlijke keuze
   * voor.
   */
  extraEis: (aantal) =>
    aantal % 2 === 0 ? null : 'alleen met een even aantal spelers',

  init(ctx) {
    const s: SteenPapierState = {
      ronde: 1,
      fase: 'kiezen',
      duels: [],
      gekozen: [],
      gewonnen: {},
      verdeeld: [],
      totalen: {},
      _geheim: { keuzes: {}, verdelingen: {} },
      klaar: false,
    }
    for (const p of ctx.spelers) s.gewonnen[p.uid] = 0
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'kiezen' && actie.type === 'kies') {
      const keuze = String(actie.payload?.keuze ?? '') as Keuze
      if (!KEUZES.includes(keuze)) return
      if (!moetNogKiezen(s).includes(actie.uid)) return

      s._geheim.keuzes[actie.uid] = keuze
      s.gekozen.push(actie.uid)
      // Alleen jij ziet wat je koos, zodat je het niet kunt verklappen door je
      // scherm te laten zien en de ander het ook niet per ongeluk ziet.
      ctx.zetPrive(actie.uid, { keuze })

      if (moetNogKiezen(s).length > 0) return
      onthul(s, ctx)
      return
    }

    if (s.fase === 'duel' && actie.type === 'verder') {
      const open = s.duels.filter((d) => !d.winnaar)
      if (open.length > 0) {
        // Gelijkspel: alleen die duels doen het nog een keer.
        for (const d of open) {
          s.gekozen = s.gekozen.filter((u) => u !== d.a && u !== d.b)
          delete s._geheim.keuzes[d.a]
          delete s._geheim.keuzes[d.b]
          d.keuzeA = null
          d.keuzeB = null
        }
        ctx.wisPrive()
        s.fase = 'kiezen'
        return
      }

      if (s.ronde >= RONDES) {
        ctx.wisPrive()
        startVerdelen(s, ctx)
        return
      }
      s.ronde++
      ctx.wisPrive()
      nieuweRonde(s, ctx)
      return
    }

    if (s.fase === 'verdelen' && actie.type === 'verdeel') {
      if (s.verdeeld.includes(actie.uid)) return
      const gewonnen = s.gewonnen[actie.uid] ?? 0
      if (gewonnen <= 0) return

      const ruw = actie.payload?.verdeling
      if (!ruw || typeof ruw !== 'object') return

      /*
       * Wat er binnenkomt is een voorstel van een telefoon, dus hier wordt het
       * nagerekend: alleen bestaande spelers, niet aan zichzelf, en de som moet
       * precies kloppen met wat hij te verdelen had. Anders deelt iemand met
       * een aangepaste app meer uit dan hij verdiende.
       */
      const verwacht = berekenSlokken(gewonnen * WINST, ctx.zwaarte)
      const schoon: Record<string, number> = {}
      let som = 0
      for (const [naar, aantal] of Object.entries(ruw)) {
        const n = Number(aantal)
        if (!volgorde.includes(naar) || naar === actie.uid) return
        if (!Number.isFinite(n) || n < 0) return
        const afgerond = Math.round(n)
        if (afgerond === 0) continue
        schoon[naar] = afgerond
        som += afgerond
      }
      if (som !== verwacht) return

      s._geheim.verdelingen[actie.uid] = schoon
      s.verdeeld.push(actie.uid)

      if (s.verdeeld.length < ctx.spelers.length) return
      rekenAf(s, ctx)
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'klaar') {
      s.klaar = true
      ctx.klaar()
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    if (s.fase === 'verdelen') return <Verdelen s={s} ctx={ctx} />
    if (s.fase === 'uitslag') return <Uitslag s={s} ctx={ctx} />
    return <Spelen s={s} ctx={ctx} />
  },
}

function Spelen({ s, ctx }: { s: SteenPapierState; ctx: KijkContext }) {
  const duel = mijnDuel(s, ctx.ik)
  const tegen = duel ? (duel.a === ctx.ik ? duel.b : duel.a) : null
  const moetKiezen = s.fase === 'kiezen' && moetNogKiezen(s).includes(ctx.ik)
  const mijnKeuze: Keuze | undefined = ctx.prive?.keuze

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Ronde {s.ronde}/{RONDES}
        </span>
        <span className="kop-klein">
          {s.gewonnen[ctx.ik] ?? 0} gewonnen · {(s.gewonnen[ctx.ik] ?? 0) * WINST} uit te delen
        </span>
      </div>

      {s.fase === 'kiezen' ? (
        <>
          <div className="midden" style={{ gap: 10 }}>
            <div className="kop-klein">Jij tegen</div>
            <h1 style={{ textAlign: 'center' }}>{tegen ? ctx.naam(tegen) : '—'}</h1>
            {mijnKeuze ? (
              <>
                <div style={{ fontSize: 56 }}>{TEKEN[mijnKeuze]}</div>
                <div className="klein zacht">Je keuze staat vast</div>
              </>
            ) : (
              <div className="klein zacht">Kies tegelijk. Niemand ziet het van de ander.</div>
            )}
            <SpelerBalk spelers={ctx.spelers} actief={s.gekozen} />
          </div>

          <div className="onderaan">
            {moetKiezen ? (
              <div className="rij">
                {KEUZES.map((k) => (
                  <GroteKnop
                    key={k}
                    kleur="grijs"
                    enorm
                    bijTik={() => {
                      tril(8)
                      ctx.stuur('kies', { keuze: k })
                    }}
                  >
                    {TEKEN[k]}
                  </GroteKnop>
                ))}
              </div>
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">
                  {duel && duel.winnaar
                    ? 'Jouw duel is beslist. Wachten op de rest…'
                    : 'Wachten op de rest…'}
                </span>
              </Kaartje>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            {s.duels.map((d) => (
              <div
                key={d.a + d.b}
                className="kaartje"
                style={{
                  borderColor: d.winnaar
                    ? d.winnaar === ctx.ik
                      ? 'var(--groen)'
                      : undefined
                    : 'var(--goud)',
                }}
              >
                <div className="balk">
                  <span>
                    {ctx.naam(d.a)} {d.keuzeA ? TEKEN[d.keuzeA] : ''}
                  </span>
                  <span className="klein zacht">
                    {d.winnaar ? ctx.naam(d.winnaar) + ' wint' : 'gelijk'}
                  </span>
                  <span>
                    {d.keuzeB ? TEKEN[d.keuzeB] : ''} {ctx.naam(d.b)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="onderaan">
            {ctx.benIkHost ? (
              <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
                {s.duels.some((d) => !d.winnaar)
                  ? 'Gelijk — nog een keer'
                  : s.ronde >= RONDES
                    ? 'Naar het verdelen'
                    : 'Volgende ronde'}
              </GroteKnop>
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">Wachten op de host…</span>
              </Kaartje>
            )}
          </div>
        </>
      )}
    </>
  )
}

function Verdelen({ s, ctx }: { s: SteenPapierState; ctx: KijkContext }) {
  const gewonnen = s.gewonnen[ctx.ik] ?? 0
  const ikKlaar = s.verdeeld.includes(ctx.ik)

  return (
    <>
      <div className="balk">
        <span className="kop-klein">Verdelen</span>
        <span className="kop-klein">
          {s.verdeeld.length}/{ctx.spelers.length} klaar
        </span>
      </div>

      {ikKlaar ? (
        <>
          <div className="midden" style={{ gap: 10 }}>
            <div style={{ fontSize: 50 }}>🤫</div>
            <h2 style={{ textAlign: 'center' }}>
              {gewonnen === 0 ? 'Je won niets te verdelen' : 'Jouw verdeling staat vast'}
            </h2>
            <div className="klein zacht" style={{ textAlign: 'center', maxWidth: 320 }}>
              Niemand ziet iets tot de laatste klaar is. Daarna komt in één keer in
              beeld wie wat moet drinken.
            </div>
            <SpelerBalk spelers={ctx.spelers} actief={s.verdeeld} />
          </div>
        </>
      ) : (
        <div className="onderaan">
          <Verdeler
            key={ctx.ik}
            totaal={ctx.slokAantal(gewonnen * WINST)}
            ctx={ctx}
            titel={`Je won ${gewonnen}x — verdeel ${ctx.slok(gewonnen * WINST)}`}
            bijKlaar={(verdeling) => ctx.stuur('verdeel', { verdeling })}
          />
        </div>
      )}
    </>
  )
}

function Uitslag({ s, ctx }: { s: SteenPapierState; ctx: KijkContext }) {
  const rij = ctx.spelers
    .map((p) => ({ p, drinkt: s.totalen[p.uid] ?? 0, won: s.gewonnen[p.uid] ?? 0 }))
    .sort((a, b) => b.drinkt - a.drinkt)

  return (
    <>
      <div className="balk">
        <span className="kop-klein">Alles tegelijk</span>
        <span className="kop-klein">na {RONDES} rondes</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {rij.map(({ p, drinkt, won }) => (
          <div
            key={p.uid}
            className="kaartje balk"
            style={{ borderColor: drinkt > 0 ? 'var(--rood)' : 'var(--groen)' }}
          >
            <span>
              {p.emoji} <strong>{p.naam}</strong>
              <span className="klein zacht"> · {won}x gewonnen</span>
            </span>
            <span className="klein">
              {drinkt > 0 ? ctx.slokKort(drinkt) : '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="onderaan">
        {ctx.benIkHost ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('klaar')}>
            Klaar
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

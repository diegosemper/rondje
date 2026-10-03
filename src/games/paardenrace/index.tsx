import { KLEUREN, KLEUR_TEKEN, nieuweStapel, trek, type Kaart, type Kleur, type Stapel } from '../../engine/deck'
import { useHostKlok } from '../../engine/hooks'
import { startKlok, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { Speelkaart } from '../../ui/Kaart'

/* ─────────────────────────────────────────────────────────────
   PAARDENRACE

   De vier azen staan aan de start. De app draait kaart na kaart om, en bij
   elke kaart loopt de aas van die kleur een stap vooruit. Eerst boven is de
   winnaar.

   Voor de start zet iedereen slokken op een kleur. Zit je goed, dan deel je
   het dubbele uit; zit je ernaast, dan drink je je inzet.

   HET VENIJN ZIT IN DE TERUGSLAG. Naast de baan liggen kaarten dicht. Zodra
   álle azen een rij voorbij zijn, gaat die kaart open en moet die kleur een
   stap terug. Daardoor kan de leider alsnog instorten en is het tot het eind
   spannend -- zonder dat ding is het een rechte lijn en weet je na vier
   kaarten al hoe het afloopt.

   Er valt niets te kunnen aan dit spel en dat is met opzet. Het is het potje
   waarbij de hele tafel staat te schreeuwen naar een stapel kaarten.
   ───────────────────────────────────────────────────────────── */

const RACES = 3
/** Zoveel stappen tot de finish. */
const BAAN = 6
/** Hoeveel slokken je hoogstens mag inzetten. */
const MAX_INZET = 5
/** Tijd tussen twee kaarten. Lang genoeg om te zien wat er gebeurt. */
const KAART_MS = 1100
/** Even stil voordat de uitslag komt. */
const FINISH_MS = 1400

interface Inzet {
  kleur: Kleur
  slokken: number
}

interface PaardenraceState {
  stapel: Stapel
  race: number
  fase: 'inzetten' | 'rennen' | 'uitslag'
  inzetten: Record<string, Inzet>

  /** per kleur het aantal stappen vanaf de start */
  posities: Record<Kleur, number>
  /** de kaart die net omgedraaid is */
  laatste: Kaart | null
  /** de terugslagkaarten naast de baan, van onder naar boven */
  terugslag: Kaart[]
  /** hoeveel terugslagkaarten er al open zijn */
  open: number
  /** tekst bij wat er net gebeurde */
  melding: string

  klok: Klok | null
  winnaar: Kleur | null
  gegeven: string[]
  klaar: boolean
}

function legePosities(): Record<Kleur, number> {
  return { harten: 0, ruiten: 0, klaveren: 0, schoppen: 0 }
}

function nieuweRace(s: PaardenraceState, ctx: SpelContext) {
  s.fase = 'inzetten'
  s.inzetten = {}
  s.posities = legePosities()
  s.laatste = null
  s.open = 0
  s.melding = ''
  s.winnaar = null
  s.gegeven = []
  s.klok = null

  /*
   * De terugslagkaarten worden nu al getrokken maar blijven dicht. Ze gaan
   * eerst uit de stapel, zodat er straks geen kaart kan omdraaien die ook
   * naast de baan ligt -- dan zou één kaart twee keer meedoen.
   */
  s.terugslag = []
  for (let i = 0; i < BAAN - 1; i++) s.terugslag.push(trek(s.stapel, ctx.rng))
}

/** Verbergt de terugslagkaarten die nog dicht liggen. */
function zichtbareTerugslag(s: PaardenraceState): (Kaart | null)[] {
  return s.terugslag.map((k, i) => (i < s.open ? k : null))
}

/**
 * Eén kaart omdraaien, en daarna kijken of er een terugslag volgt.
 *
 * De volgorde doet ertoe: eerst vooruit, dan de terugslag. Andersom zou een
 * aas die net een rij bereikt in dezelfde tik weer teruggezet worden, en dan
 * lijkt het of de kaart niets deed.
 */
function volgendeKaart(s: PaardenraceState, ctx: SpelContext) {
  const kaart = trek(s.stapel, ctx.rng)
  s.laatste = kaart
  s.posities[kaart.kleur]++
  s.melding = `${KLEUR_TEKEN[kaart.kleur]} loopt naar ${s.posities[kaart.kleur]}`

  // Finish? Dan is het klaar, ook als er nog een terugslag open zou gaan.
  if (s.posities[kaart.kleur] >= BAAN) {
    s.winnaar = kaart.kleur
    s.fase = 'uitslag'
    s.klok = null
    rekenAf(s, ctx)
    return
  }

  // Is iedereen een rij voorbij? Dan gaat de volgende terugslagkaart open.
  const laagste = Math.min(...KLEUREN.map((k) => s.posities[k]))
  if (s.open < s.terugslag.length && laagste > s.open) {
    const terug = s.terugslag[s.open]
    s.open++
    if (s.posities[terug.kleur] > 0) s.posities[terug.kleur]--
    s.melding = `Terugslag! ${KLEUR_TEKEN[terug.kleur]} gaat een stap terug`
  }

  s.klok = startKlok(KAART_MS / 1000, ctx.nu)
}

function rekenAf(s: PaardenraceState, ctx: SpelContext) {
  const winnaar = s.winnaar!
  for (const p of ctx.spelers) {
    const inzet = s.inzetten[p.uid]
    if (!inzet) continue
    if (inzet.kleur === winnaar) continue
    ctx.drink(p.uid, inzet.slokken, `zette op ${KLEUR_TEKEN[inzet.kleur]}`)
  }
  const goed = ctx.spelers.filter((p) => s.inzetten[p.uid]?.kleur === winnaar)
  ctx.log(
    `${KLEUR_TEKEN[winnaar]} wint de race — ${goed.length === 0 ? 'niemand had erop gezet' : `${goed.map((p) => p.naam).join(', ')} wel`}`,
  )
}

export const paardenrace: GameModule<PaardenraceState> = {
  id: 'paardenrace',
  naam: 'Paardenrace',
  uitleg: 'Zet slokken op een kleur en kijk welke aas als eerste boven is.',
  regels: [
    'Zet slokken op een kleur voordat de race begint.',
    'Elke kaart laat de aas van die kleur een stap lopen.',
    'Terugslagkaarten naast de baan zetten een kleur weer terug.',
    'Goed gegokt? Deel het dubbele uit. Ernaast? Drink je inzet.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['kaarten', 'geluk', 'chaos'],
  privescherm: false,

  init(ctx) {
    const s: PaardenraceState = {
      stapel: nieuweStapel(ctx.rng),
      race: 1,
      fase: 'inzetten',
      inzetten: {},
      posities: legePosities(),
      laatste: null,
      terugslag: [],
      open: 0,
      melding: '',
      klok: null,
      winnaar: null,
      gegeven: [],
      klaar: false,
    }
    nieuweRace(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'inzetten' && actie.type === 'zet') {
      if (s.inzetten[actie.uid]) return
      const kleur = String(actie.payload?.kleur ?? '') as Kleur
      if (!KLEUREN.includes(kleur)) return
      const ruw = Number(actie.payload?.slokken)
      if (typeof actie.payload?.slokken !== 'number' || !Number.isFinite(ruw)) return
      const slokken = Math.max(1, Math.min(MAX_INZET, Math.round(ruw)))

      s.inzetten[actie.uid] = { kleur, slokken }
      if (!iedereen.every((u) => s.inzetten[u])) return

      s.fase = 'rennen'
      s.melding = 'En ze zijn weg!'
      s.klok = startKlok(KAART_MS / 1000, ctx.nu)
      return
    }

    // De host tikt de klok aan; hier wordt er één kaart omgedraaid.
    if (s.fase === 'rennen' && actie.type === 'tik') {
      if (actie.uid !== ctx.spelers[0].uid && !s.klok) return
      volgendeKaart(s, ctx)
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'geef') {
      const inzet = s.inzetten[actie.uid]
      if (!inzet || inzet.kleur !== s.winnaar) return
      if (s.gegeven.includes(actie.uid)) return
      const naar = String(actie.payload?.naar ?? '')
      if (!iedereen.includes(naar) || naar === actie.uid) return

      s.gegeven.push(actie.uid)
      ctx.deelUit(actie.uid, naar, inzet.slokken * 2, 'gokte op de winnaar')
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      if (s.race >= RACES) {
        s.klaar = true
        ctx.klaar()
        return
      }
      s.race++
      nieuweRace(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.klaar,

  /*
   * De race zelf hoeft niet te wachten op de drinkpauze: er valt pas te
   * drinken als er een winnaar is, en dan ligt het spel toch al stil.
   */
  drinkVertraging: () => FINISH_MS,

  View({ state: s, ctx }) {
    useHostKlok(ctx, s.fase === 'rennen', s.klok?.eind ?? 0, 'tik')

    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Race {s.race}/{RACES}
          </span>
          <span className="kop-klein">
            {s.fase === 'inzetten'
              ? `${Object.keys(s.inzetten).length}/${ctx.spelers.length} ingezet`
              : s.melding}
          </span>
        </div>

        <Baan s={s} ctx={ctx} />

        {s.fase === 'inzetten' && <Inzetten s={s} ctx={ctx} />}
        {s.fase === 'rennen' && <Rennen s={s} />}
        {s.fase === 'uitslag' && <Uitslag s={s} ctx={ctx} />}
      </>
    )
  },
}

/** De baan: vier rijen met een aas die opschuift, en de terugslagkaarten. */
function Baan({ s, ctx }: { s: PaardenraceState; ctx: KijkContext }) {
  const terug = zichtbareTerugslag(s)
  const inzetTellen: Record<string, string[]> = {}
  for (const p of ctx.spelers) {
    const inzet = s.inzetten[p.uid]
    if (!inzet) continue
    inzetTellen[inzet.kleur] = [...(inzetTellen[inzet.kleur] ?? []), p.emoji]
  }

  return (
    <Kaartje>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {KLEUREN.map((kleur) => {
          const positie = s.posities[kleur]
          const wint = s.winnaar === kleur
          return (
            <div key={kleur} className="balk" style={{ gap: 6 }}>
              <span
                style={{
                  width: 54,
                  fontSize: 20,
                  color: kleur === 'harten' || kleur === 'ruiten' ? 'var(--rood)' : undefined,
                  fontWeight: 700,
                }}
              >
                {KLEUR_TEKEN[kleur]}
                <span className="klein zacht"> {inzetTellen[kleur]?.join('') ?? ''}</span>
              </span>
              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${BAAN + 1}, 1fr)`,
                  alignItems: 'center',
                }}
              >
                {Array.from({ length: BAAN + 1 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      textAlign: 'center',
                      fontSize: 17,
                      opacity: i === positie ? 1 : 0.22,
                    }}
                  >
                    {i === positie ? (wint ? '🏆' : '🐴') : '·'}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        <div className="balk" style={{ gap: 6, marginTop: 2 }}>
          <span className="klein zacht" style={{ width: 54 }}>
            terug
          </span>
          <div style={{ flex: 1, display: 'flex', gap: 4, justifyContent: 'flex-start' }}>
            {terug.map((k, i) => (
              <Speelkaart key={i} kaart={k} maat="klein" dicht={k === null} />
            ))}
          </div>
        </div>
      </div>
    </Kaartje>
  )
}

function Inzetten({ s, ctx }: { s: PaardenraceState; ctx: KijkContext }) {
  const mijn = s.inzetten[ctx.ik]

  if (mijn) {
    return (
      <div className="onderaan">
        <Kaartje style={{ textAlign: 'center' }}>
          <span className="zacht">
            Je zet {ctx.slok(mijn.slokken)} op {KLEUR_TEKEN[mijn.kleur]} — wachten op de rest…
          </span>
        </Kaartje>
      </div>
    )
  }

  return (
    <>
      <div className="midden" style={{ gap: 6 }}>
        <div className="kop-klein">Op welke kleur, en voor hoeveel?</div>
        <SpelerBalk spelers={ctx.spelers} actief={Object.keys(s.inzetten)} />
      </div>
      <div className="onderaan" style={{ gap: 6 }}>
        {KLEUREN.map((kleur) => (
          <div key={kleur} className="rij" style={{ gap: 4, alignItems: 'center' }}>
            <span
              style={{
                width: 34,
                fontSize: 22,
                textAlign: 'center',
                color: kleur === 'harten' || kleur === 'ruiten' ? 'var(--rood)' : undefined,
              }}
            >
              {KLEUR_TEKEN[kleur]}
            </span>
            {Array.from({ length: MAX_INZET }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className="knop klein"
                style={{ flex: 1 }}
                onClick={() => {
                  tril(8)
                  ctx.stuur('zet', { kleur, slokken: n })
                }}
              >
                {n}
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

function Rennen({ s }: { s: PaardenraceState }) {
  return (
    <div className="midden" style={{ gap: 10 }}>
      <Speelkaart kaart={s.laatste} maat="groot" dicht={!s.laatste} />
      <div className="klein zacht">{s.melding}</div>
    </div>
  )
}

function Uitslag({ s, ctx }: { s: PaardenraceState; ctx: KijkContext }) {
  const mijn = s.inzetten[ctx.ik]
  const ikGoed = !!mijn && mijn.kleur === s.winnaar
  const magGeven = ikGoed && !s.gegeven.includes(ctx.ik)
  const laatste = s.race >= RACES

  return (
    <>
      <div className="midden" style={{ gap: 8 }}>
        <div style={{ fontSize: 46 }}>🏁</div>
        <h2>
          {KLEUR_TEKEN[s.winnaar!]} wint
        </h2>
        <div className="klein zacht">
          {ikGoed ? `Je had het goed — ${ctx.slok(mijn!.slokken * 2)} uitdelen` : 'Volgende keer beter'}
        </div>
      </div>

      <div className="onderaan">
        {magGeven ? (
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
        ) : ctx.benIkHost ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
            {laatste ? 'Klaar' : 'Volgende race'}
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

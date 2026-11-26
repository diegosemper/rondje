import { tussen } from '../../engine/random'
import { volgende } from '../../engine/beurten'
import { berekenSlokken } from '../../engine/slokken'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   DE LIFT

   Eén speler stapt in en kiest elke verdieping opnieuw: nog een stuk omhoog,
   of eruit. Elke verdieping die je haalt gaat in je pot. Stap je uit, dan deel
   je die pot uit. Klapt de lift, dan drink je hem zelf.

   De app kiest in het geheim op welke verdieping het misgaat. Niemand weet dat,
   en daar zit het hele spel: hoe hoger je komt, hoe meer er in de pot zit en
   hoe kleiner de kans dat de volgende verdieping er nog bij zit.

   DIE KANS LOOPT HARD OP, EN DAT IS DE BEDOELING. Sta je op de eerste, dan is
   de kans op een klap bij de volgende één op tien. Sta je op de negende, dan is
   het de helft. Precies daarom is uitstappen op acht met negen slokken in de
   pot een echte keuze.

   OVER DE TIENDE VERDIEPING. De opdracht zei dat de klap tussen 2 en 10 valt en
   dat je op de tiende automatisch uitstapt. Die twee gaan niet samen: ligt de
   klap altijd op of onder tien, dan haal je de tiende nooit en kan die regel
   nooit gebeuren. De klap valt hier daarom tussen 2 en 11, waarbij elf
   betekent dat de lift het helemaal houdt. "Pas bij de tiende" kan nog steeds,
   en de top is nu een prijs die je één op de tien keer haalt.

   De eerste verdieping is altijd veilig -- de klap begint bij twee -- dus daar
   begin je met één slok in de pot. Anders zou je kunnen uitstappen met een pot
   van nul, en dat is geen keuze maar een knop die niets doet.
   ───────────────────────────────────────────────────────────── */

const RONDES = 2
/** Hoogste verdieping; daar stapt de lift je automatisch uit. */
const TOP = 10
/** De laagste en hoogste uitkomst voor de geheime klap. Elf is "hij houdt het". */
const KLAP_LAAG = 2
const KLAP_HOOG = TOP + 1

interface LiftState {
  ronde: number
  beurt: string
  /** wie deze ronde al in de lift heeft gestaan */
  gedaan: string[]
  fase: 'rijden' | 'uit' | 'klap' | 'top'
  /** op welke verdieping de huidige speler staat */
  verdieping: number
  /** wat hij tot nu toe heeft verdiend, in ruwe slokken */
  pot: number
  /** wat er net gebeurde */
  laatste: { uid: string; verdieping: number; pot: number; klap: number } | null
  _geheim: { klap: number }
  klaar: boolean
}

/**
 * Wat een verdieping oplevert.
 *
 * Oplopend, zodat de pot sneller groeit dan de kans op een klap -- anders was
 * doorgaan altijd dom en stapte iedereen op de eerste uit.
 */
export function waarde(verdieping: number): number {
  if (verdieping <= 3) return 1
  if (verdieping <= 6) return 2
  return 3
}

/** De pot als je tot en met deze verdieping komt. */
export function potTot(verdieping: number): number {
  let som = 0
  for (let v = 1; v <= verdieping; v++) som += waarde(v)
  return som
}

function nieuweRit(s: LiftState, ctx: SpelContext, wie: string) {
  s.beurt = wie
  s.fase = 'rijden'
  // De eerste verdieping is altijd veilig, dus die zit er meteen in.
  s.verdieping = 1
  s.pot = waarde(1)
  s._geheim.klap = tussen(ctx.rng, KLAP_LAAG, KLAP_HOOG)
}

/** Naar de volgende speler, of naar de volgende ronde. */
function volgendeRit(s: LiftState, ctx: SpelContext) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  if (!s.gedaan.includes(s.beurt)) s.gedaan.push(s.beurt)

  const over = volgorde.filter((u) => !s.gedaan.includes(u))
  if (over.length > 0) {
    nieuweRit(s, ctx, volgende(volgorde, s.beurt))
    return
  }

  if (s.ronde >= RONDES) {
    s.klaar = true
    ctx.klaar()
    return
  }
  s.ronde++
  s.gedaan = []
  nieuweRit(s, ctx, volgende(volgorde, s.beurt))
}

export const lift: GameModule<LiftState> = {
  id: 'lift',
  naam: 'De Lift',
  uitleg: 'Nog een verdieping omhoog, of eruit met je pot? Niemand weet waar hij klapt.',
  regels: [
    'Elke verdieping die je haalt gaat in je pot: 1, dan 2, dan 3 per stuk.',
    'Uitstappen betekent je pot uitdelen aan de rest.',
    'Klapt de lift, dan drink je je hele pot zelf.',
    'De app kiest in het geheim waar het misgaat — ergens tussen 2 en de top.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['geluk', 'bluf'],
  privescherm: false,

  init(ctx) {
    const s: LiftState = {
      ronde: 1,
      beurt: ctx.spelers[0].uid,
      gedaan: [],
      fase: 'rijden',
      verdieping: 1,
      pot: 0,
      laatste: null,
      _geheim: { klap: 0 },
      klaar: false,
    }
    nieuweRit(s, ctx, ctx.spelers[0].uid)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    /* ── Nog een verdieping omhoog ── */
    if (s.fase === 'rijden' && actie.type === 'omhoog') {
      if (actie.uid !== s.beurt) return

      const volgend = s.verdieping + 1

      if (volgend >= s._geheim.klap) {
        /*
         * Klap. De verdieping waar het misgaat levert niets op, dus hij drinkt
         * de pot die hij al had -- precies wat hij had kunnen uitdelen als hij
         * er een stap eerder uit was gestapt.
         */
        s.laatste = {
          uid: actie.uid,
          verdieping: volgend,
          pot: s.pot,
          klap: s._geheim.klap,
        }
        ctx.drink(actie.uid, s.pot, `de lift klapte op ${volgend}`)
        ctx.log(`${ctx.naam(actie.uid)} klapte op verdieping ${volgend} met ${s.pot} in de pot`)
        s.fase = 'klap'
        return
      }

      s.verdieping = volgend
      s.pot += waarde(volgend)

      if (s.verdieping >= TOP) {
        // De top: de lift zet je eruit, met pot en al.
        s.laatste = { uid: actie.uid, verdieping: s.verdieping, pot: s.pot, klap: s._geheim.klap }
        s.fase = 'top'
        ctx.log(`${ctx.naam(actie.uid)} haalde de top met ${s.pot} in de pot`)
      }
      return
    }

    /* ── Eruit stappen ── */
    if (s.fase === 'rijden' && actie.type === 'uit') {
      if (actie.uid !== s.beurt) return
      s.laatste = { uid: actie.uid, verdieping: s.verdieping, pot: s.pot, klap: s._geheim.klap }
      s.fase = 'uit'
      return
    }

    /* ── De pot verdelen ── */
    if ((s.fase === 'uit' || s.fase === 'top') && actie.type === 'verdeel') {
      if (actie.uid !== s.beurt) return

      const ruw = actie.payload?.verdeling
      if (!ruw || typeof ruw !== 'object') return

      /*
       * Nagerekend, want dit komt van een telefoon: alleen bestaande spelers,
       * niet aan zichzelf, en de som moet precies de pot zijn -- omgerekend naar
       * de zwaarte-instelling, want zo ziet de speler hem op zijn scherm.
       */
      const verwacht = berekenSlokken(s.pot, ctx.zwaarte)
      let som = 0
      const schoon: Record<string, number> = {}
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

      for (const [naar, aantal] of Object.entries(schoon)) {
        ctx.deelUitPrecies(actie.uid, naar, aantal, `stapte uit op ${s.verdieping}`)
      }
      volgendeRit(s, ctx)
      return
    }

    /* ── Verder na een klap ── */
    if (s.fase === 'klap' && actie.type === 'verder') {
      volgendeRit(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    const mijnBeurt = s.beurt === ctx.ik

    if (s.fase === 'klap' && s.laatste) {
      const l = s.laatste
      return (
        <>
          <Kop s={s} ctx={ctx} />
          <div className="midden" style={{ gap: 10 }}>
            <div style={{ fontSize: 56 }}>💥</div>
            <h1 style={{ textAlign: 'center' }}>Verdieping {l.verdieping}</h1>
            <div className="klein zacht" style={{ textAlign: 'center' }}>
              De lift klapte. {ctx.naam(l.uid)} drinkt de hele pot.
            </div>
            <Kaartje style={{ textAlign: 'center', borderColor: 'var(--rood)' }}>
              <strong>{ctx.slok(l.pot)}</strong>
              <div className="klein zacht" style={{ marginTop: 3 }}>
                Eén verdieping eerder uitstappen had die pot opgeleverd
              </div>
            </Kaartje>
          </div>
          <div className="onderaan">
            {ctx.benIkHost || mijnBeurt ? (
              <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
                Volgende
              </GroteKnop>
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">Wachten…</span>
              </Kaartje>
            )}
          </div>
        </>
      )
    }

    if ((s.fase === 'uit' || s.fase === 'top') && s.laatste) {
      const l = s.laatste
      return (
        <>
          <Kop s={s} ctx={ctx} />
          <div className="midden" style={{ gap: 8 }}>
            <div style={{ fontSize: 50 }}>{s.fase === 'top' ? '🏆' : '🚪'}</div>
            <h2 style={{ textAlign: 'center' }}>
              {s.fase === 'top'
                ? `${ctx.naam(l.uid)} haalde de top`
                : `${ctx.naam(l.uid)} stapte uit op ${l.verdieping}`}
            </h2>
            <div className="klein zacht">
              {s.fase === 'top' ? 'De lift hield het helemaal.' : `De klap zat op ${l.klap}.`}
            </div>
          </div>
          <div className="onderaan">
            {mijnBeurt ? (
              <Verdeler
                key={`${s.ronde}-${l.uid}-${l.verdieping}`}
                totaal={ctx.slokAantal(s.pot)}
                ctx={ctx}
                titel={`Verdeel je pot van ${ctx.slok(s.pot)}`}
                bijKlaar={(verdeling) => ctx.stuur('verdeel', { verdeling })}
              />
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">
                  {ctx.naam(l.uid)} verdeelt {ctx.slok(s.pot)}…
                </span>
              </Kaartje>
            )}
          </div>
        </>
      )
    }

    /* ── Rijden ── */
    const volgendeWaarde = waarde(s.verdieping + 1)
    return (
      <>
        <Kop s={s} ctx={ctx} />

        <div className="midden" style={{ gap: 6 }}>
          <div className="kop-klein">verdieping</div>
          <div className="reusachtig" style={{ color: 'var(--goud)' }}>
            {s.verdieping}
          </div>
          <div className="lint">pot: {ctx.slok(s.pot)}</div>
          <div className="klein zacht" style={{ textAlign: 'center', maxWidth: 300 }}>
            {mijnBeurt
              ? `Nog een verdieping is ${ctx.slok(volgendeWaarde)} erbij.`
              : `${ctx.naam(s.beurt)} staat in de lift.`}
          </div>
          <SpelerBalk spelers={ctx.spelers} actief={[s.beurt]} />
        </div>

        <div className="onderaan">
          {mijnBeurt ? (
            <div className="rij">
              <GroteKnop
                kleur="grijs"
                enorm
                bijTik={() => {
                  tril(8)
                  ctx.stuur('uit')
                }}
              >
                Eruit · {ctx.slokKort(s.pot)}
              </GroteKnop>
              <GroteKnop
                kleur="goud"
                enorm
                bijTik={() => {
                  tril(10)
                  ctx.stuur('omhoog')
                }}
              >
                Omhoog
              </GroteKnop>
            </div>
          ) : (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">Kijken of hij durft…</span>
            </Kaartje>
          )}
        </div>
      </>
    )
  },
}

function Kop({ s, ctx }: { s: LiftState; ctx: KijkContext }) {
  return (
    <div className="balk">
      <span className="kop-klein">
        Ronde {s.ronde}/{RONDES}
      </span>
      <span className="kop-klein">
        {s.gedaan.length}/{ctx.spelers.length} geweest
      </span>
    </div>
  )
}

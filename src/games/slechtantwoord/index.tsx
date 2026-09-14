import { useEffect, useState } from 'react'
import { husselen } from '../../engine/random'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { ANTWOORDEN, ZINNEN, JOKER, JOKERS, JOKER_MAX } from './kaarten'

/* ─────────────────────────────────────────────────────────────
   SLECHT ANTWOORD

   Er staat een zin met een gat erin. Iedereen kiest uit zijn eigen hand het
   antwoord dat er het beste — of het ergste — in past. Alles komt anoniem in
   beeld en de jury van die ronde kiest de winnaar.

   De jury rouleert, en wie jury is speelt zelf niet mee. Dat is met opzet:
   iemand moet kiezen, en die keuze is per definitie smaak. Laat je de hele
   groep stemmen, dan wint elke ronde de veiligste grap, en juist daar gaat
   dit spel niet over.

   Je hand blijft de hele pot van jou en wordt na elke ronde aangevuld. Dat
   betekent dat je een goede kaart kunt bewaren voor een betere zin, en dat is
   het enige stukje tactiek dat erin zit.

   Wat wel en niet naar de andere telefoons gaat: je hand staat in `_geheim`,
   want anders weet iedereen wat jij kunt spelen. De ingezette kaarten staan
   publiek maar zonder naam — de koppeling kaart naar speler blijft bij de
   host tot de jury gekozen heeft.
   ───────────────────────────────────────────────────────────── */

const RONDES = 10
const HAND = 6
/** Wat de winnaar van een ronde mag uitdelen. */
const WINST_UITDELEN = 3

interface Inzet {
  /** waar de jury op tikt; zegt niets over wie het was */
  id: string
  tekst: string
}

interface SlechtState {
  fase: 'kiezen' | 'jureren' | 'uitslag'
  ronde: number
  zin: string
  jury: string

  /** wie er al een kaart gelegd heeft */
  gelegd: string[]
  /** de ingezette kaarten, geschud en zonder naam */
  inzetten: Inzet[]

  _geheim: {
    handen: Record<string, string[]>
    /** kaart-id naar speler */
    van: Record<string, string>
    /** de stapel waar handen uit aangevuld worden */
    stapel: string[]
    /** de zinnen van dit potje, zodat er geen twee keer dezelfde langskomt */
    zinnen: string[]
    teller: number
  }

  laatste: { tekst: string; winnaar: string } | null
  magUitdelen: boolean
  klaar: boolean
}

/**
 * Het dek voor dit potje: zo veel kaarten als er hooguit doorheen gaan.
 *
 * Precies genoeg pakken en niet de hele lijst is het hele punt. Wat je pakt
 * telt als gehad, dus zou ik hier alle antwoorden opvragen, dan was de lijst na
 * één potje op en begon het geheugen meteen weer overnieuw — dan zie je alsnog
 * elke avond dezelfde kaarten.
 *
 * Iedereen kan hoogstens een volle hand plus één kaart per ronde verspelen. Er
 * gaat een marge overheen voor wie later aanschuift.
 */
function dekGrootte(ctx: SpelContext): number {
  return Math.min(ANTWOORDEN.length, (ctx.spelers.length + 1) * (HAND + RONDES))
}

/**
 * De jokers erdoorheen schudden.
 *
 * Ze gaan in het dek en niet in een vaste hand: zo weet je nooit wanneer je er
 * een krijgt, en dat is leuker dan iedereen aan het begin één geven.
 */
function maakDek(ctx: SpelContext): string[] {
  const kaarten = ctx.vers('slechtantwoord-antwoorden', ANTWOORDEN, dekGrootte(ctx))
  const metJokers = [...kaarten, ...Array.from({ length: JOKERS }, () => JOKER)]
  return husselen(ctx.rng, metJokers)
}

/** Vult iedereen aan tot een volle hand en stuurt die naar zijn eigen telefoon. */
function vulHanden(s: SlechtState, ctx: SpelContext) {
  for (const p of ctx.spelers) {
    const hand = s._geheim.handen[p.uid] ?? []
    while (hand.length < HAND) {
      // Stapel op? Dan een nieuw dek. Dat hoort niet te gebeuren -- het dek is
      // op de maximale afname berekend -- maar iemand die halverwege aanschuift
      // eet er alsnog een hand uit, en een lege stapel zou het spel laten hangen.
      if (s._geheim.stapel.length === 0) {
        s._geheim.stapel = maakDek(ctx)
      }
      hand.push(s._geheim.stapel.pop()!)
    }
    s._geheim.handen[p.uid] = hand
    ctx.zetPrive(p.uid, { hand })
  }
}

function nieuweRonde(s: SlechtState, ctx: SpelContext) {
  s.fase = 'kiezen'
  s.zin = s._geheim.zinnen[(s.ronde - 1) % s._geheim.zinnen.length]
  s.gelegd = []
  s.inzetten = []
  s._geheim.van = {}
  s.laatste = null
  s.magUitdelen = false
  vulHanden(s, ctx)
}

export const slechtantwoord: GameModule<SlechtState> = {
  id: 'slechtantwoord',
  naam: 'Slecht Antwoord',
  uitleg: 'Vul het gat in de zin met je smerigste kaart. De jury kiest.',
  regels: [
    'Er staat een zin met een gat erin.',
    'Kies uit je hand het antwoord dat er het beste in past.',
    'Alles komt anoniem in beeld; de jury kiest de winnaar.',
    'De winnaar deelt uit. De jury rouleert elke ronde.',
    'Trek je een 🃏, dan vul je zelf iets in.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'lang',
  tags: ['praten', 'geheim'],
  privescherm: true,

  init(ctx) {
    const s: SlechtState = {
      fase: 'kiezen',
      ronde: 1,
      zin: '',
      jury: ctx.spelers[0].uid,
      gelegd: [],
      inzetten: [],
      _geheim: {
        handen: {},
        van: {},
        stapel: [],
        // Zinnen die deze lobby nog niet gehad heeft. Met een gewone greep uit
        // zestig zie je na drie potjes de helft terug, en een zin die je al
        // kent is meteen een stuk minder leuk.
        zinnen: ctx.vers('slechtantwoord-zinnen', ZINNEN, RONDES),
        teller: 0,
      },
      laatste: null,
      magUitdelen: false,
      klaar: false,
    }

    s.zin = s._geheim.zinnen[0]
    s._geheim.stapel = maakDek(ctx)
    vulHanden(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)
    const spelers = iedereen.filter((u) => u !== s.jury)

    if (s.fase === 'kiezen' && actie.type === 'leg') {
      if (actie.uid === s.jury) return
      if (s.gelegd.includes(actie.uid)) return

      const kaart = String(actie.payload?.kaart ?? '')
      const hand = s._geheim.handen[actie.uid] ?? []
      const i = hand.indexOf(kaart)
      if (i < 0) return

      /*
       * De joker wordt hier omgezet in de tekst die iemand zelf intikte.
       * Afkappen en opschonen gebeurt bij de host en niet op de telefoon:
       * alles wat van een gast binnenkomt is een voorstel, geen feit. Een lege
       * joker wordt geweigerd -- dan blijft de kaart in de hand en kan hij het
       * opnieuw proberen, wat beter is dan een leeg vakje bij de jury.
       */
      let tekst = kaart
      if (kaart === JOKER) {
        tekst = String(actie.payload?.eigen ?? '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, JOKER_MAX)
        if (!tekst) return
      }

      hand.splice(i, 1)
      s._geheim.handen[actie.uid] = hand
      ctx.zetPrive(actie.uid, { hand })

      s._geheim.teller++
      const id = `k${s._geheim.teller}`
      s._geheim.van[id] = actie.uid
      s.inzetten.push({ id, tekst })
      s.gelegd.push(actie.uid)

      if (!spelers.every((u) => s.gelegd.includes(u))) return

      // Alles binnen: schudden, anders verraadt de volgorde wie wanneer legde.
      s.inzetten = husselen(ctx.rng, s.inzetten)
      s.fase = 'jureren'
      return
    }

    if (s.fase === 'jureren' && actie.type === 'kies') {
      if (actie.uid !== s.jury) return
      const id = String(actie.payload?.id ?? '')
      const winnaar = s._geheim.van[id]
      if (!winnaar) return

      const kaart = s.inzetten.find((k) => k.id === id)
      s.laatste = { tekst: kaart?.tekst ?? '', winnaar }
      s.magUitdelen = true
      s.fase = 'uitslag'
      ctx.log(`${ctx.naam(winnaar)} won met "${kaart?.tekst}"`)
      return
    }

    if (s.fase === 'uitslag') {
      if (actie.type === 'geef' && s.magUitdelen) {
        if (actie.uid !== s.laatste?.winnaar) return
        const verdeling: Record<string, number> = actie.payload?.verdeling
        if (!verdeling || typeof verdeling !== 'object') return
        for (const [uid, aantal] of Object.entries(verdeling)) {
          if (!iedereen.includes(uid) || uid === actie.uid) continue
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'beste antwoord')
        }
        s.magUitdelen = false
        return
      }

      if (actie.type === 'verder') {
        if (s.ronde >= RONDES) {
          s.klaar = true
          ctx.wisPrive()
          ctx.klaar()
          return
        }
        s.ronde++
        s.jury = volgende(iedereen, s.jury)
        nieuweRonde(s, ctx)
        return
      }
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

/* ── Schermen ───────────────────────────────────────────────── */

function Scherm({ s, ctx }: { s: SlechtState; ctx: KijkContext }) {
  const ikJury = ctx.ik === s.jury
  const jury = ctx.speler(s.jury)

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Ronde {s.ronde}/{RONDES}
        </span>
        <span className="kop-klein">
          {ikJury ? 'jij bent de jury' : `jury: ${jury?.naam}`}
        </span>
      </div>

      <Kaartje style={{ borderColor: 'var(--goud)' }}>
        <div style={{ fontSize: 19, lineHeight: 1.45 }}>
          {s.fase === 'uitslag' && s.laatste
            ? s.zin.split('___').map((deel, i) => (
                <span key={i}>
                  {deel}
                  {i === 0 && (
                    <strong style={{ color: 'var(--goud)' }}>{s.laatste!.tekst}</strong>
                  )}
                </span>
              ))
            : s.zin}
        </div>
      </Kaartje>

      {s.fase === 'kiezen' && <Kiezen s={s} ctx={ctx} ikJury={ikJury} />}
      {s.fase === 'jureren' && <Jureren s={s} ctx={ctx} ikJury={ikJury} />}
      {s.fase === 'uitslag' && <Uitslag s={s} ctx={ctx} />}
    </>
  )
}

function Kiezen({
  s,
  ctx,
  ikJury,
}: {
  s: SlechtState
  ctx: KijkContext
  ikJury: boolean
}) {
  const hand: string[] = ctx.prive?.hand ?? []
  const ikGelegd = s.gelegd.includes(ctx.ik)
  const nodig = ctx.spelers.length - 1
  const [jokert, zetJokert] = useState(false)
  const [eigen, zetEigen] = useState('')

  // Nieuwe ronde? Dan het vakje weer dicht, anders sta je bij de volgende zin
  // nog in je vorige antwoord te kijken.
  useEffect(() => {
    zetJokert(false)
    zetEigen('')
  }, [s.ronde])

  if (ikJury) {
    return (
      <div className="midden" style={{ gap: 12 }}>
        <div style={{ fontSize: 48 }}>⚖️</div>
        <h2>Jij bent de jury</h2>
        <div className="klein zacht">
          {s.gelegd.length} van {nodig} hebben gelegd
        </div>
        <SpelerBalk spelers={ctx.spelers} actief={s.gelegd} />
        <div className="klein zacht">Straks kies jij welke het beste is.</div>
      </div>
    )
  }

  if (ikGelegd) {
    return (
      <div className="midden" style={{ gap: 12 }}>
        <div style={{ fontSize: 48 }}>🤫</div>
        <div className="klein zacht">
          Gelegd — {s.gelegd.length} van {nodig} binnen
        </div>
        <SpelerBalk spelers={ctx.spelers} actief={s.gelegd} />
      </div>
    )
  }

  // Heb je op de joker getikt, dan komt er een vakje in plaats van de hand.
  if (jokert) {
    const klaar = eigen.trim().length > 0
    return (
      <>
        <div className="kop-klein" style={{ textAlign: 'center' }}>
          🃏 Vul zelf iets in
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <textarea
            autoFocus
            rows={3}
            value={eigen}
            onChange={(e) => zetEigen(e.target.value.slice(0, JOKER_MAX))}
            placeholder="wat er in het gat moet…"
            aria-label="Jouw eigen antwoord"
            style={{ width: '100%' }}
          />
          <div className="klein zacht" style={{ textAlign: 'right' }}>
            {eigen.length}/{JOKER_MAX}
          </div>
        </div>
        <div className="onderaan">
          <div className="rij">
            <GroteKnop kleur="grijs" bijTik={() => zetJokert(false)}>
              Terug
            </GroteKnop>
            <GroteKnop
              kleur="goud"
              uit={!klaar}
              bijTik={() => {
                if (!klaar) return
                tril(8)
                ctx.stuur('leg', { kaart: JOKER, eigen })
              }}
            >
              Leg in
            </GroteKnop>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="kop-klein" style={{ textAlign: 'center' }}>
        Jouw hand
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {hand.map((kaart, i) => (
          <button
            // Op de tekst kan de sleutel niet: van de joker kun je er twee in
            // je hand hebben, en dan tekent React er maar één.
            key={`${kaart}-${i}`}
            className="kaartje"
            style={{
              textAlign: 'left',
              borderColor: kaart === JOKER ? 'var(--goud)' : undefined,
            }}
            onClick={() => {
              tril(8)
              if (kaart === JOKER) {
                zetEigen('')
                zetJokert(true)
                return
              }
              ctx.stuur('leg', { kaart })
            }}
          >
            {kaart}
          </button>
        ))}
      </div>
    </>
  )
}

function Jureren({
  s,
  ctx,
  ikJury,
}: {
  s: SlechtState
  ctx: KijkContext
  ikJury: boolean
}) {
  return (
    <>
      <div className="kop-klein" style={{ textAlign: 'center' }}>
        {ikJury ? 'Kies de beste' : `${ctx.naam(s.jury)} kiest…`}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {s.inzetten.map((k) => (
          <button
            key={k.id}
            className="kaartje"
            disabled={!ikJury}
            style={{ textAlign: 'left', opacity: ikJury ? 1 : 0.8 }}
            onClick={() => {
              tril(8)
              ctx.stuur('kies', { id: k.id })
            }}
          >
            {k.tekst}
          </button>
        ))}
      </div>
    </>
  )
}

function Uitslag({ s, ctx }: { s: SlechtState; ctx: KijkContext }) {
  const l = s.laatste!
  const magUitdelen = s.magUitdelen && l.winnaar === ctx.ik
  const laatste = s.ronde >= RONDES

  return (
    <>
      <div className="midden" style={{ gap: 10 }}>
        <div style={{ fontSize: 44 }}>🏆</div>
        <h2 style={{ textAlign: 'center' }}>{ctx.naam(l.winnaar)} wint deze ronde</h2>
        <SpelerBalk spelers={ctx.spelers} actief={[l.winnaar]} />
      </div>

      <div className="onderaan">
        {magUitdelen ? (
          <Verdeler
            key={s.ronde}
            totaal={ctx.slokAantal(WINST_UITDELEN)}
            ctx={ctx}
            titel="Beste antwoord — deel uit"
            bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
          />
        ) : s.magUitdelen ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">{ctx.naam(l.winnaar)} deelt uit…</span>
          </Kaartje>
        ) : ctx.benIkHost || ctx.ik === s.jury ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
            {laatste ? 'Klaar' : 'Volgende zin'}
          </GroteKnop>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Wachten op de jury…</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

import { volgende } from '../../engine/beurten'
import { useHostKlok } from '../../engine/hooks'
import { startKlok, resterendSec, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { TAFELS, isVerboden, slokkenPerPersoon } from './regels'

/* ─────────────────────────────────────────────────────────────
   JUFFEN

   Je telt de tafel rond, en bij elk getal is er één vraag: mag dit getal, of
   is het verboden? Verboden zijn de veelvouden van de tafel, alles waar het
   cijfer van de tafel in zit, en de dubbele getallen.

   Op jouw beurt staat er één getal op het scherm en kies je: ZEGGEN of
   VERBODEN. Zeg je hem terecht, dan gaat de beurt door naar de volgende. Sla
   je hem terecht over, dan blijf jij aan zet met het getal erna -- precies
   zoals je aan tafel doorratelt tot je er een mag zeggen.

   WAAROM TWEE KNOPPEN EN NIET ÉÉN. Met één knop kijkt de app zelf of het
   volgende getal verboden is en laat hij degene die aan de beurt is drinken.
   Dan is er niets te kiezen: wie er valt staat al vast zodra de telling begint,
   en je kunt niet beter of slechter spelen. Met deze twee knoppen moet je zélf
   zien of een getal mag, en dat is het hele spel.

   Loopt je tijd af, dan klapt de telling en drinkt de hele tafel het getal
   waar je op stond, verdeeld over iedereen. Hoe verder de groep kwam, hoe
   duurder dat wordt -- en daarom wordt het stiller naarmate het getal stijgt.
   ───────────────────────────────────────────────────────────── */

/** Hoeveel tijd je hebt voor één getal. */
const BEURT_SEC = 10
/** Wat een verkeerde keuze je kost. */
const STRAF = 2
/** Zoveel keer klappen en het potje is uit. */
const MISSERS_UIT = 5
/** Haalt de tafel dit getal, dan heeft de groep gewonnen. */
const DOEL = 100
/** Wat de laatste spreker mag uitdelen als het doel gehaald wordt. */
const DOEL_UITDELEN = 10

interface JuffenState {
  fase: 'tafel' | 'tellen' | 'klap' | 'gehaald'
  /** de gekozen tafel; 0 zolang er niet gekozen is */
  tafel: number
  /** het laatst gezegde getal; het getal onder handen is dit plus één */
  gezegd: number
  /** het hoogste getal van dit potje */
  record: number
  beurt: string
  klok: Klok | null
  /** hoeveel keer de telling al geklapt is */
  missers: number
  /** wat er net gebeurde, voor het tussenscherm */
  laatste: { uid: string; getal: number; waarom: string; ieder: number } | null
  /** wie de winst mag uitdelen als het doel gehaald is */
  held: string
  /** zei hij het doelgetal, of sloeg hij het over? */
  gezegdeDoel: boolean
  gegeven: boolean
  klaar: boolean
}

function nieuweTelling(s: JuffenState, ctx: SpelContext, beginner: string) {
  s.fase = 'tellen'
  s.gezegd = 0
  s.beurt = beginner
  s.klok = startKlok(BEURT_SEC, ctx.nu)
}

/**
 * De telling klapt.
 *
 * Twee manieren waarop dat kan: een verkeerde keuze, of de tijd die afloopt.
 * Bij een verkeerde keuze drinkt alleen de speler; bij een klok die afloopt
 * drinkt de hele tafel het getal, verdeeld over iedereen. Dat laatste maakt een
 * lange telling pas echt spannend.
 */
function klap(
  s: JuffenState,
  ctx: SpelContext,
  uid: string,
  waarom: string,
  samen: boolean,
) {
  const getal = Math.max(1, s.gezegd)
  let ieder = 0

  if (samen) {
    ieder = slokkenPerPersoon(getal, ctx.spelers.length)
    ctx.iedereenDrinkt(ieder, `de telling klapte op ${getal}`)
  } else {
    ctx.drink(uid, STRAF, waarom)
  }

  s.missers++
  s.laatste = { uid, getal, waarom, ieder }
  s.fase = 'klap'
  s.klok = null
  ctx.log(`${ctx.naam(uid)}: ${waarom} — de telling stond op ${getal}`)
}

export const juffen: GameModule<JuffenState> = {
  id: 'juffen',
  naam: 'Juffen',
  uitleg: 'Tel de tafel rond, maar sla de verboden getallen over.',
  regels: [
    'Kies een tafel. Verboden zijn de veelvouden, alles met dat cijfer erin, en dubbele getallen.',
    'Op je beurt zie je één getal: zeggen of overslaan.',
    'Fout gekozen kost je 2 slokken en de telling begint opnieuw.',
    'Te lang nadenken? Dan drinkt de hele tafel het getal, verdeeld over iedereen.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['geheugen', 'reflex'],
  privescherm: false,

  init(ctx) {
    return {
      fase: 'tafel',
      tafel: 0,
      gezegd: 0,
      record: 0,
      beurt: ctx.spelers[0].uid,
      klok: null,
      missers: 0,
      laatste: null,
      held: '',
      gezegdeDoel: false,
      gegeven: false,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    /* ── De tafel kiezen ── */
    if (s.fase === 'tafel' && actie.type === 'tafel') {
      const n = Number(actie.payload?.tafel)
      if (!TAFELS.includes(n)) return
      s.tafel = n
      nieuweTelling(s, ctx, volgorde[0])
      ctx.log(`De tafel van ${n}`)
      return
    }

    /* ── Zeggen of overslaan ── */
    if (s.fase === 'tellen' && (actie.type === 'zeg' || actie.type === 'sla')) {
      if (actie.uid !== s.beurt) return

      const getal = s.gezegd + 1
      const verboden = isVerboden(getal, s.tafel)
      const zei = actie.type === 'zeg'

      if (zei && verboden) {
        klap(s, ctx, actie.uid, `zei ${getal}, en die is verboden`, false)
        return
      }
      if (!zei && !verboden) {
        klap(s, ctx, actie.uid, `sloeg ${getal} over, en die mocht gewoon`, false)
        return
      }

      s.gezegd = getal
      s.record = Math.max(s.record, getal)

      /*
        * Het doel is gehaald zodra de telling erover is, ook als dat getal zelf
        * verboden was en dus werd overgeslagen. Dat moet zo: bij tafel 10 is
        * 100 zelf een veelvoud, dus anders was die tafel nooit te winnen.
        * Daarom staat er ook niet dat hij hem zei -- dat is dan niet waar.
        */
      if (getal >= DOEL) {
        s.fase = 'gehaald'
        s.held = actie.uid
        s.gezegdeDoel = zei
        s.klok = null
        ctx.log(`De tafel is over de ${DOEL} — ${ctx.naam(actie.uid)} bracht hem erover`)
        return
      }

      /*
       * Zeg je een getal, dan gaat de beurt door. Sla je er een over, dan blijf
       * jij aan zet: aan tafel ratel je ook zelf door tot je er een mag zeggen.
       */
      if (zei) s.beurt = volgende(volgorde, actie.uid)
      s.klok = startKlok(BEURT_SEC, ctx.nu)
      return
    }

    /* ── De tijd is om ── */
    if (s.fase === 'tellen' && actie.type === 'tijdOp') {
      klap(s, ctx, s.beurt, 'dacht te lang na', true)
      return
    }

    /* ── Verder na een klap ── */
    if (s.fase === 'klap' && actie.type === 'verder') {
      if (s.missers >= MISSERS_UIT) {
        s.klaar = true
        ctx.klaar()
        return
      }
      // Wie hem liet klappen begint opnieuw.
      nieuweTelling(s, ctx, s.laatste?.uid ?? volgorde[0])
      return
    }

    /* ── Het doel gehaald ── */
    if (s.fase === 'gehaald' && actie.type === 'geef') {
      if (actie.uid !== s.held || s.gegeven) return
      const naar = String(actie.payload?.naar ?? '')
      if (!volgorde.includes(naar) || naar === actie.uid) return
      s.gegeven = true
      ctx.deelUit(actie.uid, naar, DOEL_UITDELEN, `telde tot ${DOEL}`)
      return
    }

    if (s.fase === 'gehaald' && actie.type === 'klaar') {
      s.klaar = true
      ctx.klaar()
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    useHostKlok(ctx, s.fase === 'tellen', s.klok?.eind ?? 0, 'tijdOp')

    if (s.fase === 'tafel') return <TafelKiezen ctx={ctx} />
    if (s.fase === 'klap') return <Klap s={s} ctx={ctx} />
    if (s.fase === 'gehaald') return <Gehaald s={s} ctx={ctx} />
    return <Tellen s={s} ctx={ctx} />
  },
}

function TafelKiezen({ ctx }: { ctx: KijkContext }) {
  return (
    <>
      <div className="midden" style={{ gap: 10 }}>
        <div style={{ fontSize: 52 }}>🧮</div>
        <h2>Welke tafel?</h2>
        <div className="klein zacht" style={{ textAlign: 'center', maxWidth: 320 }}>
          Verboden zijn de veelvouden van de tafel, elk getal waar dat cijfer in
          zit, en de dubbele getallen zoals 22 en 33.
        </div>
      </div>
      <div className="onderaan">
        {ctx.benIkHost ? (
          <div className="rij" style={{ flexWrap: 'wrap', gap: 6 }}>
            {TAFELS.map((n) => (
              <button
                key={n}
                className="knop klein goud"
                style={{ flex: '1 0 54px' }}
                onClick={() => {
                  tril(8)
                  ctx.stuur('tafel', { tafel: n })
                }}
              >
                {n}
              </button>
            ))}
          </div>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">De host kiest de tafel…</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

function Tellen({ s, ctx }: { s: JuffenState; ctx: KijkContext }) {
  const getal = s.gezegd + 1
  const mijnBeurt = s.beurt === ctx.ik

  return (
    <>
      <div className="balk">
        <span className="kop-klein">Tafel van {s.tafel}</span>
        <span className="kop-klein">
          record {s.record} · {s.missers}/{MISSERS_UIT} klappen
        </span>
      </div>

      <div className="midden" style={{ gap: 8 }}>
        <div className="kop-klein">
          {s.gezegd === 0 ? 'de telling begint' : `er staat ${s.gezegd}`}
        </div>
        <div className="reusachtig" style={{ color: mijnBeurt ? 'var(--goud)' : undefined }}>
          {getal}
        </div>
        <h2 style={{ textAlign: 'center' }}>
          {mijnBeurt ? 'Mag dit getal?' : `${ctx.naam(s.beurt)} is aan zet`}
        </h2>
        {s.klok && (
          <>
            <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />
            <div className="klein zacht">{resterendSec(s.klok, ctx.nu)} seconden</div>
          </>
        )}
        <SpelerBalk spelers={ctx.spelers} actief={[s.beurt]} />
      </div>

      <div className="onderaan">
        {mijnBeurt ? (
          <div className="rij">
            <GroteKnop
              kleur="rood"
              enorm
              bijTik={() => {
                tril(8)
                ctx.stuur('sla')
              }}
            >
              Verboden
            </GroteKnop>
            <GroteKnop
              kleur="groen"
              enorm
              bijTik={() => {
                tril(8)
                ctx.stuur('zeg')
              }}
            >
              {getal} zeggen
            </GroteKnop>
          </div>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Kijk of hij het ziet…</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

function Klap({ s, ctx }: { s: JuffenState; ctx: KijkContext }) {
  const l = s.laatste!
  const laatste = s.missers >= MISSERS_UIT

  return (
    <>
      <div className="balk">
        <span className="kop-klein">Tafel van {s.tafel}</span>
        <span className="kop-klein">
          record {s.record} · {s.missers}/{MISSERS_UIT} klappen
        </span>
      </div>

      <div className="midden" style={{ gap: 10 }}>
        <div style={{ fontSize: 54 }}>💥</div>
        <h1 style={{ textAlign: 'center' }}>{ctx.naam(l.uid)}</h1>
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          {l.waarom}
        </div>
        <Kaartje
          style={{
            textAlign: 'center',
            borderColor: l.ieder > 0 ? 'var(--rood)' : undefined,
          }}
        >
          {l.ieder > 0 ? (
            <>
              <strong>De telling stond op {l.getal}</strong>
              <div className="klein zacht" style={{ marginTop: 3 }}>
                Iedereen {ctx.slok(l.ieder)} — verdeeld over {ctx.spelers.length}
              </div>
            </>
          ) : (
            <strong>{ctx.slok(STRAF)}</strong>
          )}
        </Kaartje>
      </div>

      <div className="onderaan">
        {ctx.benIkHost ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
            {laatste ? 'Klaar' : 'Opnieuw vanaf 1'}
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

function Gehaald({ s, ctx }: { s: JuffenState; ctx: KijkContext }) {
  const magGeven = s.held === ctx.ik && !s.gegeven

  return (
    <>
      <div className="midden" style={{ gap: 10 }}>
        <div style={{ fontSize: 56 }}>🏆</div>
        <h1 style={{ textAlign: 'center' }}>{DOEL} gehaald</h1>
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          {ctx.naam(s.held)} {s.gezegdeDoel ? 'zei hem' : 'sloeg hem nog net over'}. De
          tafel van {s.tafel} is verslagen.
        </div>
      </div>

      <div className="onderaan">
        {magGeven ? (
          <>
            <div className="kop-klein" style={{ textAlign: 'center' }}>
              Deel {ctx.slok(DOEL_UITDELEN)} uit
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

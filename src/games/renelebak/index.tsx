import { useEffect, useRef, useState } from 'react'
import { volgende } from '../../engine/beurten'
import { useHostKlok } from '../../engine/hooks'
import { startKlok, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { BAK_NUMMERS, VEILIG } from './lijst'

/* ─────────────────────────────────────────────────────────────
   RENÉ LE BAK

   Je drukt om de beurt op volgende in een playlist op shuffle. Krijg jij "If I
   tell you" van René Le Blanc, dan drink jíj de bak. Iedereen die iets anders
   krijgt is save.

   Dat het de drukker is en niet de hele tafel is het hele spel: je drukt zelf
   op die knop, dus het is je eigen schuld. De rest kijkt toe en hoopt dat het
   bij jou valt.

   DE KANS, EN WAAROM HET GEEN VASTE PLAYLIST IS. Eerst zaten er twee tot vier
   bakken in een lijst van vijftien nummers. Dat gaf een nette speelduur, maar
   het voelde verkeerd: je wist dat ze eraan kwamen, en tegen het eind kon je
   uitrekenen dat er nog één moest vallen. Nu is elke druk een losse kans van
   één op tien. Hij kan dus bij de eerste druk vallen en net zo goed pas bij de
   twintigste, en niemand kan iets uitrekenen.

   Dat betekent wel dat een potje in theorie eeuwig kan duren, dus er is een
   bovengrens: na dertig keer drukken is het klaar, ook als er niets gevallen
   is. Dat gebeurt bij één op tien zelden, maar "zelden" is niet "nooit" en een
   spel dat niet eindigt is erger dan een spel dat kort was.

   Twee dingen die verder zo moeten:

   De titel blijft dicht terwijl het speelt. Je hóórt het aan de intro, net als
   in het echt, en pas daarna staat er wat het was.

   Het geluid komt van de telefoon van de host. Dat moet er één zijn: speelden
   alle telefoons mee, dan hoor je hetzelfde fragment acht keer net naast elkaar
   en herkent niemand er iets van.
   ───────────────────────────────────────────────────────────── */

/** Eén op zoveel kans dat de volgende druk de bak is. */
const KANS = 10
/** Zoveel bakken en dan is het potje klaar. */
const BAKKEN_UIT = 2
/** Harde bovengrens, zodat een potje niet eeuwig kan duren. */
const MAX_DRUKKEN = 30
/**
 * Hoe lang je een fragment hoort.
 *
 * Korter dan bij de muziekspellen, want hier valt niets te raden: er zijn maar
 * twee intro's en je weet binnen een halve seconde of je moet drinken. Acht
 * seconden is genoeg om het te laten landen en om te juichen.
 */
const FRAGMENT_SEC = 8
/** Wat een bak kost. */
const BAK = 4

interface Nummer {
  titel: string
  artiest: string
  url: string
  /** 0 is veilig */
  bakken: number
}

interface RenelebakState {
  _geheim: {
    /** wat er nu speelt. Hier en niet publiek, want de titel is het antwoord. */
    bezig: Nummer | null
  }
  /** hoeveel keer er gedrukt is */
  gedrukt: number
  fase: 'wachten' | 'spelen' | 'uitslag'
  beurt: string
  /** wie er op volgende drukte; die drinkt als het de bak is */
  drukker: string
  /** de link van wat er speelt; de titel blijft geheim tot het afgelopen is */
  url: string
  /** pas gevuld in de uitslagfase */
  nu: { titel: string; artiest: string; bakken: number } | null
  klok: Klok | null
  /** hoeveel bakken er al gevallen zijn */
  gevallen: number
  klaar: boolean
}

/**
 * Wat er nu gaat spelen.
 *
 * De kans wordt per druk opnieuw gegooid, dus hij kan twee keer achter elkaar
 * vallen. Dat hoort zo: zodra er een regel zou zijn als "niet twee keer op
 * rij", kun je er weer op rekenen.
 */
function trekNummer(ctx: SpelContext): Nummer {
  if (Math.floor(ctx.rng() * KANS) === 0) {
    const keuze = BAK_NUMMERS[Math.floor(ctx.rng() * BAK_NUMMERS.length)]
    return { ...keuze }
  }
  return { ...VEILIG }
}

export const renelebak: GameModule<RenelebakState> = {
  id: 'renelebak',
  naam: 'René le Bak',
  uitleg: 'Playlist op shuffle. Krijg jij dát nummer, dan drink jij de bak.',
  regels: [
    'Om de beurt druk je op volgende.',
    'Je hoort een fragment, maar niet welk nummer het is.',
    'Krijg jij "If I tell you"? Dan drink jij een bak.',
    'Bij een hardstyle-remix zijn het er twee. De rest is save.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['geluk', 'chaos'],
  privescherm: false,

  init(ctx) {
    return {
      _geheim: { bezig: null },
      gedrukt: 0,
      fase: 'wachten',
      beurt: ctx.spelers[0].uid,
      drukker: '',
      url: '',
      nu: null,
      klok: null,
      gevallen: 0,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'wachten' && actie.type === 'volgende') {
      if (actie.uid !== s.beurt) return

      const nummer = trekNummer(ctx)
      s.gedrukt++
      s.drukker = actie.uid

      /*
       * Alleen de url gaat naar de telefoons, niet de titel. Die blijft hier
       * tot het fragment klaar is -- anders leest iemand het antwoord van zijn
       * scherm terwijl de intro nog loopt.
       */
      s.fase = 'spelen'
      s.url = nummer.url
      s.nu = null
      s._geheim.bezig = nummer
      s.klok = startKlok(FRAGMENT_SEC, ctx.nu)
      return
    }

    if (s.fase === 'spelen' && actie.type === 'afgelopen') {
      const nummer = s._geheim.bezig
      if (!nummer) return

      s.fase = 'uitslag'
      s.nu = { titel: nummer.titel, artiest: nummer.artiest, bakken: nummer.bakken }
      s.klok = null

      if (nummer.bakken > 0) {
        s.gevallen++
        // Alleen de drukker. Hij heeft zelf op die knop gedrukt.
        ctx.drink(
          s.drukker,
          BAK * nummer.bakken,
          nummer.bakken === 1 ? 'kreeg de bak' : 'kreeg de hardstyle — twee bakken',
        )
        ctx.log(
          `${ctx.naam(s.drukker)} kreeg ${nummer.titel} — ${nummer.bakken === 1 ? 'een bak' : 'twee bakken'}`,
        )
      }
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      if (s.gevallen >= BAKKEN_UIT || s.gedrukt >= MAX_DRUKKEN) {
        s.klaar = true
        ctx.klaar()
        return
      }
      s.fase = 'wachten'
      s.url = ''
      s.nu = null
      s.beurt = volgende(volgorde, s.beurt)
      return
    }
  },

  isKlaar: (s) => s.klaar,

  /*
   * Even wachten voordat het slokkenscherm eroverheen valt, zodat de tafel
   * eerst ziet wélk nummer het was. Zonder die pauze staat er meteen "vier
   * slokken" en heeft niemand de titel gelezen.
   */
  drinkVertraging: () => 1500,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

function Scherm({ s, ctx }: { s: RenelebakState; ctx: KijkContext }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [fout, zetFout] = useState(false)

  useHostKlok(ctx, s.fase === 'spelen', s.klok?.eind ?? 0, 'afgelopen')

  /*
   * Alleen de host speelt af. Dat is de telefoon die aan de speaker hangt, en
   * één bron betekent dat de tafel één keer dezelfde intro hoort.
   */
  useEffect(() => {
    if (!ctx.benIkHost) return
    const el = new Audio()
    el.preload = 'auto'
    audioRef.current = el
    return () => {
      el.pause()
      audioRef.current = null
    }
  }, [ctx.benIkHost])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    if (s.fase !== 'spelen' || !s.url) {
      el.pause()
      return
    }
    zetFout(false)
    el.src = s.url
    el.currentTime = 0
    el.play().catch(() => zetFout(true))
  }, [s.fase, s.url])

  const mijnBeurt = s.beurt === ctx.ik
  const teller = `${s.gevallen}/${BAKKEN_UIT} bakken`

  if (s.fase === 'spelen') {
    const ikDrukte = s.drukker === ctx.ik
    return (
      <>
        <div className="balk">
          <span className="kop-klein">Nummer {s.gedrukt}</span>
          <span className="kop-klein">{teller}</span>
        </div>
        <div className="midden" style={{ gap: 14 }}>
          <div style={{ fontSize: 64 }}>🔊</div>
          <h1 style={{ textAlign: 'center' }}>
            {ikDrukte ? 'Dit is voor jou…' : `${ctx.naam(s.drukker)} drukte…`}
          </h1>
          <div className="klein zacht" style={{ textAlign: 'center', maxWidth: 300 }}>
            {fout
              ? 'Het geluid wil niet starten. Tik op het scherm en probeer het nog een keer.'
              : ctx.benIkHost
                ? 'Je telefoon speelt het fragment.'
                : 'Het geluid komt van de telefoon van de host.'}
          </div>
          {s.klok && <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />}
        </div>
      </>
    )
  }

  if (s.fase === 'uitslag' && s.nu) {
    const bak = s.nu.bakken > 0
    const ikDrukte = s.drukker === ctx.ik
    const klaarNa = s.gevallen >= BAKKEN_UIT || s.gedrukt >= MAX_DRUKKEN

    return (
      <>
        <div className="balk">
          <span className="kop-klein">Nummer {s.gedrukt}</span>
          <span className="kop-klein">{teller}</span>
        </div>

        <div className="midden" style={{ gap: 10 }}>
          <div style={{ fontSize: 60 }}>{bak ? '🍺' : '😮‍💨'}</div>
          <h1 style={{ textAlign: 'center', color: bak ? 'var(--goud)' : undefined }}>
            {s.nu.titel}
          </h1>
          <div className="klein zacht">{s.nu.artiest}</div>
          {bak ? (
            <Kaartje style={{ textAlign: 'center', borderColor: 'var(--rood)' }}>
              <strong>
                {ikDrukte ? 'Jij drukte' : ctx.naam(s.drukker)} —{' '}
                {s.nu.bakken === 1 ? 'een bak' : 'twee bakken, hardstyle'}
              </strong>
              <div className="klein zacht" style={{ marginTop: 3 }}>
                De rest is save
              </div>
            </Kaartje>
          ) : (
            <div className="klein zacht">
              {ikDrukte ? 'Save. Doorgeven.' : `${ctx.naam(s.drukker)} is save.`}
            </div>
          )}
        </div>

        <div className="onderaan">
          {ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
              {klaarNa ? 'Klaar' : 'Doorgeven'}
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
        <span className="kop-klein">Nummer {s.gedrukt + 1}</span>
        <span className="kop-klein">{teller}</span>
      </div>

      <div className="midden" style={{ gap: 10 }}>
        <div style={{ fontSize: 56 }}>⏭️</div>
        <h2 style={{ textAlign: 'center' }}>
          {mijnBeurt ? 'Jij mag drukken' : `${ctx.naam(s.beurt)} mag drukken`}
        </h2>
        <div className="klein zacht" style={{ textAlign: 'center', maxWidth: 300 }}>
          {mijnBeurt
            ? 'Krijg jij het nummer, dan drink jij alleen. De rest is save.'
            : 'Hij kan nu vallen, of pas over twintig nummers. Niemand weet het.'}
        </div>
        <SpelerBalk spelers={ctx.spelers} actief={[s.beurt]} />
      </div>

      <div className="onderaan">
        {mijnBeurt ? (
          <GroteKnop
            kleur="goud"
            enorm
            bijTik={() => {
              tril(10)
              ctx.stuur('volgende')
            }}
          >
            Volgende nummer
          </GroteKnop>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">{ctx.naam(s.beurt)} is aan zet…</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

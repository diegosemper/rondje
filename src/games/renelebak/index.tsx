import { useEffect, useRef, useState } from 'react'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { BAK_NUMMERS, VEILIG } from './lijst'

/* ─────────────────────────────────────────────────────────────
   RENÉ LE BAK

   Je drukt om de beurt op volgende in een playlist op shuffle. Krijg jij "If I
   tell you" van René Le Blanc, dan drink jíj de bak. Iedereen die Solid Stigma
   krijgt is save.

   Dat het de drukker is en niet de hele tafel is het hele spel: je drukt zelf
   op die knop, dus het is je eigen schuld. De rest kijkt toe en hoopt dat het
   bij jou valt.

   ER WORDT NIET MEER GEWACHT. Hiervoor speelde elk fragment een vaste tijd en
   moest er daarna nog op doorgeven worden getikt. Dat werkte niet: je hóórt
   binnen een halve seconde dat het Solid Stigma is en dan sta je nog acht
   seconden te wachten voor niets. Nu is de uitslag er op het moment dat je
   drukt en kan de volgende meteen doorklikken.

   Daarmee is ook de aparte klok weg. Het nummer stopt niet van zichzelf: het
   speelt door tot de volgende op volgende drukt, of tot het fragment afloopt.
   Bij de bak is dat precies wat je wil -- die plaat moet uitspelen terwijl
   iedereen schreeuwt en jij drinkt. Bij Solid Stigma drukt de volgende binnen
   een seconde en hoort niemand er meer van.

   Dat de titel meteen in beeld staat is geen verlies. Er zijn maar twee
   intro's en die kent iedereen uit zijn hoofd, dus er valt niets te raden dat
   het verbergen waard is -- en de muziek begint op hetzelfde moment.

   DE KANS, EN WAAROM HET GEEN VASTE PLAYLIST IS. Elke druk is een losse kans
   van één op tien. Hij kan dus bij de eerste druk vallen en net zo goed pas bij
   de twintigste, en niemand kan uitrekenen hoeveel er nog komen. Er is wel een
   bovengrens: na dertig keer drukken is het klaar, ook als er niets gevallen
   is, want zonder die grens kan een potje in theorie eeuwig duren.

   Het geluid komt van één telefoon, en je kiest aan het begin welke. Dat moet
   die ene zijn die aan de box hangt -- zelden de host van de lobby -- en het
   moet één bron zijn, want acht telefoons die hetzelfde fragment net naast
   elkaar spelen levert herrie op waarin niemand iets herkent.
   ───────────────────────────────────────────────────────────── */

/** Eén op zoveel kans dat de volgende druk de bak is. */
const KANS = 10
/** Zoveel bakken en dan is het potje klaar. */
const BAKKEN_UIT = 2
/** Harde bovengrens, zodat een potje niet eeuwig kan duren. */
const MAX_DRUKKEN = 30
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
  /** wie er aan de box hangt; die telefoon speelt alles af */
  dj: string
  /** hoeveel keer er gedrukt is */
  gedrukt: number
  fase: 'kiesdj' | 'spelen' | 'einde'
  beurt: string
  /** wie er op volgende drukte voor het nummer dat nu staat */
  drukker: string
  /** wat er nu speelt; null voordat er één keer gedrukt is */
  nu: Nummer | null
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
    'Kies eerst wie aan de box hangt — die telefoon speelt alles af.',
    'Om de beurt druk je op volgende.',
    'Krijg jij "If I tell you"? Dan drink jij een bak, en hij speelt uit.',
    'Hoor je Solid Stigma, dan mag de volgende meteen doorklikken.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['geluk', 'chaos'],
  privescherm: false,

  init(ctx) {
    return {
      dj: '',
      gedrukt: 0,
      fase: 'kiesdj',
      beurt: ctx.spelers[0].uid,
      drukker: '',
      nu: null,
      gevallen: 0,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    /*
     * Wie hangt aan de box? Iedereen mag dat aanwijzen, ook zichzelf: aan tafel
     * roept die persoon gewoon "ik heb de box" en tikt het aan. De eerste tik
     * geldt, want er valt niets te onderhandelen.
     */
    if (s.fase === 'kiesdj' && actie.type === 'dj') {
      const wie = String(actie.payload?.uid ?? '')
      if (!volgorde.includes(wie)) return
      s.dj = wie
      s.fase = 'spelen'
      return
    }

    if (s.fase === 'spelen' && actie.type === 'volgende') {
      if (actie.uid !== s.beurt) return

      const nummer = trekNummer(ctx)
      s.gedrukt++
      s.drukker = actie.uid
      s.nu = nummer

      /*
       * De uitslag valt hier, op het moment van drukken. Dat moet, want de
       * volgende mag meteen doorklikken -- zou het drinken pas na een klok
       * komen, dan kon iemand er langs klikken voordat het geregistreerd was.
       */
      if (nummer.bakken > 0) {
        s.gevallen++
        ctx.drink(
          actie.uid,
          BAK * nummer.bakken,
          nummer.bakken === 1 ? 'kreeg de bak' : 'kreeg de hardstyle — twee bakken',
        )
        ctx.log(
          `${ctx.naam(actie.uid)} kreeg ${nummer.titel} — ${nummer.bakken === 1 ? 'een bak' : 'twee bakken'}`,
        )
      }

      if (s.gevallen >= BAKKEN_UIT || s.gedrukt >= MAX_DRUKKEN) {
        s.fase = 'einde'
        return
      }

      s.beurt = volgende(volgorde, actie.uid)
      return
    }

    if (s.fase === 'einde' && actie.type === 'klaar') {
      s.klaar = true
      ctx.klaar()
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
  const ikBenDj = s.dj === ctx.ik

  /*
   * Alleen de telefoon van de dj speelt af. Dat is de telefoon die aan de box
   * hangt, en één bron betekent dat de tafel één keer dezelfde intro hoort.
   */
  useEffect(() => {
    if (!ikBenDj) return
    const el = new Audio()
    el.preload = 'auto'
    audioRef.current = el
    return () => {
      el.pause()
      audioRef.current = null
    }
  }, [ikBenDj])

  /*
   * Starten gebeurt per druk en niet per link. Op de link alleen zou hetzelfde
   * nummer twee keer achter elkaar niet opnieuw beginnen -- en bij Solid Stigma
   * is dat juist de normale gang van zaken.
   */
  useEffect(() => {
    const el = audioRef.current
    if (!el || !s.nu) return
    zetFout(false)
    el.src = s.nu.url
    el.currentTime = 0
    el.play().catch(() => zetFout(true))
  }, [s.gedrukt])

  if (s.fase === 'kiesdj') {
    return (
      <>
        <div className="balk">
          <span className="kop-klein">René le Bak</span>
          <span className="kop-klein">voor we beginnen</span>
        </div>
        <div className="midden" style={{ gap: 10 }}>
          <div style={{ fontSize: 56 }}>🔈</div>
          <h2 style={{ textAlign: 'center' }}>Wie hangt aan de box?</h2>
          <div className="klein zacht" style={{ textAlign: 'center', maxWidth: 300 }}>
            Die telefoon speelt alle nummers. Meestal is er maar één met de
            speaker verbonden, en dat is zelden de host.
          </div>
        </div>
        <div className="onderaan">
          <div className="rij" style={{ flexWrap: 'wrap', gap: 6 }}>
            {ctx.spelers.map((p) => (
              <button
                key={p.uid}
                className="knop klein"
                onClick={() => {
                  tril(8)
                  ctx.stuur('dj', { uid: p.uid })
                }}
              >
                {p.emoji} {p.naam}
                {p.uid === ctx.ik ? ' (ik)' : ''}
              </button>
            ))}
          </div>
        </div>
      </>
    )
  }

  if (s.fase === 'einde') {
    return (
      <>
        <div className="midden" style={{ gap: 10 }}>
          <div style={{ fontSize: 54 }}>🍺</div>
          <h1 style={{ textAlign: 'center' }}>
            {s.gevallen >= BAKKEN_UIT ? 'Twee bakken gevallen' : 'Niemand erin gelopen'}
          </h1>
          <div className="klein zacht" style={{ textAlign: 'center' }}>
            {s.gedrukt} nummers langs geweest
          </div>
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

  const mijnBeurt = s.beurt === ctx.ik
  const bak = (s.nu?.bakken ?? 0) > 0
  const ikKreegHem = s.drukker === ctx.ik

  return (
    <>
      <div className="balk">
        <span className="kop-klein">Nummer {s.gedrukt + 1}</span>
        <span className="kop-klein">
          {s.gevallen}/{BAKKEN_UIT} bakken
        </span>
      </div>

      <div className="midden" style={{ gap: 8 }}>
        {s.nu ? (
          <>
            <div style={{ fontSize: 52 }}>{bak ? '🍺' : '😮‍💨'}</div>
            <h1 style={{ textAlign: 'center', color: bak ? 'var(--goud)' : undefined }}>
              {s.nu.titel}
            </h1>
            <div className="klein zacht">{s.nu.artiest}</div>
            {bak ? (
              <Kaartje style={{ textAlign: 'center', borderColor: 'var(--rood)' }}>
                <strong>
                  {ikKreegHem ? 'Jij drukte' : ctx.naam(s.drukker)} —{' '}
                  {s.nu.bakken === 1 ? 'een bak' : 'twee bakken, hardstyle'}
                </strong>
                <div className="klein zacht" style={{ marginTop: 3 }}>
                  De rest is save · het nummer speelt door
                </div>
              </Kaartje>
            ) : (
              <div className="klein zacht">
                {ikKreegHem ? 'Save.' : `${ctx.naam(s.drukker)} is save.`}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 56 }}>⏭️</div>
            <div className="klein zacht" style={{ textAlign: 'center', maxWidth: 300 }}>
              Zorg dat je drinken klaarstaat. Hij kan meteen vallen, of pas over
              twintig nummers.
            </div>
          </>
        )}

        <div className="klein zacht">
          {fout
            ? 'Het geluid wil niet starten. Tik op het scherm en probeer het nog een keer.'
            : ikBenDj
              ? 'Jouw telefoon speelt het af.'
              : `Het geluid komt van de telefoon van ${ctx.naam(s.dj)}.`}
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
            {s.nu ? 'Volgende nummer' : 'Start'}
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

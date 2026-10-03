import { useEffect, useRef, useState } from 'react'
import { husselen, tussen } from '../../engine/random'
import { volgende } from '../../engine/beurten'
import { useHostKlok } from '../../engine/hooks'
import { startKlok, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { NUMMERS } from '../nummers/lijst'
import { BAK_NUMMERS } from './lijst'

/* ─────────────────────────────────────────────────────────────
   RENÉ LE BAK

   De playlist staat op shuffle en je drukt om de beurt op volgende. Komt "If I
   tell you" van René Le Blanc langs, dan drinkt de hele tafel een bak; bij een
   hardstyle-remix zijn het er twee. Verder gebeurt er niets -- en dat wachten
   is het spel.

   Er valt dus niets te kunnen, en dat is precies de bedoeling. Het is het potje
   waarbij iedereen stil wordt zodra er een pianootje begint.

   TWEE DINGEN DIE HET SPEL MAKEN, EN WAAROM ZE ZO ZIJN:

   De titel blijft dicht terwijl het speelt. Je hóórt het aan de intro, net als
   in het echt, en pas na het fragment staat er wat het was. Zette de app de
   titel er meteen bij, dan was er niets meer om naar te luisteren.

   Hoeveel bakken er in de playlist zitten weet niemand: twee, drie of vier. Bij
   een vast aantal kan de tafel aftellen hoeveel er nog komen, en dan is de
   spanning bij de laatste nummers weg.

   Het geluid komt van de telefoon van de host. Dat moet er één zijn: speelden
   alle telefoons mee, dan hoor je hetzelfde fragment acht keer net naast elkaar
   en herkent niemand er iets van.
   ───────────────────────────────────────────────────────────── */

/** Hoeveel gewone nummers er tussen zitten. */
const VULLING = 13
/** Hoe lang je een fragment hoort. Lang genoeg om het te herkennen. */
const FRAGMENT_SEC = 11
/** Wat een bak kost. */
const BAK = 4

interface Track {
  titel: string
  artiest: string
  url: string
  /** 0 voor een gewoon nummer */
  bakken: number
}

interface RenelebakState {
  /** de playlist van dit potje; blijft geheim tot een nummer gespeeld is */
  _geheim: { lijst: Track[] }
  index: number
  fase: 'wachten' | 'spelen' | 'uitslag'
  beurt: string
  /** het nummer dat nu speelt of net gespeeld is, zonder titel tijdens 'spelen' */
  url: string
  /** pas gevuld in de uitslagfase */
  nu: { titel: string; artiest: string; bakken: number } | null
  klok: Klok | null
  /** hoeveel bakken er al gevallen zijn */
  gevallen: number
  klaar: boolean
}

function maakPlaylist(ctx: SpelContext): Track[] {
  const vulling = ctx
    .vers('renelebak-vulling', NUMMERS, VULLING, (n) => n.url)
    .map((n) => ({ titel: n.titel, artiest: n.artiest, url: n.url, bakken: 0 }))

  // Twee, drie of vier bakken. Zo kan niemand aftellen hoeveel er nog komen.
  const hoeveel = tussen(ctx.rng, 2, 4)
  const bakken: Track[] = []
  for (let i = 0; i < hoeveel; i++) {
    const keuze = BAK_NUMMERS[Math.floor(ctx.rng() * BAK_NUMMERS.length)]
    bakken.push({ ...keuze })
  }

  return husselen(ctx.rng, [...vulling, ...bakken])
}

export const renelebak: GameModule<RenelebakState> = {
  id: 'renelebak',
  naam: 'René le Bak',
  uitleg: 'Playlist op shuffle. Hoor je dát nummer, dan drinkt iedereen een bak.',
  regels: [
    'Om de beurt druk je op volgende.',
    'Je hoort een fragment, maar niet welk nummer het is.',
    'Is het "If I tell you"? Dan drinkt iedereen een bak.',
    'Bij een hardstyle-remix zijn het twee bakken.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['geluk', 'chaos'],
  privescherm: false,

  init(ctx) {
    const lijst = maakPlaylist(ctx)
    return {
      _geheim: { lijst },
      index: 0,
      fase: 'wachten',
      beurt: ctx.spelers[0].uid,
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
      const track = s._geheim.lijst[s.index]
      if (!track) return

      /*
       * Alleen de url gaat naar de telefoons, niet de titel. Die staat in het
       * geheim tot het fragment klaar is -- anders leest iemand het antwoord
       * van zijn scherm terwijl de intro nog loopt.
       */
      s.fase = 'spelen'
      s.url = track.url
      s.nu = null
      s.klok = startKlok(FRAGMENT_SEC, ctx.nu)
      return
    }

    if (s.fase === 'spelen' && actie.type === 'afgelopen') {
      const track = s._geheim.lijst[s.index]
      if (!track) return

      s.fase = 'uitslag'
      s.nu = { titel: track.titel, artiest: track.artiest, bakken: track.bakken }
      s.klok = null

      if (track.bakken > 0) {
        s.gevallen++
        ctx.iedereenDrinkt(
          BAK * track.bakken,
          track.bakken === 1 ? 'een bak' : 'twee bakken — hardstyle',
        )
        ctx.log(`${track.titel} — iedereen ${track.bakken === 1 ? 'een bak' : 'twee bakken'}`)
      }
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      s.index++
      if (s.index >= s._geheim.lijst.length) {
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

  if (s.fase === 'spelen') {
    return (
      <>
        <div className="balk">
          <span className="kop-klein">Nummer {s.index + 1}</span>
          <span className="kop-klein">{s.gevallen > 0 ? `${s.gevallen} bakken gevallen` : 'nog geen bak'}</span>
        </div>
        <div className="midden" style={{ gap: 14 }}>
          <div style={{ fontSize: 64 }}>🔊</div>
          <h1 style={{ textAlign: 'center' }}>Luisteren…</h1>
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
    return (
      <>
        <div className="balk">
          <span className="kop-klein">Nummer {s.index + 1}</span>
          <span className="kop-klein">{s.gevallen} gevallen</span>
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
                {s.nu.bakken === 1 ? 'Een bak voor iedereen' : 'Twee bakken — hardstyle'}
              </strong>
            </Kaartje>
          ) : (
            <div className="klein zacht">Geen bak. Doorgeven.</div>
          )}
        </div>

        <div className="onderaan">
          {ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
              Doorgeven
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
        <span className="kop-klein">Nummer {s.index + 1}</span>
        <span className="kop-klein">{s.gevallen > 0 ? `${s.gevallen} bakken gevallen` : 'nog geen bak'}</span>
      </div>

      <div className="midden" style={{ gap: 10 }}>
        <div style={{ fontSize: 56 }}>⏭️</div>
        <h2 style={{ textAlign: 'center' }}>
          {mijnBeurt ? 'Jij mag drukken' : `${ctx.naam(s.beurt)} mag drukken`}
        </h2>
        <div className="klein zacht" style={{ textAlign: 'center', maxWidth: 300 }}>
          Zorg dat je drinken klaarstaat. Niemand weet hoeveel bakken er in deze
          playlist zitten.
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

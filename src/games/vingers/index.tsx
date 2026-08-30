import { useEffect, useRef, useState } from 'react'
import type { Actie, GameModule, Speler } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, tril } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   VINGERS

   Eén telefoon in het midden, iedereen legt er een vinger op, en na een paar
   tellen licht er één op. Die persoon drinkt.

   Dit is het enige spel in DORST! dat niet op ieders eigen scherm gebeurt
   maar op één toestel — dat van de host. De andere telefoons doen even niets
   dan meekijken, en dat hoort zo: het gaat er juist om dat je met z'n allen
   over dezelfde telefoon hangt.

   De telefoon weet niet van wie welke vinger is; dat weten jullie. Daarom
   staat er ná de keuze een rijtje namen: één tik en het staat op het
   scorebord. Zonder dat zou het een leuke goocheltruc zijn die nergens in
   terechtkomt.
   ───────────────────────────────────────────────────────────── */

/** Zo lang moeten alle vingers stilliggen voordat er gekozen wordt. */
const WACHT_MS = 2600

/** Hoeveel rondes voordat het spel er zelf mee ophoudt. */
const RONDES = 5

/** Wat de aangewezen vinger kost. */
const SLOKKEN = 2

/**
 * Een kleur per vinger.
 *
 * Bewust ver uit elkaar in tint: op een telefoon in een donkere kamer, met
 * acht handen eroverheen, moet je jouw cirkel kunnen terugvinden zonder erbij
 * na te denken.
 */
const KLEUREN = [
  '#ffd166',
  '#4c8dff',
  '#35c46b',
  '#e8453c',
  '#9b6cf0',
  '#ff9f45',
  '#2ad4c8',
  '#ff6ec7',
]

interface VingerState {
  ronde: number
  fase: 'vingers' | 'uitslag'
  /** wie er deze ronde is aangewezen */
  gekozen: string | null
  klaar: boolean
}

export const vingers: GameModule<VingerState> = {
  id: 'vingers',
  naam: 'Vingers',
  uitleg: 'Iedereen een vinger op één telefoon. Eentje wordt aangewezen.',
  regels: [
    'Leg de telefoon van de host in het midden.',
    'Iedereen legt er een vinger op — allemaal tegelijk.',
    'Blijf liggen. Na een paar tellen licht er één op.',
    'Die drinkt. Tik daarna wie het was.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['geluk', 'chaos'],
  privescherm: false,

  init() {
    return { ronde: 1, fase: 'vingers', gekozen: null, klaar: false }
  },

  reduce(s, actie: Actie, ctx) {
    if (s.fase === 'vingers' && actie.type === 'wees-aan') {
      const uid = String(actie.payload?.uid ?? '')
      if (!ctx.spelers.some((p) => p.uid === uid)) return

      s.gekozen = uid
      s.fase = 'uitslag'
      ctx.drink(uid, SLOKKEN, 'de vinger wees jou aan')
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.klaar = true
        ctx.klaar()
        return
      }
      s.ronde++
      s.fase = 'vingers'
      s.gekozen = null
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Ronde {s.ronde}/{RONDES}
          </span>
          <span className="kop-klein">{ctx.slokKort(SLOKKEN)} voor de aangewezene</span>
        </div>

        {s.fase === 'uitslag' && s.gekozen ? (
          <>
            <div className="midden">
              <div style={{ fontSize: 64 }}>👆</div>
              <h1 style={{ textAlign: 'center' }}>{ctx.naam(s.gekozen)}</h1>
              <div className="zacht">{ctx.slok(SLOKKEN)}</div>
            </div>
            <div className="onderaan">
              {ctx.benIkHost ? (
                <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
                  {s.ronde >= RONDES ? 'Klaar' : 'Volgende ronde →'}
                </GroteKnop>
              ) : (
                <Kaartje style={{ textAlign: 'center' }}>
                  <span className="zacht">De host gaat door…</span>
                </Kaartje>
              )}
            </div>
          </>
        ) : ctx.benIkHost ? (
          <VingerPad
            // Nieuwe sleutel per ronde: het pad begint schoon, zonder vingers
            // die van de vorige ronde zijn blijven hangen.
            key={s.ronde}
            spelers={ctx.spelers}
            bijAanwijzen={(uid) => ctx.stuur('wees-aan', { uid })}
          />
        ) : (
          <div className="midden">
            <div style={{ fontSize: 64 }}>📱</div>
            <h2 style={{ textAlign: 'center' }}>Leg je vinger op de telefoon in het midden</h2>
            <div className="zacht">Die van de host. Jouw scherm doet even niets.</div>
          </div>
        )}
      </>
    )
  },
}

/* ── het aanraakveld ──────────────────────────────────────── */

interface Vinger {
  id: number
  x: number
  y: number
  kleur: string
}

/**
 * Het veld waar alle vingers op liggen.
 *
 * Er wordt geteld zolang er minstens twee vingers liggen, en de teller begint
 * opnieuw zodra er eentje bijkomt of weggaat — anders kies je terwijl de
 * laatste zijn hand nog laat zakken. Bewegen mag wel: je vinger verschuift
 * altijd een beetje, en daarvoor moet niet steeds opnieuw geteld worden.
 */
function VingerPad({
  spelers,
  bijAanwijzen,
}: {
  spelers: Speler[]
  bijAanwijzen: (uid: string) => void
}) {
  const [vingers, zetVingers] = useState<Vinger[]>([])
  const [gekozenId, zetGekozenId] = useState<number | null>(null)
  const [rest, zetRest] = useState(1)

  // De teller loopt buiten React om; hij moet bij de vingers van dít moment
  // kunnen, niet bij die van toen de teller begon.
  const nu = useRef<Vinger[]>([])
  nu.current = vingers

  function plek(e: React.PointerEvent<HTMLDivElement>) {
    const vak = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - vak.left, y: e.clientY - vak.top }
  }

  function omlaag(e: React.PointerEvent<HTMLDivElement>) {
    if (gekozenId !== null) return
    e.preventDefault()
    const { x, y } = plek(e)
    zetVingers((oud) => {
      if (oud.some((v) => v.id === e.pointerId)) return oud
      return [...oud, { id: e.pointerId, x, y, kleur: KLEUREN[oud.length % KLEUREN.length] }]
    })
    tril(8)
  }

  function beweeg(e: React.PointerEvent<HTMLDivElement>) {
    if (gekozenId !== null) return
    const { x, y } = plek(e)
    zetVingers((oud) => oud.map((v) => (v.id === e.pointerId ? { ...v, x, y } : v)))
  }

  function omhoog(e: React.PointerEvent<HTMLDivElement>) {
    // Na de keuze blijven de cirkels staan: je wilt kunnen zien wie er
    // aangewezen is, ook als iedereen meteen zijn hand wegtrekt.
    if (gekozenId !== null) return
    zetVingers((oud) => oud.filter((v) => v.id !== e.pointerId))
  }

  /* Aftellen zolang er genoeg vingers liggen. */
  useEffect(() => {
    if (gekozenId !== null) return
    if (vingers.length < 2) {
      zetRest(1)
      return
    }

    const begin = Date.now()
    const tik = setInterval(() => {
      const over = WACHT_MS - (Date.now() - begin)
      if (over > 0) {
        zetRest(over / WACHT_MS)
        return
      }
      clearInterval(tik)
      zetRest(0)

      const mee = nu.current
      if (mee.length < 2) return
      const winnaar = mee[Math.floor(Math.random() * mee.length)]
      zetGekozenId(winnaar.id)
      tril([40, 60, 120])
    }, 50)

    return () => clearInterval(tik)
    // Alleen op het aantal, niet op de vingers zelf: schuiven mag, de teller
    // hoort daar niet van in de war te raken.
  }, [vingers.length, gekozenId])

  const gekozen = vingers.find((v) => v.id === gekozenId)

  return (
    <>
      <div
        className="vingerpad geen-selectie"
        onPointerDown={omlaag}
        onPointerMove={beweeg}
        onPointerUp={omhoog}
        onPointerCancel={omhoog}
        onContextMenu={(e) => e.preventDefault()}
      >
        {vingers.map((v) => (
          <div
            key={v.id}
            className={[
              'vinger',
              gekozenId === null ? '' : v.id === gekozenId ? 'gekozen' : 'verloren',
            ].join(' ')}
            style={{ left: v.x, top: v.y, color: v.kleur }}
          />
        ))}

        {vingers.length === 0 && gekozenId === null && (
          <div className="vingerpad-hint">
            Leg de telefoon neer en laat iedereen
            <br />
            een vinger op het scherm zetten
          </div>
        )}
      </div>

      <div className="onderaan">
        {gekozen ? (
          <>
            <div className="kop-klein" style={{ textAlign: 'center' }}>
              Deze vinger. Wie was dat?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {spelers.map((p) => (
                <GroteKnop key={p.uid} klein bijTik={() => bijAanwijzen(p.uid)}>
                  {p.emoji} {p.naam}
                </GroteKnop>
              ))}
            </div>
          </>
        ) : vingers.length < 2 ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">
              {vingers.length === 0
                ? 'Wachten op vingers…'
                : 'Nog eentje erbij, dan begint het tellen'}
            </span>
          </Kaartje>
        ) : (
          <>
            <div className="kop-klein" style={{ textAlign: 'center' }}>
              {vingers.length} vingers — blijf liggen
            </div>
            <Balkje waarde={rest} />
          </>
        )}
      </div>
    </>
  )
}

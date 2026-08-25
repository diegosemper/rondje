import { husselen, pak } from '../../engine/random'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, startKlok, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { GROEPEN } from './woorden'

/* ─────────────────────────────────────────────────────────────
   SPIEGELSPELERS

   Iedereen krijgt een woord uit dezelfde groep. Twee spelers krijgen precies
   hetzelfde woord; de rest krijgt iets anders. Niemand weet of hij de dubbele
   is.

   Twee minuten praten en hinten. Daarna wijst iedereen aan wie hij denkt dat
   zijn spiegel is.

   Vinden de twee spiegels elkaar, dan drinkt de rest. Zitten ze fout, dan
   drinken zij. En wie een spiegel om de tuin leidde — die op jou wees terwijl
   je het niet was — mag uitdelen.
   ───────────────────────────────────────────────────────────── */

const PRAAT_SEC = 150
const STRAF_REST = 3
const STRAF_SPIEGELS = 4
const MISLEID_UITDELEN = 2
const RONDES = 2

interface SpiegelState {
  ronde: number
  fase: 'praten' | 'wijzen' | 'uitslag'
  groep: string
  klok: Klok | null

  _geheim: {
    /** de twee spelers met hetzelfde woord */
    spiegels: [string, string]
    woorden: Record<string, string>
    keuzes: Record<string, string>
  }

  /** wie er al gewezen heeft — dit mag iedereen zien */
  gewezen: string[]

  uitslag: {
    spiegels: [string, string]
    gelukt: boolean
    woorden: Record<string, string>
    keuzes: Record<string, string>
    misleiders: string[]
  } | null
  uitdeelRest: string[]
  klaar: boolean
}

function nieuweRonde(s: SpiegelState, ctx: SpelContext) {
  const groep = pak(ctx.rng, GROEPEN)
  const spelers = husselen(
    ctx.rng,
    ctx.spelers.map((p) => p.uid),
  )
  const woordenlijst = husselen(ctx.rng, groep.woorden)

  const woorden: Record<string, string> = {}
  // De eerste twee spelers krijgen hetzelfde woord, de rest allemaal iets
  // anders uit dezelfde groep.
  const gedeeld = woordenlijst[0]
  woorden[spelers[0]] = gedeeld
  woorden[spelers[1]] = gedeeld
  spelers.slice(2).forEach((uid, i) => {
    woorden[uid] = woordenlijst[i + 1]
  })

  s.groep = groep.naam
  s._geheim.spiegels = [spelers[0], spelers[1]]
  s._geheim.woorden = woorden
  s._geheim.keuzes = {}
  s.gewezen = []
  s.uitslag = null
  s.uitdeelRest = []
  s.fase = 'praten'
  s.klok = startKlok(PRAAT_SEC, ctx.nu)

  for (const p of ctx.spelers) {
    ctx.zetPrive(p.uid, { woord: woorden[p.uid], groep: groep.naam })
  }
}

export const spiegel: GameModule<SpiegelState> = {
  id: 'spiegel',
  naam: 'Spiegelspelers',
  uitleg: 'Twee mensen hebben hetzelfde woord. Vind elkaar zonder het te zeggen.',
  regels: [
    'Iedereen krijgt een woord uit dezelfde groep.',
    'Twee spelers hebben precies hetzelfde — misschien jij.',
    'Praat en hint, maar zeg je woord nooit hardop.',
    'Daarna wijs je aan wie jouw spiegel is.',
  ],
  minSpelers: 4,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['geheim', 'bluf', 'praten'],
  privescherm: true,

  init(ctx) {
    const s: SpiegelState = {
      ronde: 1,
      fase: 'praten',
      groep: '',
      klok: null,
      _geheim: { spiegels: ['', ''], woorden: {}, keuzes: {} },
      gewezen: [],
      uitslag: null,
      uitdeelRest: [],
      klaar: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'praten' && (actie.type === 'klaar-met-praten' || actie.type === 'tijd-op')) {
      s.fase = 'wijzen'
      s.klok = null
      return
    }

    if (s.fase === 'wijzen' && actie.type === 'wijs') {
      const doel = actie.payload?.uid
      if (!doel || doel === actie.uid || !iedereen.includes(doel)) return
      if (s._geheim.keuzes[actie.uid]) return

      s._geheim.keuzes[actie.uid] = doel
      if (!s.gewezen.includes(actie.uid)) s.gewezen.push(actie.uid)
      if (!iedereen.every((u) => s._geheim.keuzes[u])) return

      const [a, b] = s._geheim.spiegels
      const gelukt = s._geheim.keuzes[a] === b && s._geheim.keuzes[b] === a

      // Wie door een spiegel werd aangewezen terwijl hij het niet was, heeft
      // hem goed voor de gek gehouden.
      const misleiders = [s._geheim.keuzes[a], s._geheim.keuzes[b]].filter(
        (u) => u && u !== a && u !== b,
      )

      s.uitslag = {
        spiegels: [a, b],
        gelukt,
        woorden: { ...s._geheim.woorden },
        keuzes: { ...s._geheim.keuzes },
        misleiders: [...new Set(misleiders)],
      }
      s.fase = 'uitslag'

      if (gelukt) {
        ctx.iedereenDrinkt(STRAF_REST, 'de spiegels vonden elkaar', [a, b])
      } else {
        ctx.drink(a, STRAF_SPIEGELS, 'vond zijn spiegel niet')
        ctx.drink(b, STRAF_SPIEGELS, 'vond zijn spiegel niet')
        s.uitdeelRest = [...new Set(misleiders)]
      }
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'geef') {
      if (!s.uitdeelRest.includes(actie.uid)) return
      const verdeling: Record<string, number> = actie.payload?.verdeling
      if (!verdeling || typeof verdeling !== 'object') return
      for (const [uid, aantal] of Object.entries(verdeling)) {
        if (!iedereen.includes(uid) || uid === actie.uid) continue
        ctx.deelUitPrecies(actie.uid, uid, aantal, 'leidde een spiegel om de tuin')
      }
      s.uitdeelRest = s.uitdeelRest.filter((u) => u !== actie.uid)
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.klaar = true
        ctx.wisPrive()
        ctx.klaar()
        return
      }
      s.ronde++
      nieuweRonde(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    useHostKlok(ctx, s.fase === 'praten', s.klok?.eind ?? 0, 'tijd-op')

    const woord: string = ctx.prive?.woord ?? '…'
    const ikGewezen = s.gewezen.includes(ctx.ik)
    const magUitdelen = s.uitdeelRest.includes(ctx.ik)

    if (s.fase === 'uitslag' && s.uitslag) {
      const u = s.uitslag
      return (
        <>
          <div className="midden" style={{ gap: 10 }}>
            <div style={{ fontSize: 54 }}>{u.gelukt ? '🪞' : '🙈'}</div>
            <h1>{u.gelukt ? 'Gevonden!' : 'Elkaar misgelopen'}</h1>
            <Kaartje style={{ textAlign: 'center', borderColor: 'var(--goud)' }}>
              <div className="kop-klein">De spiegels waren</div>
              <h2>
                {ctx.naam(u.spiegels[0])} en {ctx.naam(u.spiegels[1])}
              </h2>
              <div className="klein zacht">met het woord "{u.woorden[u.spiegels[0]]}"</div>
            </Kaartje>

            <div style={{ display: 'grid', gap: 5, width: '100%' }}>
              {ctx.spelers.map((p) => (
                <div key={p.uid} className="kaartje balk" style={{ padding: 8, fontSize: 13 }}>
                  <span>
                    {p.emoji} <strong>{p.naam}</strong> — {u.woorden[p.uid]}
                  </span>
                  <span className="zacht">→ {ctx.naam(u.keuzes[p.uid])}</span>
                </div>
              ))}
            </div>

            {u.misleiders.length > 0 && !u.gelukt && (
              <div className="klein" style={{ color: 'var(--goud)' }}>
                {u.misleiders.map(ctx.naam).join(' en ')} hield een spiegel voor de gek
              </div>
            )}
          </div>

          <div className="onderaan">
            {magUitdelen ? (
              <Verdeler
                totaal={ctx.slokAantal(MISLEID_UITDELEN)}
                ctx={ctx}
                titel="Je misleidde een spiegel — deel uit"
                bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
              />
            ) : s.uitdeelRest.length > 0 ? (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">{s.uitdeelRest.map(ctx.naam).join(', ')} deelt uit…</span>
              </Kaartje>
            ) : ctx.benIkHost ? (
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
            Ronde {s.ronde}/{RONDES} · groep: {s.groep}
          </span>
          <span className="kop-klein">{s.fase === 'praten' ? 'praten' : 'wijzen'}</span>
        </div>

        <Kaartje style={{ textAlign: 'center', borderColor: 'var(--goud)' }}>
          <div className="kop-klein">🤫 Jouw woord</div>
          <h1 style={{ margin: '4px 0', color: 'var(--goud)' }}>{woord}</h1>
          <div className="klein zacht">Twee mensen hebben ditzelfde woord. Misschien jij.</div>
        </Kaartje>

        {s.fase === 'praten' ? (
          <>
            <div className="midden" style={{ gap: 10 }}>
              <div className="reusachtig" style={{ fontSize: 'clamp(36px,12vw,64px)' }}>
                {klokTekst(s.klok, ctx.nu)}
              </div>
              <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />
              <div className="klein zacht" style={{ textAlign: 'center' }}>
                Praat, hint, lieg. Zeg je woord nooit hardop —
                <br />
                ook niet als je denkt dat je je spiegel gevonden hebt.
              </div>
            </div>
            <div className="onderaan">
              {ctx.benIkHost && (
                <GroteKnop kleur="leeg" bijTik={() => ctx.stuur('klaar-met-praten')}>
                  Genoeg gepraat — wijzen
                </GroteKnop>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="midden" style={{ gap: 8 }}>
              <h2>{ikGewezen ? 'Je keuze staat vast' : 'Wie is jouw spiegel?'}</h2>
              <div className="klein zacht">
                {s.gewezen.length} van {ctx.spelers.length} gewezen
              </div>
              <SpelerBalk spelers={ctx.spelers} actief={s.gewezen} />
            </div>
            <div className="onderaan">
              {!ikGewezen && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {ctx.spelers
                    .filter((p) => p.uid !== ctx.ik)
                    .map((p) => (
                      <GroteKnop key={p.uid} bijTik={() => ctx.stuur('wijs', { uid: p.uid })}>
                        {p.emoji} {p.naam}
                      </GroteKnop>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </>
    )
  },
}

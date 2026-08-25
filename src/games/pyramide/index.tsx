import {
  nieuweStapel,
  trek,
  waardeVoluit,
  type Kaart,
  type Stapel,
} from '../../engine/deck'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, startKlok, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, SpelContext } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { Balkje, GroteKnop, Kaartje } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   PYRAMIDE

   Tien kaarten in een piramide, van onder naar boven 4-3-2-1 en waard 1 tot
   4 slokken. Gaat er een open en heb jij die waarde, dan leg je hem op en
   deel je uit.

   Bluffen mag hier wél — anders dan in Bussen, waar de race het in de weg
   zat. Hier is er niets anders te doen dan elkaar aankijken, en dan is de
   vraag "heeft hij hem echt?" het hele spel. Roept iemand "laat zien" en had
   je hem niet, dan drink je dubbel. Zat je goed, dan drinkt de uitdager.
   ───────────────────────────────────────────────────────────── */

const RIJEN = [4, 3, 2, 1]
const CLAIM_SEC = 10
const UITDAAG_SEC = 8
const HAND = 4

interface Plek {
  rij: number
  waarde: number
  kaart: Kaart | null
}

interface Claim {
  uid: string
  aantal: number
}

interface PyramideState {
  stapel: Stapel
  _geheim: {
    handen: Record<string, Kaart[]>
    piramideKaarten: Kaart[]
  }
  handGrootte: Record<string, number>

  piramide: Plek[]
  index: number
  fase: 'claimen' | 'uitdagen' | 'uitdelen' | 'klaar'
  klok: Klok | null

  claims: Claim[]
  gepast: string[]
  uitdagingen: { door: string; tegen: string }[]
  betrapt: string[]

  uitdeelVolgorde: string[]
  uitdeelIndex: number
}

function duwHand(s: PyramideState, ctx: SpelContext, uid: string) {
  const hand = s._geheim.handen[uid] ?? []
  s.handGrootte[uid] = hand.length
  ctx.zetPrive(uid, { hand })
}

function opentPlek(s: PyramideState, ctx: SpelContext) {
  const plek = s.piramide[s.index]
  plek.kaart = s._geheim.piramideKaarten[s.index]
  s.fase = 'claimen'
  s.klok = startKlok(CLAIM_SEC, ctx.nu)
  s.claims = []
  s.gepast = []
  s.uitdagingen = []
  s.betrapt = []
  s.uitdeelVolgorde = []
  s.uitdeelIndex = 0
}

function volgendePlek(s: PyramideState, ctx: SpelContext) {
  s.index++
  if (s.index >= s.piramide.length) {
    s.fase = 'klaar'
    ctx.wisPrive()
    ctx.klaar()
    return
  }
  opentPlek(s, ctx)
}

function aantalInHand(s: PyramideState, uid: string, waarde: number): number {
  return (s._geheim.handen[uid] ?? []).filter((k) => k.waarde === waarde).length
}

export const pyramide: GameModule<PyramideState> = {
  id: 'pyramide',
  naam: 'Pyramide',
  uitleg: 'Leg je kaart op en deel uit. Of doe alsof je hem hebt.',
  regels: [
    'Tien kaarten, de bovenste zijn het duurst.',
    'Heb je de waarde? Leg op en deel uit.',
    'Bluffen mag — je hoeft hem niet echt te hebben.',
    '"Laat zien!" en je betaalt dubbel als je loog.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['kaarten', 'bluf', 'geheim'],
  privescherm: true,

  init(ctx) {
    const stapel = nieuweStapel(ctx.rng)

    const piramide: Plek[] = []
    RIJEN.forEach((aantal, r) => {
      for (let i = 0; i < aantal; i++) {
        piramide.push({ rij: r + 1, waarde: r + 1, kaart: null })
      }
    })
    const piramideKaarten = piramide.map(() => trek(stapel, ctx.rng))

    const handen: Record<string, Kaart[]> = {}
    const handGrootte: Record<string, number> = {}
    for (const p of ctx.spelers) {
      const hand: Kaart[] = []
      for (let i = 0; i < HAND; i++) hand.push(trek(stapel, ctx.rng))
      handen[p.uid] = hand
      handGrootte[p.uid] = hand.length
      ctx.zetPrive(p.uid, { hand })
    }

    const s: PyramideState = {
      stapel,
      _geheim: { handen, piramideKaarten },
      handGrootte,
      piramide,
      index: 0,
      fase: 'claimen',
      klok: null,
      claims: [],
      gepast: [],
      uitdagingen: [],
      betrapt: [],
      uitdeelVolgorde: [],
      uitdeelIndex: 0,
    }
    opentPlek(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)
    if (s.fase === 'klaar') return
    const plek = s.piramide[s.index]
    const waarde = plek.kaart!.waarde
    const inzet = plek.waarde

    if (s.fase === 'claimen') {
      if (actie.type === 'claim') {
        const bestaand = s.claims.find((c) => c.uid === actie.uid)
        if (bestaand) bestaand.aantal = Math.min(HAND, bestaand.aantal + 1)
        else s.claims.push({ uid: actie.uid, aantal: 1 })
        s.gepast = s.gepast.filter((u) => u !== actie.uid)
      } else if (actie.type === 'pas') {
        if (!s.gepast.includes(actie.uid)) s.gepast.push(actie.uid)
        s.claims = s.claims.filter((c) => c.uid !== actie.uid)
      } else if (actie.type !== 'sluit-claim') {
        return
      }

      const iedereenKlaar = volgorde.every(
        (u) => s.gepast.includes(u) || s.claims.some((c) => c.uid === u),
      )
      if (actie.type !== 'sluit-claim' && !iedereenKlaar) return

      if (s.claims.length === 0) {
        ctx.log(`Niemand claimde een ${waardeVoluit(waarde)}`)
        volgendePlek(s, ctx)
        return
      }
      s.fase = 'uitdagen'
      s.klok = startKlok(UITDAAG_SEC, ctx.nu)
      return
    }

    if (s.fase === 'uitdagen') {
      if (actie.type === 'daag') {
        const tegen = actie.payload?.uid
        if (!tegen || tegen === actie.uid) return
        if (!s.claims.some((c) => c.uid === tegen)) return
        if (s.uitdagingen.some((u) => u.door === actie.uid)) return
        s.uitdagingen.push({ door: actie.uid, tegen })
        return
      }
      if (actie.type !== 'sluit-uitdagen') return

      for (const uitdaging of s.uitdagingen) {
        const claim = s.claims.find((c) => c.uid === uitdaging.tegen)
        if (!claim) continue
        const echt = aantalInHand(s, uitdaging.tegen, waarde)

        if (echt >= claim.aantal) {
          ctx.drink(
            uitdaging.door,
            inzet * 2,
            `daagde ${ctx.naam(uitdaging.tegen)} onterecht uit`,
          )
        } else {
          ctx.drink(uitdaging.tegen, inzet * 2, 'bluf betrapt')
          if (!s.betrapt.includes(uitdaging.tegen)) s.betrapt.push(uitdaging.tegen)
        }
      }

      // Betrapte bluffers delen niets uit. Wie niet betrapt is wel — ook als
      // hij loog. Dat is de beloning voor durf.
      const eerlijk = s.claims.filter((c) => !s.betrapt.includes(c.uid))
      const uitdeel: string[] = []
      for (const claim of eerlijk) {
        for (let i = 0; i < claim.aantal; i++) uitdeel.push(claim.uid)

        // Wat je écht had raak je kwijt.
        const hand = s._geheim.handen[claim.uid] ?? []
        const kwijt = Math.min(aantalInHand(s, claim.uid, waarde), claim.aantal)
        for (let i = 0; i < kwijt; i++) {
          const idx = hand.findIndex((k) => k.waarde === waarde)
          if (idx >= 0) hand.splice(idx, 1)
        }
        s._geheim.handen[claim.uid] = hand
        duwHand(s, ctx, claim.uid)
      }

      if (uitdeel.length === 0) {
        volgendePlek(s, ctx)
        return
      }
      s.uitdeelVolgorde = uitdeel
      s.uitdeelIndex = 0
      s.fase = 'uitdelen'
      s.klok = null
      return
    }

    if (s.fase === 'uitdelen') {
      const aanZet = s.uitdeelVolgorde[s.uitdeelIndex]

      if (actie.type === 'sla-over') {
        s.uitdeelIndex++
        if (s.uitdeelIndex >= s.uitdeelVolgorde.length) volgendePlek(s, ctx)
        return
      }
      if (actie.type !== 'geef' || actie.uid !== aanZet) return

      const verdeling: Record<string, number> = actie.payload?.verdeling
      if (!verdeling || typeof verdeling !== 'object') return
      for (const [uid, aantal] of Object.entries(verdeling)) {
        if (!volgorde.includes(uid) || uid === aanZet) continue
        ctx.deelUitPrecies(aanZet, uid, aantal, `piramide rij ${plek.rij}`)
      }

      s.uitdeelIndex++
      if (s.uitdeelIndex >= s.uitdeelVolgorde.length) volgendePlek(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.fase === 'klaar',

  View({ state: s, ctx }) {
    const plek = s.piramide[s.index]
    const inzet = plek?.waarde ?? 1
    const hand: Kaart[] = ctx.prive?.hand ?? []
    const passend = plek?.kaart ? hand.filter((k) => k.waarde === plek.kaart!.waarde).length : 0

    useHostKlok(ctx, s.fase === 'claimen', s.klok?.eind ?? 0, 'sluit-claim')
    useHostKlok(ctx, s.fase === 'uitdagen', s.klok?.eind ?? 0, 'sluit-uitdagen')

    const ikGeclaimd = s.claims.find((c) => c.uid === ctx.ik)
    const ikGepast = s.gepast.includes(ctx.ik)
    const aanZet = s.uitdeelVolgorde[s.uitdeelIndex]

    return (
      <>
        <Piramide s={s} />

        <div style={{ textAlign: 'center' }}>
          <div className="kop-klein">
            Rij {plek?.rij} · {ctx.slok(inzet)}
          </div>
        </div>

        {s.klok && <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />}

        {s.fase === 'claimen' && (
          <>
            <div className="midden" style={{ gap: 8 }}>
              <div className="reusachtig" style={{ fontSize: 'clamp(32px,10vw,56px)' }}>
                {klokTekst(s.klok, ctx.nu)}
              </div>
              {s.claims.length > 0 && (
                <div className="klein zacht">
                  Claimt: {s.claims.map((c) => ctx.naam(c.uid)).join(', ')}
                </div>
              )}
              <MijnHand hand={hand} raak={plek?.kaart?.waarde} />
            </div>

            <div className="onderaan">
              <div className="rij">
                <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('claim')}>
                  Ik heb hem {ikGeclaimd ? `(${ikGeclaimd.aantal})` : ''}
                </GroteKnop>
                <GroteKnop
                  kleur={ikGepast ? 'leeg' : 'grijs'}
                  enorm
                  uit={ikGepast}
                  bijTik={() => ctx.stuur('pas')}
                >
                  Ik heb niks
                </GroteKnop>
              </div>
              <div className="klein zacht" style={{ textAlign: 'center' }}>
                {passend > 0
                  ? `Je hebt er ${passend} echt.`
                  : 'Je hebt hem niet — maar dat hoeft niemand te weten. 😏'}
              </div>
            </div>
          </>
        )}

        {s.fase === 'uitdagen' && (
          <div className="onderaan" style={{ marginTop: 'auto' }}>
            <div className="kop-klein" style={{ textAlign: 'center' }}>
              Wie bluft er? {klokTekst(s.klok, ctx.nu)}s
            </div>
            {s.claims.map((c) => (
              <GroteKnop
                key={c.uid}
                klein
                kleur={s.uitdagingen.some((u) => u.tegen === c.uid) ? 'rood' : 'leeg'}
                uit={c.uid === ctx.ik || s.uitdagingen.some((u) => u.door === ctx.ik)}
                bijTik={() => ctx.stuur('daag', { uid: c.uid })}
              >
                {ctx.naam(c.uid)}
                {c.aantal > 1 ? ` (${c.aantal}×)` : ''} — laat zien!
              </GroteKnop>
            ))}
            <div className="klein zacht" style={{ textAlign: 'center' }}>
              Betrapt = {ctx.slok(inzet * 2)} voor hem. Mis = {ctx.slok(inzet * 2)} voor jou.
            </div>
          </div>
        )}

        {s.fase === 'uitdelen' && (
          <div className="onderaan" style={{ marginTop: 'auto' }}>
            {s.betrapt.length > 0 && (
              <div className="klein" style={{ textAlign: 'center', color: 'var(--rood)' }}>
                Betrapt: {s.betrapt.map(ctx.naam).join(', ')}
              </div>
            )}
            {aanZet === ctx.ik ? (
              <Verdeler
                key={`${s.index}-${s.uitdeelIndex}`}
                totaal={ctx.slokAantal(inzet)}
                ctx={ctx}
                titel={`Rij ${plek.rij} — deel uit`}
                bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
              />
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">{ctx.naam(aanZet)} deelt uit…</span>
              </Kaartje>
            )}
            {ctx.benIkHost && aanZet !== ctx.ik && (
              <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('sla-over')}>
                Sla over
              </GroteKnop>
            )}
          </div>
        )}
      </>
    )
  },
}

function Piramide({ s }: { s: PyramideState }) {
  const rijen: Plek[][] = []
  let i = 0
  for (const aantal of RIJEN) {
    rijen.push(s.piramide.slice(i, i + aantal))
    i += aantal
  }
  rijen.reverse()

  let index = s.piramide.length
  return (
    <div className="boom">
      {rijen.map((rij, r) => {
        index -= rij.length
        return (
          <div className="boom-rij" key={r}>
            {rij.map((plek, k) => {
              const echteIndex = index + k
              return (
                <div
                  key={echteIndex}
                  className={`boom-plek ${echteIndex === s.index ? 'nu' : ''}`}
                >
                  <Speelkaart kaart={plek.kaart} maat="klein" dicht={!plek.kaart} />
                  <span className="badge">{plek.waarde}</span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function MijnHand({ hand, raak }: { hand: Kaart[]; raak?: number }) {
  if (hand.length === 0) {
    return (
      <div className="klein" style={{ color: 'var(--groen)' }}>
        Je hand is leeg 🎉
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {hand.map((k) => (
        <div
          key={k.id}
          style={{
            outline: raak === k.waarde ? '3px solid var(--goud)' : 'none',
            outlineOffset: 2,
            borderRadius: 14,
          }}
        >
          <Speelkaart kaart={k} maat="klein" />
        </div>
      ))}
    </div>
  )
}

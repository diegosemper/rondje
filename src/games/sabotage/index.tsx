import { useState } from 'react'
import { husselen } from '../../engine/random'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, startKlok, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { SABOTAGE_REGELS } from './regels'

/* ─────────────────────────────────────────────────────────────
   SABOTAGE

   Iedereen krijgt een geheim verbod. Vier minuten lang gewoon doorpraten en
   drinken, maar jij mag geen "ja" zeggen, of alleen met links drinken.

   Aan het eind wijs je aan wie je doorhad — je kiest een speler en typt wat
   je denkt dat zijn regel was. De app beoordeelt het niet woord voor woord;
   de betrapte bevestigt zelf of je gelijk had. Dat is eerlijker dan een
   computer die op letters vergelijkt, en het levert meer geschreeuw op.

   Ontsnappen loont: wie niemand doorhad, deelt uit.
   ───────────────────────────────────────────────────────────── */

const PRAAT_SEC = 240
const STRAF_BETRAPT = 4
const ONTSNAPT_UITDELEN = 4
const RONDES = 2

interface Beschuldiging {
  door: string
  tegen: string
  gok: string
  /** null zolang de beschuldigde nog niet geoordeeld heeft */
  klopt: boolean | null
}

interface SabotageState {
  ronde: number
  fase: 'praten' | 'beschuldigen' | 'oordelen' | 'uitslag'
  klok: Klok | null

  _geheim: { regels: Record<string, string> }

  /** wie er al beschuldigd heeft — dit mag iedereen zien */
  klaar: string[]
  beschuldigingen: Beschuldiging[]
  oordeelIndex: number

  onthuld: Record<string, string> | null
  betrapt: string[]
  ontsnapt: string[]
  uitdeelRest: string[]
  klaarMetSpel: boolean
}

function nieuweRonde(s: SabotageState, ctx: SpelContext) {
  const lijst = husselen(ctx.rng, SABOTAGE_REGELS)
  s._geheim.regels = {}
  ctx.spelers.forEach((p, i) => {
    s._geheim.regels[p.uid] = lijst[i % lijst.length]
    ctx.zetPrive(p.uid, { regel: lijst[i % lijst.length] })
  })
  s.fase = 'praten'
  s.klok = startKlok(PRAAT_SEC, ctx.nu)
  s.klaar = []
  s.beschuldigingen = []
  s.oordeelIndex = 0
  s.onthuld = null
  s.betrapt = []
  s.ontsnapt = []
  s.uitdeelRest = []
}

function naOordelen(s: SabotageState, ctx: SpelContext) {
  const iedereen = ctx.spelers.map((p) => p.uid)

  const raak = s.beschuldigingen.filter((b) => b.klopt === true)
  s.betrapt = [...new Set(raak.map((b) => b.tegen))]
  s.ontsnapt = iedereen.filter((u) => !s.betrapt.includes(u))

  for (const uid of s.betrapt) {
    ctx.drink(uid, STRAF_BETRAPT, 'zijn regel werd doorzien')
  }
  s.onthuld = { ...s._geheim.regels }
  s.uitdeelRest = [...s.ontsnapt]
  s.fase = 'uitslag'
}

export const sabotage: GameModule<SabotageState> = {
  id: 'sabotage',
  naam: 'Sabotage',
  uitleg: 'Iedereen heeft een geheim verbod. Wie doorziet wie?',
  regels: [
    'Je krijgt een geheime regel voor jezelf.',
    'Hou hem vier minuten vol zonder op te vallen.',
    'Let ondertussen op de anderen.',
    'Doorzien kost 4. Ontsnappen levert 4 op.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['geheim', 'bluf', 'praten'],
  privescherm: true,

  init(ctx) {
    const s: SabotageState = {
      ronde: 1,
      fase: 'praten',
      klok: null,
      _geheim: { regels: {} },
      klaar: [],
      beschuldigingen: [],
      oordeelIndex: 0,
      onthuld: null,
      betrapt: [],
      ontsnapt: [],
      uitdeelRest: [],
      klaarMetSpel: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'praten' && (actie.type === 'tijd-op' || actie.type === 'klaar-met-praten')) {
      s.fase = 'beschuldigen'
      s.klok = null
      return
    }

    if (s.fase === 'beschuldigen') {
      if (actie.type === 'beschuldig') {
        if (s.klaar.includes(actie.uid)) return
        const tegen = actie.payload?.uid
        const gok = String(actie.payload?.gok ?? '').trim().slice(0, 80)
        if (tegen && tegen !== actie.uid && iedereen.includes(tegen) && gok.length >= 3) {
          s.beschuldigingen.push({ door: actie.uid, tegen, gok, klopt: null })
        }
        s.klaar.push(actie.uid)
      } else if (actie.type === 'sla-beschuldiging-over') {
        if (!s.klaar.includes(actie.uid)) s.klaar.push(actie.uid)
      } else {
        return
      }

      if (!iedereen.every((u) => s.klaar.includes(u))) return

      if (s.beschuldigingen.length === 0) {
        ctx.log('Niemand durfde te beschuldigen')
        naOordelen(s, ctx)
        return
      }
      s.fase = 'oordelen'
      s.oordeelIndex = 0
      return
    }

    if (s.fase === 'oordelen' && actie.type === 'oordeel') {
      const b = s.beschuldigingen[s.oordeelIndex]
      if (!b || actie.uid !== b.tegen) return
      b.klopt = !!actie.payload?.klopt
      s.oordeelIndex++
      if (s.oordeelIndex >= s.beschuldigingen.length) naOordelen(s, ctx)
      return
    }

    if (s.fase === 'uitslag') {
      if (actie.type === 'geef' && s.uitdeelRest.includes(actie.uid)) {
        const verdeling: Record<string, number> = actie.payload?.verdeling
        if (!verdeling || typeof verdeling !== 'object') return
        for (const [uid, aantal] of Object.entries(verdeling)) {
          if (!iedereen.includes(uid) || uid === actie.uid) continue
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'niemand had zijn regel door')
        }
        s.uitdeelRest = s.uitdeelRest.filter((u) => u !== actie.uid)
        return
      }

      if (actie.type === 'verder') {
        if (s.ronde >= RONDES) {
          s.klaarMetSpel = true
          ctx.wisPrive()
          ctx.klaar()
          return
        }
        s.ronde++
        nieuweRonde(s, ctx)
        return
      }
    }
  },

  isKlaar: (s) => s.klaarMetSpel,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

function Scherm({ s, ctx }: { s: SabotageState; ctx: KijkContext }) {
  useHostKlok(ctx, s.fase === 'praten', s.klok?.eind ?? 0, 'tijd-op')
  const regel: string = ctx.prive?.regel ?? '…'

  if (s.fase === 'praten') {
    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Ronde {s.ronde}/{RONDES}
          </span>
          <span className="kop-klein">gewoon doorpraten</span>
        </div>

        <Kaartje style={{ textAlign: 'center', borderColor: 'var(--goud)' }}>
          <div className="kop-klein">🤫 Jouw geheime regel</div>
          <h2 style={{ margin: '6px 0', color: 'var(--goud)' }}>{regel}</h2>
        </Kaartje>

        <div className="midden" style={{ gap: 10 }}>
          <div className="reusachtig" style={{ fontSize: 'clamp(36px,12vw,64px)' }}>
            {klokTekst(s.klok, ctx.nu)}
          </div>
          <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />
          <div className="klein zacht" style={{ textAlign: 'center' }}>
            Iedereen heeft een andere regel.
            <br />
            Hou de jouwe vol én let op de rest.
          </div>
        </div>

        <div className="onderaan">
          {ctx.benIkHost && (
            <GroteKnop kleur="leeg" bijTik={() => ctx.stuur('klaar-met-praten')}>
              Genoeg — beschuldigen
            </GroteKnop>
          )}
        </div>
      </>
    )
  }

  if (s.fase === 'beschuldigen') return <Beschuldigen s={s} ctx={ctx} />
  if (s.fase === 'oordelen') return <Oordelen s={s} ctx={ctx} />
  return <Uitslag s={s} ctx={ctx} />
}

function Beschuldigen({ s, ctx }: { s: SabotageState; ctx: KijkContext }) {
  const [doel, zetDoel] = useState<string | null>(null)
  const [gok, zetGok] = useState('')
  const ikKlaar = s.klaar.includes(ctx.ik)

  if (ikKlaar) {
    return (
      <div className="midden" style={{ gap: 10 }}>
        <div style={{ fontSize: 48 }}>🤐</div>
        <h2 className="zacht">Ingeleverd</h2>
        <div className="klein zacht">
          {s.klaar.length} van {ctx.spelers.length}
        </div>
        <SpelerBalk spelers={ctx.spelers} actief={s.klaar} />
      </div>
    )
  }

  return (
    <>
      <div className="kop-klein" style={{ textAlign: 'center' }}>
        Wie had jij door? En wat was zijn regel?
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {ctx.spelers
          .filter((p) => p.uid !== ctx.ik)
          .map((p) => (
            <GroteKnop
              key={p.uid}
              klein
              kleur={doel === p.uid ? 'goud' : 'leeg'}
              bijTik={() => zetDoel(p.uid)}
            >
              {p.emoji} {p.naam}
            </GroteKnop>
          ))}
      </div>

      <div className="onderaan" style={{ marginTop: 'auto' }}>
        <input
          value={gok}
          onChange={(e) => zetGok(e.target.value.slice(0, 80))}
          placeholder="wat was zijn regel?"
          autoComplete="off"
        />
        <GroteKnop
          kleur="goud"
          uit={!doel || gok.trim().length < 3}
          bijTik={() => ctx.stuur('beschuldig', { uid: doel, gok })}
        >
          Beschuldigen
        </GroteKnop>
        <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('sla-beschuldiging-over')}>
          Ik had niemand door
        </GroteKnop>
      </div>
    </>
  )
}

function Oordelen({ s, ctx }: { s: SabotageState; ctx: KijkContext }) {
  const b = s.beschuldigingen[s.oordeelIndex]
  const ikBenHet = b?.tegen === ctx.ik
  const regel: string = ctx.prive?.regel ?? ''

  return (
    <>
      <div className="kop-klein" style={{ textAlign: 'center' }}>
        Beschuldiging {s.oordeelIndex + 1} van {s.beschuldigingen.length}
      </div>

      <div className="midden" style={{ gap: 12 }}>
        <Kaartje style={{ textAlign: 'center', width: '100%' }}>
          <div className="klein zacht">{ctx.naam(b.door)} zegt over {ctx.naam(b.tegen)}</div>
          <h2 style={{ margin: '6px 0' }}>"{b.gok}"</h2>
        </Kaartje>

        {ikBenHet && (
          <Kaartje style={{ textAlign: 'center', borderColor: 'var(--goud)', width: '100%' }}>
            <div className="kop-klein">Jouw echte regel</div>
            <strong style={{ color: 'var(--goud)' }}>{regel}</strong>
          </Kaartje>
        )}
      </div>

      <div className="onderaan">
        {ikBenHet ? (
          <>
            <div className="kop-klein" style={{ textAlign: 'center' }}>
              Had hij het door? Jij beslist — eerlijk zijn.
            </div>
            <div className="rij">
              <GroteKnop kleur="rood" enorm bijTik={() => ctx.stuur('oordeel', { klopt: true })}>
                Ja, betrapt
              </GroteKnop>
              <GroteKnop kleur="groen" enorm bijTik={() => ctx.stuur('oordeel', { klopt: false })}>
                Nee, mis
              </GroteKnop>
            </div>
          </>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">{ctx.naam(b.tegen)} beslist of dit klopt…</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

function Uitslag({ s, ctx }: { s: SabotageState; ctx: KijkContext }) {
  const magUitdelen = s.uitdeelRest.includes(ctx.ik)

  return (
    <>
      <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
        <h1 style={{ textAlign: 'center' }}>Alle regels</h1>
        {ctx.spelers.map((p) => {
          const betrapt = s.betrapt.includes(p.uid)
          return (
            <div
              key={p.uid}
              className="kaartje"
              style={{
                borderColor: betrapt ? 'var(--rood)' : 'var(--groen)',
                background: betrapt ? 'var(--rood-donker)' : undefined,
              }}
            >
              <div className="balk">
                <strong>
                  {p.emoji} {p.naam}
                </strong>
                <span className="klein">{betrapt ? '🎯 betrapt' : '🥷 ontsnapt'}</span>
              </div>
              <div className="klein zacht">{s.onthuld?.[p.uid]}</div>
            </div>
          )
        })}
      </div>

      <div className="onderaan">
        {magUitdelen ? (
          <Verdeler
            totaal={ctx.slokAantal(ONTSNAPT_UITDELEN)}
            ctx={ctx}
            titel="Niemand had je door — deel uit"
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

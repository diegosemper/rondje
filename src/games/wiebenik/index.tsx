import { useState } from 'react'
import { husselen } from '../../engine/random'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { WIE_WOORDEN } from './woorden'

/* ─────────────────────────────────────────────────────────────
   WIE BEN IK

   Je krijgt een woord dat iedereen ziet behalve jij — een briefje op je
   voorhoofd, maar dan digitaal en zonder plakband.

   Om de beurt stel je één ja-nee-vraag, hardop. Elke vraag kost je een slok,
   dus eindeloos doorvragen is duur. Denk je het te weten, dan gok je.

   Aan een tafel moet iemand de briefjes schrijven en zit die persoon zelf
   nooit lekker in het spel. Hier doet de app dat, en speelt iedereen mee.
   ───────────────────────────────────────────────────────────── */

const KOSTEN_VRAAG = 1
const STRAF_MISGOK = 2
const STRAF_NIET_GERADEN = 5
const GOED_UITDELEN = 3
const MAX_VRAGEN = 40

function normaliseer(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

interface WieState {
  beurt: string
  woorden: Record<string, string>
  klaarMet: string[]
  vragen: Record<string, number>
  gesteld: number
  laatsteGok: { uid: string; gok: string; goed: boolean } | null
  fase: 'spelen' | 'uitdelen' | 'uitslag'
  uitdeelRij: string[]
  uitdeelIndex: number
  klaar: boolean
}

function volgendeBeurt(s: WieState, ctx: SpelContext) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  let kandidaat = s.beurt
  for (let i = 0; i < volgorde.length; i++) {
    kandidaat = volgende(volgorde, kandidaat)
    if (!s.klaarMet.includes(kandidaat)) {
      s.beurt = kandidaat
      return
    }
  }
  eindig(s, ctx)
}

function eindig(s: WieState, ctx: SpelContext) {
  for (const p of ctx.spelers) {
    if (!s.klaarMet.includes(p.uid)) {
      ctx.drink(p.uid, STRAF_NIET_GERADEN, `raadde "${s.woorden[p.uid]}" niet`)
    }
  }
  s.fase = s.uitdeelRij.length > 0 ? 'uitdelen' : 'uitslag'
  s.uitdeelIndex = 0
}

export const wiebenik: GameModule<WieState> = {
  id: 'wiebenik',
  naam: 'Wie Ben Ik',
  uitleg: 'Iedereen ziet jouw woord behalve jij. Elke vraag kost een slok.',
  regels: [
    'Je krijgt een woord dat je zelf niet ziet.',
    'Om de beurt één ja-nee-vraag, hardop.',
    'Elke vraag kost je een slok.',
    'Goed geraden? Je deelt uit. Nooit geraden? Je drinkt 5.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['praten', 'geheim'],
  privescherm: true,

  init(ctx) {
    const lijst = husselen(ctx.rng, WIE_WOORDEN)
    const woorden: Record<string, string> = {}
    ctx.spelers.forEach((p, i) => {
      woorden[p.uid] = lijst[i % lijst.length]
    })

    // Iedereen krijgt de woorden van alle ánderen op zijn scherm.
    for (const p of ctx.spelers) {
      const anderen: Record<string, string> = {}
      for (const q of ctx.spelers) {
        if (q.uid !== p.uid) anderen[q.uid] = woorden[q.uid]
      }
      ctx.zetPrive(p.uid, { anderen })
    }

    return {
      beurt: ctx.spelers[0].uid,
      woorden,
      klaarMet: [],
      vragen: {},
      gesteld: 0,
      laatsteGok: null,
      fase: 'spelen',
      uitdeelRij: [],
      uitdeelIndex: 0,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'spelen') {
      if (actie.type === 'vraag') {
        if (actie.uid !== s.beurt) return
        s.vragen[actie.uid] = (s.vragen[actie.uid] ?? 0) + 1
        s.gesteld++
        ctx.drink(actie.uid, KOSTEN_VRAAG, 'stelde een vraag')
        if (s.gesteld >= MAX_VRAGEN) {
          eindig(s, ctx)
          return
        }
        volgendeBeurt(s, ctx)
        return
      }

      if (actie.type === 'gok') {
        if (actie.uid !== s.beurt) return
        const gok = String(actie.payload?.woord ?? '').trim().slice(0, 40)
        if (gok.length < 2) return
        const echt = s.woorden[actie.uid]
        const goed =
          normaliseer(gok) === normaliseer(echt) ||
          (normaliseer(gok).length >= 4 && normaliseer(echt).includes(normaliseer(gok)))

        s.laatsteGok = { uid: actie.uid, gok, goed }

        if (goed) {
          s.klaarMet.push(actie.uid)
          s.uitdeelRij.push(actie.uid)
          ctx.log(`${ctx.naam(actie.uid)} raadde "${echt}" na ${s.vragen[actie.uid] ?? 0} vragen`)
          if (s.klaarMet.length >= iedereen.length) {
            eindig(s, ctx)
            return
          }
        } else {
          ctx.drink(actie.uid, STRAF_MISGOK, `gokte "${gok}" — mis`)
        }
        volgendeBeurt(s, ctx)
        return
      }

      if (actie.type === 'stoppen') {
        eindig(s, ctx)
        return
      }
      return
    }

    if (s.fase === 'uitdelen' && actie.type === 'geef') {
      const aanZet = s.uitdeelRij[s.uitdeelIndex]
      if (actie.uid !== aanZet) return
      const verdeling: Record<string, number> = actie.payload?.verdeling
      if (!verdeling || typeof verdeling !== 'object') return
      for (const [uid, aantal] of Object.entries(verdeling)) {
        if (!iedereen.includes(uid) || uid === aanZet) continue
        ctx.deelUitPrecies(aanZet, uid, aantal, 'raadde zijn eigen woord')
      }
      s.uitdeelIndex++
      if (s.uitdeelIndex >= s.uitdeelRij.length) s.fase = 'uitslag'
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      s.klaar = true
      ctx.wisPrive()
      ctx.klaar()
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

function Scherm({ s, ctx }: { s: WieState; ctx: KijkContext }) {
  const [gok, zetGok] = useState('')
  const anderen: Record<string, string> = ctx.prive?.anderen ?? {}
  const mijnBeurt = ctx.ik === s.beurt && s.fase === 'spelen'
  const ikKlaar = s.klaarMet.includes(ctx.ik)

  if (s.fase === 'uitdelen') {
    const aanZet = s.uitdeelRij[s.uitdeelIndex]
    return (
      <div className="onderaan" style={{ marginTop: 'auto' }}>
        {aanZet === ctx.ik ? (
          <Verdeler
            key={s.uitdeelIndex}
            totaal={ctx.slokAantal(GOED_UITDELEN)}
            ctx={ctx}
            titel="Je raadde jezelf — deel uit"
            bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
          />
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">{ctx.naam(aanZet)} raadde het en deelt uit…</span>
          </Kaartje>
        )}
      </div>
    )
  }

  if (s.fase === 'uitslag') {
    return (
      <>
        <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
          <h1 style={{ textAlign: 'center' }}>Alle woorden</h1>
          {ctx.spelers.map((p) => {
            const gelukt = s.klaarMet.includes(p.uid)
            return (
              <div
                key={p.uid}
                className="kaartje balk"
                style={{
                  borderColor: gelukt ? 'var(--groen)' : 'var(--rood)',
                  background: gelukt ? undefined : 'var(--rood-donker)',
                }}
              >
                <span>
                  {p.emoji} <strong>{p.naam}</strong> — {s.woorden[p.uid]}
                </span>
                <span className="klein">
                  {gelukt ? `✓ na ${s.vragen[p.uid] ?? 0} vragen` : '✗'}
                </span>
              </div>
            )
          })}
        </div>
        <div className="onderaan">
          {ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
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

  return (
    <>
      <div className="balk">
        <span className="kop-klein">{s.gesteld} vragen gesteld</span>
        <span className="kop-klein">elke vraag kost {ctx.slokKort(KOSTEN_VRAAG)}</span>
      </div>

      <SpelerBalk spelers={ctx.spelers} actief={s.beurt} />

      <div style={{ display: 'grid', gap: 6 }}>
        <div className="kop-klein" style={{ textAlign: 'center' }}>
          Op jouw voorhoofd
        </div>
        <Kaartje style={{ textAlign: 'center', borderColor: 'var(--goud)' }}>
          <div style={{ fontSize: 30, letterSpacing: 4 }}>██████</div>
          <div className="klein zacht">jij ziet dit niet</div>
        </Kaartje>

        <div className="kop-klein" style={{ textAlign: 'center', marginTop: 4 }}>
          En de rest heeft
        </div>
        <div style={{ display: 'grid', gap: 5 }}>
          {ctx.spelers
            .filter((p) => p.uid !== ctx.ik)
            .map((p) => (
              <div
                key={p.uid}
                className="kaartje balk"
                style={{ padding: 8, opacity: s.klaarMet.includes(p.uid) ? 0.45 : 1 }}
              >
                <span>
                  {p.emoji} {p.naam}
                </span>
                <strong>{anderen[p.uid] ?? '…'}</strong>
              </div>
            ))}
        </div>
      </div>

      {s.laatsteGok && (
        <div
          className="klein"
          style={{ textAlign: 'center', color: s.laatsteGok.goed ? 'var(--groen)' : 'var(--rood)' }}
        >
          {ctx.naam(s.laatsteGok.uid)} gokte "{s.laatsteGok.gok}" — {s.laatsteGok.goed ? 'goed!' : 'mis'}
        </div>
      )}

      <div className="onderaan">
        {ikKlaar ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Je hebt hem al — laat de rest zwoegen</span>
          </Kaartje>
        ) : mijnBeurt ? (
          <>
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('vraag')}>
              Vraag gesteld — {ctx.slokKort(KOSTEN_VRAAG)}
            </GroteKnop>
            <input
              value={gok}
              onChange={(e) => zetGok(e.target.value.slice(0, 40))}
              placeholder="of gok wie je bent…"
              autoComplete="off"
            />
            <GroteKnop
              kleur="groen"
              uit={gok.trim().length < 2}
              bijTik={() => {
                ctx.stuur('gok', { woord: gok })
                zetGok('')
              }}
            >
              Dit ben ik
            </GroteKnop>
            <div className="klein zacht" style={{ textAlign: 'center' }}>
              Mis gokken kost {ctx.slok(STRAF_MISGOK)}.
            </div>
          </>
        ) : (
          <>
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">
                {ctx.speler(s.beurt)?.emoji} {ctx.naam(s.beurt)} is aan de beurt
              </span>
            </Kaartje>
            {ctx.benIkHost && (
              <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('stoppen')}>
                Genoeg — antwoorden tonen
              </GroteKnop>
            )}
          </>
        )}
      </div>
    </>
  )
}


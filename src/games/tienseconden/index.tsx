import { useRef, useState } from 'react'
import { tussen } from '../../engine/random'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   BLINDE KLOK

   Je krijgt een doeltijd — elke ronde een andere, ergens tussen de tien en
   negentig seconden, tot op een tiende nauwkeurig. Je start een stopwatch die
   je niet kunt zien en stopt hem als je denkt dat je er bent. Geen klok, geen
   balkje, niets.

   Het doel wisselt met opzet: op een vaste tien seconden leer je binnen twee
   rondes het ritme, en dan is er niets meer aan. Op 47,3 moet je echt tellen.

   De meting gebeurt op je eigen telefoon en gaat niet over het netwerk: een
   halve seconde vertraging zou hier het hele verschil zijn.
   ───────────────────────────────────────────────────────────── */

const DOEL_MIN = 10
const DOEL_MAX = 90
const RONDES = 3
const MAX_STRAF = 5
const WINST_UITDELEN = 5

/** "47,3" — met een komma, want we tellen in het Nederlands. */
function toon(seconden: number): string {
  return seconden.toFixed(1).replace('.', ',')
}

interface TienState {
  ronde: number
  fase: 'meten' | 'uitslag'
  /** de doeltijd van deze ronde, in milliseconden */
  doel: number
  /** de gemeten tijd in milliseconden per speler */
  tijden: Record<string, number>
  klaarMet: string[]
  winnaar: string | null
  magUitdelen: boolean
  klaar: boolean
}

/** Een doel tussen 10,0 en 90,0 seconden, op een tiende. */
function nieuwDoel(ctx: SpelContext): number {
  return tussen(ctx.rng, DOEL_MIN * 10, DOEL_MAX * 10) * 100
}

function rondAf(s: TienState, ctx: SpelContext) {
  const rij = ctx.spelers
    .map((p) => ({ uid: p.uid, af: Math.abs((s.tijden[p.uid] ?? 999999) - s.doel) }))
    .sort((a, b) => a.af - b.af)

  s.winnaar = rij[0]?.uid ?? null
  s.fase = 'uitslag'

  rij.forEach((r, i) => {
    if (i === 0) return
    ctx.drink(r.uid, Math.min(MAX_STRAF, i), `${(r.af / 1000).toFixed(1)}s ernaast`)
  })
  if (s.winnaar) s.magUitdelen = true
}

export const tienseconden: GameModule<TienState> = {
  id: 'tienseconden',
  naam: 'Blinde Klok',
  uitleg: 'Stop de onzichtbare stopwatch op de doeltijd. Elke ronde een andere.',
  regels: [
    'Je krijgt een doeltijd tussen 10 en 90 seconden.',
    'Tik op START en dan zie je niets meer.',
    'Tik op STOP als je denkt dat je er bent.',
    'Wie er het verst naast zit, drinkt het meest.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['reflex', 'chaos'],
  privescherm: false,

  init(ctx) {
    return {
      ronde: 1,
      fase: 'meten',
      doel: nieuwDoel(ctx),
      tijden: {},
      klaarMet: [],
      winnaar: null,
      magUitdelen: false,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'meten' && actie.type === 'gemeten') {
      if (s.tijden[actie.uid] !== undefined) return
      const ms = Number(actie.payload?.ms)
      if (!Number.isFinite(ms)) return
      s.tijden[actie.uid] = Math.max(0, Math.round(ms))
      s.klaarMet.push(actie.uid)
      if (iedereen.every((u) => s.tijden[u] !== undefined)) rondAf(s, ctx)
      return
    }

    if (s.fase === 'uitslag') {
      if (actie.type === 'geef' && s.magUitdelen && actie.uid === s.winnaar) {
        const verdeling: Record<string, number> = actie.payload?.verdeling
        if (!verdeling || typeof verdeling !== 'object') return
        for (const [uid, aantal] of Object.entries(verdeling)) {
          if (!iedereen.includes(uid) || uid === actie.uid) continue
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'zat er het dichtst bij')
        }
        s.magUitdelen = false
        return
      }
      if (actie.type === 'verder') {
        if (s.ronde >= RONDES) {
          s.klaar = true
          ctx.klaar()
          return
        }
        s.ronde++
        s.fase = 'meten'
        s.doel = nieuwDoel(ctx)
        s.tijden = {}
        s.klaarMet = []
        s.winnaar = null
        s.magUitdelen = false
        return
      }
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

function Scherm({ s, ctx }: { s: TienState; ctx: KijkContext }) {
  const [loopt, zetLoopt] = useState(false)
  const startRef = useRef(0)
  const ikKlaar = s.tijden[ctx.ik] !== undefined

  if (s.fase === 'uitslag') {
    const rij = ctx.spelers
      .map((p) => ({ p, ms: s.tijden[p.uid] ?? 0 }))
      .sort((a, b) => Math.abs(a.ms - s.doel) - Math.abs(b.ms - s.doel))
    const magUitdelen = s.magUitdelen && s.winnaar === ctx.ik

    return (
      <>
        <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="kop-klein">Het doel was</div>
            <h1 style={{ color: 'var(--goud)' }}>{toon(s.doel / 1000)}s</h1>
          </div>
          {rij.map(({ p, ms }, i) => {
            const af = (ms - s.doel) / 1000
            return (
              <div
                key={p.uid}
                className="kaartje balk"
                style={{
                  borderColor:
                    i === 0 ? 'var(--goud)' : i === rij.length - 1 ? 'var(--rood)' : undefined,
                  background:
                    i === 0
                      ? 'var(--goud-donker)'
                      : i === rij.length - 1
                        ? 'var(--rood-donker)'
                        : undefined,
                }}
              >
                <span>
                  {['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} {p.emoji} <strong>{p.naam}</strong>
                </span>
                <span>
                  <strong>{toon(ms / 1000)}s</strong>
                  <span className="klein zacht">
                    {' '}
                    {af >= 0 ? '+' : '−'}
                    {toon(Math.abs(af))}
                  </span>
                </span>
              </div>
            )
          })}
        </div>

        <div className="onderaan">
          {magUitdelen ? (
            <Verdeler
              key={s.ronde}
              totaal={ctx.slokAantal(WINST_UITDELEN)}
              ctx={ctx}
              titel="Dichtst bij tien — deel uit"
              bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
            />
          ) : s.magUitdelen ? (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">{ctx.naam(s.winnaar!)} deelt uit…</span>
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
          Ronde {s.ronde}/{RONDES}
        </span>
        <span className="kop-klein">
          {s.klaarMet.length}/{ctx.spelers.length} klaar
        </span>
      </div>

      <div className="midden" style={{ gap: 12 }}>
        <div style={{ fontSize: 56 }}>{loopt ? '🤫' : '⏱'}</div>
        <div className="reusachtig" style={{ fontSize: 'clamp(50px,20vw,110px)' }}>
          {loopt ? '???' : '10'}
        </div>
        <div className="klein zacht">
          {ikKlaar
            ? 'Ingeleverd — wachten op de rest'
            : loopt
              ? 'Tellen maar. Je ziet niets.'
              : 'Stop hem op precies tien seconden'}
        </div>
        <SpelerBalk spelers={ctx.spelers} actief={s.klaarMet} />
      </div>

      <div className="onderaan">
        {ikKlaar ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">
              Jij zat op {((s.tijden[ctx.ik] ?? 0) / 1000).toFixed(2)}s
            </span>
          </Kaartje>
        ) : loopt ? (
          <GroteKnop
            kleur="rood"
            enorm
            bijTik={() => {
              const ms = performance.now() - startRef.current
              zetLoopt(false)
              tril(20)
              ctx.stuur('gemeten', { ms })
            }}
          >
            STOP
          </GroteKnop>
        ) : (
          <GroteKnop
            kleur="groen"
            enorm
            bijTik={() => {
              startRef.current = performance.now()
              zetLoopt(true)
              tril(10)
            }}
          >
            START
          </GroteKnop>
        )}
      </div>
    </>
  )
}

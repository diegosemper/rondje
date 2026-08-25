import { useRef, useState } from 'react'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   TIEN SECONDEN

   Je start een stopwatch die je niet kunt zien, en stopt hem als je denkt dat
   er precies tien seconden om zijn. Geen klok, geen balkje, niets.

   Belachelijk simpel, en toch spannend — en het is een van de weinige dingen
   die aantoonbaar slechter worden naarmate de avond vordert.

   De meting gebeurt op je eigen telefoon en gaat niet over het netwerk: een
   halve seconde vertraging zou hier het hele verschil zijn.
   ───────────────────────────────────────────────────────────── */

const DOEL = 10
const RONDES = 3
const MAX_STRAF = 5
const WINST_UITDELEN = 5

interface TienState {
  ronde: number
  fase: 'meten' | 'uitslag'
  /** afwijking in milliseconden per speler */
  tijden: Record<string, number>
  klaarMet: string[]
  winnaar: string | null
  magUitdelen: boolean
  klaar: boolean
}

function rondAf(s: TienState, ctx: SpelContext) {
  const rij = ctx.spelers
    .map((p) => ({ uid: p.uid, af: Math.abs((s.tijden[p.uid] ?? 99999) - DOEL * 1000) }))
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
  naam: 'Tien Seconden',
  uitleg: 'Stop de onzichtbare stopwatch op precies tien seconden.',
  regels: [
    'Tik op START en dan zie je niets meer.',
    'Tik op STOP als je denkt dat er tien seconden om zijn.',
    'Geen klok, geen balkje. Alleen tellen.',
    'Wie er het verst naast zit, drinkt het meest.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['reflex', 'chaos'],
  privescherm: false,

  init() {
    return {
      ronde: 1,
      fase: 'meten',
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
      .sort((a, b) => Math.abs(a.ms - DOEL * 1000) - Math.abs(b.ms - DOEL * 1000))
    const magUitdelen = s.magUitdelen && s.winnaar === ctx.ik

    return (
      <>
        <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
          <h1 style={{ textAlign: 'center' }}>⏱ Ronde {s.ronde}</h1>
          {rij.map(({ p, ms }, i) => {
            const af = (ms - DOEL * 1000) / 1000
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
                  <strong>{(ms / 1000).toFixed(2)}s</strong>
                  <span className="klein zacht">
                    {' '}
                    {af >= 0 ? '+' : ''}
                    {af.toFixed(2)}
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

import { useEffect, useRef, useState } from 'react'
import { tussen } from '../../engine/random'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   BLINDE KLOK

   Je krijgt een doeltijd — elke ronde een andere, ergens tussen de tien en
   dertig seconden, tot op een tiende nauwkeurig. Je telt een stopwatch af die
   je niet kunt zien en stopt hem als je denkt dat je er bent. Geen klok, geen
   balkje, niets.

   Iedereen gaat eerst op gereed. Dan telt het scherm af van drie, en start de
   klok bij iedereen op hetzelfde moment. Dat moet ook wel: als de een al
   twintig seconden zit te tellen terwijl de ander nog naar zijn knop zoekt,
   staat het halve gezelschap te wachten en weet je van de rest niets.

   Het doel staat in de gedeelde spelstand, dus iedereen telt naar hetzelfde
   getal. Het wisselt met opzet per ronde: op een vaste tijd heb je binnen twee
   rondes het ritme te pakken en is er niets meer aan.

   De meting gebeurt op je eigen telefoon en gaat niet over het netwerk: een
   halve seconde vertraging zou hier het hele verschil zijn. Het startmoment
   komt wel van de server, en daar ijkt elke telefoon zijn eigen klok op.
   ───────────────────────────────────────────────────────────── */

const DOEL_MIN = 10
const DOEL_MAX = 30
const RONDES = 3
const MAX_STRAF = 5
const WINST_UITDELEN = 5
/** Drie, twee, een — en gaan. */
const AFTEL_MS = 3000

/** "17,3" — met een komma, want we tellen in het Nederlands. */
function toon(seconden: number): string {
  return seconden.toFixed(1).replace('.', ',')
}

interface TienState {
  ronde: number
  fase: 'gereed' | 'lopen' | 'uitslag'
  /** de doeltijd van deze ronde, in milliseconden */
  doel: number
  /** wie er al op gereed staat */
  gereed: string[]
  /** wanneer de klok gaat lopen, in servertijd */
  startOp: number
  /** de gemeten tijd in milliseconden per speler */
  tijden: Record<string, number>
  klaarMet: string[]
  winnaar: string | null
  magUitdelen: boolean
  klaar: boolean
}

/** Een doel tussen 10,0 en 30,0 seconden, op een tiende nauwkeurig. */
function nieuwDoel(ctx: SpelContext): number {
  return tussen(ctx.rng, DOEL_MIN * 10, DOEL_MAX * 10) * 100
}

/**
 * Het doel van deze ronde, met vangnet.
 *
 * Een potje dat begon vóórdat dit veld bestond heeft geen doel in zijn
 * spelstand. Zonder deze val zou daar NaN op het scherm komen.
 */
function doelVan(s: TienState): number {
  return typeof s.doel === 'number' && s.doel > 0 ? s.doel : DOEL_MIN * 1000
}

function startKlok(s: TienState, ctx: SpelContext) {
  s.fase = 'lopen'
  s.startOp = ctx.nu + AFTEL_MS
}

function nieuweRonde(s: TienState, ctx: SpelContext) {
  s.fase = 'gereed'
  s.doel = nieuwDoel(ctx)
  s.gereed = []
  s.startOp = 0
  s.tijden = {}
  s.klaarMet = []
  s.winnaar = null
  s.magUitdelen = false
}

function rondAf(s: TienState, ctx: SpelContext) {
  const doel = doelVan(s)
  const rij = ctx.spelers
    .map((p) => ({ uid: p.uid, af: Math.abs((s.tijden[p.uid] ?? 999999) - doel) }))
    .sort((a, b) => a.af - b.af)

  s.winnaar = rij[0]?.uid ?? null
  s.fase = 'uitslag'

  rij.forEach((r, i) => {
    if (i === 0) return
    ctx.drink(r.uid, Math.min(MAX_STRAF, i), `${toon(r.af / 1000)}s ernaast`)
  })
  if (s.winnaar) s.magUitdelen = true
}

export const tienseconden: GameModule<TienState> = {
  id: 'tienseconden',
  naam: 'Blinde Klok',
  uitleg: 'Stop de onzichtbare stopwatch op de doeltijd. Iedereen start tegelijk.',
  regels: [
    'Je krijgt een doeltijd tussen 10 en 30 seconden.',
    'Iedereen gaat op gereed, dan telt het scherm af van 3.',
    'Vanaf dat moment zie je niets meer — tik STOP als je denkt dat je er bent.',
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
      fase: 'gereed',
      doel: nieuwDoel(ctx),
      gereed: [],
      startOp: 0,
      tijden: {},
      klaarMet: [],
      winnaar: null,
      magUitdelen: false,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'gereed') {
      if (actie.type === 'gereed') {
        if (s.gereed.includes(actie.uid)) return
        s.gereed.push(actie.uid)
        if (iedereen.every((u) => s.gereed.includes(u))) startKlok(s, ctx)
        return
      }
      // Iemand is even weg en de rest zit te wachten. De host trekt hem los;
      // de knop staat alleen bij hem op het scherm.
      if (actie.type === 'toch-starten') {
        startKlok(s, ctx)
        return
      }
      return
    }

    if (s.fase === 'lopen' && actie.type === 'gemeten') {
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
        nieuweRonde(s, ctx)
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
  const doel = doelVan(s)

  if (s.fase === 'uitslag') return <Uitslag s={s} ctx={ctx} doel={doel} />
  if (s.fase === 'gereed') return <Gereed s={s} ctx={ctx} doel={doel} />
  return <Lopen s={s} ctx={ctx} doel={doel} />
}

/* ── Gereed staan ───────────────────────────────────────────── */

function Gereed({ s, ctx, doel }: { s: TienState; ctx: KijkContext; doel: number }) {
  const ikGereed = s.gereed.includes(ctx.ik)
  const wachtOp = ctx.spelers.filter((p) => !s.gereed.includes(p.uid))

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Ronde {s.ronde}/{RONDES}
        </span>
        <span className="kop-klein">
          {s.gereed.length}/{ctx.spelers.length} gereed
        </span>
      </div>

      <div className="midden" style={{ gap: 12 }}>
        <div style={{ fontSize: 56 }}>⏱</div>
        <div className="kop-klein">Het doel deze ronde</div>
        <div
          className="reusachtig"
          style={{ fontSize: 'clamp(46px,18vw,100px)', color: 'var(--goud)' }}
        >
          {toon(doel / 1000)}s
        </div>
        <div className="klein zacht">
          Iedereen telt naar hetzelfde getal en start straks tegelijk.
        </div>
        <SpelerBalk spelers={ctx.spelers} actief={s.gereed} />
      </div>

      <div className="onderaan">
        {ikGereed ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">
              {wachtOp.length === 0
                ? 'Daar gaan we…'
                : `Wachten op ${wachtOp.map((p) => p.naam).join(', ')}`}
            </span>
          </Kaartje>
        ) : (
          <GroteKnop kleur="groen" enorm bijTik={() => ctx.stuur('gereed')}>
            GEREED
          </GroteKnop>
        )}
        {ctx.benIkHost && wachtOp.length > 0 && (
          <button className="knop leeg klein" onClick={() => ctx.stuur('toch-starten')}>
            Start toch maar
          </button>
        )}
      </div>
    </>
  )
}

/* ── Aftellen en meten ──────────────────────────────────────── */

function Lopen({ s, ctx, doel }: { s: TienState; ctx: KijkContext; doel: number }) {
  const ikKlaar = s.tijden[ctx.ik] !== undefined
  const over = s.startOp - ctx.nu
  const telAf = over > 0

  /**
   * Het ijkpunt op de eigen klok.
   *
   * De meting moet op deze telefoon gebeuren — over het netwerk zou een halve
   * seconde vertraging het hele verschil zijn. Maar het startmoment komt van
   * de server, dus zetten we die twee één keer naast elkaar. ctx.nu tikt per
   * tiende, en die overschrijding halen we eraf, zodat iedereen echt vanaf
   * hetzelfde moment telt.
   */
  const ijk = useRef<number | null>(null)
  const [gestart, zetGestart] = useState(false)

  useEffect(() => {
    if (telAf || ijk.current !== null) return
    ijk.current = performance.now() + over
    zetGestart(true)
    tril(20)
  }, [telAf, over])

  if (telAf) {
    return (
      <div className="midden" style={{ gap: 12 }}>
        <div className="kop-klein">Klaarzitten…</div>
        <div
          key={Math.ceil(over / 1000)}
          className="reusachtig aftellen"
          style={{ fontSize: 'clamp(90px,34vw,200px)', color: 'var(--goud)' }}
        >
          {Math.ceil(over / 1000)}
        </div>
        <div className="klein zacht">Doel: {toon(doel / 1000)}s</div>
      </div>
    )
  }

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Ronde {s.ronde}/{RONDES}
        </span>
        <span className="kop-klein">
          doel {toon(doel / 1000)}s · {s.klaarMet.length}/{ctx.spelers.length}
        </span>
      </div>

      <div className="midden" style={{ gap: 12 }}>
        <div style={{ fontSize: 56 }}>🤫</div>
        <div className="reusachtig" style={{ fontSize: 'clamp(46px,18vw,100px)' }}>
          ???
        </div>
        <div className="klein zacht">
          {ikKlaar ? 'Ingeleverd — wachten op de rest' : `Tellen maar. Doel: ${toon(doel / 1000)}s`}
        </div>
        <SpelerBalk spelers={ctx.spelers} actief={s.klaarMet} />
      </div>

      <div className="onderaan">
        {ikKlaar ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Jij zat op {toon((s.tijden[ctx.ik] ?? 0) / 1000)}s</span>
          </Kaartje>
        ) : (
          <GroteKnop
            kleur="rood"
            enorm
            uit={!gestart}
            bijTik={() => {
              const ms = performance.now() - (ijk.current ?? performance.now())
              tril(20)
              ctx.stuur('gemeten', { ms })
            }}
          >
            STOP
          </GroteKnop>
        )}
      </div>
    </>
  )
}

/* ── De uitslag ─────────────────────────────────────────────── */

function Uitslag({ s, ctx, doel }: { s: TienState; ctx: KijkContext; doel: number }) {
  const rij = ctx.spelers
    .map((p) => ({ p, ms: s.tijden[p.uid] ?? 0 }))
    .sort((a, b) => Math.abs(a.ms - doel) - Math.abs(b.ms - doel))
  const magUitdelen = s.magUitdelen && s.winnaar === ctx.ik

  return (
    <>
      <div className="midden" style={{ gap: 8, alignItems: 'stretch' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="kop-klein">Het doel was</div>
          <h1 style={{ color: 'var(--goud)' }}>{toon(doel / 1000)}s</h1>
        </div>
        {rij.map(({ p, ms }, i) => {
          const af = (ms - doel) / 1000
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
            titel="Dichtst bij het doel — deel uit"
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

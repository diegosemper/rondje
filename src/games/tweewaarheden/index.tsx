import { useState } from 'react'
import { husselen } from '../../engine/random'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   TWEE WAARHEDEN, ÉÉN LEUGEN

   Je typt drie dingen over jezelf in en geeft aan welke gelogen is. Daarna
   komt iedereen om de beurt aan de beurt en stemt de rest geheim welke van
   de drie de leugen was.

   Wie fout stemt drinkt. Doorziet niemand je, dan mag jij uitdelen — dus het
   loont om een leugen te verzinnen die net zo saai klinkt als de waarheid.
   ───────────────────────────────────────────────────────────── */

const STRAF_FOUT = 2
const WINST_UITDELEN = 4

interface Inzending {
  regels: [string, string, string]
  leugen: number
}

interface TweeState {
  fase: 'typen' | 'stemmen' | 'uitslag' | 'klaar'
  /** de volgorde waarin de spelers aan de beurt komen */
  volgorde: string[]
  index: number

  _geheim: {
    inzendingen: Record<string, Inzending>
    stemmen: Record<string, number>
  }

  /** wie er al ingeleverd heeft — dit mag iedereen zien */
  ingeleverd: string[]
  /** de drie regels van wie nu aan de beurt is, in beeld voor iedereen */
  huidig: { uid: string; regels: [string, string, string] } | null
  gestemd: string[]

  uitslag: {
    uid: string
    leugen: number
    stemmen: Record<string, number>
    goedGeraden: string[]
  } | null
  magUitdelen: boolean
}

function startStemmen(s: TweeState, ctx: SpelContext) {
  const uid = s.volgorde[s.index]
  const inzending = s._geheim.inzendingen[uid]
  if (!inzending) {
    // Speler is weggevallen; sla hem over.
    s.index++
    if (s.index >= s.volgorde.length) {
      s.fase = 'klaar'
      ctx.klaar()
      return
    }
    startStemmen(s, ctx)
    return
  }
  s.huidig = { uid, regels: inzending.regels }
  s._geheim.stemmen = {}
  s.gestemd = []
  s.uitslag = null
  s.magUitdelen = false
  s.fase = 'stemmen'
}

export const tweewaarheden: GameModule<TweeState> = {
  id: 'tweewaarheden',
  naam: 'Twee Waarheden, één Leugen',
  uitleg: 'Drie dingen over jezelf, één gelogen. Wie prikt erdoorheen?',
  regels: [
    'Typ drie dingen over jezelf in.',
    'Eén ervan is gelogen — jij kiest welke.',
    'De rest stemt geheim welke de leugen was.',
    'Fout gestemd? Je drinkt. Niemand goed? Jij deelt uit.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['praten', 'bluf', 'geheim'],
  privescherm: true,

  init(ctx) {
    return {
      fase: 'typen',
      volgorde: husselen(
        ctx.rng,
        ctx.spelers.map((p) => p.uid),
      ),
      index: 0,
      _geheim: { inzendingen: {}, stemmen: {} },
      ingeleverd: [],
      huidig: null,
      gestemd: [],
      uitslag: null,
      magUitdelen: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'typen' && actie.type === 'inleveren') {
      if (s._geheim.inzendingen[actie.uid]) return
      const ruw = actie.payload?.regels
      const leugen = Number(actie.payload?.leugen)
      if (!Array.isArray(ruw) || ruw.length !== 3) return
      if (![0, 1, 2].includes(leugen)) return

      const regels = ruw.map((r: any) => String(r ?? '').trim().slice(0, 80)) as [
        string,
        string,
        string,
      ]
      if (regels.some((r) => r.length < 3)) return

      s._geheim.inzendingen[actie.uid] = { regels, leugen }
      if (!s.ingeleverd.includes(actie.uid)) s.ingeleverd.push(actie.uid)

      if (!iedereen.every((u) => s._geheim.inzendingen[u])) return
      startStemmen(s, ctx)
      return
    }

    if (s.fase === 'stemmen' && actie.type === 'stem' && s.huidig) {
      if (actie.uid === s.huidig.uid) return
      if (s._geheim.stemmen[actie.uid] !== undefined) return
      const keuze = Number(actie.payload?.keuze)
      if (![0, 1, 2].includes(keuze)) return

      s._geheim.stemmen[actie.uid] = keuze
      if (!s.gestemd.includes(actie.uid)) s.gestemd.push(actie.uid)

      const stemmers = iedereen.filter((u) => u !== s.huidig!.uid)
      if (!stemmers.every((u) => s._geheim.stemmen[u] !== undefined)) return

      const leugen = s._geheim.inzendingen[s.huidig.uid].leugen
      const goedGeraden = stemmers.filter((u) => s._geheim.stemmen[u] === leugen)
      const foutGeraden = stemmers.filter((u) => s._geheim.stemmen[u] !== leugen)

      for (const uid of foutGeraden) ctx.drink(uid, STRAF_FOUT, 'zat ernaast')

      s.uitslag = {
        uid: s.huidig.uid,
        leugen,
        stemmen: { ...s._geheim.stemmen },
        goedGeraden,
      }
      s.magUitdelen = goedGeraden.length === 0
      if (s.magUitdelen) {
        ctx.log(`Niemand doorzag ${ctx.naam(s.huidig.uid)}`)
      }
      s.fase = 'uitslag'
      return
    }

    if (s.fase === 'uitslag') {
      if (actie.type === 'geef' && s.magUitdelen && actie.uid === s.uitslag?.uid) {
        const verdeling: Record<string, number> = actie.payload?.verdeling
        if (!verdeling || typeof verdeling !== 'object') return
        for (const [uid, aantal] of Object.entries(verdeling)) {
          if (!iedereen.includes(uid) || uid === actie.uid) continue
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'niemand doorzag de leugen')
        }
        s.magUitdelen = false
        return
      }

      if (actie.type === 'verder') {
        s.index++
        if (s.index >= s.volgorde.length) {
          s.fase = 'klaar'
          ctx.wisPrive()
          ctx.klaar()
          return
        }
        startStemmen(s, ctx)
        return
      }
    }
  },

  isKlaar: (s) => s.fase === 'klaar',

  View({ state: s, ctx }) {
    if (s.fase === 'typen') return <Typen s={s} ctx={ctx} />
    if (s.fase === 'stemmen') return <Stemmen s={s} ctx={ctx} />
    return <Uitslag s={s} ctx={ctx} />
  },
}

function Typen({ s, ctx }: { s: TweeState; ctx: KijkContext }) {
  const [regels, zetRegels] = useState<[string, string, string]>(['', '', ''])
  const [leugen, zetLeugen] = useState<number | null>(null)
  const ikKlaar = s.ingeleverd.includes(ctx.ik)
  const compleet = regels.every((r) => r.trim().length >= 3) && leugen !== null

  if (ikKlaar) {
    return (
      <>
        <div className="midden" style={{ gap: 10 }}>
          <div style={{ fontSize: 48 }}>🤫</div>
          <h2 className="zacht">Ingeleverd</h2>
          <div className="klein zacht">
            {s.ingeleverd.length} van {ctx.spelers.length}
          </div>
          <SpelerBalk spelers={ctx.spelers} actief={s.ingeleverd} />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="kop-klein" style={{ textAlign: 'center' }}>
        Drie dingen over jezelf · tik de gelogen regel aan
      </div>

      <div style={{ display: 'grid', gap: 10, flex: 1 }}>
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <input
              value={regels[i]}
              onChange={(e) => {
                const nieuw = [...regels] as [string, string, string]
                nieuw[i] = e.target.value.slice(0, 80)
                zetRegels(nieuw)
              }}
              placeholder={`Bewering ${'ABC'[i]}`}
              style={{ minHeight: 52, fontSize: 16 }}
            />
            <button
              onClick={() => zetLeugen(i)}
              className={`knop klein ${leugen === i ? 'rood' : 'leeg'}`}
              style={{ width: '100%', marginTop: 4 }}
            >
              {leugen === i ? '🤥 Dit is de leugen' : 'Dit is de leugen'}
            </button>
          </div>
        ))}
      </div>

      <div className="onderaan">
        <GroteKnop
          kleur="goud"
          uit={!compleet}
          bijTik={() => ctx.stuur('inleveren', { regels, leugen })}
        >
          Inleveren
        </GroteKnop>
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          Een goede leugen klinkt net zo saai als de waarheid.
        </div>
      </div>
    </>
  )
}

function Stemmen({ s, ctx }: { s: TweeState; ctx: KijkContext }) {
  const h = s.huidig!
  const ikBenHet = h.uid === ctx.ik
  const ikGestemd = s.gestemd.includes(ctx.ik)
  const speler = ctx.speler(h.uid)

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Speler {s.index + 1}/{s.volgorde.length}
        </span>
        <span className="kop-klein">
          {s.gestemd.length}/{ctx.spelers.length - 1} gestemd
        </span>
      </div>

      <Kaartje style={{ textAlign: 'center' }}>
        <h2>
          {speler?.emoji} {speler?.naam} zegt
        </h2>
      </Kaartje>

      <div style={{ display: 'grid', gap: 10, flex: 1, alignContent: 'start' }}>
        {h.regels.map((r, i) => (
          <button
            key={i}
            className="kaartje"
            disabled={ikBenHet || ikGestemd}
            onClick={() => ctx.stuur('stem', { keuze: i })}
            style={{
              textAlign: 'left',
              opacity: ikBenHet || ikGestemd ? 0.6 : 1,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 26,
                height: 26,
                borderRadius: 99,
                background: 'var(--goud)',
                color: '#1a1205',
                fontWeight: 800,
                display: 'grid',
                placeItems: 'center',
                fontSize: 13,
              }}
            >
              {'ABC'[i]}
            </span>
            <span style={{ fontSize: 16, lineHeight: 1.3 }}>{r}</span>
          </button>
        ))}
      </div>

      <Kaartje style={{ textAlign: 'center' }}>
        <span className="zacht">
          {ikBenHet
            ? 'Jouw beurt — zit stil en kijk hoe het gaat'
            : ikGestemd
              ? '🤫 Je stem staat vast'
              : 'Welke is gelogen?'}
        </span>
      </Kaartje>
    </>
  )
}

function Uitslag({ s, ctx }: { s: TweeState; ctx: KijkContext }) {
  const u = s.uitslag!
  const h = s.huidig!
  const speler = ctx.speler(u.uid)
  const magUitdelen = s.magUitdelen && u.uid === ctx.ik

  return (
    <>
      <div className="midden" style={{ gap: 10, alignItems: 'stretch' }}>
        <h1 style={{ textAlign: 'center' }}>
          {u.goedGeraden.length === 0 ? 'Niemand doorzag het' : 'Doorgeprikt'}
        </h1>
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          {speler?.emoji} {speler?.naam}
        </div>

        {h.regels.map((r, i) => {
          const isLeugen = i === u.leugen
          const stemmers = Object.entries(u.stemmen)
            .filter(([, k]) => k === i)
            .map(([uid]) => ctx.naam(uid))
          return (
            <div
              key={i}
              className="kaartje"
              style={{
                borderColor: isLeugen ? 'var(--rood)' : 'var(--groen)',
                background: isLeugen ? 'var(--rood-donker)' : undefined,
              }}
            >
              <div className="balk">
                <strong>
                  {'ABC'[i]} · {isLeugen ? '🤥 gelogen' : '✓ waar'}
                </strong>
                <span className="klein zacht">{stemmers.length} stem(men)</span>
              </div>
              <div style={{ fontSize: 15, marginTop: 2 }}>{r}</div>
              {stemmers.length > 0 && (
                <div className="klein zacht" style={{ marginTop: 2 }}>
                  {stemmers.join(', ')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="onderaan">
        {magUitdelen ? (
          <Verdeler
            totaal={ctx.slokAantal(WINST_UITDELEN)}
            ctx={ctx}
            titel="Niemand had het — deel uit"
            bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
          />
        ) : s.magUitdelen ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">{ctx.naam(u.uid)} deelt uit…</span>
          </Kaartje>
        ) : ctx.benIkHost ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
            {s.index + 1 >= s.volgorde.length ? 'Klaar' : 'Volgende speler'}
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

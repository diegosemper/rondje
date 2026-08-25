import { useEffect, useState } from 'react'
import { husselen, pakMeerdere } from '../../engine/random'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, startKlok, voortgang, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { Kleurkiezer, Tekenveld } from '../../ui/Tekenveld'
import { stuurStreep, useTekening, wisTekening } from '../../net/tekening'
import { TEKEN_WOORDEN } from './woorden'

/* ─────────────────────────────────────────────────────────────
   TEKENEN

   Eén speler krijgt drie woorden te zien en kiest er één. Die tekent hij met
   zijn vinger, en de tekening verschijnt live bij iedereen. De rest typt
   gokken in en ziet meteen of het goed of fout was.

   Wie het niet raadt voordat de tijd om is, drinkt. Raadt niemand het, dan
   drinkt de tekenaar — want dan was het geen tekening maar een raadsel.

   De strepen lopen buiten de spellogica om rechtstreeks naar de database; de
   gokken gaan wél via de host, want alleen die weet het woord.
   ───────────────────────────────────────────────────────────── */

const TEKEN_SEC = 70
const KEUZES = 3
const MAX_RONDES = 5

const STRAF_NIET_GERADEN = 3
const STRAF_TEKENAAR = 4
const SNELSTE_UITDELEN = 2

function normaliseer(woord: string): string {
  return woord
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

interface TekenState {
  fase: 'kiezen' | 'tekenen' | 'uitslag' | 'klaar'
  volgorde: string[]
  index: number

  _geheim: { woord: string; keuzes: string[]; gebruikt: string[] }

  klok: Klok | null
  begonOp: number
  /** wie het geraden heeft, op volgorde van snelheid */
  geraden: { uid: string; ms: number }[]
  fouteGokken: { uid: string; woord: string }[]

  onthuldWoord: string | null
  magUitdelen: boolean
}

function startBeurt(s: TekenState, ctx: SpelContext) {
  const tekenaar = s.volgorde[s.index]
  const vrij = TEKEN_WOORDEN.filter((w) => !s._geheim.gebruikt.includes(w))
  const keuzes = pakMeerdere(ctx.rng, vrij.length >= KEUZES ? vrij : TEKEN_WOORDEN, KEUZES)

  s._geheim.keuzes = keuzes
  s._geheim.woord = ''
  s.fase = 'kiezen'
  s.klok = null
  s.geraden = []
  s.fouteGokken = []
  s.onthuldWoord = null
  s.magUitdelen = false

  for (const p of ctx.spelers) {
    ctx.zetPrive(p.uid, p.uid === tekenaar ? { keuzes } : null)
  }
}

function beurtAf(s: TekenState, ctx: SpelContext) {
  const tekenaar = s.volgorde[s.index]
  const raders = ctx.spelers.map((p) => p.uid).filter((u) => u !== tekenaar)
  const gelukt = s.geraden.map((g) => g.uid)

  s.fase = 'uitslag'
  s.klok = null
  s.onthuldWoord = s._geheim.woord

  const gemist = raders.filter((u) => !gelukt.includes(u))
  for (const uid of gemist) ctx.drink(uid, STRAF_NIET_GERADEN, `raadde "${s._geheim.woord}" niet`)

  if (gelukt.length === 0) {
    ctx.drink(tekenaar, STRAF_TEKENAAR, 'niemand snapte de tekening')
  } else {
    s.magUitdelen = true
  }
}

export const tekenen: GameModule<TekenState> = {
  id: 'tekenen',
  naam: 'Tekenen',
  uitleg: 'Teken met je vinger, de rest raadt live mee. Te laat = drinken.',
  regels: [
    'De tekenaar kiest één van drie woorden.',
    'Hij tekent, iedereen ziet het live verschijnen.',
    'Typ je gok — je ziet meteen of het klopt.',
    'Niet geraden? Je drinkt. Niemand geraden? De tekenaar.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'lang',
  tags: ['chaos', 'praten', 'reflex'],
  privescherm: true,

  init(ctx) {
    const s: TekenState = {
      fase: 'kiezen',
      volgorde: husselen(
        ctx.rng,
        ctx.spelers.map((p) => p.uid),
      ).slice(0, MAX_RONDES),
      index: 0,
      _geheim: { woord: '', keuzes: [], gebruikt: [] },
      klok: null,
      begonOp: 0,
      geraden: [],
      fouteGokken: [],
      onthuldWoord: null,
      magUitdelen: false,
    }
    startBeurt(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const tekenaar = s.volgorde[s.index]
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'kiezen' && actie.type === 'kies') {
      if (actie.uid !== tekenaar) return
      const i = Number(actie.payload?.i)
      const woord = s._geheim.keuzes[i]
      if (!woord) return

      s._geheim.woord = woord
      s._geheim.gebruikt.push(woord)
      s.fase = 'tekenen'
      s.klok = startKlok(TEKEN_SEC, ctx.nu)
      s.begonOp = ctx.nu
      ctx.zetPrive(tekenaar, { woord })
      return
    }

    if (s.fase === 'tekenen') {
      if (actie.type === 'gok') {
        if (actie.uid === tekenaar) return
        if (s.geraden.some((g) => g.uid === actie.uid)) return
        const gok = String(actie.payload?.woord ?? '').trim().slice(0, 30)
        if (!gok) return

        if (normaliseer(gok) === normaliseer(s._geheim.woord)) {
          s.geraden.push({ uid: actie.uid, ms: Math.max(0, actie.ts - s.begonOp) })
          const raders = iedereen.filter((u) => u !== tekenaar)
          if (s.geraden.length >= raders.length) beurtAf(s, ctx)
          return
        }

        s.fouteGokken.push({ uid: actie.uid, woord: gok })
        if (s.fouteGokken.length > 14) s.fouteGokken.shift()
        return
      }

      if (actie.type === 'tijd-op' || actie.type === 'geef-op') {
        beurtAf(s, ctx)
        return
      }
      return
    }

    if (s.fase === 'uitslag') {
      if (actie.type === 'geef' && s.magUitdelen && actie.uid === s.geraden[0]?.uid) {
        const verdeling: Record<string, number> = actie.payload?.verdeling
        if (!verdeling || typeof verdeling !== 'object') return
        for (const [uid, aantal] of Object.entries(verdeling)) {
          if (!iedereen.includes(uid) || uid === actie.uid) continue
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'raadde als eerste')
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
        startBeurt(s, ctx)
        return
      }
    }
  },

  isKlaar: (s) => s.fase === 'klaar',

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

/* ── Scherm ─────────────────────────────────────────────────── */

function Scherm({ s, ctx }: { s: TekenState; ctx: KijkContext }) {
  const tekenaar = s.volgorde[s.index]
  const ikTeken = ctx.ik === tekenaar
  const [kleur, zetKleur] = useState(0)
  const [gok, zetGok] = useState('')

  // Alle strepen van deze beurt, live uit de database.
  const strepen = useTekening(ctx.kamerCode, s.index)

  useHostKlok(ctx, s.fase === 'tekenen', s.klok?.eind ?? 0, 'tijd-op')

  // De tekenaar veegt het bord schoon zodra hij aan de beurt is.
  useEffect(() => {
    if (!ikTeken || s.fase !== 'kiezen' || !ctx.kamerCode) return
    wisTekening(ctx.kamerCode).catch(() => {})
  }, [ikTeken, s.fase, ctx.kamerCode])

  const ikGeraden = s.geraden.some((g) => g.uid === ctx.ik)

  /* ── Woord kiezen ── */
  if (s.fase === 'kiezen') {
    const keuzes: string[] = ctx.prive?.keuzes ?? []
    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Beurt {s.index + 1}/{s.volgorde.length}
          </span>
        </div>
        <div className="midden" style={{ gap: 12 }}>
          <div style={{ fontSize: 54 }}>🎨</div>
          <h1>
            {ikTeken ? 'Kies je woord' : `${ctx.naam(tekenaar)} kiest een woord`}
          </h1>
        </div>
        <div className="onderaan">
          {ikTeken &&
            keuzes.map((w, i) => (
              <GroteKnop key={w} kleur="goud" bijTik={() => ctx.stuur('kies', { i })}>
                {w}
              </GroteKnop>
            ))}
        </div>
      </>
    )
  }

  /* ── Uitslag ── */
  if (s.fase === 'uitslag') {
    const magUitdelen = s.magUitdelen && s.geraden[0]?.uid === ctx.ik
    return (
      <>
        <div className="midden" style={{ gap: 10, alignItems: 'stretch' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="kop-klein">Het woord was</div>
            <h1 style={{ color: 'var(--goud)' }}>{s.onthuldWoord}</h1>
          </div>

          <Tekenveld strepen={strepen} magTekenen={false} kleur={0} bijStreep={() => {}} />

          {s.geraden.length === 0 ? (
            <Kaartje style={{ textAlign: 'center', borderColor: 'var(--rood)' }}>
              <strong>Niemand kwam eruit</strong>
              <div className="klein zacht">{ctx.naam(tekenaar)} drinkt</div>
            </Kaartje>
          ) : (
            s.geraden.map((g, i) => (
              <div key={g.uid} className="kaartje balk" style={{ padding: 8 }}>
                <span>
                  {i + 1}. {ctx.speler(g.uid)?.emoji} <strong>{ctx.naam(g.uid)}</strong>
                </span>
                <span className="klein zacht">{(g.ms / 1000).toFixed(1)}s</span>
              </div>
            ))
          )}
        </div>

        <div className="onderaan">
          {magUitdelen ? (
            <Verdeler
              totaal={ctx.slokAantal(SNELSTE_UITDELEN)}
              ctx={ctx}
              titel="Als eerste geraden — deel uit"
              bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
            />
          ) : s.magUitdelen ? (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">{ctx.naam(s.geraden[0].uid)} deelt uit…</span>
            </Kaartje>
          ) : ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
              {s.index + 1 >= s.volgorde.length ? 'Klaar' : 'Volgende tekenaar'}
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

  /* ── Tekenen en raden ── */
  const woord: string = ctx.prive?.woord ?? ''

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          {ikTeken ? `Teken: ${woord}` : `${ctx.naam(tekenaar)} tekent`}
        </span>
        <span className="kop-klein">{klokTekst(s.klok, ctx.nu)}s</span>
      </div>

      <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />

      <Tekenveld
        strepen={strepen}
        magTekenen={ikTeken}
        kleur={kleur}
        bijStreep={(punten) => {
          if (!ctx.kamerCode) return
          stuurStreep(ctx.kamerCode, s.index, kleur, punten).catch(() => {})
        }}
      />

      {s.geraden.length > 0 && (
        <div className="klein" style={{ textAlign: 'center', color: 'var(--groen)' }}>
          ✓ {s.geraden.map((g) => ctx.naam(g.uid)).join(', ')}
        </div>
      )}

      <div className="logboek" style={{ maxHeight: 72 }}>
        {s.fouteGokken
          .slice(-6)
          .reverse()
          .map((g, i) => (
            <div key={i}>
              <strong>{ctx.naam(g.uid)}</strong>: {g.woord}
            </div>
          ))}
      </div>

      <div className="onderaan">
        {ikTeken ? (
          <>
            <Kleurkiezer kleur={kleur} zetKleur={zetKleur} />
            <div className="rij">
              <GroteKnop
                kleur="leeg"
                klein
                bijTik={() => ctx.kamerCode && wisTekening(ctx.kamerCode).catch(() => {})}
              >
                Wis alles
              </GroteKnop>
              <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('geef-op')}>
                Stoppen
              </GroteKnop>
            </div>
          </>
        ) : ikGeraden ? (
          <Kaartje style={{ textAlign: 'center', borderColor: 'var(--groen)' }}>
            <h2 style={{ color: 'var(--groen)' }}>✓ Je hebt hem!</h2>
            <span className="klein zacht">Niets zeggen. Laat de rest zwoegen.</span>
          </Kaartje>
        ) : (
          <>
            <input
              value={gok}
              onChange={(e) => zetGok(e.target.value.slice(0, 30))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && gok.trim()) {
                  ctx.stuur('gok', { woord: gok })
                  zetGok('')
                }
              }}
              placeholder="wat is het?"
              autoComplete="off"
              autoCorrect="off"
            />
            <GroteKnop
              kleur="goud"
              uit={gok.trim().length < 2}
              bijTik={() => {
                tril(8)
                ctx.stuur('gok', { woord: gok })
                zetGok('')
              }}
            >
              Gokken
            </GroteKnop>
          </>
        )}
      </div>
    </>
  )
}

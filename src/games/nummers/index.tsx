import { useEffect, useRef, useState } from 'react'
import { husselen } from '../../engine/random'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { NUMMERS, type Nummer } from './lijst'

/* ─────────────────────────────────────────────────────────────
   RAAD HET NUMMER

   Iedereen luistert op zijn eigen telefoon en bepaalt zelf hoe lang. Je hoort
   eerst één seconde; weet je het niet, dan rek je op naar twee, vier, zeven,
   twaalf, twintig.

   Iedereen kan het dus raden — het verschil zit in wat je ermee verdient. Na
   één seconde mag je zeven slokken uitdelen, na twintig nog maar twee. Wie het
   helemaal niet krijgt, drinkt.

   Dat werkt alleen omdat iedereen een eigen telefoon heeft: zes mensen die
   tegelijk hun eigen fragment op hun eigen tempo afspelen, zonder dat het
   elkaar in de weg zit.

   De fragmenten komen van Apple's openbare voorluister-dienst: dertig seconden
   per nummer, gratis en zonder inloggen. Zo'n fragment begint meestal bij het
   refrein en niet bij het begin van het nummer, wat die eerste seconde juist
   herkenbaarder maakt.
   ───────────────────────────────────────────────────────────── */

/** Hoeveel seconden je per stap te horen krijgt. */
const STAPPEN = [1, 2, 4, 7, 12, 20]
/** Wat je bij die stap mag uitdelen als je het raadt. */
const BELONING = [7, 6, 5, 4, 3, 2]
/** Wat je drinkt als je het helemaal niet krijgt. */
const STRAF_MISLUKT = 5
const RONDES = 5

function normaliseer(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/** Ruim genoeg om typefouten door te laten, streng genoeg om niet alles goed te keuren. */
function klopt(gok: string, titel: string): boolean {
  const g = normaliseer(gok)
  const t = normaliseer(titel)
  if (g.length < 3) return false
  if (g === t) return true
  if (g.length >= 5 && t.includes(g)) return true
  if (t.length >= 5 && g.includes(t)) return true
  return false
}

interface NummerState {
  ronde: number
  fase: 'spelen' | 'uitdelen' | 'uitslag'

  _geheim: { lijst: Nummer[] }
  /** alleen de link is publiek; de titel blijft geheim tot het eind */
  url: string

  /** hoe ver iedereen zelf is opgerekt */
  stap: Record<string, number>
  /** wie het geraden heeft, op volgorde, met de stap waarop het lukte */
  goed: { uid: string; stap: number }[]
  /** wie het opgegeven heeft of afgekapt is */
  op: string[]

  uitdeelIndex: number
  onthuld: Nummer | null
  klaar: boolean
}

function huidigNummer(s: NummerState): Nummer {
  return s._geheim.lijst[(s.ronde - 1) % s._geheim.lijst.length]
}

function nieuweRonde(s: NummerState, ctx: SpelContext) {
  s.url = huidigNummer(s).url
  s.fase = 'spelen'
  s.stap = {}
  s.goed = []
  s.op = []
  s.uitdeelIndex = 0
  s.onthuld = null
  for (const p of ctx.spelers) {
    s.stap[p.uid] = 0
    ctx.zetPrive(p.uid, null)
  }
}

function rondAf(s: NummerState, ctx: SpelContext) {
  const iedereen = ctx.spelers.map((p) => p.uid)
  const gelukt = s.goed.map((g) => g.uid)

  for (const uid of iedereen) {
    if (!gelukt.includes(uid)) {
      ctx.drink(uid, STRAF_MISLUKT, `kende "${huidigNummer(s).titel}" niet`)
    }
  }

  s.onthuld = huidigNummer(s)
  s.uitdeelIndex = 0
  s.fase = s.goed.length > 0 ? 'uitdelen' : 'uitslag'
}

export const nummers: GameModule<NummerState> = {
  id: 'nummers',
  naam: 'Raad het Nummer',
  uitleg: 'Eén seconde muziek op je eigen telefoon. Sneller raden levert meer op.',
  regels: [
    'Iedereen luistert op zijn eigen telefoon.',
    'Eerst één seconde. Nodig? Rek zelf op naar meer.',
    'Meteen goed = 7 uitdelen, na 20 seconden nog 2.',
    'Krijg je het niet? Dan drink je 5.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['reflex', 'praten'],
  privescherm: true,

  init(ctx) {
    const s: NummerState = {
      ronde: 1,
      fase: 'spelen',
      _geheim: { lijst: husselen(ctx.rng, NUMMERS).slice(0, RONDES + 3) },
      url: '',
      stap: {},
      goed: [],
      op: [],
      uitdeelIndex: 0,
      onthuld: null,
      klaar: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)
    const isKlaarMetRonde = (uid: string) =>
      s.goed.some((g) => g.uid === uid) || s.op.includes(uid)

    if (s.fase === 'spelen') {
      /* Zelf oprekken naar een langer fragment */
      if (actie.type === 'langer') {
        if (isKlaarMetRonde(actie.uid)) return
        const nu = s.stap[actie.uid] ?? 0
        if (nu < STAPPEN.length - 1) s.stap[actie.uid] = nu + 1
        return
      }

      if (actie.type === 'gok') {
        if (isKlaarMetRonde(actie.uid)) return
        const gok = String(actie.payload?.woord ?? '').trim().slice(0, 40)
        if (!gok) return
        const nummer = huidigNummer(s)

        if (klopt(gok, nummer.titel)) {
          const stap = s.stap[actie.uid] ?? 0
          s.goed.push({ uid: actie.uid, stap })
          // Alleen deze speler krijgt te horen dat het goed was.
          ctx.zetPrive(actie.uid, { goed: true, beloning: BELONING[stap] })
          ctx.log(`${ctx.naam(actie.uid)} had hem na ${STAPPEN[stap]} sec`)
        } else {
          // Een foute gok blijft tussen jou en je telefoon, anders geef je
          // de rest gratis hints.
          ctx.zetPrive(actie.uid, { fout: gok, ts: actie.ts })
        }

        if (iedereen.every(isKlaarMetRonde)) rondAf(s, ctx)
        return
      }

      if (actie.type === 'geef-op') {
        if (isKlaarMetRonde(actie.uid)) return
        s.op.push(actie.uid)
        ctx.zetPrive(actie.uid, { opgegeven: true })
        if (iedereen.every(isKlaarMetRonde)) rondAf(s, ctx)
        return
      }

      /* De host kapt af als er iemand blijft hangen. */
      if (actie.type === 'kap-af') {
        for (const uid of iedereen) {
          if (!isKlaarMetRonde(uid)) s.op.push(uid)
        }
        rondAf(s, ctx)
        return
      }
      return
    }

    if (s.fase === 'uitdelen' && actie.type === 'geef') {
      const aanZet = s.goed[s.uitdeelIndex]
      if (!aanZet || actie.uid !== aanZet.uid) return
      const verdeling: Record<string, number> = actie.payload?.verdeling
      if (!verdeling || typeof verdeling !== 'object') return

      for (const [uid, aantal] of Object.entries(verdeling)) {
        if (!iedereen.includes(uid) || uid === aanZet.uid) continue
        ctx.deelUitPrecies(aanZet.uid, uid, aantal, `raadde na ${STAPPEN[aanZet.stap]} sec`)
      }
      s.uitdeelIndex++
      if (s.uitdeelIndex >= s.goed.length) s.fase = 'uitslag'
      return
    }

    if (s.fase === 'uitdelen' && actie.type === 'sla-over') {
      s.uitdeelIndex++
      if (s.uitdeelIndex >= s.goed.length) s.fase = 'uitslag'
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
    return <Scherm s={s} ctx={ctx} />
  },
}

/* ── Scherm ─────────────────────────────────────────────────── */

function Scherm({ s, ctx }: { s: NummerState; ctx: KijkContext }) {
  const [gok, zetGok] = useState('')
  const [speelt, zetSpeelt] = useState(false)
  const [laadfout, zetLaadfout] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stopRef = useRef<number | null>(null)

  const mijnStap = s.stap[ctx.ik] ?? 0
  const ikGoed = s.goed.some((g) => g.uid === ctx.ik)
  const ikOp = s.op.includes(ctx.ik)
  const ikKlaar = ikGoed || ikOp

  /* Elke telefoon speelt zijn eigen fragment af. */
  useEffect(() => {
    const el = new Audio()
    el.preload = 'auto'
    audioRef.current = el
    return () => {
      el.pause()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    const el = audioRef.current
    if (!el || !s.url) return
    el.pause()
    el.src = s.url
    el.load()
    zetLaadfout(false)
    zetSpeelt(false)
    zetGok('')
  }, [s.url])

  function speel(secondes: number) {
    const el = audioRef.current
    if (!el) return
    if (stopRef.current) window.clearTimeout(stopRef.current)
    el.currentTime = 0
    zetSpeelt(true)
    el.play()
      .then(() => {
        stopRef.current = window.setTimeout(() => {
          el.pause()
          zetSpeelt(false)
        }, secondes * 1000)
      })
      .catch(() => {
        zetLaadfout(true)
        zetSpeelt(false)
      })
  }

  /* ── Uitdelen ── */
  if (s.fase === 'uitdelen') {
    const aanZet = s.goed[s.uitdeelIndex]
    const ikAanZet = aanZet?.uid === ctx.ik

    return (
      <>
        <div className="midden" style={{ gap: 10 }}>
          <div className="kop-klein">Het nummer was</div>
          <h1 style={{ textAlign: 'center' }}>{s.onthuld?.titel}</h1>
          <h2 className="zacht">{s.onthuld?.artiest}</h2>
        </div>

        <div className="onderaan">
          {ikAanZet ? (
            <Verdeler
              key={s.uitdeelIndex}
              totaal={ctx.slokAantal(BELONING[aanZet.stap])}
              ctx={ctx}
              titel={`Geraden na ${STAPPEN[aanZet.stap]} sec — deel uit`}
              bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
            />
          ) : (
            <>
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">
                  {ctx.naam(aanZet.uid)} deelt {ctx.slok(BELONING[aanZet.stap])} uit…
                </span>
              </Kaartje>
              {ctx.benIkHost && (
                <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('sla-over')}>
                  Sla over
                </GroteKnop>
              )}
            </>
          )}
        </div>
      </>
    )
  }

  /* ── Uitslag ── */
  if (s.fase === 'uitslag') {
    return (
      <>
        <div className="midden" style={{ gap: 10, alignItems: 'stretch' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="kop-klein">Het nummer was</div>
            <h1>{s.onthuld?.titel}</h1>
            <h2 className="zacht">{s.onthuld?.artiest}</h2>
          </div>

          {ctx.spelers.map((p) => {
            const g = s.goed.find((x) => x.uid === p.uid)
            return (
              <div
                key={p.uid}
                className="kaartje balk"
                style={{
                  padding: 8,
                  borderColor: g ? 'var(--groen)' : 'var(--rood)',
                  background: g ? undefined : 'var(--rood-donker)',
                }}
              >
                <span>
                  {p.emoji} <strong>{p.naam}</strong>
                </span>
                <span className="klein">
                  {g ? `na ${STAPPEN[g.stap]}s · deelde ${BELONING[g.stap]} uit` : `🍺 ${STRAF_MISLUKT}`}
                </span>
              </div>
            )
          })}
        </div>

        <div className="onderaan">
          {ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
              {s.ronde >= RONDES ? 'Klaar' : 'Volgend nummer'}
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

  /* ── Spelen ── */
  const laatsteStap = mijnStap >= STAPPEN.length - 1
  const fout: string | undefined = ctx.prive?.fout

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Nummer {s.ronde}/{RONDES}
        </span>
        <span className="kop-klein">
          {s.goed.length + s.op.length}/{ctx.spelers.length} klaar
        </span>
      </div>

      {ikKlaar ? (
        <div className="midden" style={{ gap: 12 }}>
          <div style={{ fontSize: 56 }}>{ikGoed ? '🎧' : '🤷'}</div>
          <h1>{ikGoed ? 'Je hebt hem!' : 'Opgegeven'}</h1>
          {ikGoed && (
            <Kaartje style={{ textAlign: 'center', borderColor: 'var(--groen)' }}>
              <div className="kop-klein">Straks uit te delen</div>
              <h2 style={{ color: 'var(--groen)' }}>
                {ctx.slok(BELONING[s.goed.find((g) => g.uid === ctx.ik)!.stap])}
              </h2>
            </Kaartje>
          )}
          <div className="klein zacht">Niets zeggen — laat de rest zwoegen.</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
            {ctx.spelers.map((p) => {
              const klaar = s.goed.some((g) => g.uid === p.uid) || s.op.includes(p.uid)
              return (
                <span
                  key={p.uid}
                  className="kaartje"
                  style={{ padding: '4px 10px', fontSize: 12, opacity: klaar ? 0.4 : 1 }}
                >
                  {p.emoji} {p.naam} {klaar ? '✓' : '…'}
                </span>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="midden" style={{ gap: 10 }}>
            <div style={{ fontSize: 52 }} className={speelt ? 'klopt' : ''}>
              {speelt ? '🔊' : '🎵'}
            </div>
            <div className="reusachtig" style={{ fontSize: 'clamp(40px,15vw,80px)' }}>
              {STAPPEN[mijnStap]}s
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {STAPPEN.map((sec, i) => (
                <span
                  key={sec}
                  style={{
                    width: 24,
                    height: 8,
                    borderRadius: 99,
                    background:
                      i < mijnStap ? 'var(--rand)' : i === mijnStap ? 'var(--goud)' : 'var(--vlak-hoog)',
                  }}
                />
              ))}
            </div>
            <Kaartje style={{ textAlign: 'center' }}>
              <div className="kop-klein">Nu waard</div>
              <strong style={{ fontSize: 20, color: 'var(--goud)' }}>
                {ctx.slok(BELONING[mijnStap])} uitdelen
              </strong>
            </Kaartje>
            {fout && (
              <div className="klein" style={{ color: 'var(--rood)' }}>
                "{fout}" — dat is 'm niet
              </div>
            )}
          </div>

          <div className="onderaan">
            <GroteKnop kleur="goud" enorm uit={speelt} bijTik={() => speel(STAPPEN[mijnStap])}>
              {speelt ? '🔊 Speelt…' : `▶ Speel ${STAPPEN[mijnStap]} ${STAPPEN[mijnStap] === 1 ? 'seconde' : 'seconden'}`}
            </GroteKnop>

            {laadfout && (
              <div className="klein" style={{ color: 'var(--rood)', textAlign: 'center' }}>
                Fragment laadt niet — vraag de host dit nummer over te slaan.
              </div>
            )}

            <input
              value={gok}
              onChange={(e) => zetGok(e.target.value.slice(0, 40))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && gok.trim().length >= 3) {
                  ctx.stuur('gok', { woord: gok })
                  zetGok('')
                }
              }}
              placeholder="welk nummer is dit?"
              autoComplete="off"
              autoCorrect="off"
            />
            <GroteKnop
              kleur="groen"
              uit={gok.trim().length < 3}
              bijTik={() => {
                tril(8)
                ctx.stuur('gok', { woord: gok })
                zetGok('')
              }}
            >
              Dit is het
            </GroteKnop>

            <div className="rij">
              <GroteKnop
                kleur="leeg"
                klein
                uit={laatsteStap}
                bijTik={() => ctx.stuur('langer')}
              >
                {laatsteStap
                  ? 'Langer kan niet meer'
                  : `Langer ▶ ${STAPPEN[mijnStap + 1]}s · nog ${BELONING[mijnStap + 1]}`}
              </GroteKnop>
              <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('geef-op')}>
                Opgeven — {ctx.slokKort(STRAF_MISLUKT)}
              </GroteKnop>
            </div>

            {ctx.benIkHost && (
              <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('kap-af')}>
                Genoeg — antwoord tonen
              </GroteKnop>
            )}

            <div className="klein zacht" style={{ textAlign: 'center' }}>
              Alleen de titel, ruim gespeld. De artiest hoeft niet.
            </div>
          </div>
        </>
      )}
    </>
  )
}

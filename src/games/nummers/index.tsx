import { useEffect, useRef, useState } from 'react'
import { husselen } from '../../engine/random'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { NUMMERS, type Nummer } from './lijst'

/* ─────────────────────────────────────────────────────────────
   RAAD HET NUMMER

   Iedereen hoort even veel. Je begint met één seconde, en er komt pas meer bij
   als íedereen die nog aan het raden is daarmee instemt. Wie hem al heeft stemt
   niet mee -- die heeft er baat bij dat het kort blijft, en mag dus ook niet
   tegenhouden.

   Het verschil zit in de volgorde. Wie hem als eerste heeft mag zeven slokken
   uitdelen, de tweede vijf, daarna minder -- ook als jullie precies evenveel
   gehoord hebben. Wie hem helemaal niet krijgt, drinkt.

   Afspelen doet iedereen op zijn eigen telefoon, wanneer hij wil. Alleen hoe
   lang je mag horen is gedeeld.

   De fragmenten komen van Apple's openbare voorluister-dienst: dertig seconden
   per nummer, gratis en zonder inloggen. Zo'n fragment begint meestal bij het
   refrein en niet bij het begin van het nummer, wat die eerste seconde juist
   herkenbaarder maakt.
   ───────────────────────────────────────────────────────────── */

/** Hoeveel seconden er per stap te horen is. Geldt voor iedereen tegelijk. */
const STAPPEN = [1, 2, 4, 7, 12, 20]
/**
 * Wat je mag uitdelen, op volgorde van raden.
 *
 * Niet op hoe lang je geluisterd hebt: iedereen hoort even veel, dus dat zou
 * niets onderscheiden. Wie hem als eerste heeft is de snelste van de tafel, en
 * daar hoort de grootste beloning bij.
 */
const BELONING_PLEK = [7, 5, 4, 3, 2, 2, 1, 1]

function beloningVoor(plek: number): number {
  return BELONING_PLEK[Math.min(plek, BELONING_PLEK.length - 1)]
}
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

  /** hoeveel er nu te horen is — voor iedereen hetzelfde */
  stap: number
  /** wie er gestemd heeft om langer te luisteren */
  stemmen: string[]
  /** wie het geraden heeft, op volgorde; de plek in deze rij bepaalt de beloning */
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
  s.stap = 0
  s.stemmen = []
  s.goed = []
  s.op = []
  s.uitdeelIndex = 0
  s.onthuld = null
  for (const p of ctx.spelers) ctx.zetPrive(p.uid, null)
}

/**
 * Zijn ze het eens over langer luisteren? Dan gaat de stap omhoog.
 *
 * Wordt ook aangeroepen als er iemand afvalt: wie hem net geraden heeft telt
 * niet meer mee, en dan kan de stemming ineens rond zijn zonder dat er nog
 * iemand op de knop hoefde te drukken.
 */
function controleerStemmen(s: NummerState, bezig: string[]) {
  if (s.stap >= STAPPEN.length - 1) return
  if (bezig.length === 0) return
  if (!bezig.every((u) => s.stemmen.includes(u))) return
  s.stap++
  s.stemmen = []
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
  uitleg: 'Eén seconde muziek. Wie hem als eerste heeft, deelt het meest uit.',
  regels: [
    'Iedereen hoort even veel — te beginnen met één seconde.',
    'Meer horen mag pas als iedereen die nog zoekt dat wil.',
    'Eerste die hem heeft deelt 7 uit, de tweede 5, daarna minder.',
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
      stap: 0,
      stemmen: [],
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
      /* Stemmen om er meer van te horen. Pas als iedereen die nog zoekt het
         eens is, komt er een stuk bij. */
      if (actie.type === 'langer') {
        if (isKlaarMetRonde(actie.uid)) return
        if (s.stap >= STAPPEN.length - 1) return
        if (!s.stemmen.includes(actie.uid)) s.stemmen.push(actie.uid)
        controleerStemmen(s, iedereen.filter((u) => !isKlaarMetRonde(u)))
        return
      }

      if (actie.type === 'gok') {
        if (isKlaarMetRonde(actie.uid)) return
        const gok = String(actie.payload?.woord ?? '').trim().slice(0, 40)
        if (!gok) return
        const nummer = huidigNummer(s)

        if (klopt(gok, nummer.titel)) {
          const plek = s.goed.length
          s.goed.push({ uid: actie.uid, stap: s.stap })
          // Zijn stem telt niet meer mee: hij is klaar, en zou anders de rest
          // kunnen ophouden.
          s.stemmen = s.stemmen.filter((u) => u !== actie.uid)
          // Alleen deze speler krijgt te horen dat het goed was.
          ctx.zetPrive(actie.uid, { goed: true, beloning: beloningVoor(plek) })
          ctx.log(
            `${ctx.naam(actie.uid)} had hem als ${plek + 1}e, na ${STAPPEN[s.stap]} sec`,
          )
        } else {
          // Een foute gok blijft tussen jou en je telefoon, anders geef je
          // de rest gratis hints.
          ctx.zetPrive(actie.uid, { fout: gok, ts: actie.ts })
        }

        if (iedereen.every(isKlaarMetRonde)) rondAf(s, ctx)
        else controleerStemmen(s, iedereen.filter((u) => !isKlaarMetRonde(u)))
        return
      }

      if (actie.type === 'geef-op') {
        if (isKlaarMetRonde(actie.uid)) return
        s.op.push(actie.uid)
        s.stemmen = s.stemmen.filter((u) => u !== actie.uid)
        ctx.zetPrive(actie.uid, { opgegeven: true })
        if (iedereen.every(isKlaarMetRonde)) rondAf(s, ctx)
        else controleerStemmen(s, iedereen.filter((u) => !isKlaarMetRonde(u)))
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
        ctx.deelUitPrecies(aanZet.uid, uid, aantal, `had hem als ${s.uitdeelIndex + 1}e`)
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

  const stap = s.stap ?? 0
  const mijnPlek = s.goed.findIndex((g) => g.uid === ctx.ik)
  const ikGoed = mijnPlek >= 0
  const ikOp = s.op.includes(ctx.ik)
  const ikKlaar = ikGoed || ikOp

  // Wie er nog zoekt, en dus mag meestemmen over langer luisteren.
  const bezig = ctx.spelers.filter(
    (p) => !s.goed.some((g) => g.uid === p.uid) && !s.op.includes(p.uid),
  )
  const stemmen = s.stemmen ?? []
  const ikGestemd = stemmen.includes(ctx.ik)

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
              totaal={ctx.slokAantal(beloningVoor(s.uitdeelIndex))}
              ctx={ctx}
              titel={`${s.uitdeelIndex + 1}e die hem had — deel uit`}
              bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
            />
          ) : (
            <>
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">
                  {ctx.naam(aanZet.uid)} deelt {ctx.slok(beloningVoor(s.uitdeelIndex))} uit…
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
            const plek = s.goed.findIndex((x) => x.uid === p.uid)
            const g = plek >= 0 ? s.goed[plek] : undefined
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
                  {g
                    ? `${plek + 1}e · na ${STAPPEN[g.stap]}s · deelde ${beloningVoor(plek)} uit`
                    : `🍺 ${STRAF_MISLUKT}`}
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
  const laatsteStap = stap >= STAPPEN.length - 1
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
              <div className="klein zacht">
                Je had hem als {mijnPlek + 1}e van {ctx.spelers.length}
              </div>
              <h2 style={{ color: 'var(--groen)' }}>{ctx.slok(beloningVoor(mijnPlek))}</h2>
            </Kaartje>
          )}
          <div className="klein zacht">Niets zeggen — laat de rest zwoegen.</div>
          <div className="klein zacht">
            Er is nu {STAPPEN[stap]} seconde{STAPPEN[stap] === 1 ? '' : 'n'} te horen. Jij stemt
            niet meer mee over langer luisteren.
          </div>
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
              {STAPPEN[stap]}s
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
                      i < stap ? 'var(--rand)' : i === stap ? 'var(--goud)' : 'var(--vlak-hoog)',
                  }}
                />
              ))}
            </div>
            <Kaartje style={{ textAlign: 'center' }}>
              <div className="kop-klein">
                {s.goed.length === 0 ? 'Als eerste goed' : `Als ${s.goed.length + 1}e goed`}
              </div>
              <strong style={{ fontSize: 20, color: 'var(--goud)' }}>
                {ctx.slok(beloningVoor(s.goed.length))} uitdelen
              </strong>
              {s.goed.length > 0 && (
                <div className="klein zacht" style={{ marginTop: 4 }}>
                  {s.goed.length === 1 ? 'Er is er al één' : `Er zijn er al ${s.goed.length}`} —
                  hoe later, hoe minder.
                </div>
              )}
            </Kaartje>
            {fout && (
              <div className="klein" style={{ color: 'var(--rood)' }}>
                "{fout}" — dat is 'm niet
              </div>
            )}
          </div>

          <div className="onderaan">
            <GroteKnop kleur="goud" enorm uit={speelt} bijTik={() => speel(STAPPEN[stap])}>
              {speelt
                ? '🔊 Speelt…'
                : `▶ Speel ${STAPPEN[stap]} ${STAPPEN[stap] === 1 ? 'seconde' : 'seconden'}`}
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
                kleur={ikGestemd ? 'goud' : 'leeg'}
                klein
                uit={laatsteStap || ikGestemd}
                bijTik={() => ctx.stuur('langer')}
              >
                {laatsteStap
                  ? 'Langer kan niet meer'
                  : ikGestemd
                    ? `Gestemd · ${stemmen.length}/${bezig.length}`
                    : `Langer ▶ ${STAPPEN[stap + 1]}s`}
              </GroteKnop>
              <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('geef-op')}>
                Opgeven — {ctx.slokKort(STRAF_MISLUKT)}
              </GroteKnop>
            </div>

            {!laatsteStap && (
              <div className="klein zacht" style={{ textAlign: 'center' }}>
                {stemmen.length === 0
                  ? `Er komt pas meer bij als alle ${bezig.length} die nog zoeken dat willen.`
                  : `${stemmen.length} van de ${bezig.length} willen langer luisteren.`}
              </div>
            )}

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

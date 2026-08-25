import { useEffect, useRef, useState } from 'react'
import { husselen } from '../../engine/random'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { NUMMERS, type Nummer } from './lijst'

/* ─────────────────────────────────────────────────────────────
   RAAD HET NUMMER

   Je hoort eerst één seconde. Weet je het niet, dan hoor je er twee. Dan
   vier, zeven, twaalf, twintig. Hoe langer het duurt, hoe minder het oplevert
   — en komt niemand eruit, dan drinkt iedereen fors.

   De telefoon van de host is de speaker; die speelt hardop af. De rest luistert
   mee en typt gokken in op zijn eigen scherm.

   De fragmenten komen van Apple's openbare voorluister-dienst: dertig seconden
   per nummer, gratis en zonder inloggen. Wel goed om te weten: dat fragment
   begint meestal bij het refrein en niet bij het begin van het nummer. Die ene
   seconde is daardoor juist herkenbaarder dan je zou denken.
   ───────────────────────────────────────────────────────────── */

/** Hoeveel seconden je per stap te horen krijgt. */
const STAPPEN = [1, 2, 4, 7, 12, 20]
/** Wat de rest drinkt als niemand het weet. */
const STRAF_NIEMAND = 6
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
  // "bohemian" telt voor "bohemianrhapsody", maar "the" niet.
  if (g.length >= 5 && t.includes(g)) return true
  if (t.length >= 5 && g.includes(t)) return true
  return false
}

interface NummerState {
  ronde: number
  fase: 'spelen' | 'uitslag'
  stap: number

  _geheim: { lijst: Nummer[] }
  /** het nummer dat nu speelt — alleen de url, de titel blijft geheim */
  url: string

  gokken: { uid: string; woord: string; goed: boolean }[]
  winnaar: string | null
  onthuld: Nummer | null
  magUitdelen: boolean
  klaar: boolean
}

function nieuweRonde(s: NummerState, ctx: SpelContext) {
  const nummer = s._geheim.lijst[(s.ronde - 1) % s._geheim.lijst.length]
  s.url = nummer.url
  s.stap = 0
  s.fase = 'spelen'
  s.gokken = []
  s.winnaar = null
  s.onthuld = null
  s.magUitdelen = false
  ctx.wisPrive()
}

function huidigNummer(s: NummerState): Nummer {
  return s._geheim.lijst[(s.ronde - 1) % s._geheim.lijst.length]
}

export const nummers: GameModule<NummerState> = {
  id: 'nummers',
  naam: 'Raad het Nummer',
  uitleg: 'Eén seconde muziek. Weet je het niet? Dan hoor je meer, maar dan kost het.',
  regels: [
    'De host speelt eerst één seconde af.',
    'Typ zo snel mogelijk welk nummer het is.',
    'Niemand? Langer fragment, minder punten.',
    'Komt niemand eruit, dan drinkt iedereen.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['reflex', 'praten', 'chaos'],
  privescherm: false,

  init(ctx) {
    const s: NummerState = {
      ronde: 1,
      fase: 'spelen',
      stap: 0,
      _geheim: { lijst: husselen(ctx.rng, NUMMERS).slice(0, RONDES + 3) },
      url: '',
      gokken: [],
      winnaar: null,
      onthuld: null,
      magUitdelen: false,
      klaar: false,
    }
    nieuweRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'spelen') {
      if (actie.type === 'gok') {
        const gok = String(actie.payload?.woord ?? '').trim().slice(0, 40)
        if (!gok) return
        const nummer = huidigNummer(s)

        if (klopt(gok, nummer.titel)) {
          s.winnaar = actie.uid
          s.onthuld = nummer
          s.fase = 'uitslag'
          s.magUitdelen = true
          s.gokken.push({ uid: actie.uid, woord: gok, goed: true })
          ctx.log(`${ctx.naam(actie.uid)} had het na ${STAPPEN[s.stap]} seconden`)
          return
        }

        s.gokken.push({ uid: actie.uid, woord: gok, goed: false })
        if (s.gokken.length > 14) s.gokken.shift()
        return
      }

      if (actie.type === 'langer') {
        if (s.stap < STAPPEN.length - 1) {
          s.stap++
          return
        }
        // Laatste stap gehad en nog steeds niets: iedereen betaalt.
        const nummer = huidigNummer(s)
        s.onthuld = nummer
        s.winnaar = null
        s.fase = 'uitslag'
        ctx.iedereenDrinkt(STRAF_NIEMAND, `niemand kende "${nummer.titel}"`)
        return
      }

      if (actie.type === 'sla-over') {
        // Fragment laadt niet: overslaan zonder straf.
        s.onthuld = huidigNummer(s)
        s.winnaar = null
        s.fase = 'uitslag'
        ctx.log('Fragment kon niet worden afgespeeld — overgeslagen')
        return
      }
      return
    }

    if (s.fase === 'uitslag') {
      if (actie.type === 'geef' && s.magUitdelen && actie.uid === s.winnaar) {
        const verdeling: Record<string, number> = actie.payload?.verdeling
        if (!verdeling || typeof verdeling !== 'object') return
        for (const [uid, aantal] of Object.entries(verdeling)) {
          if (!iedereen.includes(uid) || uid === actie.uid) continue
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'raadde het nummer')
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

/* ── Scherm ─────────────────────────────────────────────────── */

function Scherm({ s, ctx }: { s: NummerState; ctx: KijkContext }) {
  const [gok, zetGok] = useState('')
  const [speelt, zetSpeelt] = useState(false)
  const [fout, zetFout] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stopRef = useRef<number | null>(null)

  // Eén audio-element voor het hele spel; alleen de host gebruikt het.
  useEffect(() => {
    const el = new Audio()
    el.preload = 'auto'
    audioRef.current = el
    return () => {
      el.pause()
      audioRef.current = null
    }
  }, [])

  // Nieuw nummer: laden en de teller resetten.
  useEffect(() => {
    const el = audioRef.current
    if (!el || !s.url) return
    el.pause()
    el.src = s.url
    el.load()
    zetFout(false)
    zetSpeelt(false)
  }, [s.url])

  function speel() {
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
        }, STAPPEN[s.stap] * 1000)
      })
      .catch(() => {
        zetFout(true)
        zetSpeelt(false)
      })
  }

  /* ── Uitslag ── */
  if (s.fase === 'uitslag') {
    const magUitdelen = s.magUitdelen && s.winnaar === ctx.ik
    const beloning = STAPPEN.length - s.stap

    return (
      <>
        <div className="midden" style={{ gap: 12 }}>
          <div style={{ fontSize: 54 }}>{s.winnaar ? '🎧' : '🤷'}</div>
          <div style={{ textAlign: 'center' }}>
            <h1>{s.onthuld?.titel}</h1>
            <h2 className="zacht">{s.onthuld?.artiest}</h2>
          </div>

          <Kaartje
            style={{
              textAlign: 'center',
              borderColor: s.winnaar ? 'var(--groen)' : 'var(--rood)',
            }}
          >
            {s.winnaar ? (
              <>
                <strong>
                  {ctx.speler(s.winnaar)?.emoji} {ctx.naam(s.winnaar)} had hem
                </strong>
                <div className="klein zacht">na {STAPPEN[s.stap]} seconden</div>
              </>
            ) : (
              <strong>Niemand kwam eruit</strong>
            )}
          </Kaartje>
        </div>

        <div className="onderaan">
          {magUitdelen ? (
            <Verdeler
              totaal={ctx.slokAantal(beloning)}
              ctx={ctx}
              titel={`Geraden na ${STAPPEN[s.stap]}s — deel uit`}
              bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
            />
          ) : s.magUitdelen ? (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">{ctx.naam(s.winnaar!)} deelt uit…</span>
            </Kaartje>
          ) : ctx.benIkHost ? (
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
  const laatste = STAPPEN.length - 1
  const beloning = STAPPEN.length - s.stap

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Nummer {s.ronde}/{RONDES}
        </span>
        <span className="kop-klein">levert {ctx.slokKort(beloning)} op</span>
      </div>

      <div className="midden" style={{ gap: 12 }}>
        <div style={{ fontSize: 56 }} className={speelt ? 'klopt' : ''}>
          {speelt ? '🔊' : '🎵'}
        </div>
        <div className="reusachtig" style={{ fontSize: 'clamp(44px,16vw,88px)' }}>
          {STAPPEN[s.stap]}s
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {STAPPEN.map((sec, i) => (
            <span
              key={sec}
              style={{
                width: 26,
                height: 8,
                borderRadius: 99,
                background:
                  i < s.stap ? 'var(--rand)' : i === s.stap ? 'var(--goud)' : 'var(--vlak-hoog)',
              }}
            />
          ))}
        </div>

        {!ctx.benIkHost && (
          <div className="klein zacht" style={{ textAlign: 'center' }}>
            De telefoon van de host speelt af — luister mee.
          </div>
        )}
      </div>

      <div className="logboek" style={{ maxHeight: 72 }}>
        {s.gokken
          .slice(-6)
          .reverse()
          .map((g, i) => (
            <div key={i}>
              <strong>{ctx.naam(g.uid)}</strong>: {g.woord}
            </div>
          ))}
      </div>

      <div className="onderaan">
        {ctx.benIkHost && (
          <>
            <GroteKnop kleur="goud" enorm uit={speelt} bijTik={speel}>
              {speelt ? '🔊 Speelt…' : `▶ Speel ${STAPPEN[s.stap]} ${STAPPEN[s.stap] === 1 ? 'seconde' : 'seconden'}`}
            </GroteKnop>
            {fout && (
              <div className="klein" style={{ color: 'var(--rood)', textAlign: 'center' }}>
                Fragment kon niet worden afgespeeld.
              </div>
            )}
            <div className="rij">
              <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('langer')}>
                {s.stap >= laatste ? 'Geef het antwoord' : `Langer ▶ ${STAPPEN[s.stap + 1]}s`}
              </GroteKnop>
              {fout && (
                <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('sla-over')}>
                  Sla over
                </GroteKnop>
              )}
            </div>
          </>
        )}

        <input
          value={gok}
          onChange={(e) => zetGok(e.target.value.slice(0, 40))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && gok.trim()) {
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
          Gokken
        </GroteKnop>
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          De titel is genoeg — de artiest hoeft niet.
        </div>
      </div>
    </>
  )
}

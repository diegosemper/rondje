import { useState } from 'react'
import { husselen } from '../../engine/random'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { VERHALEN, type Zwart } from './verhalen'

/* ─────────────────────────────────────────────────────────────
   BLACK STORIES

   Volgens de regels van het kaartspel: er is één verteller die als enige de
   oplossing kent. Hij leest het raadsel voor en beantwoordt daarna alleen nog
   maar JA, NEE of NIET RELEVANT. De rest reconstrueert wat er gebeurd is.

   Wat de app hier beter doet dan de kaartjes: aan een echte tafel raakt
   iedereen kwijt wat er al gevraagd is, wordt er door elkaar heen geroepen en
   komt de stilste van de groep nooit aan de beurt. Hier typ je je vraag, komt
   hij in de wachtrij van de verteller, en blijft elk antwoord in een lijst
   staan die iedereen kan teruglezen. Dat is hetzelfde idee als de regels die
   Kingsen onthoudt: de app houdt bij wat de tafel vergeet.

   De oplossing staat in `_geheim` en gaat via `zetPrive` alleen naar de
   verteller. Op de andere telefoons staat hij simpelweg niet, dus er valt ook
   niets te spieken.
   ───────────────────────────────────────────────────────────── */

const RAADSELS_PER_POTJE = 3
/** Zoveel vragen heeft de groep per raadsel. */
const VRAGEN_BUDGET = 20
/** Wat degene die het kraakt mag uitdelen. */
const WINST_UITDELEN = 5
/** Wat de groep drinkt als de vragen op zijn. */
const STRAF_NIET_GEKRAAKT = 3
const MAX_VRAAG = 90

type Antwoord = 'ja' | 'nee' | 'nvt'

interface Beurt {
  id: string
  uid: string
  vraag: string
}

interface Gegeven extends Beurt {
  antwoord: Antwoord
}

interface ZwartState {
  fase: 'raden' | 'onthuld' | 'klaar'
  ronde: number
  verteller: string

  /** het raadsel zelf — dit mag iedereen zien */
  titel: string
  raadsel: string

  /** de vragen die de verteller nog moet beantwoorden */
  wachtrij: Beurt[]
  /** alles wat al beantwoord is, voor iedereen zichtbaar */
  spoor: Gegeven[]
  vragenOver: number
  teller: number

  /** gezet zodra het raadsel voorbij is */
  afloop: { gekraakt: boolean; oplosser: string | null; oplossing: string } | null
  magUitdelen: boolean

  _geheim: {
    oplossing: string
    /** de raadsels van dit potje, op volgorde */
    lijst: Zwart[]
  }

  klaar: boolean
}

/** Zet het raadsel van deze ronde klaar en geeft de oplossing aan de verteller. */
function nieuwRaadsel(s: ZwartState, ctx: SpelContext) {
  const z = s._geheim.lijst[(s.ronde - 1) % s._geheim.lijst.length]

  s.fase = 'raden'
  s.titel = z.titel
  s.raadsel = z.raadsel
  s._geheim.oplossing = z.oplossing
  s.wachtrij = []
  s.spoor = []
  s.vragenOver = VRAGEN_BUDGET
  s.afloop = null
  s.magUitdelen = false

  // Alleen de verteller krijgt de oplossing te zien.
  for (const p of ctx.spelers) {
    ctx.zetPrive(p.uid, p.uid === s.verteller ? { oplossing: z.oplossing } : null)
  }

  ctx.log(`${ctx.naam(s.verteller)} vertelt: "${z.titel}"`)
}

function sluitAf(
  s: ZwartState,
  ctx: SpelContext,
  gekraakt: boolean,
  oplosser: string | null,
) {
  s.fase = 'onthuld'
  s.afloop = { gekraakt, oplosser, oplossing: s._geheim.oplossing }

  if (gekraakt && oplosser) {
    s.magUitdelen = true
    ctx.log(`${ctx.naam(oplosser)} kraakte "${s.titel}"`)
    return
  }

  // Niet gekraakt: de hele tafel behalve de verteller drinkt. Die had het
  // tenslotte makkelijk.
  for (const p of ctx.spelers) {
    if (p.uid === s.verteller) continue
    ctx.drink(p.uid, STRAF_NIET_GEKRAAKT, `kwam er niet uit bij "${s.titel}"`)
  }
}

export const blackstories: GameModule<ZwartState> = {
  id: 'blackstories',
  naam: 'Black Stories',
  uitleg: 'Eén iemand kent de oplossing. De rest vraagt zich eruit met ja of nee.',
  regels: [
    'De verteller kent als enige de oplossing.',
    'Typ je vraag; hij mag alleen ja of nee antwoorden.',
    'Alle antwoorden blijven staan, dus vraag niets dubbel.',
    'Kraken jullie hem, dan deelt de oplosser uit. Zo niet, drinkt de groep.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'lang',
  tags: ['praten', 'geheim'],
  privescherm: true,

  init(ctx) {
    const s: ZwartState = {
      fase: 'raden',
      ronde: 1,
      verteller: ctx.spelers[0].uid,
      titel: '',
      raadsel: '',
      wachtrij: [],
      spoor: [],
      vragenOver: VRAGEN_BUDGET,
      teller: 0,
      afloop: null,
      magUitdelen: false,
      _geheim: {
        oplossing: '',
        lijst: husselen(ctx.rng, VERHALEN).slice(0, RAADSELS_PER_POTJE),
      },
      klaar: false,
    }
    nieuwRaadsel(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'raden') {
      /* Een vraag insturen. Iedereen mag, behalve de verteller. */
      if (actie.type === 'vraag') {
        if (actie.uid === s.verteller) return
        if (s.vragenOver <= 0) return
        const vraag = String(actie.payload?.vraag ?? '')
          .trim()
          .slice(0, MAX_VRAAG)
        if (vraag.length < 3) return

        // Eén vraag tegelijk per persoon: anders vult één iemand de hele
        // wachtrij en komt de rest er niet meer tussen.
        if (s.wachtrij.some((b) => b.uid === actie.uid)) return

        s.teller++
        s.wachtrij.push({ id: `v${s.teller}`, uid: actie.uid, vraag })
        return
      }

      /* Antwoorden mag alleen de verteller. */
      if (actie.type === 'antwoord') {
        if (actie.uid !== s.verteller) return
        const id = String(actie.payload?.id ?? '')
        const antwoord = actie.payload?.antwoord as Antwoord
        if (!['ja', 'nee', 'nvt'].includes(antwoord)) return

        const i = s.wachtrij.findIndex((b) => b.id === id)
        if (i < 0) return

        const [beurt] = s.wachtrij.splice(i, 1)
        s.spoor.push({ ...beurt, antwoord })
        s.vragenOver--

        if (s.vragenOver <= 0) sluitAf(s, ctx, false, null)
        return
      }

      /* De verteller kapt een vraag af die geen ja/nee-vraag is. Dat kost geen
         budget: anders wordt de groep gestraft voor iets wat de app niet kan
         controleren. */
      if (actie.type === 'weg') {
        if (actie.uid !== s.verteller) return
        const id = String(actie.payload?.id ?? '')
        s.wachtrij = s.wachtrij.filter((b) => b.id !== id)
        return
      }

      /* Ze hebben het. De verteller wijst aan wie. */
      if (actie.type === 'gekraakt') {
        if (actie.uid !== s.verteller) return
        const wie = String(actie.payload?.uid ?? '')
        if (!iedereen.includes(wie) || wie === s.verteller) return
        sluitAf(s, ctx, true, wie)
        return
      }

      /* Opgeven. De oplossing komt in beeld en de groep drinkt. */
      if (actie.type === 'opgeven') {
        if (actie.uid !== s.verteller) return
        sluitAf(s, ctx, false, null)
        return
      }
      return
    }

    if (s.fase === 'onthuld') {
      if (actie.type === 'geef' && s.magUitdelen) {
        if (actie.uid !== s.afloop?.oplosser) return
        const verdeling: Record<string, number> = actie.payload?.verdeling
        if (!verdeling || typeof verdeling !== 'object') return
        for (const [uid, aantal] of Object.entries(verdeling)) {
          if (!iedereen.includes(uid) || uid === actie.uid) continue
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'kraakte het raadsel')
        }
        s.magUitdelen = false
        return
      }

      if (actie.type === 'verder') {
        if (s.ronde >= RAADSELS_PER_POTJE) {
          s.fase = 'klaar'
          s.klaar = true
          ctx.wisPrive()
          ctx.klaar()
          return
        }
        s.ronde++
        s.verteller = volgende(iedereen, s.verteller)
        nieuwRaadsel(s, ctx)
        return
      }
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

/* ── Schermen ───────────────────────────────────────────────── */

function Scherm({ s, ctx }: { s: ZwartState; ctx: KijkContext }) {
  const ikVertel = ctx.ik === s.verteller
  const verteller = ctx.speler(s.verteller)

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Raadsel {s.ronde}/{RAADSELS_PER_POTJE}
        </span>
        <span className="kop-klein">
          {s.fase === 'raden' ? `nog ${s.vragenOver} vragen` : 'opgelost'}
        </span>
      </div>

      <Kaartje style={{ borderColor: 'var(--goud)' }}>
        <div className="kop-klein" style={{ marginBottom: 4 }}>
          🕯️ {s.titel}
        </div>
        <div style={{ fontSize: 17, lineHeight: 1.45 }}>{s.raadsel}</div>
      </Kaartje>

      <div className="klein zacht" style={{ textAlign: 'center' }}>
        {ikVertel ? 'Jij weet de oplossing' : `${verteller?.emoji} ${verteller?.naam} weet de oplossing`}
      </div>

      {s.fase === 'onthuld' ? (
        <Onthuld s={s} ctx={ctx} />
      ) : ikVertel ? (
        <Verteller s={s} ctx={ctx} />
      ) : (
        <Rader s={s} ctx={ctx} />
      )}
    </>
  )
}

/** Het spoor van vragen en antwoorden. Iedereen ziet hetzelfde. */
function Spoor({ s, ctx }: { s: ZwartState; ctx: KijkContext }) {
  if (s.spoor.length === 0) {
    return (
      <div className="klein zacht" style={{ textAlign: 'center', padding: '8px 0' }}>
        Nog niets gevraagd.
      </div>
    )
  }

  return (
    <div className="zwart-spoor">
      {[...s.spoor].reverse().map((g) => (
        <div key={g.id} className={`zwart-regel ${g.antwoord}`}>
          <span className="zwart-vraag">
            <span className="zwart-wie">{ctx.naam(g.uid)}:</span> {g.vraag}
          </span>
          <span className="zwart-antwoord">
            {g.antwoord === 'ja' ? 'JA' : g.antwoord === 'nee' ? 'NEE' : 'N.V.T.'}
          </span>
        </div>
      ))}
    </div>
  )
}

function Rader({ s, ctx }: { s: ZwartState; ctx: KijkContext }) {
  const [vraag, zetVraag] = useState('')
  const ikInWachtrij = s.wachtrij.some((b) => b.uid === ctx.ik)

  return (
    <>
      <Spoor s={s} ctx={ctx} />

      <div className="onderaan">
        {s.wachtrij.length > 0 && (
          <div className="klein zacht" style={{ textAlign: 'center' }}>
            {s.wachtrij.length} {s.wachtrij.length === 1 ? 'vraag' : 'vragen'} in de rij
          </div>
        )}

        {ikInWachtrij ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Je vraag staat in de rij…</span>
          </Kaartje>
        ) : (
          <>
            <input
              value={vraag}
              onChange={(e) => zetVraag(e.target.value.slice(0, MAX_VRAAG))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && vraag.trim().length >= 3) {
                  ctx.stuur('vraag', { vraag })
                  zetVraag('')
                }
              }}
              placeholder="een vraag met ja of nee als antwoord"
              autoComplete="off"
            />
            <GroteKnop
              kleur="groen"
              uit={vraag.trim().length < 3}
              bijTik={() => {
                tril(8)
                ctx.stuur('vraag', { vraag })
                zetVraag('')
              }}
            >
              Vraag stellen
            </GroteKnop>
          </>
        )}

        <div className="klein zacht" style={{ textAlign: 'center' }}>
          Denk je het te weten? Zeg het hardop — de verteller wijst je aan.
        </div>
      </div>
    </>
  )
}

function Verteller({ s, ctx }: { s: ZwartState; ctx: KijkContext }) {
  const [wijst, zetWijst] = useState(false)
  const oplossing: string | undefined = ctx.prive?.oplossing
  const nu = s.wachtrij[0]

  if (wijst) {
    return (
      <div className="onderaan">
        <div className="kop-klein" style={{ textAlign: 'center' }}>
          Wie had hem?
        </div>
        {ctx.spelers
          .filter((p) => p.uid !== s.verteller)
          .map((p) => (
            <GroteKnop
              key={p.uid}
              kleur="goud"
              bijTik={() => ctx.stuur('gekraakt', { uid: p.uid })}
            >
              {p.emoji} {p.naam}
            </GroteKnop>
          ))}
        <button className="knop leeg klein" onClick={() => zetWijst(false)}>
          Toch niet
        </button>
      </div>
    )
  }

  return (
    <>
      <Kaartje style={{ borderColor: 'var(--groen)' }}>
        <div className="kop-klein" style={{ marginBottom: 4 }}>
          🤫 Alleen jij ziet dit
        </div>
        <div className="klein" style={{ lineHeight: 1.45 }}>
          {oplossing ?? '…'}
        </div>
      </Kaartje>

      <Spoor s={s} ctx={ctx} />

      <div className="onderaan">
        {nu ? (
          <>
            <Kaartje style={{ textAlign: 'center', borderColor: 'var(--goud)' }}>
              <div className="kop-klein">{ctx.naam(nu.uid)} vraagt</div>
              <div style={{ fontSize: 17, marginTop: 4 }}>{nu.vraag}</div>
            </Kaartje>
            <div className="rij">
              <GroteKnop
                kleur="groen"
                bijTik={() => ctx.stuur('antwoord', { id: nu.id, antwoord: 'ja' })}
              >
                JA
              </GroteKnop>
              <GroteKnop
                kleur="rood"
                bijTik={() => ctx.stuur('antwoord', { id: nu.id, antwoord: 'nee' })}
              >
                NEE
              </GroteKnop>
            </div>
            <div className="rij">
              <GroteKnop
                klein
                bijTik={() => ctx.stuur('antwoord', { id: nu.id, antwoord: 'nvt' })}
              >
                Niet relevant
              </GroteKnop>
              <button className="knop leeg klein" onClick={() => ctx.stuur('weg', { id: nu.id })}>
                Geen ja/nee-vraag
              </button>
            </div>
          </>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Wachten op een vraag…</span>
          </Kaartje>
        )}

        <div className="rij">
          <GroteKnop kleur="goud" klein bijTik={() => zetWijst(true)}>
            Ze hebben het
          </GroteKnop>
          <button className="knop leeg klein" onClick={() => ctx.stuur('opgeven')}>
            Verklap de oplossing
          </button>
        </div>
      </div>
    </>
  )
}

function Onthuld({ s, ctx }: { s: ZwartState; ctx: KijkContext }) {
  const a = s.afloop!
  const magUitdelen = s.magUitdelen && a.oplosser === ctx.ik
  const laatste = s.ronde >= RAADSELS_PER_POTJE

  return (
    <>
      <div className="midden" style={{ gap: 10, alignItems: 'stretch' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>{a.gekraakt ? '🔦' : '🕯️'}</div>
          <h2>
            {a.gekraakt && a.oplosser
              ? `${ctx.naam(a.oplosser)} kraakte hem`
              : 'Niemand kwam eruit'}
          </h2>
        </div>

        <Kaartje style={{ borderColor: a.gekraakt ? 'var(--groen)' : 'var(--rood)' }}>
          <div className="kop-klein" style={{ marginBottom: 4 }}>
            Wat er echt gebeurde
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.5 }}>{a.oplossing}</div>
        </Kaartje>

        <div className="klein zacht" style={{ textAlign: 'center' }}>
          {s.spoor.length} van de {VRAGEN_BUDGET} vragen gebruikt
        </div>
        <SpelerBalk spelers={ctx.spelers} actief={a.oplosser ? [a.oplosser] : []} />
      </div>

      <div className="onderaan">
        {magUitdelen ? (
          <Verdeler
            key={s.ronde}
            totaal={ctx.slokAantal(WINST_UITDELEN)}
            ctx={ctx}
            titel="Gekraakt — deel uit"
            bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
          />
        ) : s.magUitdelen ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">{ctx.naam(a.oplosser!)} deelt uit…</span>
          </Kaartje>
        ) : ctx.benIkHost || ctx.ik === s.verteller ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
            {laatste ? 'Klaar' : 'Volgend raadsel'}
          </GroteKnop>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Wachten op de verteller…</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

import { useState } from 'react'
import { husselen } from '../../engine/random'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { VERHALEN, type Zwart } from './verhalen'

/* ─────────────────────────────────────────────────────────────
   BLACK STORIES

   Volgens de regels van het kaartspel. Eén verteller kent de oplossing en
   leest het raadsel voor. De rest vraagt hardop door, en hij antwoordt alleen
   maar ja, nee of niet relevant, tot ze het verhaal gereconstrueerd hebben.

   DE APP DOET HIER WEINIG, EN DAT IS DE BEDOELING. Dit spel hoort aan tafel
   te gebeuren, niet op zes schermen. Er is geen vragenteller, je typt je
   vraag niet in, en er wordt niets bijgehouden: je vraagt het gewoon hardop.
   Wie geen verteller is kan zijn telefoon wegleggen tot hij zelf aan de beurt
   is.

   Wat de app dan wél is: het kaartje. Het raadsel staat op ieders scherm zodat
   je de details kunt teruglezen, en de oplossing gaat via zetPrive alleen naar
   de verteller. Op de andere telefoons staat hij simpelweg niet, dus er valt
   niets te spieken — en dat is precies het ding dat met echte kaartjes altijd
   misgaat.

   Aan het eind wijst de verteller aan wie hem kraakte, of hij verklapt hem.
   Dat zijn de enige twee knoppen in het hele spel.
   ───────────────────────────────────────────────────────────── */

const RAADSELS_PER_POTJE = 3
/** Wat degene die het kraakt mag uitdelen. */
const WINST_UITDELEN = 5
/** Wat de groep drinkt als niemand eruit komt. */
const STRAF_NIET_GEKRAAKT = 3

interface ZwartState {
  fase: 'raden' | 'onthuld' | 'klaar'
  ronde: number
  verteller: string

  /** het raadsel zelf — dit mag iedereen zien */
  titel: string
  raadsel: string

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

  // Niemand kwam eruit: de hele tafel behalve de verteller drinkt. Die had het
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
    'De verteller leest het raadsel voor en kent als enige de oplossing.',
    'De rest vraagt hardop door; hij zegt alleen ja, nee of niet relevant.',
    'Geen tijd en geen vragenlimiet — je bent klaar als je het hebt.',
    'Wie hem kraakt deelt uit. Komt niemand eruit, dan drinkt de groep.',
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
      /* Ze hebben het. De verteller wijst aan wie. */
      if (actie.type === 'gekraakt') {
        if (actie.uid !== s.verteller) return
        const wie = String(actie.payload?.uid ?? '')
        if (!iedereen.includes(wie) || wie === s.verteller) return
        sluitAf(s, ctx, true, wie)
        return
      }

      /* Niemand komt eruit. De oplossing komt in beeld en de groep drinkt. */
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
        <span className="kop-klein">{ikVertel ? 'jij vertelt' : verteller?.naam}</span>
      </div>

      <Kaartje style={{ borderColor: 'var(--goud)' }}>
        <div className="kop-klein" style={{ marginBottom: 4 }}>
          🕯️ {s.titel}
        </div>
        <div style={{ fontSize: 17, lineHeight: 1.45 }}>{s.raadsel}</div>
      </Kaartje>

      {s.fase === 'onthuld' ? (
        <Onthuld s={s} ctx={ctx} />
      ) : ikVertel ? (
        <Verteller s={s} ctx={ctx} />
      ) : (
        <Rader verteller={verteller?.naam ?? ''} />
      )}
    </>
  )
}

/**
 * Wat je ziet als je niet vertelt: het raadsel, en verder niets.
 *
 * Er is met opzet geen knop. Je vraagt hardop, je krijgt hardop antwoord, en
 * je telefoon mag in je zak tot jij aan de beurt bent om te vertellen.
 */
function Rader({ verteller }: { verteller: string }) {
  return (
    <div className="midden" style={{ gap: 12 }}>
      <div style={{ fontSize: 48 }}>🗣️</div>
      <h2 style={{ textAlign: 'center' }}>Vraag het hardop</h2>
      <Kaartje style={{ textAlign: 'center', maxWidth: 340 }}>
        {verteller} weet wat er gebeurd is en antwoordt alleen met{' '}
        <strong>ja</strong>, <strong>nee</strong> of <strong>niet relevant</strong>.
        <div className="klein zacht" style={{ marginTop: 8 }}>
          Geen tijd, geen limiet. Leg je telefoon maar weg tot jij aan de beurt bent.
        </div>
      </Kaartje>
      <div className="klein zacht" style={{ textAlign: 'center' }}>
        Denk je het te weten? Zeg het hardop — {verteller} wijst je aan.
      </div>
    </div>
  )
}

function Verteller({ s, ctx }: { s: ZwartState; ctx: KijkContext }) {
  const [wijst, zetWijst] = useState(false)
  const oplossing: string | undefined = ctx.prive?.oplossing

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
        <div style={{ fontSize: 15, lineHeight: 1.5 }}>{oplossing ?? '…'}</div>
      </Kaartje>

      <div className="midden" style={{ gap: 8 }}>
        <div className="klein zacht" style={{ textAlign: 'center', maxWidth: 320 }}>
          Lees het raadsel voor en antwoord alleen met <strong>ja</strong>,{' '}
          <strong>nee</strong> of <strong>niet relevant</strong>.
        </div>
      </div>

      <div className="onderaan">
        <GroteKnop kleur="goud" enorm bijTik={() => zetWijst(true)}>
          Ze hebben het
        </GroteKnop>
        <button className="knop leeg klein" onClick={() => ctx.stuur('opgeven')}>
          Niemand komt eruit — verklap hem
        </button>
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

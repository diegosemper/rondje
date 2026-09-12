import { useState } from 'react'
import { husselen, pak } from '../../engine/random'
import { useHostKlok } from '../../engine/hooks'
import { startKlok, voortgang, type Klok } from '../../engine/timer'
import {
  iedereenGestemd,
  nieuweStemming,
  onthul,
  stem,
  type Stemming,
} from '../../engine/stemmen'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { STARTS } from './starts'
import { WOORDEN } from './woorden'

/* ─────────────────────────────────────────────────────────────
   HET VERHAAL

   Samen één volslagen belachelijk verhaal schrijven, zin voor zin.

   De app zet een openingszin neer. Elke ronde krijgt iedereen een eigen
   verplicht woord en typt de volgende zin. Alle zinnen komen anoniem en
   geschud in beeld, iedereen stemt op de beste, en die zin wordt aan het
   verhaal geplakt. Aan het eind lees je het geheel in één keer terug.

   Twee dingen maken of breken dit spel:

   · HET VERPLICHTE WOORD. Zonder dat schrijft iedereen de voor de hand
     liggende volgende zin en is het binnen drie rondes saai. Met "statiegeld"
     of "pinguïn" in je zin moet je een bocht maken, en juist daar komt het
     verhaal van op gang. Iedereen krijgt een ander woord, dus je weet bij het
     stemmen niet wie welke handicap had.

   · ANONIEM STEMMEN. Wie zijn eigen zin ziet staan weet dat wel, en daarom
     kan je er ook niet op stemmen. De koppeling zin → schrijver blijft tot na
     de uitslag bij de host; op de andere telefoons staat hij simpelweg niet.
   ───────────────────────────────────────────────────────────── */

const RONDES = 8
const MAX_TEKENS = 140
const SCHRIJF_SEC = 75
/** Wat de winnende schrijver mag uitdelen. */
const WINST_UITDELEN = 3
/** Wat je drinkt als niemand op je zin stemde. */
const STRAF_GEEN_STEM = 2
/** Wat overslaan kost. */
const STRAF_OVERSLAAN = 2

interface Zin {
  tekst: string
  /** null bij de openingszin: die komt van de app */
  uid: string | null
}

interface VerhaalState {
  fase: 'schrijven' | 'stemmen' | 'uitslag' | 'einde'
  ronde: number

  /** het verhaal tot nu toe, voor iedereen zichtbaar */
  verhaal: Zin[]
  /** ieders verplichte woord van deze ronde — publiek, dat maakt het leuker */
  woorden: Record<string, string>
  /** wie er al ingeleverd heeft */
  ingeleverd: string[]
  /** wie er deze ronde overslaat */
  overgeslagen: string[]
  klok: Klok | null

  /**
   * De zinnen van deze ronde, geschud en zonder naam. De koppeling naar de
   * schrijver zit in `_geheim`, anders staat op elke telefoon wie wat schreef
   * en valt er niets meer te stemmen.
   */
  stemming: Stemming | null

  _geheim: {
    zinnen: Record<string, string>
    /** optie-id → schrijver */
    schrijvers: Record<string, string>
    /** woorden die deze pot al gebruikt zijn */
    gebruikt: string[]
  }

  laatste: {
    tekst: string
    winnaar: string
    /** wie er geen enkele stem kreeg */
    zonderStem: string[]
  } | null

  klaar: boolean
}

/** Of het verplichte woord echt in de zin staat. Ruim: "ladders" telt ook. */
export function bevatWoord(zin: string, woord: string): boolean {
  const schoon = (t: string) =>
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '')
  return schoon(zin).includes(schoon(woord))
}

/** Deelt iedereen een vers verplicht woord uit, allemaal verschillend. */
function deelWoorden(s: VerhaalState, ctx: SpelContext) {
  const vers = WOORDEN.filter((w) => !s._geheim.gebruikt.includes(w))
  // Raakt de lijst op — bij acht rondes en acht spelers zijn dat 64 woorden —
  // dan beginnen we gewoon opnieuw met de hele lijst.
  const bron = vers.length >= ctx.spelers.length ? vers : [...WOORDEN]
  const gekozen = husselen(ctx.rng, bron).slice(0, ctx.spelers.length)

  s.woorden = {}
  ctx.spelers.forEach((p, i) => {
    s.woorden[p.uid] = gekozen[i]
    s._geheim.gebruikt.push(gekozen[i])
  })
}

function nieuweRonde(s: VerhaalState, ctx: SpelContext) {
  s.fase = 'schrijven'
  s.ingeleverd = []
  s.overgeslagen = []
  s.stemming = null
  s.laatste = null
  s._geheim.zinnen = {}
  s._geheim.schrijvers = {}
  deelWoorden(s, ctx)
  s.klok = startKlok(SCHRIJF_SEC, ctx.nu)
  ctx.wisPrive()
}

/**
 * Alles binnen: de zinnen geschud in de stemming zetten.
 *
 * Elke schrijver krijgt privé te horen welke optie van hem is, zodat zijn
 * eigen zin op zijn scherm uitstaat. Dat gaat per speler en niet via de
 * publieke stand, want anders weet iedereen het.
 */
function naarStemmen(s: VerhaalState, ctx: SpelContext) {
  const schrijvers = Object.keys(s._geheim.zinnen)

  // Niemand heeft iets ingeleverd: dan valt er niets te stemmen.
  if (schrijvers.length === 0) {
    s.laatste = { tekst: '', winnaar: '', zonderStem: [] }
    s.fase = 'uitslag'
    s.klok = null
    return
  }

  const opties = husselen(ctx.rng, schrijvers).map((uid, i) => {
    const id = `z${i}`
    s._geheim.schrijvers[id] = uid
    return { id, label: s._geheim.zinnen[uid] }
  })

  s.stemming = nieuweStemming('Welke zin gaat het verhaal in?', opties)
  s.fase = 'stemmen'
  s.klok = null

  for (const [id, uid] of Object.entries(s._geheim.schrijvers)) {
    ctx.zetPrive(uid, { mijnOptie: id })
  }
}

function telStemmen(s: VerhaalState, ctx: SpelContext) {
  const uitslag = onthul(s.stemming!)

  // Gelijkspel gebeurt vaak bij vier spelers. De app kiest er dan één; een
  // tweede stemronde zou het spel alleen maar ophouden.
  const winId = uitslag.top.length === 1 ? uitslag.top[0] : pak(ctx.rng, uitslag.top)
  const winnaar = s._geheim.schrijvers[winId]
  const tekst = s._geheim.zinnen[winnaar]

  s.verhaal.push({ tekst, uid: winnaar })

  const zonderStem = Object.entries(s._geheim.schrijvers)
    .filter(([id]) => (uitslag.per[id]?.aantal ?? 0) === 0)
    .map(([, uid]) => uid)

  for (const uid of zonderStem) {
    ctx.drink(uid, STRAF_GEEN_STEM, 'kreeg geen enkele stem')
  }

  s.laatste = { tekst, winnaar, zonderStem }
  s.fase = 'uitslag'
  ctx.log(`"${tekst}" — van ${ctx.naam(winnaar)}`)
}

export const verhaal: GameModule<VerhaalState> = {
  id: 'verhaal',
  naam: 'Het Verhaal',
  uitleg: 'Schrijf samen één verhaal. Elke ronde wint de beste zin.',
  regels: [
    'Je krijgt een verplicht woord dat in je zin moet.',
    'Iedereen typt tegelijk de volgende zin van het verhaal.',
    'Daarna stem je anoniem op de beste — niet op je eigen.',
    'De winnaar deelt uit, wie geen stem kreeg drinkt.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'lang',
  tags: ['praten', 'geheim'],
  privescherm: true,

  init(ctx) {
    const naam = pak(ctx.rng, ctx.spelers).naam
    const start = pak(ctx.rng, STARTS).replace(/\{naam\}/g, naam)

    const s: VerhaalState = {
      fase: 'schrijven',
      ronde: 1,
      verhaal: [{ tekst: start, uid: null }],
      woorden: {},
      ingeleverd: [],
      overgeslagen: [],
      klok: null,
      stemming: null,
      _geheim: { zinnen: {}, schrijvers: {}, gebruikt: [] },
      laatste: null,
      klaar: false,
    }

    deelWoorden(s, ctx)
    s.klok = startKlok(SCHRIJF_SEC, ctx.nu)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)
    const klaarMet = (uid: string) =>
      s.ingeleverd.includes(uid) || s.overgeslagen.includes(uid)

    if (s.fase === 'schrijven') {
      if (actie.type === 'zin') {
        if (klaarMet(actie.uid)) return
        const tekst = String(actie.payload?.tekst ?? '')
          .trim()
          .slice(0, MAX_TEKENS)
        if (!tekst) return

        // Het verplichte woord wordt hier nog eens nagekeken. De knop op het
        // scherm staat al uit zonder dat woord, maar een scherm is geen slot.
        const woord = s.woorden[actie.uid]
        if (woord && !bevatWoord(tekst, woord)) return

        s._geheim.zinnen[actie.uid] = tekst
        s.ingeleverd.push(actie.uid)
        if (iedereen.every(klaarMet)) naarStemmen(s, ctx)
        return
      }

      if (actie.type === 'sla-over') {
        if (klaarMet(actie.uid)) return
        s.overgeslagen.push(actie.uid)
        ctx.drink(actie.uid, STRAF_OVERSLAAN, 'sloeg zijn beurt over')
        if (iedereen.every(klaarMet)) naarStemmen(s, ctx)
        return
      }

      // De klok is om. Wie niets inleverde slaat over.
      if (actie.type === 'tijd-om') {
        for (const uid of iedereen) {
          if (klaarMet(uid)) continue
          s.overgeslagen.push(uid)
          ctx.drink(uid, STRAF_OVERSLAAN, 'had niets op tijd')
        }
        naarStemmen(s, ctx)
        return
      }
      return
    }

    if (s.fase === 'stemmen' && s.stemming) {
      if (actie.type === 'stem') {
        const optie = String(actie.payload?.optie ?? '')
        // Op je eigen zin stemmen kan niet. De knop staat al uit, maar ook dat
        // is een scherm en geen slot.
        if (s._geheim.schrijvers[optie] === actie.uid) return
        stem(s.stemming, actie.uid, optie)
        if (iedereenGestemd(s.stemming, iedereen)) telStemmen(s, ctx)
        return
      }

      if (actie.type === 'sluit-stemming') {
        // Iemand is weg. De host telt met wat er ligt.
        if (s.stemming.gestemd.length === 0) return
        telStemmen(s, ctx)
        return
      }
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'geef') {
      if (!s.laatste || actie.uid !== s.laatste.winnaar) return
      const verdeling: Record<string, number> = actie.payload?.verdeling
      if (!verdeling || typeof verdeling !== 'object') return
      for (const [uid, aantal] of Object.entries(verdeling)) {
        if (!iedereen.includes(uid) || uid === actie.uid) continue
        ctx.deelUitPrecies(actie.uid, uid, aantal, 'schreef de beste zin')
      }
      s.laatste = { ...s.laatste, winnaar: '' }
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.fase = 'einde'
        ctx.wisPrive()
        return
      }
      s.ronde++
      nieuweRonde(s, ctx)
      return
    }

    if (s.fase === 'einde' && actie.type === 'klaar') {
      s.klaar = true
      ctx.wisPrive()
      ctx.klaar()
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

/* ── Schermen ───────────────────────────────────────────────── */

function Scherm({ s, ctx }: { s: VerhaalState; ctx: KijkContext }) {
  useHostKlok(ctx, s.fase === 'schrijven', s.klok?.eind ?? 0, 'tijd-om')

  if (s.fase === 'einde') return <Einde s={s} ctx={ctx} />

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Zin {s.ronde}/{RONDES}
        </span>
        <span className="kop-klein">
          {s.fase === 'schrijven'
            ? `${s.ingeleverd.length + s.overgeslagen.length}/${ctx.spelers.length} klaar`
            : s.fase === 'stemmen'
              ? `${s.stemming?.gestemd.length ?? 0}/${ctx.spelers.length} gestemd`
              : 'de zin is gekozen'}
        </span>
      </div>

      <Verhaaltje verhaal={s.verhaal} ctx={ctx} />

      {s.fase === 'schrijven' && <Schrijven key={s.ronde} s={s} ctx={ctx} />}
      {s.fase === 'stemmen' && <Stemmen s={s} ctx={ctx} />}
      {s.fase === 'uitslag' && <Uitslag s={s} ctx={ctx} />}
    </>
  )
}

/** Het verhaal tot nu toe. De laatste zin springt eruit; die telt. */
function Verhaaltje({ verhaal, ctx }: { verhaal: Zin[]; ctx: KijkContext }) {
  return (
    <div className="verhaal-blok">
      {verhaal.map((z, i) => (
        <span key={i} className={i === verhaal.length - 1 ? 'verhaal-nieuw' : undefined}>
          {z.tekst}{' '}
          {z.uid && <span className="verhaal-naam">— {ctx.naam(z.uid)}</span>}{' '}
        </span>
      ))}
    </div>
  )
}

function Schrijven({ s, ctx }: { s: VerhaalState; ctx: KijkContext }) {
  const [tekst, zetTekst] = useState('')
  const woord = s.woorden[ctx.ik] ?? ''
  const ikKlaar = s.ingeleverd.includes(ctx.ik) || s.overgeslagen.includes(ctx.ik)
  const heeftWoord = bevatWoord(tekst, woord)
  const mag = tekst.trim().length >= 3 && heeftWoord

  if (ikKlaar) {
    return (
      <>
        <div className="midden" style={{ gap: 10 }}>
          <div style={{ fontSize: 44 }}>🤫</div>
          <div className="klein zacht">Ingeleverd — wachten op de rest</div>
          <SpelerBalk
            spelers={ctx.spelers}
            actief={[...s.ingeleverd, ...s.overgeslagen]}
          />
        </div>
        {s.klok && <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />}
      </>
    )
  }

  return (
    <>
      <div className="midden" style={{ gap: 8 }}>
        <div className="kop-klein">Jouw verplichte woord</div>
        <div className="lint">{woord}</div>
        <div className="klein zacht">Schrijf de volgende zin van het verhaal.</div>
        <SpelerBalk spelers={ctx.spelers} actief={[...s.ingeleverd, ...s.overgeslagen]} />
      </div>

      {s.klok && <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />}

      <div className="onderaan">
        <textarea
          value={tekst}
          onChange={(e) => zetTekst(e.target.value.slice(0, MAX_TEKENS))}
          rows={3}
          placeholder={`…en toen ${woord}`}
          aria-label="Jouw zin"
          style={{ width: '100%' }}
        />
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          {heeftWoord ? (
            <span style={{ color: 'var(--groen)' }}>✓ "{woord}" staat erin</span>
          ) : (
            <>
              "{woord}" moet er nog in — {MAX_TEKENS - tekst.length} tekens over
            </>
          )}
        </div>

        <GroteKnop
          kleur="groen"
          enorm
          uit={!mag}
          bijTik={() => {
            tril(8)
            ctx.stuur('zin', { tekst })
          }}
        >
          Inleveren
        </GroteKnop>

        <button className="knop leeg klein" onClick={() => ctx.stuur('sla-over')}>
          Sla over — {ctx.slokKort(STRAF_OVERSLAAN)}
        </button>
      </div>
    </>
  )
}

function Stemmen({ s, ctx }: { s: VerhaalState; ctx: KijkContext }) {
  const stemming = s.stemming!
  const mijnOptie: string | undefined = ctx.prive?.mijnOptie
  const ikGestemd = stemming.gestemd.includes(ctx.ik)

  return (
    <>
      <div className="kop-klein" style={{ textAlign: 'center' }}>
        {ikGestemd ? 'Gestemd — wachten op de rest' : 'Welke zin gaat het verhaal in?'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {stemming.opties.map((o) => {
          const eigen = o.id === mijnOptie
          return (
            <button
              key={o.id}
              className="kaartje"
              disabled={eigen || ikGestemd}
              onClick={() => {
                tril(8)
                ctx.stuur('stem', { optie: o.id })
              }}
              style={{
                textAlign: 'left',
                opacity: eigen ? 0.45 : ikGestemd ? 0.7 : 1,
                borderColor: eigen ? 'var(--goud)' : undefined,
              }}
            >
              {o.label}
              {eigen && <div className="klein zacht">jouw eigen zin</div>}
            </button>
          )
        })}
      </div>

      {ctx.benIkHost && !ikGestemd && (
        <button className="knop leeg klein" onClick={() => ctx.stuur('sluit-stemming')}>
          Tel de stemmen nu
        </button>
      )}
    </>
  )
}

function Uitslag({ s, ctx }: { s: VerhaalState; ctx: KijkContext }) {
  const l = s.laatste
  const magUitdelen = !!l?.winnaar && l.winnaar === ctx.ik
  const laatsteRonde = s.ronde >= RONDES

  return (
    <>
      <div className="midden" style={{ gap: 8 }}>
        {l?.winnaar ? (
          <>
            <div style={{ fontSize: 40 }}>✍️</div>
            <h2 style={{ textAlign: 'center' }}>{ctx.naam(l.winnaar)} schreef hem</h2>
          </>
        ) : l && l.zonderStem.length > 0 ? (
          <div className="klein zacht">
            Geen stem gekregen: {l.zonderStem.map((u) => ctx.naam(u)).join(', ')}
          </div>
        ) : (
          <div className="klein zacht">Niemand leverde iets in.</div>
        )}
      </div>

      <div className="onderaan">
        {magUitdelen ? (
          <Verdeler
            key={s.ronde}
            totaal={ctx.slokAantal(WINST_UITDELEN)}
            ctx={ctx}
            titel="Beste zin — deel uit"
            bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
          />
        ) : l?.winnaar ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">{ctx.naam(l.winnaar)} deelt uit…</span>
          </Kaartje>
        ) : ctx.benIkHost ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
            {laatsteRonde ? 'Lees het verhaal' : 'Volgende zin'}
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

function Einde({ s, ctx }: { s: VerhaalState; ctx: KijkContext }) {
  const tellen: Record<string, number> = {}
  for (const z of s.verhaal) {
    if (z.uid) tellen[z.uid] = (tellen[z.uid] ?? 0) + 1
  }
  const top = Object.entries(tellen).sort((a, b) => b[1] - a[1])

  return (
    <>
      <div className="midden" style={{ gap: 10, alignItems: 'stretch' }}>
        <h1 style={{ textAlign: 'center' }}>📖 Jullie verhaal</h1>
        <div className="verhaal-blok heel">
          {s.verhaal.map((z, i) => (
            <span key={i}>{z.tekst} </span>
          ))}
        </div>
        {top.length > 0 && (
          <div className="klein zacht" style={{ textAlign: 'center' }}>
            Meeste zinnen: {top.slice(0, 3).map(([u, n]) => `${ctx.naam(u)} ${n}`).join('  ·  ')}
          </div>
        )}
      </div>

      <div className="onderaan">
        {ctx.benIkHost ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('klaar')}>
            Klaar
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

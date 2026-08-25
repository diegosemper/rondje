import { useState } from 'react'
import { husselen, pak } from '../../engine/random'
import {
  iedereenGestemd,
  nieuweStemming,
  onthul,
  spelerOpties,
  stem,
  type Stemming,
} from '../../engine/stemmen'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'
import { WOORDPAREN, type WoordPaar } from './woorden'

/* ─────────────────────────────────────────────────────────────
   DE IMPOSTER

   Iedereen krijgt geheim een woord. Bijna iedereen krijgt hetzelfde —
   SHAKIRA — maar één iemand krijgt het algemenere MUZIEK. Twee rondes lang
   typt iedereen tegelijk één woord dat erbij past. Daarna stemmen.

   De vondst zit in de asymmetrie: de imposter kan met "liedje" of "zingen"
   nog een tijdje meekomen, terwijl de groep klem zit. Te algemeen en je lijkt
   zelf de imposter; te specifiek en je geeft hem het antwoord.

   LET OP — de imposter krijgt te horen dat hij veilig is. Dat is gelogen, en
   het is met opzet: hij hoort er pas achter te komen als de woorden van de
   anderen binnenkomen. Wil je dat hij het wél weet, dan is het één regel in
   init(): zet `veilig` op `p.uid !== imposter`.
   ───────────────────────────────────────────────────────────── */

const RONDES = 2
const MAX_POTJES = 3

const STRAF_IMPOSTER = 5
const STRAF_GROEP = 3

interface Inzending {
  uid: string
  woord: string
}

interface ImposterState {
  fase: 'typen' | 'stemmen' | 'uitslag'
  potje: number
  ronde: number

  _geheim: {
    imposter: string
    paar: WoordPaar
    /** de inzendingen van de lopende ronde, tot iedereen binnen is */
    bezig: Record<string, string>
    /** paren die dit potje al geweest zijn */
    gebruikt: number[]
  }

  /** wie er deze ronde al iets ingeleverd heeft — dit mag iedereen zien */
  ingeleverd: string[]
  /** de onthulde woorden per ronde */
  rondes: Inzending[][]

  stemming: Stemming | null
  uitslag: {
    imposter: string
    gepakt: boolean
    groepWoord: string
    imposterWoord: string
  } | null
  klaar: boolean
}

/* ── Een nieuw potje opzetten ───────────────────────────────── */

function nieuwPotje(s: ImposterState, ctx: SpelContext) {
  const vrij = WOORDPAREN.map((_, i) => i).filter((i) => !s._geheim.gebruikt.includes(i))
  const index = pak(ctx.rng, vrij.length > 0 ? vrij : WOORDPAREN.map((_, i) => i))
  const paar = WOORDPAREN[index]
  const imposter = pak(ctx.rng, ctx.spelers.map((p) => p.uid))

  s._geheim.paar = paar
  s._geheim.imposter = imposter
  s._geheim.bezig = {}
  s._geheim.gebruikt.push(index)

  s.fase = 'typen'
  s.ronde = 1
  s.ingeleverd = []
  s.rondes = []
  s.stemming = null
  s.uitslag = null

  for (const p of ctx.spelers) {
    ctx.zetPrive(p.uid, {
      woord: p.uid === imposter ? paar.imposter : paar.groep,
      // Ook de imposter krijgt "veilig" te zien. Dat is de hele grap.
      veilig: true,
    })
  }
}

/* ── Het spel ───────────────────────────────────────────────── */

export const imposter: GameModule<ImposterState> = {
  id: 'imposter',
  naam: 'De Imposter',
  uitleg: 'Iedereen krijgt een woord — behalve één iemand. Wie is het?',
  regels: [
    'Je krijgt geheim een woord op je scherm.',
    'Typ twee rondes lang één woord dat erbij past.',
    'Eén speler heeft stiekem een ander woord.',
    'Stem daarna wie dat was.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['geheim', 'bluf', 'praten'],
  privescherm: true,

  init(ctx) {
    const s: ImposterState = {
      fase: 'typen',
      potje: 1,
      ronde: 1,
      _geheim: {
        imposter: '',
        paar: WOORDPAREN[0],
        bezig: {},
        gebruikt: [],
      },
      ingeleverd: [],
      rondes: [],
      stemming: null,
      uitslag: null,
      klaar: false,
    }
    nieuwPotje(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    /* Een woord inleveren */
    if (s.fase === 'typen' && actie.type === 'woord') {
      if (s._geheim.bezig[actie.uid]) return
      const woord = String(actie.payload?.woord ?? '').trim().slice(0, 22)
      if (!woord) return

      s._geheim.bezig[actie.uid] = woord
      if (!s.ingeleverd.includes(actie.uid)) s.ingeleverd.push(actie.uid)

      if (!iedereen.every((u) => s._geheim.bezig[u])) return

      // Iedereen binnen: alles in één klap onthullen, door elkaar gehusseld
      // zodat de volgorde niemand verraadt.
      const onthuldeWoorden: Inzending[] = husselen(
        ctx.rng,
        iedereen.map((uid) => ({ uid, woord: s._geheim.bezig[uid] })),
      )
      s.rondes.push(onthuldeWoorden)
      s._geheim.bezig = {}
      s.ingeleverd = []

      if (s.ronde < RONDES) {
        s.ronde++
        return
      }

      s.fase = 'stemmen'
      s.stemming = nieuweStemming('Wie is de imposter?', spelerOpties(ctx.spelers))
      return
    }

    /* Stemmen */
    if (s.fase === 'stemmen' && actie.type === 'stem' && s.stemming) {
      stem(s.stemming, actie.uid, actie.payload?.uid)
      if (!iedereenGestemd(s.stemming, iedereen)) return

      const uitslag = onthul(s.stemming)
      const imposter = s._geheim.imposter
      // Alleen gepakt als de groep het eens was. Gelijkspel = hij komt weg.
      const gepakt = uitslag.top.length === 1 && uitslag.top[0] === imposter

      s.fase = 'uitslag'
      s.uitslag = {
        imposter,
        gepakt,
        groepWoord: s._geheim.paar.groep,
        imposterWoord: s._geheim.paar.imposter,
      }

      if (gepakt) {
        ctx.drink(imposter, STRAF_IMPOSTER, 'betrapt als imposter')
      } else {
        ctx.iedereenDrinkt(STRAF_GROEP, `${ctx.naam(imposter)} kwam ermee weg`, [imposter])
      }
      return
    }

    /* Nog een potje, of klaar */
    if (s.fase === 'uitslag' && actie.type === 'verder') {
      if (s.potje >= MAX_POTJES) {
        s.klaar = true
        ctx.wisPrive()
        ctx.klaar()
        return
      }
      s.potje++
      nieuwPotje(s, ctx)
      return
    }

    if (s.fase === 'uitslag' && actie.type === 'stoppen') {
      s.klaar = true
      ctx.wisPrive()
      ctx.klaar()
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Potje {s.potje}/{MAX_POTJES}
          </span>
          <span className="kop-klein">
            {s.fase === 'typen' ? `Woord ${s.ronde} van ${RONDES}` : ''}
          </span>
        </div>

        {/* Nieuwe sleutel per ronde, anders staat je vorige woord er nog. */}
        {s.fase === 'typen' && <Typen key={`${s.potje}-${s.ronde}`} s={s} ctx={ctx} />}
        {s.fase === 'stemmen' && <Stemmen s={s} ctx={ctx} />}
        {s.fase === 'uitslag' && <Uitslag s={s} ctx={ctx} />}
      </>
    )
  },
}

/* ── Het geheime woord ──────────────────────────────────────── */

function MijnWoord({ ctx }: { ctx: KijkContext }) {
  const woord: string = ctx.prive?.woord ?? '…'
  return (
    <Kaartje style={{ textAlign: 'center', borderColor: 'var(--goud)' }}>
      <div className="kop-klein">🤫 Alleen jij ziet dit</div>
      <h1 style={{ margin: '6px 0', color: 'var(--goud)' }}>{woord}</h1>
      <div className="klein zacht">✓ Je bent veilig</div>
    </Kaartje>
  )
}

/** De woorden van de vorige rondes, voor iedereen zichtbaar. */
function EerdereWoorden({ s, ctx }: { s: ImposterState; ctx: KijkContext }) {
  if (s.rondes.length === 0) return null
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {s.rondes.map((ronde, i) => (
        <div key={i}>
          <div className="kop-klein" style={{ marginBottom: 4 }}>
            Ronde {i + 1}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ronde.map((inz) => (
              <span
                key={inz.uid + i}
                className="kaartje"
                style={{ padding: '6px 10px', fontSize: 14 }}
              >
                <strong>{inz.woord}</strong>{' '}
                <span className="zacht">— {ctx.naam(inz.uid)}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Typen({ s, ctx }: { s: ImposterState; ctx: KijkContext }) {
  const [tekst, zetTekst] = useState('')
  const ikKlaar = s.ingeleverd.includes(ctx.ik)

  return (
    <>
      <MijnWoord ctx={ctx} />
      <EerdereWoorden s={s} ctx={ctx} />

      <div className="midden" style={{ gap: 8 }}>
        <div className="klein zacht">
          {s.ingeleverd.length} van {ctx.spelers.length} ingeleverd
        </div>
        <SpelerBalk spelers={ctx.spelers} actief={s.ingeleverd} />
      </div>

      <div className="onderaan">
        {ikKlaar ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <h2 className="zacht">Ingeleverd — wachten op de rest</h2>
          </Kaartje>
        ) : (
          <>
            <div className="kop-klein" style={{ textAlign: 'center' }}>
              Typ één woord dat bij jouw woord past
            </div>
            <input
              value={tekst}
              onChange={(e) => zetTekst(e.target.value.slice(0, 22))}
              placeholder="jouw woord…"
              autoComplete="off"
              autoCorrect="off"
            />
            <GroteKnop
              kleur="goud"
              uit={tekst.trim().length < 2}
              bijTik={() => ctx.stuur('woord', { woord: tekst })}
            >
              Inleveren
            </GroteKnop>
            <div className="klein zacht" style={{ textAlign: 'center' }}>
              Te vaag en je lijkt zelf verdacht. Te precies en je geeft het weg.
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Stemmen({ s, ctx }: { s: ImposterState; ctx: KijkContext }) {
  const ikGestemd = s.stemming?.gestemd.includes(ctx.ik)

  return (
    <>
      <EerdereWoorden s={s} ctx={ctx} />

      <div className="midden" style={{ gap: 8 }}>
        <h2>Wie is de imposter?</h2>
        <div className="klein zacht">
          {s.stemming?.gestemd.length} van {ctx.spelers.length} gestemd
        </div>
      </div>

      <div className="onderaan">
        {ikGestemd ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <h2 className="zacht">🤫 Je stem staat vast</h2>
          </Kaartje>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ctx.spelers
              .filter((p) => p.uid !== ctx.ik)
              .map((p) => (
                <GroteKnop key={p.uid} bijTik={() => ctx.stuur('stem', { uid: p.uid })}>
                  {p.emoji} {p.naam}
                </GroteKnop>
              ))}
          </div>
        )}
      </div>
    </>
  )
}

function Uitslag({ s, ctx }: { s: ImposterState; ctx: KijkContext }) {
  const u = s.uitslag!
  const speler = ctx.speler(u.imposter)
  const ikWasHet = u.imposter === ctx.ik

  return (
    <>
      <div className="midden" style={{ gap: 12 }}>
        <div style={{ fontSize: 54 }}>{u.gepakt ? '🎯' : '🥷'}</div>
        <h1>{u.gepakt ? 'Gepakt!' : 'Ontsnapt!'}</h1>

        <Kaartje
          style={{
            textAlign: 'center',
            borderColor: u.gepakt ? 'var(--groen)' : 'var(--rood)',
          }}
        >
          <div className="kop-klein">De imposter was</div>
          <h2>
            {speler?.emoji} {speler?.naam}
            {ikWasHet && ' — jij dus'}
          </h2>
        </Kaartje>

        <div className="rij" style={{ width: '100%' }}>
          <Kaartje style={{ textAlign: 'center' }}>
            <div className="kop-klein">De groep had</div>
            <strong style={{ fontSize: 18 }}>{u.groepWoord}</strong>
          </Kaartje>
          <Kaartje style={{ textAlign: 'center', borderColor: 'var(--goud)' }}>
            <div className="kop-klein">De imposter had</div>
            <strong style={{ fontSize: 18, color: 'var(--goud)' }}>{u.imposterWoord}</strong>
          </Kaartje>
        </div>

        {s.stemming?.uitslag && (
          <div className="klein zacht">
            {ctx.spelers
              .map((p) => {
                const n = s.stemming!.uitslag!.per[p.uid]?.aantal ?? 0
                return n > 0 ? `${p.naam} ${n}` : null
              })
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}
      </div>

      <div className="onderaan">
        {ctx.benIkHost ? (
          <>
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
              {s.potje >= MAX_POTJES ? 'Klaar' : 'Nog een potje'}
            </GroteKnop>
            {s.potje < MAX_POTJES && (
              <GroteKnop kleur="leeg" klein bijTik={() => ctx.stuur('stoppen')}>
                Genoeg zo
              </GroteKnop>
            )}
          </>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">De host beslist of er nog een potje komt…</span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

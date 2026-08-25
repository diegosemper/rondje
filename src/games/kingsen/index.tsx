import { useState } from 'react'
import { kaartKort, nieuweStapel, trek, waardeTekst, type Kaart, type Stapel } from '../../engine/deck'
import { volgende } from '../../engine/beurten'
import { useHostKlok } from '../../engine/hooks'
import { klokTekst, startKlok, voortgang, type Klok } from '../../engine/timer'
import { pak } from '../../engine/random'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { Balkje, GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'
import { CATEGORIEEN, RIJMWOORDEN } from './woorden'

/* ─────────────────────────────────────────────────────────────
   KINGSEN

   Waar dit spel aan een echte tafel op stukloopt: de regels stapelen zich op
   en na vier kaarten weet niemand meer wie de duimmeester is, wie met wie
   drinkt, of wat die zelfbedachte regel van tien minuten geleden was. Hier
   staan ze permanent bovenaan het scherm.

   Vier dingen kan een app niet weten of afdwingen, en die zijn zo opgelost:

   · "Mannen drinken" — de app weet niet wie er man is. Iedereen tikt zelf
     "ik ook" of "niet ik".
   · Vloer, hemel en het duimspel zijn races op de milliseconde in plaats van
     geruzie over wie er nou het laatst was.
   · Vragenmeester en zelfbedachte regels kan de app niet controleren; die
     blijven in beeld staan zodat de groep het zelf doet.
   · Maatjes worden wél afgedwongen: drinkt de een, dan drinkt de ander mee.
   ───────────────────────────────────────────────────────────── */

const RACE_SEC = 6
const GROEP_SEC = 12
const MAX_KAARTEN = 32

interface Regel {
  waarde: number
  naam: string
  uitleg: string
}

export const REGELS: Regel[] = [
  { waarde: 14, naam: 'Waterval', uitleg: 'Iedereen drinkt. Je mag pas stoppen als je voorganger stopt.' },
  { waarde: 2, naam: 'Jij', uitleg: 'Deel 2 slokken uit.' },
  { waarde: 3, naam: 'Mij', uitleg: 'Jij drinkt er 3.' },
  { waarde: 4, naam: 'Vloer', uitleg: 'Hand omlaag! De laatste drinkt.' },
  { waarde: 5, naam: 'Duimspel', uitleg: 'Jij bent duimmeester, de hele ronde.' },
  { waarde: 6, naam: 'Mannen', uitleg: 'Alle mannen drinken 2.' },
  { waarde: 7, naam: 'Hemel', uitleg: 'Hand omhoog! De laatste drinkt.' },
  { waarde: 8, naam: 'Maatje', uitleg: 'Kies iemand. Drinkt hij, dan drink jij mee.' },
  { waarde: 9, naam: 'Rijmen', uitleg: 'Rijmen op een woord tot iemand vastloopt.' },
  { waarde: 10, naam: 'Categorie', uitleg: 'Noem er om de beurt een tot iemand vastloopt.' },
  { waarde: 11, naam: 'Nieuwe regel', uitleg: 'Verzin een regel die de rest van het spel geldt.' },
  { waarde: 12, naam: 'Vragenmeester', uitleg: 'Wie antwoord geeft op jouw vraag, drinkt.' },
  { waarde: 13, naam: 'Heer', uitleg: 'Schenk in de beker. De vierde heer drinkt hem leeg.' },
]

export function regelVan(waarde: number): Regel {
  return REGELS.find((r) => r.waarde === waarde)!
}

/* ── Wat er nu op tafel gebeurt ─────────────────────────────── */

type Actief =
  /**
   * De slokken worden pas aan het eind uitgedeeld. Zou dat per stopper
   * gebeuren, dan valt de drinkpauze meteen over het spel heen en kan de
   * rest van de kring niet meer stoppen.
   */
  | { soort: 'waterval'; begonOp: number; gestopt: string[]; slokken: Record<string, number> }
  /** `aantal` is het rúwe getal; de kijkkant rekent het om met slokAantal() */
  | { soort: 'verdelen'; wie: string; aantal: number }
  | { soort: 'race'; wat: 'vloer' | 'hemel' | 'duim'; klok: Klok; getikt: Record<string, number> }
  | { soort: 'groep'; tekst: string; aantal: number; klok: Klok; keuze: Record<string, boolean> }
  | { soort: 'kies'; wie: string; waarvoor: 'maatje' }
  | { soort: 'regel'; wie: string }
  | { soort: 'ketting'; wat: 'rijmen' | 'categorie'; onderwerp: string; beurt: string; ronde: number }
  | { soort: 'melding'; tekst: string; klok: Klok }

interface KingsenState {
  stapel: Stapel
  open: Kaart | null
  beurt: string
  getrokken: number
  heren: number

  /* regels die blijven staan */
  duimmeester: string | null
  vragenmeester: string | null
  maatjes: [string, string][]
  eigenRegels: { tekst: string; door: string }[]

  actief: Actief | null
  klaar: boolean
}

/* ── Hulpjes ────────────────────────────────────────────────── */

/** Drinken mét maatjes: wie aan jou vastzit, drinkt mee. */
function drinkMetMaatjes(s: KingsenState, ctx: SpelContext, uid: string, n: number, reden: string) {
  ctx.drink(uid, n, reden)
  for (const [a, b] of s.maatjes) {
    if (a === uid) ctx.drink(b, n, `maatje van ${ctx.naam(a)}`)
    else if (b === uid) ctx.drink(a, n, `maatje van ${ctx.naam(b)}`)
  }
}

function naarVolgende(s: KingsenState, ctx: SpelContext) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  s.actief = null
  s.beurt = volgende(volgorde, s.beurt)
  if (s.getrokken >= MAX_KAARTEN) {
    s.klaar = true
    ctx.klaar()
  }
}

/** Een kaart is getrokken: zet klaar wat er moet gebeuren. */
function voerUit(s: KingsenState, ctx: SpelContext, kaart: Kaart) {
  const wie = s.beurt
  const regel = regelVan(kaart.waarde)
  ctx.log(`${ctx.naam(wie)} trok ${kaartKort(kaart)} — ${regel.naam}`)

  switch (kaart.waarde) {
    case 14:
      s.actief = { soort: 'waterval', begonOp: ctx.nu, gestopt: [], slokken: {} }
      return
    case 2:
      s.actief = { soort: 'verdelen', wie, aantal: 2 }
      return
    case 3:
      drinkMetMaatjes(s, ctx, wie, 3, 'mij')
      naarVolgende(s, ctx)
      return
    case 4:
      s.actief = { soort: 'race', wat: 'vloer', klok: startKlok(RACE_SEC, ctx.nu), getikt: {} }
      return
    case 5:
      s.duimmeester = wie
      s.actief = { soort: 'melding', tekst: `${ctx.naam(wie)} is de duimmeester`, klok: startKlok(3, ctx.nu) }
      return
    case 6:
      s.actief = {
        soort: 'groep',
        tekst: 'Alle mannen drinken',
        aantal: 2,
        klok: startKlok(GROEP_SEC, ctx.nu),
        keuze: {},
      }
      return
    case 7:
      s.actief = { soort: 'race', wat: 'hemel', klok: startKlok(RACE_SEC, ctx.nu), getikt: {} }
      return
    case 8:
      s.actief = { soort: 'kies', wie, waarvoor: 'maatje' }
      return
    case 9:
      s.actief = {
        soort: 'ketting',
        wat: 'rijmen',
        onderwerp: pak(ctx.rng, RIJMWOORDEN),
        beurt: wie,
        ronde: 0,
      }
      return
    case 10:
      s.actief = {
        soort: 'ketting',
        wat: 'categorie',
        onderwerp: pak(ctx.rng, CATEGORIEEN),
        beurt: wie,
        ronde: 0,
      }
      return
    case 11:
      s.actief = { soort: 'regel', wie }
      return
    case 12:
      s.vragenmeester = wie
      s.actief = { soort: 'melding', tekst: `${ctx.naam(wie)} is de vragenmeester`, klok: startKlok(3, ctx.nu) }
      return
    case 13: {
      s.heren++
      if (s.heren >= 4) {
        drinkMetMaatjes(s, ctx, wie, 8, 'de vierde heer — de beker!')
        s.klaar = true
        ctx.klaar()
        return
      }
      s.actief = {
        soort: 'melding',
        tekst: `Heer ${s.heren} van 4 — schenk in de beker`,
        klok: startKlok(3, ctx.nu),
      }
      return
    }
    default:
      naarVolgende(s, ctx)
  }
}

/* ── Het spel ───────────────────────────────────────────────── */

export const kingsen: GameModule<KingsenState> = {
  id: 'kingsen',
  naam: 'Kingsen',
  uitleg: 'Elke kaart een regel, en de regels stapelen op. De app onthoudt ze.',
  regels: [
    'Om de beurt een kaart trekken.',
    'Elke waarde heeft zijn eigen regel.',
    'Duimspel, maatjes en eigen regels blijven gelden.',
    'De vierde heer drinkt de beker — en dan is het klaar.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'lang',
  tags: ['kaarten', 'chaos', 'praten'],
  privescherm: false,

  init(ctx) {
    return {
      stapel: nieuweStapel(ctx.rng),
      open: null,
      beurt: ctx.spelers[0].uid,
      getrokken: 0,
      heren: 0,
      duimmeester: null,
      vragenmeester: null,
      maatjes: [],
      eigenRegels: [],
      actief: null,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    /* Kaart trekken */
    if (actie.type === 'trek' && !s.actief) {
      if (actie.uid !== s.beurt) return
      const kaart = trek(s.stapel, ctx.rng)
      s.open = kaart
      s.getrokken++
      voerUit(s, ctx, kaart)
      return
    }

    /* Duimmeester mag op elk moment zijn duim leggen */
    if (actie.type === 'duim' && !s.actief) {
      if (actie.uid !== s.duimmeester) return
      s.actief = { soort: 'race', wat: 'duim', klok: startKlok(RACE_SEC, ctx.nu), getikt: {} }
      return
    }

    if (!s.actief) return
    const a = s.actief

    /* Waterval */
    if (a.soort === 'waterval' && actie.type === 'stop') {
      if (a.gestopt.includes(actie.uid)) return
      // Je mag pas stoppen als iedereen vóór je gestopt is.
      const mijnPlek = volgorde.indexOf(actie.uid)
      const startPlek = volgorde.indexOf(s.beurt)
      const positie = (mijnPlek - startPlek + volgorde.length) % volgorde.length
      if (positie !== a.gestopt.length) return

      const secondes = (actie.ts - a.begonOp) / 1000
      a.slokken[actie.uid] = Math.min(8, Math.max(1, Math.round(secondes / 2)))
      a.gestopt.push(actie.uid)

      if (a.gestopt.length < volgorde.length) return

      // Iedereen is gestopt: nu pas afrekenen, in één keer.
      for (const uid of a.gestopt) {
        drinkMetMaatjes(s, ctx, uid, a.slokken[uid], 'waterval')
      }
      naarVolgende(s, ctx)
      return
    }

    /* Verdelen (de 2) */
    if (a.soort === 'verdelen' && actie.type === 'geef') {
      if (actie.uid !== a.wie) return
      const verdeling: Record<string, number> = actie.payload?.verdeling
      if (!verdeling || typeof verdeling !== 'object') return
      for (const [uid, aantal] of Object.entries(verdeling)) {
        if (!volgorde.includes(uid) || uid === a.wie) continue
        ctx.deelUitPrecies(a.wie, uid, aantal, 'de twee')
        for (const [x, y] of s.maatjes) {
          if (x === uid) ctx.deelUitPrecies(a.wie, y, aantal, `maatje van ${ctx.naam(x)}`)
          else if (y === uid) ctx.deelUitPrecies(a.wie, x, aantal, `maatje van ${ctx.naam(y)}`)
        }
      }
      naarVolgende(s, ctx)
      return
    }

    /* Race: vloer, hemel, duimspel */
    if (a.soort === 'race') {
      if (actie.type === 'tik') {
        if (a.getikt[actie.uid] !== undefined) return
        a.getikt[actie.uid] = actie.ts
        if (!volgorde.every((u) => a.getikt[u] !== undefined)) return
      } else if (actie.type !== 'sluit-race') {
        return
      }

      // De traagste drinkt. Wie helemaal niet tikte, is per definitie traagst.
      let slechtste: string | null = null
      let slechtsteTijd = -1
      for (const uid of volgorde) {
        const t = a.getikt[uid] ?? Number.MAX_SAFE_INTEGER
        if (t > slechtsteTijd) {
          slechtsteTijd = t
          slechtste = uid
        }
      }
      const wat = a.wat === 'duim' ? 'duimspel' : a.wat === 'vloer' ? 'vloer' : 'hemel'
      if (slechtste) drinkMetMaatjes(s, ctx, slechtste, 2, `laatste bij ${wat}`)

      // Het duimspel onderbreekt de beurt niet — het is een tussendoortje.
      if (a.wat === 'duim') s.actief = null
      else naarVolgende(s, ctx)
      return
    }

    /* Groepskaart: iedereen bepaalt zelf of hij meedoet */
    if (a.soort === 'groep') {
      if (actie.type === 'groep-keuze') {
        a.keuze[actie.uid] = !!actie.payload?.ja
        if (!volgorde.every((u) => a.keuze[u] !== undefined)) return
      } else if (actie.type !== 'sluit-groep') {
        return
      }

      const meedoeners = volgorde.filter((u) => a.keuze[u])
      for (const uid of meedoeners) drinkMetMaatjes(s, ctx, uid, a.aantal, a.tekst.toLowerCase())
      if (meedoeners.length === 0) ctx.log('Niemand deed mee')
      naarVolgende(s, ctx)
      return
    }

    /* Maatje kiezen */
    if (a.soort === 'kies' && actie.type === 'kies') {
      if (actie.uid !== a.wie) return
      const doel = actie.payload?.uid
      if (!doel || doel === a.wie || !volgorde.includes(doel)) return
      s.maatjes.push([a.wie, doel])
      ctx.log(`${ctx.naam(a.wie)} en ${ctx.naam(doel)} zijn maatjes`)
      naarVolgende(s, ctx)
      return
    }

    /* Nieuwe regel bedenken */
    if (a.soort === 'regel' && actie.type === 'regel') {
      if (actie.uid !== a.wie) return
      const tekst = String(actie.payload?.tekst ?? '').trim().slice(0, 90)
      if (tekst) {
        s.eigenRegels.push({ tekst, door: a.wie })
        ctx.log(`Nieuwe regel: ${tekst}`)
      }
      naarVolgende(s, ctx)
      return
    }

    /* Rijmen en categorie */
    if (a.soort === 'ketting') {
      if (actie.type === 'gelukt') {
        if (actie.uid !== a.beurt) return
        a.ronde++
        a.beurt = volgende(volgorde, a.beurt)
        return
      }
      if (actie.type === 'faal') {
        // Zowel de speler zelf ("ik weet het niet") als de rest ("afgekeurd").
        const zondebok = actie.uid === a.beurt ? actie.uid : a.beurt
        drinkMetMaatjes(s, ctx, zondebok, 3, a.wat === 'rijmen' ? 'kon niet rijmen' : 'wist er geen meer')
        naarVolgende(s, ctx)
        return
      }
      return
    }

    /* Kort meldingsscherm */
    if (a.soort === 'melding' && actie.type === 'verder') {
      naarVolgende(s, ctx)
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return (
      <>
        <RegelPaneel s={s} ctx={ctx} />
        <SpelerBalk spelers={ctx.spelers} actief={s.beurt} />
        <Tafel s={s} ctx={ctx} />
      </>
    )
  },
}

/* ── De blijvende regels, altijd in beeld ───────────────────── */

function RegelPaneel({ s, ctx }: { s: KingsenState; ctx: KijkContext }) {
  const items: string[] = []
  if (s.duimmeester) items.push(`👍 duimmeester: ${ctx.naam(s.duimmeester)}`)
  if (s.vragenmeester) items.push(`❓ vragenmeester: ${ctx.naam(s.vragenmeester)}`)
  for (const [a, b] of s.maatjes) items.push(`🤝 ${ctx.naam(a)} + ${ctx.naam(b)}`)
  for (const r of s.eigenRegels) items.push(`📜 ${r.tekst}`)

  if (items.length === 0) {
    return (
      <div className="klein zacht" style={{ textAlign: 'center' }}>
        Kaart {s.getrokken}/{MAX_KAARTEN} · heren {s.heren}/4
      </div>
    )
  }

  return (
    <div className="kaartje" style={{ padding: 10 }}>
      <div className="balk" style={{ marginBottom: 6 }}>
        <span className="kop-klein">Geldt nu</span>
        <span className="klein zacht">
          kaart {s.getrokken}/{MAX_KAARTEN} · heren {s.heren}/4
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {items.map((t, i) => (
          <span
            key={i}
            style={{
              fontSize: 12,
              padding: '3px 8px',
              borderRadius: 99,
              background: 'var(--vlak-hoog)',
              border: '1px solid var(--rand)',
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Wat er nu moet gebeuren ────────────────────────────────── */

function Tafel({ s, ctx }: { s: KingsenState; ctx: KijkContext }) {
  const a = s.actief
  const mijnBeurt = ctx.ik === s.beurt
  const speler = ctx.speler(s.beurt)
  const regel = s.open ? regelVan(s.open.waarde) : null

  useHostKlok(ctx, a?.soort === 'race', a?.soort === 'race' ? a.klok.eind : 0, 'sluit-race')
  useHostKlok(ctx, a?.soort === 'groep', a?.soort === 'groep' ? a.klok.eind : 0, 'sluit-groep')
  useHostKlok(ctx, a?.soort === 'melding', a?.soort === 'melding' ? a.klok.eind : 0, 'verder')

  /* Niets aan de hand: iemand moet trekken. */
  if (!a) {
    return (
      <>
        <div className="midden" style={{ gap: 12 }}>
          <Speelkaart kaart={s.open} maat="groot" dicht={!s.open} />
          {regel && (
            <div style={{ textAlign: 'center' }}>
              <h2>
                {waardeTekst(s.open!.waarde)} · {regel.naam}
              </h2>
              <div className="klein zacht">{regel.uitleg}</div>
            </div>
          )}
        </div>
        <div className="onderaan">
          {mijnBeurt ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('trek')}>
              Trek een kaart
            </GroteKnop>
          ) : (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">
                {speler?.emoji} {speler?.naam} is aan de beurt
              </span>
            </Kaartje>
          )}
          {s.duimmeester === ctx.ik && (
            <GroteKnop kleur="leeg" bijTik={() => ctx.stuur('duim')}>
              👍 Duim op tafel
            </GroteKnop>
          )}
        </div>
      </>
    )
  }

  if (a.soort === 'waterval') return <Waterval a={a} s={s} ctx={ctx} />
  if (a.soort === 'race') return <Race a={a} ctx={ctx} />
  if (a.soort === 'groep') return <Groep a={a} ctx={ctx} />
  if (a.soort === 'ketting') return <Ketting a={a} ctx={ctx} />
  if (a.soort === 'melding') return <Melding a={a} />

  if (a.soort === 'verdelen') {
    return (
      <div className="onderaan" style={{ marginTop: 'auto' }}>
        {a.wie === ctx.ik ? (
          <Verdeler
            totaal={ctx.slokAantal(a.aantal)}
            ctx={ctx}
            titel="De twee — deel uit"
            bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
          />
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <h2 className="zacht">{ctx.naam(a.wie)} verdeelt…</h2>
          </Kaartje>
        )}
      </div>
    )
  }

  if (a.soort === 'kies') {
    return (
      <div className="onderaan" style={{ marginTop: 'auto' }}>
        <h2 style={{ textAlign: 'center' }}>
          {a.wie === ctx.ik ? 'Kies je maatje' : `${ctx.naam(a.wie)} kiest een maatje…`}
        </h2>
        {a.wie === ctx.ik && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ctx.spelers
              .filter((p) => p.uid !== ctx.ik)
              .map((p) => (
                <GroteKnop key={p.uid} kleur="goud" bijTik={() => ctx.stuur('kies', { uid: p.uid })}>
                  {p.emoji} {p.naam}
                </GroteKnop>
              ))}
          </div>
        )}
      </div>
    )
  }

  if (a.soort === 'regel') return <NieuweRegel a={a} ctx={ctx} />
  return null
}

function Melding({ a }: { a: Extract<Actief, { soort: 'melding' }> }) {
  return (
    <div className="midden">
      <div style={{ fontSize: 52 }}>📌</div>
      <h1>{a.tekst}</h1>
    </div>
  )
}

function Waterval({
  a,
  s,
  ctx,
}: {
  a: Extract<Actief, { soort: 'waterval' }>
  s: KingsenState
  ctx: KijkContext
}) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  const startPlek = volgorde.indexOf(s.beurt)
  const mijnPlek = volgorde.indexOf(ctx.ik)
  const positie = (mijnPlek - startPlek + volgorde.length) % volgorde.length
  const ikGestopt = a.gestopt.includes(ctx.ik)
  const ikMag = positie === a.gestopt.length
  const secondes = Math.max(0, (ctx.nu - a.begonOp) / 1000)

  return (
    <>
      <div className="midden" style={{ gap: 10 }}>
        <div style={{ fontSize: 52 }}>🌊</div>
        <h1>Waterval</h1>
        <div className="zacht klein">
          {a.gestopt.length} van {volgorde.length} gestopt
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {volgorde.map((uid, i) => {
            const plek = (i - startPlek + volgorde.length) % volgorde.length
            return (
              <span
                key={uid}
                className="kaartje"
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  opacity: a.gestopt.includes(uid) ? 0.4 : 1,
                  borderColor: plek === a.gestopt.length ? 'var(--goud)' : undefined,
                }}
              >
                {ctx.speler(uid)?.emoji} {ctx.naam(uid)}
              </span>
            )
          })}
        </div>
      </div>

      <div className="onderaan">
        {ikGestopt ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">Je bent gestopt. Wachten op de rest.</span>
          </Kaartje>
        ) : (
          <>
            <div className="klein zacht" style={{ textAlign: 'center' }}>
              {ikMag
                ? 'Je mag stoppen wanneer je wil'
                : `Wachten tot ${ctx.naam(volgorde[(startPlek + a.gestopt.length) % volgorde.length])} stopt`}
              {' · '}
              {Math.round(secondes)} sec
            </div>
            <GroteKnop kleur={ikMag ? 'rood' : 'grijs'} enorm uit={!ikMag} bijTik={() => ctx.stuur('stop')}>
              {ikMag ? 'STOP' : '🔒 Nog even doordrinken'}
            </GroteKnop>
          </>
        )}
      </div>
    </>
  )
}

function Race({ a, ctx }: { a: Extract<Actief, { soort: 'race' }>; ctx: KijkContext }) {
  const ikGetikt = a.getikt[ctx.ik] !== undefined
  const tekst =
    a.wat === 'vloer'
      ? { emoji: '👇', titel: 'HAND OMLAAG', knop: 'Vloer!' }
      : a.wat === 'hemel'
        ? { emoji: '☝️', titel: 'HAND OMHOOG', knop: 'Hemel!' }
        : { emoji: '👍', titel: 'DUIM OP TAFEL', knop: 'Duim!' }

  return (
    <>
      <div className="midden" style={{ gap: 8 }}>
        <div style={{ fontSize: 60 }}>{tekst.emoji}</div>
        <h1>{tekst.titel}</h1>
        <Balkje waarde={1 - voortgang(a.klok, ctx.nu)} />
        <div className="klein zacht">
          {Object.keys(a.getikt).length} van {ctx.spelers.length} · {klokTekst(a.klok, ctx.nu)}s
        </div>
      </div>
      <div className="onderaan">
        <GroteKnop
          kleur={ikGetikt ? 'leeg' : 'groen'}
          enorm
          uit={ikGetikt}
          bijTik={() => {
            tril(15)
            ctx.stuur('tik')
          }}
        >
          {ikGetikt ? '✓ Je was er op tijd' : tekst.knop}
        </GroteKnop>
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          De laatste drinkt 2.
        </div>
      </div>
    </>
  )
}

function Groep({ a, ctx }: { a: Extract<Actief, { soort: 'groep' }>; ctx: KijkContext }) {
  const gekozen = a.keuze[ctx.ik] !== undefined

  return (
    <>
      <div className="midden" style={{ gap: 10 }}>
        <h1>{a.tekst}</h1>
        <h2 className="zacht">{ctx.slok(a.aantal)}</h2>
        <Balkje waarde={1 - voortgang(a.klok, ctx.nu)} />
        <div className="klein zacht">
          {Object.keys(a.keuze).length} van {ctx.spelers.length} · {klokTekst(a.klok, ctx.nu)}s
        </div>
      </div>
      <div className="onderaan">
        {gekozen ? (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">
              Je koos: {a.keuze[ctx.ik] ? 'ik ook 🍺' : 'niet ik'}
            </span>
          </Kaartje>
        ) : (
          <div className="rij">
            <GroteKnop kleur="rood" enorm bijTik={() => ctx.stuur('groep-keuze', { ja: true })}>
              Ik ook 🍺
            </GroteKnop>
            <GroteKnop enorm bijTik={() => ctx.stuur('groep-keuze', { ja: false })}>
              Niet ik
            </GroteKnop>
          </div>
        )}
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          De app weet niet wie wie is — dat bepaal je zelf.
        </div>
      </div>
    </>
  )
}

function Ketting({ a, ctx }: { a: Extract<Actief, { soort: 'ketting' }>; ctx: KijkContext }) {
  const mijnBeurt = ctx.ik === a.beurt
  const rijmen = a.wat === 'rijmen'

  return (
    <>
      <div className="midden" style={{ gap: 10 }}>
        <div className="kop-klein">{rijmen ? 'Rijmen op' : 'Noem een'}</div>
        <h1>{a.onderwerp}</h1>
        <div className="zacht klein">{a.ronde} goed tot nu toe</div>
        <Kaartje style={{ textAlign: 'center' }}>
          <span className="zacht">
            {mijnBeurt ? 'Jij bent!' : `${ctx.speler(a.beurt)?.emoji} ${ctx.naam(a.beurt)} is aan de beurt`}
          </span>
        </Kaartje>
      </div>

      <div className="onderaan">
        {mijnBeurt ? (
          <>
            <GroteKnop kleur="groen" enorm bijTik={() => ctx.stuur('gelukt')}>
              Gezegd — volgende
            </GroteKnop>
            <GroteKnop kleur="rood" bijTik={() => ctx.stuur('faal')}>
              Ik weet er geen meer
            </GroteKnop>
          </>
        ) : (
          <GroteKnop kleur="leeg" bijTik={() => ctx.stuur('faal')}>
            Afgekeurd! ({ctx.naam(a.beurt)} drinkt)
          </GroteKnop>
        )}
      </div>
    </>
  )
}

function NieuweRegel({
  a,
  ctx,
}: {
  a: Extract<Actief, { soort: 'regel' }>
  ctx: KijkContext
}) {
  const [tekst, zetTekst] = useState('')

  if (a.wie !== ctx.ik) {
    return (
      <div className="midden">
        <div style={{ fontSize: 52 }}>📜</div>
        <h2 className="zacht">{ctx.naam(a.wie)} verzint een regel…</h2>
      </div>
    )
  }

  return (
    <>
      <div className="midden" style={{ gap: 10 }}>
        <div style={{ fontSize: 52 }}>📜</div>
        <h1>Verzin een regel</h1>
        <div className="klein zacht">
          Hij geldt de rest van het spel en blijft bovenaan staan.
          <br />
          Bijvoorbeeld: geen namen noemen · drinken met links · niet wijzen
        </div>
      </div>
      <div className="onderaan">
        <input
          value={tekst}
          onChange={(e) => zetTekst(e.target.value.slice(0, 90))}
          placeholder="Vanaf nu…"
          autoFocus
        />
        <GroteKnop
          kleur="goud"
          uit={tekst.trim().length < 3}
          bijTik={() => ctx.stuur('regel', { tekst })}
        >
          Zo is het
        </GroteKnop>
      </div>
    </>
  )
}

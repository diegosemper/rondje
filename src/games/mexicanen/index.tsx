import { tussen } from '../../engine/random'
import { volgende } from '../../engine/beurten'
import type { Actie, GameModule, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   MEXICANEN

   Twee dobbelstenen, en alleen jij ziet wat je gooit. Je zegt hardop een
   waarde die hoger is dan die van je voorganger — waar of gelogen. De
   volgende gelooft je en moet er zelf overheen, of roept "laat zien".

   Aan een tafel doe je dit met een beker en veel gedoe over wie er stiekem
   keek. Hier weet de app precies wat er ligt, en niemand kan spieken.

   De rangorde: 21 (de Mexicaan) is het hoogst, daarna de dubbels van 66 naar
   11, en daaronder alle gewone worpen van 65 tot 31.
   ───────────────────────────────────────────────────────────── */

const STRAF = 2
const STRAF_MEXICAAN = 4
const BEURTEN = 12

/** Alle worpen, van laag naar hoog. */
function bouwRang(): number[] {
  const gewoon: number[] = []
  for (let hoog = 6; hoog >= 1; hoog--) {
    for (let laag = hoog - 1; laag >= 1; laag--) {
      if (hoog === 2 && laag === 1) continue // dat is de Mexicaan
      gewoon.push(hoog * 10 + laag)
    }
  }
  gewoon.sort((a, b) => a - b)
  const dubbels = [11, 22, 33, 44, 55, 66]
  return [...gewoon, ...dubbels, 21]
}

const RANG = bouwRang()

function waardeVan(a: number, b: number): number {
  const hoog = Math.max(a, b)
  const laag = Math.min(a, b)
  return hoog * 10 + laag
}

function rang(waarde: number): number {
  return RANG.indexOf(waarde)
}

function tekst(waarde: number): string {
  if (waarde === 21) return '21 · Mexicaan'
  const hoog = Math.floor(waarde / 10)
  const laag = waarde % 10
  return hoog === laag ? `${waarde} · dubbel` : String(waarde)
}

interface MexState {
  beurt: string
  fase: 'gooien' | 'zeggen' | 'oordeel'
  /** wat de vorige speler beweerde */
  vorigeClaim: number | null
  vorigeSpeler: string | null
  claim: number | null
  _geheim: { worp: [number, number] | null }
  onthuld: { worp: [number, number]; claim: number; loog: boolean; door: string } | null
  beurtenGespeeld: number
  klaar: boolean
}

function nieuweBeurt(s: MexState, ctx: SpelContext, naarVolgende: boolean) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  if (naarVolgende) s.beurt = volgende(volgorde, s.beurt)
  s.fase = 'gooien'
  s._geheim.worp = null
  s.claim = null
  ctx.wisPrive()
}

export const mexicanen: GameModule<MexState> = {
  id: 'mexicanen',
  naam: 'Mexicanen',
  uitleg: 'Gooi geheim, zeg wat je wil. Geloven ze je, of niet?',
  regels: [
    'Je gooit twee stenen; alleen jij ziet ze.',
    'Zeg een waarde die hoger is dan de vorige — of lieg.',
    'De volgende gelooft je, of roept "laat zien".',
    'Betrapt of onterecht beschuldigd: je drinkt.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'middel',
  tags: ['bluf', 'geheim', 'geluk'],
  privescherm: true,

  init(ctx) {
    return {
      beurt: ctx.spelers[0].uid,
      fase: 'gooien',
      vorigeClaim: null,
      vorigeSpeler: null,
      claim: null,
      _geheim: { worp: null },
      onthuld: null,
      beurtenGespeeld: 0,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    if (s.fase === 'gooien' && actie.type === 'gooi') {
      if (actie.uid !== s.beurt) return
      const worp: [number, number] = [tussen(ctx.rng, 1, 6), tussen(ctx.rng, 1, 6)]
      s._geheim.worp = worp
      ctx.zetPrive(actie.uid, { worp })
      s.fase = 'zeggen'
      s.onthuld = null
      return
    }

    if (s.fase === 'zeggen' && actie.type === 'zeg') {
      if (actie.uid !== s.beurt) return
      const claim = Number(actie.payload?.waarde)
      if (rang(claim) < 0) return
      if (s.vorigeClaim !== null && rang(claim) <= rang(s.vorigeClaim)) return

      s.claim = claim
      s.fase = 'oordeel'
      return
    }

    if (s.fase === 'oordeel') {
      const volgorde = ctx.spelers.map((p) => p.uid)
      const volgendeSpeler = volgende(volgorde, s.beurt)

      /* Geloven: jij bent nu aan de beurt en moet erboven zien te komen. */
      if (actie.type === 'geloof') {
        if (actie.uid !== volgendeSpeler) return
        s.vorigeClaim = s.claim
        s.vorigeSpeler = s.beurt
        s.beurtenGespeeld++
        if (s.beurtenGespeeld >= BEURTEN) {
          s.klaar = true
          ctx.wisPrive()
          ctx.klaar()
          return
        }
        nieuweBeurt(s, ctx, true)
        return
      }

      /* Niet geloven: onthullen. */
      if (actie.type === 'daag') {
        if (actie.uid !== volgendeSpeler) return
        const worp = s._geheim.worp!
        const echt = waardeVan(worp[0], worp[1])
        const loog = rang(echt) < rang(s.claim!)
        const straf = s.claim === 21 || echt === 21 ? STRAF_MEXICAAN : STRAF

        if (loog) {
          ctx.drink(s.beurt, straf, `beweerde ${tekst(s.claim!)}, had ${tekst(echt)}`)
        } else {
          ctx.drink(actie.uid, straf, `daagde ${ctx.naam(s.beurt)} onterecht uit`)
        }

        s.onthuld = { worp, claim: s.claim!, loog, door: s.beurt }
        s.vorigeClaim = null
        s.vorigeSpeler = null
        s.beurtenGespeeld++
        if (s.beurtenGespeeld >= BEURTEN) {
          s.klaar = true
          ctx.wisPrive()
          ctx.klaar()
          return
        }
        // De uitgedaagde partij begint opnieuw, met een schone lei.
        s.beurt = loog ? actie.uid : s.beurt
        nieuweBeurt(s, ctx, false)
        return
      }
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    const volgorde = ctx.spelers.map((p) => p.uid)
    const volgendeSpeler = volgende(volgorde, s.beurt)
    const mijnBeurt = ctx.ik === s.beurt
    const ikOordeel = ctx.ik === volgendeSpeler && s.fase === 'oordeel'
    const worp: [number, number] | undefined = ctx.prive?.worp

    const OGEN = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

    // Wat je mag zeggen: alles boven de vorige claim.
    const mogelijk = RANG.filter(
      (w) => s.vorigeClaim === null || rang(w) > rang(s.vorigeClaim),
    ).slice(0, 14)

    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Beurt {s.beurtenGespeeld + 1}/{BEURTEN}
          </span>
          {s.vorigeClaim !== null && (
            <span className="kop-klein">te kloppen: {tekst(s.vorigeClaim)}</span>
          )}
        </div>

        <SpelerBalk spelers={ctx.spelers} actief={[s.beurt, volgendeSpeler]} />

        <div className="midden" style={{ gap: 10 }}>
          {s.onthuld && (
            <Kaartje
              style={{
                textAlign: 'center',
                borderColor: s.onthuld.loog ? 'var(--rood)' : 'var(--groen)',
              }}
            >
              <div className="kop-klein">Onthuld</div>
              <div style={{ fontSize: 40 }}>
                {OGEN[s.onthuld.worp[0]]} {OGEN[s.onthuld.worp[1]]}
              </div>
              <div className="klein">
                {ctx.naam(s.onthuld.door)} zei {tekst(s.onthuld.claim)} —{' '}
                <strong style={{ color: s.onthuld.loog ? 'var(--rood)' : 'var(--groen)' }}>
                  {s.onthuld.loog ? 'GELOGEN' : 'WAAR'}
                </strong>
              </div>
            </Kaartje>
          )}

          {mijnBeurt && worp && (
            <Kaartje style={{ textAlign: 'center', borderColor: 'var(--goud)' }}>
              <div className="kop-klein">🤫 Alleen jij ziet dit</div>
              <div style={{ fontSize: 52 }}>
                {OGEN[worp[0]]} {OGEN[worp[1]]}
              </div>
              <strong style={{ color: 'var(--goud)' }}>
                {tekst(waardeVan(worp[0], worp[1]))}
              </strong>
            </Kaartje>
          )}

          {s.claim !== null && (
            <div style={{ textAlign: 'center' }}>
              <div className="kop-klein">{ctx.naam(s.beurt)} zegt</div>
              <h1>{tekst(s.claim)}</h1>
            </div>
          )}
        </div>

        <div className="onderaan">
          {s.fase === 'gooien' &&
            (mijnBeurt ? (
              <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('gooi')}>
                🎲 Gooi geheim
              </GroteKnop>
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">{ctx.naam(s.beurt)} gooit…</span>
              </Kaartje>
            ))}

          {s.fase === 'zeggen' &&
            (mijnBeurt ? (
              <>
                <div className="kop-klein" style={{ textAlign: 'center' }}>
                  Wat zeg je? Hoeft niet te kloppen.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {mogelijk.map((w) => (
                    <GroteKnop
                      key={w}
                      klein
                      kleur={w === 21 ? 'goud' : 'leeg'}
                      bijTik={() => ctx.stuur('zeg', { waarde: w })}
                    >
                      {tekst(w)}
                    </GroteKnop>
                  ))}
                </div>
              </>
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">{ctx.naam(s.beurt)} bedenkt wat hij zegt…</span>
              </Kaartje>
            ))}

          {s.fase === 'oordeel' &&
            (ikOordeel ? (
              <>
                <div className="rij">
                  <GroteKnop kleur="groen" enorm bijTik={() => ctx.stuur('geloof')}>
                    Ik geloof je
                  </GroteKnop>
                  <GroteKnop kleur="rood" enorm bijTik={() => ctx.stuur('daag')}>
                    Laat zien!
                  </GroteKnop>
                </div>
                <div className="klein zacht" style={{ textAlign: 'center' }}>
                  Geloven betekent dat jij er nu overheen moet.
                </div>
              </>
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">{ctx.naam(volgendeSpeler)} beslist…</span>
              </Kaartje>
            ))}
        </div>
      </>
    )
  },
}

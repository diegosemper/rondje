import { nieuweStapel, trek, kaartKort, type Kaart, type Stapel } from '../../engine/deck'
import { volgende } from '../../engine/beurten'
import { klokTekst, resterendSec, startKlok, voortgang, type Klok } from '../../engine/timer'
import {
  iedereenGestemd,
  nieuweStemming,
  onthul,
  spelerOpties,
  stem,
  type Stemming,
} from '../../engine/stemmen'
import { pak } from '../../engine/random'
import type { Actie, GameModule } from '../../engine/types'
import { Speelkaart } from '../../ui/Kaart'
import { Balkje, GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   Testspel — geen echt spel

   Dit staat er om te bewijzen dat het fundament werkt. Elke knop zet één
   bouwsteen aan het werk. Werkt dit met vier telefoons, dan werken alle
   spellen die erop gebouwd worden ook.

   Dit spel verdwijnt zodra we klaar zijn met bouwen.
   ───────────────────────────────────────────────────────────── */

interface TestState {
  stapel: Stapel
  kaart: Kaart | null
  beurt: string
  klok: Klok | null
  stemming: Stemming | null
  geheimGegeven: boolean
}

export const testspel: GameModule<TestState> = {
  id: 'testspel',
  naam: 'Testspel',
  uitleg: 'Geen spel — hiermee testen we of alle onderdelen werken.',
  regels: [
    'Elke knop test één bouwsteen.',
    'Doe ze allemaal met minstens 3 telefoons.',
    'Werkt alles? Dan staat het fundament.',
  ],
  minSpelers: 1,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['chaos'],
  privescherm: true,

  init(ctx) {
    const stapel = nieuweStapel(ctx.rng)
    return {
      stapel,
      kaart: null,
      beurt: ctx.spelers[0].uid,
      klok: null,
      stemming: null,
      geheimGegeven: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    switch (actie.type) {
      case 'trek':
        s.kaart = trek(s.stapel, ctx.rng)
        ctx.log(`Kaart getrokken: ${kaartKort(s.kaart)}`)
        break

      case 'beurt':
        s.beurt = volgende(volgorde, s.beurt)
        break

      case 'drink': {
        const doel = pak(ctx.rng, volgorde)
        ctx.deelUit(actie.uid, doel, 2, 'test')
        break
      }

      case 'iedereen':
        ctx.iedereenDrinkt(1, 'test')
        break

      case 'klok':
        s.klok = startKlok(10, ctx.nu)
        ctx.log('Klok van 10 seconden gestart')
        break

      case 'stem-start':
        s.stemming = nieuweStemming('Wie test het best?', spelerOpties(ctx.spelers))
        break

      case 'stem':
        if (!s.stemming || s.stemming.uitslag) break
        stem(s.stemming, actie.uid, actie.payload?.uid)
        if (iedereenGestemd(s.stemming, volgorde)) {
          const uitslag = onthul(s.stemming)
          ctx.log(`Stemming klaar — ${uitslag.top.map(ctx.naam).join(', ')} wint`)
        }
        break

      case 'prive': {
        s.geheimGegeven = true
        for (const p of ctx.spelers) {
          ctx.zetPrive(p.uid, { kaart: trek(s.stapel, ctx.rng) })
        }
        ctx.log('Iedereen heeft een geheime kaart gekregen')
        break
      }

      case 'wis-prive':
        s.geheimGegeven = false
        ctx.wisPrive()
        break

      case 'klaar':
        ctx.klaar()
        break
    }
  },

  View({ state: s, ctx }) {
    const secOver = resterendSec(s.klok, ctx.nu)

    return (
      <>
        <SpelerBalk spelers={ctx.spelers} actief={s.beurt} />

        <div className="midden" style={{ gap: 12 }}>
          {s.kaart && <Speelkaart kaart={s.kaart} maat="midden" />}

          {s.klok && secOver > 0 && (
            <div style={{ width: '100%' }}>
              <div className="reusachtig" style={{ fontSize: 'clamp(40px,14vw,80px)' }}>
                {klokTekst(s.klok, ctx.nu)}
              </div>
              <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />
            </div>
          )}

          {ctx.prive && (
            <Kaartje style={{ textAlign: 'center', borderColor: 'var(--goud)' }}>
              <div className="kop-klein">Alleen jij ziet dit</div>
              <Speelkaart kaart={ctx.prive.kaart} maat="midden" />
            </Kaartje>
          )}

          {s.stemming && (
            <Kaartje style={{ width: '100%' }}>
              <div className="kop-klein">{s.stemming.vraag}</div>
              {s.stemming.uitslag ? (
                <div>
                  Uitslag: {s.stemming.uitslag.top.map(ctx.naam).join(', ') || 'geen'}
                </div>
              ) : s.stemming.gestemd.includes(ctx.ik) ? (
                <div className="zacht">
                  Gestemd · {s.stemming.gestemd.length}/{ctx.spelers.length}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {ctx.spelers.map((p) => (
                    <GroteKnop key={p.uid} klein bijTik={() => ctx.stuur('stem', { uid: p.uid })}>
                      {p.emoji} {p.naam}
                    </GroteKnop>
                  ))}
                </div>
              )}
            </Kaartje>
          )}
        </div>

        <div className="onderaan">
          <div className="rij">
            <GroteKnop klein bijTik={() => ctx.stuur('trek')}>🂠 Kaart</GroteKnop>
            <GroteKnop klein bijTik={() => ctx.stuur('beurt')}>↻ Beurt</GroteKnop>
            <GroteKnop klein bijTik={() => ctx.stuur('klok')}>⏱ Klok</GroteKnop>
          </div>
          <div className="rij">
            <GroteKnop klein bijTik={() => ctx.stuur('drink')}>🍺 Deel uit</GroteKnop>
            <GroteKnop klein bijTik={() => ctx.stuur('iedereen')}>🍻 Iedereen</GroteKnop>
          </div>
          <div className="rij">
            <GroteKnop klein bijTik={() => ctx.stuur('stem-start')}>🗳 Stemming</GroteKnop>
            <GroteKnop
              klein
              bijTik={() => ctx.stuur(s.geheimGegeven ? 'wis-prive' : 'prive')}
            >
              {s.geheimGegeven ? '🙈 Wis geheim' : '🤫 Geheime kaart'}
            </GroteKnop>
          </div>
          <GroteKnop kleur="leeg" bijTik={() => ctx.stuur('klaar')}>
            Test afronden
          </GroteKnop>
        </div>
      </>
    )
  },
}

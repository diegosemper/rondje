import { husselen } from '../../engine/random'
import type { Actie, GameModule } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   STELLINGEN

   Een stelling, iedereen kiest tegelijk eens of oneens, en de minderheid
   drinkt. Bij gelijkspel drinkt niemand en mag iedereen doorruziën.

   Simpel gehouden met opzet: dit is het spel dat je ertussendoor speelt
   terwijl er nog iemand bier haalt.
   ───────────────────────────────────────────────────────────── */

const RONDES = 8
const STRAF = 3

const STELLINGEN: string[] = [
  'Ananas hoort op pizza',
  'Pindakaas met hagelslag kan',
  'Een hotdog is een broodje',
  'Je mag met sokken in bed',
  'Koffie zonder suiker is beter',
  'Kerst is overschat',
  'Katten zijn beter dan honden',
  'Een appel eten in de trein mag niet',
  'Je moet je bed elke dag opmaken',
  'Bellen is beter dan appen',
  'Het is normaal om onder de douche te plassen',
  'Zwarte koffie hoort bij ontbijt',
  'Een tosti met ketchup is verkeerd',
  'Vakantie in Nederland is prima',
  'Series kijken op 1,5 keer snelheid mag',
  'De film is altijd slechter dan het boek',
  'Je mag dubbelen in een dipsaus',
  'Frietjes zonder saus is verspilling',
  'Nieuwjaarsvoornemens zijn zinloos',
  'Verjaardagsfeestjes bij familie zijn saai',
  'Emoji in een zakelijke mail kan',
  'Een gitaar meenemen naar een feestje is asociaal',
  'Je bent te oud voor games na je dertigste',
  'Vlees eten wordt over dertig jaar raar gevonden',
  'Het is prima om alleen naar de bioscoop te gaan',
  'Cadeaus geven is leuker dan krijgen',
  'Alles smaakt beter met kaas',
  'Een sms is beter dan een spraakbericht',
  'Je mag klagen over het weer',
  'Vroeg opstaan in het weekend is zonde',
  'Boterhammen doormidden snijden hoort',
  'Fooi geven moet verplicht worden',
  'Studenten hebben het zwaar',
  'Je mag pas een tattoo als je 25 bent',
  'Melk hoort niet in thee',
  'Feestjes zijn leuker zonder thema',
  'Muziek in de kroeg staat altijd te hard',
  'Je mag over spoilers klagen na een week',
  'Fietsen zonder licht is niet zo erg',
  'Een cadeaubon is een lui cadeau',
]

interface StellingState {
  ronde: number
  stellingen: string[]
  _geheim: { keuzes: Record<string, boolean> }
  gedaan: string[]
  uitslag: { eens: string[]; oneens: string[]; gelijk: boolean } | null
  klaar: boolean
}

export const stellingen: GameModule<StellingState> = {
  id: 'stellingen',
  naam: 'Stellingen',
  uitleg: 'Eens of oneens, allemaal tegelijk. De minderheid drinkt.',
  regels: [
    'Er komt een stelling in beeld.',
    'Kies eens of oneens — iedereen tegelijk.',
    'De kleinste groep drinkt.',
    'Gelijkspel? Niemand drinkt, iedereen ruziet door.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['praten', 'geheim'],
  privescherm: true,

  init(ctx) {
    return {
      ronde: 1,
      stellingen: husselen(ctx.rng, STELLINGEN).slice(0, RONDES),
      _geheim: { keuzes: {} },
      gedaan: [],
      uitslag: null,
      klaar: false,
    }
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (!s.uitslag && actie.type === 'stem') {
      if (s._geheim.keuzes[actie.uid] !== undefined) return
      s._geheim.keuzes[actie.uid] = !!actie.payload?.eens
      if (!s.gedaan.includes(actie.uid)) s.gedaan.push(actie.uid)
      if (!iedereen.every((u) => s._geheim.keuzes[u] !== undefined)) return

      const eens = iedereen.filter((u) => s._geheim.keuzes[u])
      const oneens = iedereen.filter((u) => !s._geheim.keuzes[u])
      const gelijk = eens.length === oneens.length
      s.uitslag = { eens, oneens, gelijk }

      if (!gelijk) {
        const kleinste = eens.length < oneens.length ? eens : oneens
        for (const uid of kleinste) ctx.drink(uid, STRAF, 'zat in de minderheid')
      } else {
        ctx.log('Precies gelijk — niemand drinkt')
      }
      return
    }

    if (s.uitslag && actie.type === 'verder') {
      if (s.ronde >= RONDES) {
        s.klaar = true
        ctx.wisPrive()
        ctx.klaar()
        return
      }
      s.ronde++
      s._geheim.keuzes = {}
      s.gedaan = []
      s.uitslag = null
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    const stelling = s.stellingen[(s.ronde - 1) % s.stellingen.length]
    const ikGedaan = s.gedaan.includes(ctx.ik)

    return (
      <>
        <div className="balk">
          <span className="kop-klein">
            Stelling {s.ronde}/{RONDES}
          </span>
          <span className="kop-klein">
            {s.gedaan.length}/{ctx.spelers.length}
          </span>
        </div>

        <Kaartje style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 26 }}>{stelling}</h1>
        </Kaartje>

        {s.uitslag ? (
          <>
            <div className="midden" style={{ gap: 10, alignItems: 'stretch' }}>
              {(['eens', 'oneens'] as const).map((kant) => {
                const uids = kant === 'eens' ? s.uitslag!.eens : s.uitslag!.oneens
                const ander = kant === 'eens' ? s.uitslag!.oneens : s.uitslag!.eens
                const drinkt = !s.uitslag!.gelijk && uids.length < ander.length
                return (
                  <div
                    key={kant}
                    className="kaartje"
                    style={{
                      borderColor: drinkt ? 'var(--rood)' : 'var(--groen)',
                      background: drinkt ? 'var(--rood-donker)' : undefined,
                    }}
                  >
                    <div className="balk">
                      <strong>{kant === 'eens' ? 'EENS' : 'ONEENS'}</strong>
                      <span>
                        {uids.length}
                        {drinkt && ' 🍺'}
                      </span>
                    </div>
                    <div className="klein zacht" style={{ marginTop: 3 }}>
                      {uids.length === 0 ? 'niemand' : uids.map(ctx.naam).join(', ')}
                    </div>
                  </div>
                )
              })}
              {s.uitslag.gelijk && (
                <div className="klein" style={{ textAlign: 'center', color: 'var(--goud)' }}>
                  Precies gelijk — niemand drinkt
                </div>
              )}
            </div>
            <div className="onderaan">
              {ctx.benIkHost ? (
                <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
                  {s.ronde >= RONDES ? 'Klaar' : 'Volgende stelling'}
                </GroteKnop>
              ) : (
                <Kaartje style={{ textAlign: 'center' }}>
                  <span className="zacht">Wachten op de host…</span>
                </Kaartje>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="midden" style={{ gap: 10 }}>
              <div style={{ fontSize: 46 }}>{ikGedaan ? '🤫' : '🤔'}</div>
              <SpelerBalk spelers={ctx.spelers} actief={s.gedaan} />
            </div>
            <div className="onderaan">
              {ikGedaan ? (
                <Kaartje style={{ textAlign: 'center' }}>
                  <span className="zacht">Je stem staat vast</span>
                </Kaartje>
              ) : (
                <div className="rij">
                  <GroteKnop kleur="groen" enorm bijTik={() => ctx.stuur('stem', { eens: true })}>
                    Eens
                  </GroteKnop>
                  <GroteKnop kleur="rood" enorm bijTik={() => ctx.stuur('stem', { eens: false })}>
                    Oneens
                  </GroteKnop>
                </div>
              )}
            </div>
          </>
        )}
      </>
    )
  },
}

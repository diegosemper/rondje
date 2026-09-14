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

/**
 * De stellingen.
 *
 * De minderheid drinkt, dus een stelling is alleen goed als de tafel er
 * ongeveer doormidden over gaat. "Ananas hoort op pizza" is daarvoor prima,
 * maar het levert geen enkel gesprek op — en dat is wel waar je het voor doet.
 *
 * Wat er nu staat splijt een groep van achttien écht: over daten, over wat je
 * partner mag weten, over wat nog kan en wat niet meer. Er zitten een paar
 * onschuldige tussen als adempauze, want acht rondes lang ruzie is ook niks.
 */
const STELLINGEN: string[] = [
  'Je telefoon laten zien aan je partner hoort gewoon te kunnen',
  'Vreemdgaan is vreemdgaan, ook als er niets gebeurd is',
  'Zoenen op een feestje telt niet',
  'Je mag je ex blijven volgen op social media',
  'Een relatie zonder seks kan prima werken',
  'Je moet weten hoeveel mensen je partner heeft gehad',
  'Vrienden blijven met je ex kan niet',
  'Iemand ghosten is soms het vriendelijkst',
  'Een open relatie is gedoemd te mislukken',
  'Je mag een date afzeggen via een appje',
  'Wie het uitmaakt hoort te vertrekken uit het huis',
  'Je partner mag je wachtwoorden weten',
  'Seks op de eerste date is prima',
  'Je mag liegen over je verleden als het voorbij is',
  'Flirten met iemand anders is onschuldig',
  'Als je twijfelt moet je het uitmaken',
  'Je mag je vrienden alles vertellen over je relatie',
  'Iemand terugpakken na een breuk is verdiend',
  'Leeftijdsverschil van tien jaar is te veel',
  'Je moet je ouders vertellen wie je date',
  'Nudes versturen is vragen om problemen',
  'Eén keer dronken iets doen telt niet mee',
  'Je mag iemands dagboek lezen als je je zorgen maakt',
  'Jaloers zijn is een teken dat je om iemand geeft',
  'Samenwonen voor je trouwt hoort erbij',
  'Je moet altijd eerlijk zeggen wat je van iemands outfit vindt',
  'Een vriendschap kan nooit meer hetzelfde na een zoen',
  'Je mag je vrienden verbieden met je ex te daten',
  'Het is normaal om je date op te zoeken voordat je gaat',
  'Je moet je partner alles vertellen over je vrijgezellenfeest',
  'Iemand dumpen op zijn verjaardag kan echt niet',
  'Je mag iemand beoordelen op zijn muzieksmaak',
  'Zonder ruzie is een relatie niet echt',
  'Je moet je telefoon weg kunnen leggen aan tafel',
  'Dronken beloftes tellen',
  'Onder de douche plassen is normaal',
  'Je mag dubbelen in een dipsaus',
  'Kerst is overschat',
  'Bellen is beter dan appen',
  'Ananas hoort op pizza',
  'Je mag met sokken in bed',
  'Vakantie in Nederland is prima',
  'Verjaardagsfeestjes bij familie zijn saai',
  'Je moet je bed elke dag opmaken',
  'De film is altijd slechter dan het boek',
  'Series kijken op 1,5 keer snelheid mag',
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
      stellingen: ctx.vers('stellingen', STELLINGEN, RONDES),
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

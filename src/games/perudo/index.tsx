import { useEffect, useRef, useState } from 'react'
import { volgendeActieve } from '../../engine/beurten'
import { tussen } from '../../engine/random'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'
import {
  START_STENEN,
  magBieden,
  minimumAantal,
  mogelijkeOgen,
  telOgen,
  telt,
  type Bod,
} from './regels'

/* ─────────────────────────────────────────────────────────────
   PERUDO

   Iedereen heeft vijf stenen onder zijn beker, en alleen jij ziet die van
   jou. Om de beurt zeg je hoe vaak een oog volgens jou aan tafel ligt — bij
   iedereen bij elkaar opgeteld. Elk bod moet hoger dan het vorige. Geloof je
   het niet, dan roep je "dudo" en gaan alle bekers omhoog. Wie ernaast zit
   raakt een steen kwijt, en wie er geen meer heeft ligt eruit.

   Aan een tafel is dit spel één lange discussie over wie er stiekem keek en
   of het nou drie of vier waren. Hier weet de app precies wat er ligt.

   Het rekenwerk — mag dit bod, en hoe vaak ligt dat oog er echt — staat in
   regels.ts. Dit bestand gaat over de beurt, de straf en het scherm.
   ───────────────────────────────────────────────────────────── */

const OGEN = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

interface Onthulling {
  soort: 'dudo' | 'calza'
  /** wie het riep */
  door: string
  /** het bod waar het om ging, en wie het deed */
  bod: Bod
  bieder: string
  /** stond de joker uit toen dit bod viel? */
  palifico: boolean
  /** hoe vaak dat oog werkelijk aan tafel lag */
  totaal: number
  /** alle bekers omhoog — nu mag iedereen alles zien */
  worpen: Record<string, number[]>
  verliezer: string | null
  /** wie er een steen bij kreeg (geslaagde calza) */
  winnaar: string | null
  afgevallen: string[]
  /** wie de volgende ronde begint */
  beginner: string
}

interface PerudoState {
  ronde: number
  /**
   * gooien → iedereen keert zijn eigen beker om
   * bieden → rondgaan tot iemand het niet gelooft
   * onthuld → alle bekers omhoog
   * einde   → er is er nog één met stenen
   */
  fase: 'gooien' | 'bieden' | 'onthuld' | 'einde'
  /** wie zijn stenen deze ronde al gegooid heeft */
  gegooid: Record<string, boolean>
  /** wie er aan zet is: bieden, dudo of calza */
  beurt: string
  /** stenen per speler; 0 = af */
  stenen: Record<string, number>
  bod: Bod | null
  bieder: string | null
  /** in deze ronde is de joker uit en ligt het oog vast na het eerste bod */
  palifico: boolean
  /** wie er al een palifico-ronde gehad heeft; ieder krijgt er één */
  palificoGehad: Record<string, boolean>
  /**
   * De worpen van iedereen.
   *
   * Onder `_geheim`, en dat is hier het hele spel: alles onder die sleutel
   * blijft op de telefoon van de host en gaat nooit naar de andere
   * telefoons. Wat één speler wél mag zien gaat apart mee via zetPrive().
   */
  _geheim: { worpen: Record<string, number[]> }
  onthuld: Onthulling | null
  kampioen: string | null
  klaar: boolean
}

/* ── rekenen aan de stand ─────────────────────────────────── */

function leeft(s: PerudoState, uid: string): boolean {
  return (s.stenen[uid] ?? 0) > 0
}

/** Hoeveel stenen er in totaal onder de bekers liggen. */
function stenenAanTafel(s: PerudoState): number {
  return Object.values(s.stenen).reduce((a, b) => a + b, 0)
}

/**
 * Eén speler keert zijn beker om.
 *
 * Het rekenwerk gebeurt nog steeds op de host — daar zit de enige
 * toevalsgenerator, en met dezelfde seed is een potje exact na te spelen.
 * Maar wánneer er gegooid wordt bepaalt de speler zelf, en de uitkomst gaat
 * alleen naar zijn eigen scherm.
 */
function gooiVoor(s: PerudoState, ctx: SpelContext, uid: string) {
  const worp: number[] = []
  for (let i = 0; i < s.stenen[uid]; i++) worp.push(tussen(ctx.rng, 1, 6))
  // Gesorteerd, want een handje dat elke ronde in een andere volgorde staat
  // leest slecht: je wilt in één oogopslag zien wat je hebt.
  worp.sort((a, b) => a - b)

  s._geheim.worpen[uid] = worp
  s.gegooid[uid] = true
  ctx.zetPrive(uid, { worp })
}

/** Alles op scherp voor een nieuwe ronde: lege bekers, niemand heeft gegooid. */
function nieuweRonde(s: PerudoState, ctx: SpelContext, beginner: string) {
  s.ronde++
  s.fase = 'gooien'
  s.beurt = beginner
  s.bod = null
  s.bieder = null
  s.onthuld = null
  s.gegooid = {}
  s._geheim.worpen = {}
  ctx.wisPrive()

  /*
   * Palifico: wie voor het eerst op zijn laatste steen zit, opent een ronde
   * zonder joker, waarin het oog na het eerste bod vaststaat. Eén keer per
   * speler — anders zit je aan het eind van een potje in niets anders meer.
   */
  s.palifico = s.stenen[beginner] === 1 && !s.palificoGehad[beginner]
  if (s.palifico) s.palificoGehad[beginner] = true

  ctx.log(
    s.palifico
      ? `Ronde ${s.ronde} — PALIFICO bij ${ctx.naam(beginner)}: geen joker, oog ligt vast`
      : `Ronde ${s.ronde} — ${ctx.naam(beginner)} begint`,
  )
}

/**
 * De bekers gaan omhoog: verwerk de uitslag van een dudo of calza.
 *
 * `verliezer` raakt een steen kwijt, `winnaar` krijgt er een terug. Bij een
 * dudo is er altijd precies één verliezer; bij een calza óf een winnaar óf
 * een verliezer.
 */
function beslis(
  s: PerudoState,
  ctx: SpelContext,
  soort: 'dudo' | 'calza',
  door: string,
  totaal: number,
  verliezer: string | null,
  winnaar: string | null,
) {
  const volgorde = ctx.spelers.map((p) => p.uid)
  const bod = s.bod!
  const afgevallen: string[] = []

  if (verliezer) {
    s.stenen[verliezer] = Math.max(0, s.stenen[verliezer] - 1)
    if (s.stenen[verliezer] === 0) {
      afgevallen.push(verliezer)
      // In één keer, niet twee keer drinken achter elkaar: dan krijg je ook
      // maar één regel in het logboek en één pauze.
      ctx.drink(verliezer, 3, 'laatste steen kwijt — eruit')
    } else {
      ctx.drink(verliezer, 1, `steen kwijt, nog ${s.stenen[verliezer]}`)
    }
  }

  if (winnaar) {
    s.stenen[winnaar] = Math.min(START_STENEN, s.stenen[winnaar] + 1)
    ctx.log(`${ctx.naam(winnaar)} zat er precies op en krijgt een steen terug`)
  }

  /*
   * Wie begint de volgende ronde? Degene die de klap kreeg — die mag als
   * eerste weer bieden. Ligt hij eruit, dan de eerstvolgende die nog leeft.
   * Bij een geslaagde calza is er geen verliezer; dan begint wie hem riep.
   */
  let beginner = verliezer ?? door
  if (!leeft(s, beginner)) {
    beginner = volgendeActieve(volgorde, beginner, (u) => leeft(s, u)) ?? beginner
  }

  s.onthuld = {
    soort,
    door,
    bod,
    bieder: s.bieder!,
    palifico: s.palifico,
    totaal,
    // Kopie: `_geheim.worpen` wordt volgende ronde overschreven, en dit
    // scherm moet blijven staan tot iedereen doorgetikt heeft.
    worpen: { ...s._geheim.worpen },
    verliezer,
    winnaar,
    afgevallen,
    beginner,
  }
  s.fase = 'onthuld'
  ctx.wisPrive()

  ctx.log(
    `${ctx.naam(door)} roept ${soort} op ${bod.aantal}× ${OGEN[bod.ogen]} — er lagen er ${totaal}`,
  )
}

/* ── het spel ─────────────────────────────────────────────── */

export const perudo: GameModule<PerudoState> = {
  id: 'perudo',
  naam: 'Perudo',
  uitleg: 'Vijf stenen onder je beker. Bied hoog, of roep dudo.',
  regels: [
    'Gooi je eigen vijf stenen; alleen jij ziet ze. Enen zijn joker.',
    'Zeg hoe vaak een oog aan tafel ligt — bij iedereen samen.',
    'Verhogen: meer stenen, of hetzelfde aantal van een hóger oog. Omlaag nooit.',
    'Dudo = ik geloof je niet. Wie ernaast zit raakt een steen kwijt.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'lang',
  tags: ['bluf', 'geheim', 'geluk'],
  privescherm: true,

  init(ctx) {
    const stenen: Record<string, number> = {}
    for (const speler of ctx.spelers) stenen[speler.uid] = START_STENEN

    const s: PerudoState = {
      ronde: 0,
      fase: 'gooien',
      gegooid: {},
      beurt: ctx.spelers[0].uid,
      stenen,
      bod: null,
      bieder: null,
      palifico: false,
      palificoGehad: {},
      _geheim: { worpen: {} },
      onthuld: null,
      kampioen: null,
      klaar: false,
    }

    nieuweRonde(s, ctx, ctx.spelers[0].uid)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const volgorde = ctx.spelers.map((p) => p.uid)

    /*
     * Iedereen keert zijn eigen beker om. Pas als de laatste beker om is
     * begint het bieden — anders zit je te bieden op stenen die er nog niet
     * liggen, en dan is de eerste bieder in het nadeel.
     */
    if (s.fase === 'gooien' && actie.type === 'gooi') {
      if (!leeft(s, actie.uid)) return
      if (s.gegooid[actie.uid]) return

      gooiVoor(s, ctx, actie.uid)

      const levend = volgorde.filter((u) => leeft(s, u))
      if (levend.every((u) => s.gegooid[u])) s.fase = 'bieden'
      return
    }

    if (s.fase === 'bieden') {
      // Bieden, dudo én calza zijn alleen voor wie aan de beurt is. Aan een
      // echte tafel mag iedereen ertussen roepen, maar op telefoons wordt dat
      // een wedstrijdje wie het snelst tikt.
      if (actie.uid !== s.beurt) return
      const maxAantal = stenenAanTafel(s)

      if (actie.type === 'bied') {
        const bod: Bod = {
          aantal: Math.round(Number(actie.payload?.aantal)),
          ogen: Math.round(Number(actie.payload?.ogen)),
        }
        if (!magBieden(s.bod, bod, s.palifico, maxAantal)) return

        s.bod = bod
        s.bieder = actie.uid
        const volgendeSpeler = volgendeActieve(volgorde, actie.uid, (u) => leeft(s, u))
        if (volgendeSpeler) s.beurt = volgendeSpeler
        return
      }

      if (actie.type === 'dudo') {
        if (!s.bod || !s.bieder) return
        const totaal = telOgen(s._geheim.worpen, s.bod.ogen, s.palifico)
        // Lag het er echt? Dan zat de twijfelaar ernaast, en anders de bieder.
        const bodKlopt = totaal >= s.bod.aantal
        beslis(s, ctx, 'dudo', actie.uid, totaal, bodKlopt ? actie.uid : s.bieder, null)
        return
      }

      if (actie.type === 'calza') {
        if (!s.bod || !s.bieder) return
        if (actie.uid === s.bieder) return // je eigen bod natellen mag niet
        const totaal = telOgen(s._geheim.worpen, s.bod.ogen, s.palifico)
        const precies = totaal === s.bod.aantal
        beslis(
          s,
          ctx,
          'calza',
          actie.uid,
          totaal,
          precies ? null : actie.uid,
          precies ? actie.uid : null,
        )
        return
      }
      return
    }

    if (s.fase === 'onthuld' && actie.type === 'verder') {
      // Iedereen die nog meedoet mag doortikken, zodat het spel niet stilvalt
      // als degene die moet beginnen net even niet kijkt.
      if (!leeft(s, actie.uid)) return

      const over = volgorde.filter((u) => leeft(s, u))
      if (over.length <= 1) {
        s.kampioen = over[0] ?? null
        s.fase = 'einde'
        ctx.wisPrive()
        if (s.kampioen) ctx.log(`🏆 ${ctx.naam(s.kampioen)} wint Perudo`)
        return
      }

      nieuweRonde(s, ctx, s.onthuld!.beginner)
      return
    }

    if (s.fase === 'einde' && actie.type === 'afsluiten') {
      s.klaar = true
      ctx.wisPrive()
      ctx.klaar()
      return
    }
  },

  isKlaar: (s) => s.klaar,

  /*
   * Even wachten met het slokkenscherm: de bekers zijn net omhoog gegaan en
   * je wilt eerst zien wat er lag voordat er een drinkpauze overheen komt.
   */
  drinkVertraging: (s) => (s.fase === 'onthuld' ? 2600 : 0),

  View({ state: s, ctx }) {
    const volgorde = ctx.spelers.map((p) => p.uid)
    const maxAantal = stenenAanTafel(s)
    const mijnWorp: number[] = ctx.prive?.worp ?? []
    const mijnBeurt = ctx.ik === s.beurt && s.fase === 'bieden'
    const ikLeef = leeft(s, ctx.ik)
    const wachtOp = volgorde.filter((uid) => leeft(s, uid) && !s.gegooid[uid])

    /*
     * In welke ronde ik op "gooi" getikt heb. Puur voor het gevoel: de beker
     * kiept meteen om, ook al is de worp zelf nog onderweg van de host. Als
     * getal en niet als ja/nee, dan hoeft hij niet per ronde teruggezet te
     * worden — een oude ronde is vanzelf niet de huidige meer.
     */
    const [getiktRonde, zetGetiktRonde] = useState(-1)

    /*
     * Hoeveel stenen iedereen nog heeft, onder zijn naam in de spelersbalk.
     * SpelerBalk zet daar normaal het aantal slokken neer; in Perudo is dit
     * het enige getal dat er toe doet.
     */
    const stenenPerSpeler: Record<string, { gedronken: number }> = {}
    for (const speler of ctx.spelers) {
      stenenPerSpeler[speler.uid] = { gedronken: s.stenen[speler.uid] ?? 0 }
    }

    return (
      <>
        <div className="balk">
          <span className="kop-klein">Ronde {s.ronde}</span>
          {s.palifico && s.fase !== 'einde' && (
            <span className="kop-klein" style={{ color: 'var(--rood)' }}>
              PALIFICO · geen joker
            </span>
          )}
          <span className="kop-klein">{maxAantal} stenen</span>
        </div>

        <SpelerBalk
          spelers={ctx.spelers}
          actief={s.fase === 'bieden' ? s.beurt : []}
          score={stenenPerSpeler}
        />

        <div className="midden" style={{ gap: 10 }}>
          {s.fase === 'einde' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64 }}>🏆</div>
              <h1>{s.kampioen ? ctx.naam(s.kampioen) : 'Niemand'} wint</h1>
              <div className="zacht">Als laatste nog stenen onder de beker.</div>
            </div>
          ) : s.fase === 'onthuld' && s.onthuld ? (
            <OnthuldScherm o={s.onthuld} ctx={ctx} volgorde={volgorde} />
          ) : (
            <>
              {s.fase === 'bieden' &&
                (s.bod ? (
                  <div style={{ textAlign: 'center' }}>
                    <div className="kop-klein">{ctx.naam(s.bieder!)} zegt</div>
                    <h1 style={{ margin: '2px 0' }}>
                      {s.bod.aantal} × {OGEN[s.bod.ogen]}
                    </h1>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div className="kop-klein">Nog geen bod</div>
                    <h2 className="zacht">{ctx.naam(s.beurt)} opent</h2>
                  </div>
                ))}

              {ikLeef ? (
                <Kaartje style={{ textAlign: 'center', borderColor: 'var(--goud)' }}>
                  <div className="kop-klein">🤫 Alleen jij ziet dit</div>
                  <Beker
                    // Nieuwe sleutel per ronde, zodat de beker weer dicht gaat
                    // en de worp opnieuw mag tuimelen.
                    key={s.ronde}
                    aantal={s.stenen[ctx.ik]}
                    worp={mijnWorp.length > 0 ? mijnWorp : null}
                    jokerAan={!s.palifico}
                    kiepend={getiktRonde === s.ronde && mijnWorp.length === 0}
                  />
                  {mijnWorp.length > 0 && !s.palifico && (
                    <div className="klein zacht">Enen tellen bij elk oog mee.</div>
                  )}
                </Kaartje>
              ) : (
                <Kaartje style={{ textAlign: 'center' }}>
                  <span className="zacht">Je bent af — je kijkt mee.</span>
                </Kaartje>
              )}

              {s.fase === 'gooien' && (
                <div className="gooistand">
                  {volgorde
                    .filter((uid) => leeft(s, uid))
                    .map((uid) => (
                      <span key={uid} className={s.gegooid[uid] ? 'klaar' : ''}>
                        {ctx.speler(uid)?.emoji} {ctx.naam(uid)} {s.gegooid[uid] ? '✓' : '🥤'}
                      </span>
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="onderaan">
          {s.fase === 'gooien' &&
            (!ikLeef ? (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">De rest gooit…</span>
              </Kaartje>
            ) : !s.gegooid[ctx.ik] ? (
              <GroteKnop
                kleur="goud"
                enorm
                bijTik={() => {
                  zetGetiktRonde(s.ronde)
                  ctx.stuur('gooi')
                }}
              >
                🎲 Gooi je stenen
              </GroteKnop>
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">
                  Wachten op {wachtOp.map((uid) => ctx.naam(uid)).join(', ')}…
                </span>
              </Kaartje>
            ))}

          {s.fase === 'einde' && (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('afsluiten')}>
              Klaar
            </GroteKnop>
          )}

          {s.fase === 'onthuld' &&
            (ikLeef ? (
              <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
                Volgende ronde →
              </GroteKnop>
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">Wachten op de volgende ronde…</span>
              </Kaartje>
            ))}

          {s.fase === 'bieden' &&
            (mijnBeurt ? (
              <>
                <Bieder
                  // Nieuwe sleutel bij elk nieuw bod, zodat de kiezer zichzelf
                  // opnieuw opbouwt en niet blijft staan op iets wat inmiddels
                  // te laag is.
                  key={`${s.ronde}:${s.bod?.aantal ?? 0}:${s.bod?.ogen ?? 0}`}
                  bod={s.bod}
                  palifico={s.palifico}
                  maxAantal={maxAantal}
                  bijBod={(b) => ctx.stuur('bied', b)}
                />

                {s.bod && (
                  <div className="rij">
                    <GroteKnop kleur="rood" bijTik={() => ctx.stuur('dudo')}>
                      Dudo!
                    </GroteKnop>
                    {s.bieder !== ctx.ik && (
                      <GroteKnop kleur="groen" bijTik={() => ctx.stuur('calza')}>
                        Calza
                      </GroteKnop>
                    )}
                  </div>
                )}
              </>
            ) : (
              <Kaartje style={{ textAlign: 'center' }}>
                <span className="zacht">{ctx.naam(s.beurt)} denkt na…</span>
              </Kaartje>
            ))}
        </div>
      </>
    )
  },
}

/* ── de beker ─────────────────────────────────────────────── */

/** Hoe lang de stenen tuimelen voordat ze blijven liggen. */
const ROL_MS = 850

/**
 * Losse ogen om mee te tuimelen.
 *
 * Hier mag Math.random() wél: dit zijn de stenen die je ziet rollen, niet de
 * stenen die je krijgt. Die laatste komen van de host, uit ctx.rng.
 */
function losseOgen(n: number): number[] {
  return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6))
}

/**
 * Je eigen beker: dicht, tuimelend, of stilliggend.
 *
 * De worp komt van de host en is er dus pas na een tikje netwerk. Dat gat
 * wordt niet weggepoetst maar gebruikt: de beker kiept om zodra je tikt, de
 * stenen rollen zodra ze binnen zijn, en ze blijven pas liggen als ze echt
 * uitgerold zijn. Zo zie je een worp gebeuren in plaats van een getal dat er
 * ineens staat.
 */
function Beker({
  aantal,
  worp,
  jokerAan,
  kiepend,
}: {
  aantal: number
  worp: number[] | null
  jokerAan: boolean
  kiepend: boolean
}) {
  const [rollend, zetRollend] = useState(false)
  const [nep, zetNep] = useState<number[]>([])
  const alGerold = useRef(false)

  /* De worp is binnen: eerst laten tuimelen, dan pas laten liggen. */
  useEffect(() => {
    if (!worp || alGerold.current) return
    alGerold.current = true
    zetRollend(true)
    const klok = setTimeout(() => {
      zetRollend(false)
      // Een tikje als ze liggen, zodat je het ook voelt als je net wegkijkt.
      tril([16, 40, 16])
    }, ROL_MS)
    return () => clearTimeout(klok)
  }, [worp])

  /* Tijdens het tuimelen wisselen de ogen door. */
  useEffect(() => {
    if (!rollend) return
    const tik = setInterval(() => zetNep(losseOgen(aantal)), 70)
    return () => clearInterval(tik)
  }, [rollend, aantal])

  if (!worp) {
    return (
      <div>
        <div className={`beker${kiepend ? ' kiept' : ''}`}>🥤</div>
        <div className="klein zacht">
          {aantal} {aantal === 1 ? 'steen' : 'stenen'} onder je beker
        </div>
      </div>
    )
  }

  const tonen = rollend ? nep : worp

  return (
    <div className="dobbel">
      {tonen.map((oog, i) => (
        <span
          key={i}
          className={[
            'steen',
            rollend ? 'rolt' : 'ligt',
            !rollend && jokerAan && oog === 1 ? 'joker' : '',
          ].join(' ')}
          // Elke steen een eigen vertraging: anders tuimelen ze als één blok.
          style={{ animationDelay: `${i * 0.07}s` }}
        >
          {OGEN[oog]}
        </span>
      ))}
    </div>
  )
}

/* ── de bod-kiezer ────────────────────────────────────────── */

/**
 * Kies een oog, kies een aantal, zeg het.
 *
 * De ogen waar niet meer op geboden kan worden staan uit, en het aantal kan
 * niet onder het minimum zakken. Zo hoeft niemand de reken­regels uit zijn
 * hoofd te kennen: wat je kunt indrukken, mag.
 */
function Bieder({
  bod,
  palifico,
  maxAantal,
  bijBod,
}: {
  bod: Bod | null
  palifico: boolean
  maxAantal: number
  bijBod: (b: Bod) => void
}) {
  const kan = mogelijkeOgen(bod, palifico, maxAantal)

  // Begin bij het goedkoopste vervolg op het bod dat er ligt: hetzelfde oog,
  // eentje meer. Ligt er nog niets, dan een gok van ongeveer een derde.
  const startOgen = bod && kan.includes(bod.ogen) ? bod.ogen : (kan[0] ?? 1)
  const startMin = minimumAantal(bod, startOgen, palifico) ?? 1
  const startAantal = bod
    ? startMin
    : Math.min(maxAantal, Math.max(startMin, Math.round(maxAantal / 3)))

  const [ogen, zetOgen] = useState(startOgen)
  const [aantal, zetAantal] = useState(startAantal)

  const min = minimumAantal(bod, ogen, palifico) ?? 1

  /*
   * Er is een stand waarin er niets meer te bieden valt: als alle stenen aan
   * tafel al als enen geclaimd zijn, kan er niets meer bij. Dan hoort hier
   * geen kiezer te staan die toch niets doet, maar de mededeling dat je nog
   * één uitweg hebt.
   */
  if (kan.length === 0) {
    return (
      <Kaartje style={{ textAlign: 'center' }}>
        <span className="zacht">
          Hier kan niets meer overheen. Je moet wel dudo of calza roepen.
        </span>
      </Kaartje>
    )
  }

  /*
   * Bij een ander oog springt het aantal terug naar het minimum van dát oog.
   * Het aantal laten staan zou betekenen dat je na een stap naar ⚄ ineens op
   * "zeven enen" staat zonder dat je daarom vroeg.
   */
  function kiesOgen(nieuw: number) {
    tril(10)
    zetOgen(nieuw)
    zetAantal(Math.min(maxAantal, minimumAantal(bod, nieuw, palifico) ?? 1))
  }

  return (
    <>
      <div className="aantal-rij" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {[1, 2, 3, 4, 5, 6].map((o) => {
          const magNiet = !kan.includes(o)
          return (
            <button
              key={o}
              className={['aantal-knop', o === ogen ? 'gekozen' : ''].join(' ')}
              disabled={magNiet}
              style={{ fontSize: 26, opacity: magNiet ? 0.25 : 1 }}
              onClick={() => kiesOgen(o)}
            >
              {OGEN[o]}
            </button>
          )
        })}
      </div>

      <div className="rij" style={{ alignItems: 'center' }}>
        <GroteKnop klein uit={aantal <= min} bijTik={() => zetAantal((a) => Math.max(min, a - 1))}>
          −
        </GroteKnop>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1 }}>
            {aantal} × {OGEN[ogen]}
          </div>
          <div className="klein zacht">
            minstens {min}
            {palifico && bod ? ' · oog ligt vast' : ''}
          </div>
        </div>
        <GroteKnop
          klein
          uit={aantal >= maxAantal}
          bijTik={() => zetAantal((a) => Math.min(maxAantal, a + 1))}
        >
          +
        </GroteKnop>
      </div>

      <GroteKnop kleur="goud" enorm bijTik={() => bijBod({ aantal, ogen })}>
        Zeg {aantal} × {OGEN[ogen]}
      </GroteKnop>
    </>
  )
}

/* ── de bekers omhoog ─────────────────────────────────────── */

function OnthuldScherm({
  o,
  ctx,
  volgorde,
}: {
  o: Onthulling
  ctx: KijkContext
  volgorde: string[]
}) {
  const bodKlopte = o.totaal >= o.bod.aantal
  const goed = o.soort === 'calza' ? o.winnaar !== null : bodKlopte

  const uitslag =
    o.soort === 'calza'
      ? o.winnaar
        ? `Precies goed — ${ctx.naam(o.door)} krijgt een steen terug`
        : `Er lagen er ${o.totaal}, niet ${o.bod.aantal} — ${ctx.naam(o.door)} raakt een steen kwijt`
      : bodKlopte
        ? `Het bod klopte — ${ctx.naam(o.door)} raakt een steen kwijt`
        : `${ctx.naam(o.bieder)} blufte — en raakt een steen kwijt`

  return (
    <>
      <Kaartje
        style={{
          textAlign: 'center',
          borderColor: goed ? 'var(--groen)' : 'var(--rood)',
        }}
      >
        <div className="kop-klein">
          {o.soort === 'dudo' ? 'DUDO' : 'CALZA'} van {ctx.naam(o.door)}
        </div>
        <h2 style={{ margin: '2px 0' }}>
          {o.bod.aantal} × {OGEN[o.bod.ogen]}
        </h2>
        <div className="klein">
          er lagen er{' '}
          <strong style={{ color: goed ? 'var(--groen)' : 'var(--rood)', fontSize: 18 }}>
            {o.totaal}
          </strong>
        </div>
      </Kaartje>

      <div style={{ display: 'grid', gap: 4, width: '100%' }}>
        {volgorde
          .filter((uid) => o.worpen[uid])
          .map((uid) => (
            <div
              key={uid}
              className="rij"
              style={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span className="klein zacht" style={{ minWidth: 70 }}>
                {ctx.speler(uid)?.emoji} {ctx.naam(uid)}
              </span>
              <span style={{ fontSize: 26, letterSpacing: 1 }}>
                {o.worpen[uid].map((steen, i) => {
                  const meetellend = telt(steen, o.bod.ogen, o.palifico)
                  return (
                    <span
                      key={i}
                      style={{
                        color: meetellend ? 'var(--goud)' : 'var(--tekst)',
                        opacity: meetellend ? 1 : 0.3,
                      }}
                    >
                      {OGEN[steen]}
                    </span>
                  )
                })}
              </span>
            </div>
          ))}
      </div>

      <div className="klein" style={{ textAlign: 'center' }}>
        {uitslag}
        {o.afgevallen.map((uid) => (
          <div key={uid} style={{ color: 'var(--rood)', fontWeight: 700 }}>
            {ctx.naam(uid)} ligt eruit
          </div>
        ))}
      </div>
    </>
  )
}

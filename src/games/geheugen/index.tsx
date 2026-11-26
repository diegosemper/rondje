import { tussen } from '../../engine/random'
import { useHostKlok } from '../../engine/hooks'
import { startKlok, voortgang, resterendSec, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { Balkje, GroteKnop, Kaartje, SpelerBalk, tril } from '../../ui/Basis'

/* ─────────────────────────────────────────────────────────────
   GEHEUGENREEKS

   De app laat een reeks vakjes oplichten. Eerst één, dan twee, dan drie, en zo
   door. Iedereen tikt hem daarna na op zijn eigen telefoon, allemaal tegelijk.

   Hoeveel rondes je achter elkaar goed hebt, is wat je aan het eind mag
   uitdelen. Eén goed is één slok, tien goed is tien slokken. Dus er wordt
   niemand afgestraft voor meedoen -- je verdient alleen minder.

   Dat is met opzet geen eliminatiespel waarin je drinkt als je mist. Zou een
   fout slokken kosten, dan stopt iedereen zodra het spannend wordt. Nu is de
   enige straf dat je streak stilstaat terwijl die van de anderen doorgroeit, en
   dat blijf je proberen.

   DE REEKS LOOPT OP ALLE TELEFOONS GELIJK. Hij staat in de spelstand en het
   oplichten komt uit de gedeelde klok, niet uit een eigen timer per telefoon.
   Draaide elk toestel zijn eigen animatie, dan licht het vierde vakje bij de
   een op terwijl de ander nog bij het derde zit -- en dan is het geen
   gezamenlijk moment meer maar acht mensen die iets anders zien.

   Dat de reeks publiek in de stand staat is geen probleem: iedereen mag hem
   zien, dat is het hele spel. Het geheim zit in je hoofd, niet in de app.
   ───────────────────────────────────────────────────────────── */

/** Hoeveel vakjes er zijn om uit te kiezen. */
const VAKJES = 4
/** Hoe lang één vakje oplicht, inclusief de pauze erna. */
const STAP_MS = 760
/** Even stil voordat de reeks begint, zodat niemand het eerste vakje mist. */
const AANLOOP_MS = 900
/** Hoeveel tijd je per vakje krijgt om na te tikken. */
const TIK_MS_PER_VAKJE = 1700
/** En hoeveel extra, zodat de eerste ronde niet belachelijk krap is. */
const TIK_MS_EXTRA = 2500
/** Hier stopt het. Twaalf achter elkaar haalt vrijwel niemand. */
const MAX_RONDES = 12

interface GeheugenState {
  /** de ronde is ook de lengte van de reeks */
  ronde: number
  /** de vakjes die oplichten, 0 tot 3 */
  reeks: number[]
  fase: 'kijken' | 'tikken' | 'ronde' | 'einde'
  klok: Klok | null
  /** hoeveel vakjes iemand deze ronde goed heeft getikt */
  invoer: Record<string, number>
  /** wie deze ronde al klaar is */
  klaarDezeRonde: string[]
  /** wie eruit ligt, met de ronde waarin het misging */
  af: string[]
  /** hoeveel rondes iemand achter elkaar goed had */
  streak: Record<string, number>
  /** wie zijn slokken al heeft uitgedeeld */
  gegeven: string[]
  klaar: boolean
}

function nieuweReeks(ctx: SpelContext, lengte: number): number[] {
  const uit: number[] = []
  for (let i = 0; i < lengte; i++) uit.push(tussen(ctx.rng, 0, VAKJES - 1))
  return uit
}

/** Wie er nog meedoet. */
function actief(s: GeheugenState, ctx: SpelContext): string[] {
  return ctx.spelers.map((p) => p.uid).filter((u) => !s.af.includes(u))
}

function startRonde(s: GeheugenState, ctx: SpelContext) {
  s.reeks = nieuweReeks(ctx, s.ronde)
  s.fase = 'kijken'
  s.invoer = {}
  s.klaarDezeRonde = []
  // De aanloop zit in de klok, zodat het aftellen en het oplichten uit dezelfde
  // bron komen en niet langzaam uit elkaar lopen.
  s.klok = startKlok((AANLOOP_MS + s.reeks.length * STAP_MS) / 1000, ctx.nu)
}

/**
 * De ronde afsluiten.
 *
 * Wie hem goed had schuift een ronde op; wie hem miste of te langzaam was ligt
 * eruit met de streak die hij al had. Blijft er niemand over, dan is het potje
 * klaar.
 */
function sluitRonde(s: GeheugenState, ctx: SpelContext) {
  for (const uid of actief(s, ctx)) {
    if (s.klaarDezeRonde.includes(uid)) {
      s.streak[uid] = s.ronde
    } else {
      s.af.push(uid)
    }
  }

  s.fase = 'ronde'
  s.klok = null

  const over = actief(s, ctx)
  if (over.length === 0 || s.ronde >= MAX_RONDES) {
    s.fase = 'einde'
    const beste = Math.max(0, ...Object.values(s.streak))
    ctx.log(
      beste === 0
        ? 'Niemand haalde zelfs de eerste reeks'
        : `De langste reeks was ${beste} lang`,
    )
  }
}

export const geheugen: GameModule<GeheugenState> = {
  id: 'geheugen',
  naam: 'Geheugenreeks',
  uitleg: 'Eerst één vakje, dan twee, dan drie. Je streak is wat je uitdeelt.',
  regels: [
    'Kijk goed welke vakjes oplichten.',
    'Tik de reeks daarna na, in dezelfde volgorde.',
    'Goed? Volgende ronde, en de reeks wordt één langer.',
    'Je streak is wat je aan het eind mag uitdelen: tien goed is tien slokken.',
  ],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['geheugen', 'reflex'],
  privescherm: false,

  init(ctx) {
    const s: GeheugenState = {
      ronde: 1,
      reeks: [],
      fase: 'kijken',
      klok: null,
      invoer: {},
      klaarDezeRonde: [],
      af: [],
      streak: {},
      gegeven: [],
      klaar: false,
    }
    for (const p of ctx.spelers) s.streak[p.uid] = 0
    startRonde(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    /* ── De reeks is afgespeeld: nu natikken ── */
    if (s.fase === 'kijken' && actie.type === 'gezien') {
      s.fase = 'tikken'
      s.klok = startKlok(
        (TIK_MS_EXTRA + s.reeks.length * TIK_MS_PER_VAKJE) / 1000,
        ctx.nu,
      )
      return
    }

    if (s.fase === 'tikken' && actie.type === 'tik') {
      if (s.af.includes(actie.uid)) return
      if (s.klaarDezeRonde.includes(actie.uid)) return

      const vakje = actie.payload?.vakje
      if (typeof vakje !== 'number' || !Number.isInteger(vakje)) return
      if (vakje < 0 || vakje >= VAKJES) return

      const tot = s.invoer[actie.uid] ?? 0
      if (s.reeks[tot] !== vakje) {
        /*
         * Mis. Hij gaat er nu uit en niet pas aan het eind van de ronde, zodat
         * hij meteen ziet dat het voorbij is in plaats van te blijven tikken
         * op een reeks die toch niet meer goed kan komen.
         */
        s.af.push(actie.uid)
        delete s.invoer[actie.uid]
      } else {
        s.invoer[actie.uid] = tot + 1
        if (tot + 1 >= s.reeks.length) s.klaarDezeRonde.push(actie.uid)
      }

      // Iedereen die nog meedeed is klaar of ligt eruit? Dan sluiten we af.
      const over = actief(s, ctx)
      if (over.every((u) => s.klaarDezeRonde.includes(u))) sluitRonde(s, ctx)
      return
    }

    /* ── De tijd is om ── */
    if (s.fase === 'tikken' && actie.type === 'tijdOp') {
      sluitRonde(s, ctx)
      return
    }

    /* ── Naar de volgende ronde ── */
    if (s.fase === 'ronde' && actie.type === 'verder') {
      s.ronde++
      startRonde(s, ctx)
      return
    }

    /* ── Aan het eind deelt iedereen zijn streak uit ── */
    if (s.fase === 'einde' && actie.type === 'geef') {
      const mijn = s.streak[actie.uid] ?? 0
      if (mijn <= 0) return
      if (s.gegeven.includes(actie.uid)) return
      const naar = String(actie.payload?.naar ?? '')
      if (!iedereen.includes(naar) || naar === actie.uid) return

      s.gegeven.push(actie.uid)
      ctx.deelUit(actie.uid, naar, mijn, `had ${mijn} op een rij`)
      return
    }

    if (s.fase === 'einde' && actie.type === 'klaar') {
      s.klaar = true
      ctx.klaar()
      return
    }
  },

  isKlaar: (s) => s.klaar,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

function Scherm({ s, ctx }: { s: GeheugenState; ctx: KijkContext }) {
  // Twee klokken die de host doorzet: het einde van de reeks en het einde van
  // de tikfase. Precies één telefoon stuurt die, anders komen ze acht keer aan.
  useHostKlok(ctx, s.fase === 'kijken', s.klok?.eind ?? 0, 'gezien')
  useHostKlok(ctx, s.fase === 'tikken', s.klok?.eind ?? 0, 'tijdOp')

  const ikAf = s.af.includes(ctx.ik)
  const mijnStreak = s.streak[ctx.ik] ?? 0

  if (s.fase === 'einde') return <Einde s={s} ctx={ctx} />

  /*
   * Welk vakje licht nu op? Dat komt uit de gedeelde klok: de voortgang
   * vertelt hoe ver de reeks is, dus elke telefoon komt op hetzelfde vakje uit
   * zonder dat er iets wordt rondgestuurd.
   */
  let licht = -1
  if (s.fase === 'kijken' && s.klok) {
    const totaal = AANLOOP_MS + s.reeks.length * STAP_MS
    const verstreken = voortgang(s.klok, ctx.nu) * totaal
    if (verstreken >= AANLOOP_MS) {
      const stap = Math.floor((verstreken - AANLOOP_MS) / STAP_MS)
      // De laatste 160ms van elke stap is donker, zodat twee keer hetzelfde
      // vakje achter elkaar als twee keer oplichten te zien is.
      const binnenStap = (verstreken - AANLOOP_MS) % STAP_MS
      if (stap < s.reeks.length && binnenStap < STAP_MS - 160) licht = s.reeks[stap]
    }
  }

  const tot = s.invoer[ctx.ik] ?? 0

  return (
    <>
      <div className="balk">
        <span className="kop-klein">
          Reeks van {s.ronde}
          {s.ronde >= MAX_RONDES ? ' · laatste' : ''}
        </span>
        <span className="kop-klein">
          {ikAf ? `je streak: ${mijnStreak}` : `${s.klaarDezeRonde.length}/${ctx.spelers.length - s.af.length}`}
        </span>
      </div>

      <div className="midden" style={{ gap: 10 }}>
        {s.fase === 'kijken' && <h2>Kijken…</h2>}
        {s.fase === 'tikken' && (
          <h2>
            {ikAf
              ? 'Je ligt eruit'
              : s.klaarDezeRonde.includes(ctx.ik)
                ? 'Goed! Wachten op de rest…'
                : `Tik hem na · ${tot}/${s.reeks.length}`}
          </h2>
        )}
        {s.fase === 'ronde' && (
          <h2>{ikAf ? `Je bleef op ${mijnStreak}` : `${s.ronde} op een rij`}</h2>
        )}

        <div className="vakjes">
          {Array.from({ length: VAKJES }, (_, i) => {
            const kanTikken = s.fase === 'tikken' && !ikAf && !s.klaarDezeRonde.includes(ctx.ik)
            return (
              <button
                key={i}
                className={`vakje v${i} ${licht === i ? 'aan' : ''}`}
                disabled={!kanTikken}
                aria-label={`Vakje ${i + 1}`}
                onClick={() => {
                  if (!kanTikken) return
                  tril(6)
                  ctx.stuur('tik', { vakje: i })
                }}
              />
            )
          })}
        </div>

        {s.klok && s.fase === 'tikken' && (
          <>
            <Balkje waarde={1 - voortgang(s.klok, ctx.nu)} />
            <div className="klein zacht">{resterendSec(s.klok, ctx.nu)} seconden</div>
          </>
        )}

        <SpelerBalk spelers={ctx.spelers} actief={s.klaarDezeRonde} />
      </div>

      {s.fase === 'ronde' && (
        <div className="onderaan">
          {ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
              Volgende reeks
            </GroteKnop>
          ) : (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">Wachten op de host…</span>
            </Kaartje>
          )}
        </div>
      )}
    </>
  )
}

function Einde({ s, ctx }: { s: GeheugenState; ctx: KijkContext }) {
  const mijn = s.streak[ctx.ik] ?? 0
  const magGeven = mijn > 0 && !s.gegeven.includes(ctx.ik)
  const rij = ctx.spelers
    .map((p) => ({ p, n: s.streak[p.uid] ?? 0 }))
    .sort((a, b) => b.n - a.n)

  return (
    <>
      <div className="balk">
        <span className="kop-klein">Afgelopen</span>
        <span className="kop-klein">langste reeks wint</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {rij.map(({ p, n }, i) => (
          <div
            key={p.uid}
            className="kaartje balk"
            style={{ borderColor: i === 0 && n > 0 ? 'var(--goud)' : undefined }}
          >
            <span>
              {p.emoji} <strong>{p.naam}</strong>
              {s.gegeven.includes(p.uid) && <span className="klein zacht"> · uitgedeeld</span>}
            </span>
            <span className="klein">
              {n === 0 ? 'niets' : `${n} op een rij`}
            </span>
          </div>
        ))}
      </div>

      <div className="onderaan">
        {magGeven ? (
          <>
            <div className="kop-klein" style={{ textAlign: 'center' }}>
              Je deelt {ctx.slok(mijn)} uit — aan wie?
            </div>
            <div className="rij" style={{ flexWrap: 'wrap', gap: 6 }}>
              {ctx.spelers
                .filter((p) => p.uid !== ctx.ik)
                .map((p) => (
                  <button
                    key={p.uid}
                    className="knop klein"
                    onClick={() => {
                      tril(8)
                      ctx.stuur('geef', { naar: p.uid })
                    }}
                  >
                    {p.emoji} {p.naam}
                  </button>
                ))}
            </div>
          </>
        ) : ctx.benIkHost ? (
          <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('klaar')}>
            Klaar
          </GroteKnop>
        ) : (
          <Kaartje style={{ textAlign: 'center' }}>
            <span className="zacht">
              {mijn > 0 ? 'Je hebt uitgedeeld.' : 'Niets om uit te delen.'}
            </span>
          </Kaartje>
        )}
      </div>
    </>
  )
}

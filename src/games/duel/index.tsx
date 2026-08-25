import { husselen, tussen } from '../../engine/random'
import { useHostKlok } from '../../engine/hooks'
import { startKlok, type Klok } from '../../engine/timer'
import type { Actie, GameModule, KijkContext, SpelContext } from '../../engine/types'
import { GroteKnop, Kaartje, tril } from '../../ui/Basis'
import { Verdeler } from '../../ui/Verdeler'

/* ─────────────────────────────────────────────────────────────
   DUEL

   Twee spelers tegenover elkaar. Het scherm staat rood, wordt op een
   willekeurig moment groen, en wie het eerst tikt wint. De verliezer drinkt
   en ligt eruit.

   Zo door tot er één overblijft, die mag uitdelen. Wie meteen als eerste
   sneuvelt heeft de hele avond nog om het goed te maken.

   Het groene moment staat als tijdstip in de spelstand, niet als signaal over
   het netwerk. Anders zou het bij de een een tiende eerder aankomen dan bij
   de ander, en dat is precies het verschil waar het hier om gaat.
   ───────────────────────────────────────────────────────────── */

const MIN_WACHT = 1800
const MAX_WACHT = 6000
const STRAF = 2
const WINST_UITDELEN = 5

interface DuelState {
  /** wie er nog in het toernooi zitten */
  over: string[]
  paar: [string, string] | null
  groenOp: number
  tikken: Record<string, number>
  klok: Klok | null
  fase: 'duel' | 'uitkomst' | 'klaar'
  laatste: { winnaar: string; verliezer: string; tijden: Record<string, number> } | null
  magUitdelen: boolean
  afgelopen: boolean
}

function nieuwDuel(s: DuelState, ctx: SpelContext) {
  if (s.over.length < 2) {
    s.fase = 'klaar'
    s.magUitdelen = s.over.length === 1
    return
  }
  const geschud = husselen(ctx.rng, s.over)
  s.paar = [geschud[0], geschud[1]]
  s.groenOp = ctx.nu + tussen(ctx.rng, MIN_WACHT, MAX_WACHT)
  s.tikken = {}
  s.klok = startKlok(12, ctx.nu)
  s.fase = 'duel'
}

function duelAf(s: DuelState, ctx: SpelContext) {
  const [a, b] = s.paar!
  const straf = (uid: string) => {
    const t = s.tikken[uid]
    if (t === undefined) return Number.MAX_SAFE_INTEGER
    return t < s.groenOp ? 1_000_000 - t : t
  }

  const winnaar = straf(a) <= straf(b) ? a : b
  const verliezer = winnaar === a ? b : a

  const teVroeg = (s.tikken[verliezer] ?? 0) < s.groenOp && s.tikken[verliezer] !== undefined
  ctx.drink(verliezer, STRAF, teVroeg ? 'tikte te vroeg' : `verloor van ${ctx.naam(winnaar)}`)

  s.laatste = { winnaar, verliezer, tijden: { ...s.tikken } }
  s.over = s.over.filter((u) => u !== verliezer)
  s.fase = 'uitkomst'
  s.klok = null
}

export const duel: GameModule<DuelState> = {
  id: 'duel',
  naam: 'Duel',
  uitleg: 'Eén tegen één op reflex. Verliezer drinkt en ligt eruit.',
  regels: [
    'Twee spelers, scherm op rood.',
    'Zodra het groen wordt: zo snel mogelijk tikken.',
    'Te vroeg tikken telt als verlies.',
    'Verliezer drinkt en ligt eruit. Laatste deelt uit.',
  ],
  minSpelers: 3,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['reflex', 'chaos'],
  privescherm: false,

  init(ctx) {
    const s: DuelState = {
      over: ctx.spelers.map((p) => p.uid),
      paar: null,
      groenOp: 0,
      tikken: {},
      klok: null,
      fase: 'duel',
      laatste: null,
      magUitdelen: false,
      afgelopen: false,
    }
    nieuwDuel(s, ctx)
    return s
  },

  reduce(s, actie: Actie, ctx) {
    const iedereen = ctx.spelers.map((p) => p.uid)

    if (s.fase === 'duel') {
      if (actie.type === 'tik') {
        if (!s.paar?.includes(actie.uid)) return
        if (s.tikken[actie.uid] !== undefined) return
        s.tikken[actie.uid] = actie.ts
        if (s.paar.every((u) => s.tikken[u] !== undefined)) duelAf(s, ctx)
        return
      }
      if (actie.type === 'tijd-op') {
        duelAf(s, ctx)
        return
      }
      return
    }

    if (s.fase === 'uitkomst' && actie.type === 'verder') {
      nieuwDuel(s, ctx)
      return
    }

    if (s.fase === 'klaar') {
      if (actie.type === 'geef' && s.magUitdelen && actie.uid === s.over[0]) {
        const verdeling: Record<string, number> = actie.payload?.verdeling
        if (!verdeling || typeof verdeling !== 'object') return
        for (const [uid, aantal] of Object.entries(verdeling)) {
          if (!iedereen.includes(uid) || uid === actie.uid) continue
          ctx.deelUitPrecies(actie.uid, uid, aantal, 'won het toernooi')
        }
        s.magUitdelen = false
        return
      }
      if (actie.type === 'einde') {
        s.afgelopen = true
        ctx.klaar()
        return
      }
    }
  },

  isKlaar: (s) => s.afgelopen,

  View({ state: s, ctx }) {
    return <Scherm s={s} ctx={ctx} />
  },
}

function Scherm({ s, ctx }: { s: DuelState; ctx: KijkContext }) {
  useHostKlok(ctx, s.fase === 'duel', s.klok?.eind ?? 0, 'tijd-op')

  if (s.fase === 'klaar') {
    const winnaar = s.over[0]
    const magUitdelen = s.magUitdelen && winnaar === ctx.ik
    return (
      <>
        <div className="midden" style={{ gap: 10 }}>
          <div style={{ fontSize: 60 }}>🏆</div>
          <h1>{ctx.naam(winnaar)} wint</h1>
          <div className="zacht klein">de snelste vinger van de avond</div>
        </div>
        <div className="onderaan">
          {magUitdelen ? (
            <Verdeler
              totaal={ctx.slokAantal(WINST_UITDELEN)}
              ctx={ctx}
              titel="Toernooi gewonnen — deel uit"
              bijKlaar={(verdeling) => ctx.stuur('geef', { verdeling })}
            />
          ) : s.magUitdelen ? (
            <Kaartje style={{ textAlign: 'center' }}>
              <span className="zacht">{ctx.naam(winnaar)} deelt uit…</span>
            </Kaartje>
          ) : ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('einde')}>
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

  if (s.fase === 'uitkomst' && s.laatste) {
    const l = s.laatste
    return (
      <>
        <div className="midden" style={{ gap: 10 }}>
          <div style={{ fontSize: 54 }}>⚡</div>
          <h1>{ctx.naam(l.winnaar)} wint</h1>
          <div style={{ display: 'grid', gap: 6, width: '100%' }}>
            {Object.entries(l.tijden).map(([uid, t]) => {
              const teVroeg = t < s.groenOp
              return (
                <div key={uid} className="kaartje balk" style={{ padding: 8 }}>
                  <span>
                    {ctx.speler(uid)?.emoji} <strong>{ctx.naam(uid)}</strong>
                  </span>
                  <span className="klein">
                    {teVroeg ? 'te vroeg' : `${Math.round(t - s.groenOp)} ms`}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="klein zacht">
            {ctx.naam(l.verliezer)} ligt eruit · nog {s.over.length} over
          </div>
        </div>
        <div className="onderaan">
          {ctx.benIkHost ? (
            <GroteKnop kleur="goud" enorm bijTik={() => ctx.stuur('verder')}>
              {s.over.length > 1 ? 'Volgend duel' : 'Naar de finale-uitslag'}
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

  const [a, b] = s.paar ?? ['', '']
  const ikDoeMee = s.paar?.includes(ctx.ik) ?? false
  const groen = ctx.nu >= s.groenOp
  const ikGetikt = s.tikken[ctx.ik] !== undefined

  return (
    <>
      <div className="balk">
        <span className="kop-klein">Nog {s.over.length} over</span>
        <span className="kop-klein">verliezer drinkt {ctx.slokKort(STRAF)}</span>
      </div>

      <Kaartje style={{ textAlign: 'center' }}>
        <h2>
          {ctx.speler(a)?.emoji} {ctx.naam(a)} <span className="zacht">vs</span>{' '}
          {ctx.naam(b)} {ctx.speler(b)?.emoji}
        </h2>
      </Kaartje>

      {ikDoeMee ? (
        <button
          onClick={() => {
            if (ikGetikt) return
            tril(groen ? 15 : [40, 30, 40])
            ctx.stuur('tik')
          }}
          disabled={ikGetikt}
          style={{
            flex: 1,
            borderRadius: 'var(--straal)',
            background: ikGetikt ? 'var(--vlak)' : groen ? 'var(--groen)' : 'var(--rood-donker)',
            color: groen && !ikGetikt ? '#05230f' : 'var(--tekst)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {ikGetikt ? (
            <>
              <div className="reusachtig" style={{ fontSize: 'clamp(34px,12vw,64px)' }}>
                {s.tikken[ctx.ik] < s.groenOp ? 'TE VROEG' : `${Math.round(s.tikken[ctx.ik] - s.groenOp)} ms`}
              </div>
              <div className="zacht">wachten op je tegenstander…</div>
            </>
          ) : groen ? (
            <div className="reusachtig">TIK!</div>
          ) : (
            <>
              <div style={{ fontSize: 56 }}>✋</div>
              <h2>Wacht…</h2>
            </>
          )}
        </button>
      ) : (
        <div className="midden">
          <div style={{ fontSize: 54 }}>👀</div>
          <h2 className="zacht">Kijken wie er wint</h2>
          <div className="klein zacht">
            {Object.keys(s.tikken).length} van 2 getikt
          </div>
        </div>
      )}
    </>
  )
}

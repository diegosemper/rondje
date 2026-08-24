import type { Kamer } from '../engine/types'
import { eenheid } from '../engine/slokken'
import { naarFase } from '../net/hostLoop'
import { GroteKnop, Kaartje } from '../ui/Basis'

export function Scorebord({ kamer, uid }: { kamer: Kamer; uid: string }) {
  const benHost = kamer.meta.hostUid === uid
  const zwaarte = kamer.instelling.zwaarte

  const rijen = kamer.volgorde
    .map((u) => kamer.spelers[u])
    .filter(Boolean)
    .map((s) => ({
      s,
      gedronken: kamer.score[s.uid]?.gedronken ?? 0,
      uitgedeeld: kamer.score[s.uid]?.uitgedeeld ?? 0,
    }))

  const opGedronken = [...rijen].sort((a, b) => b.gedronken - a.gedronken)
  const opUitgedeeld = [...rijen].sort((a, b) => b.uitgedeeld - a.uitgedeeld)
  const beul = opUitgedeeld[0]

  return (
    <div className="scherm">
      <h1>Eindstand</h1>
      <div className="zacht klein">
        {kamer.geschiedenis.length} {kamer.geschiedenis.length === 1 ? 'spel' : 'spellen'} gespeeld
      </div>

      <div style={{ display: 'grid', gap: 8, flex: 1, alignContent: 'start' }}>
        {opGedronken.map((r, i) => (
          <div
            key={r.s.uid}
            className="kaartje balk"
            style={{
              borderColor: i === 0 ? 'var(--goud)' : undefined,
              background: i === 0 ? 'var(--goud-donker)' : undefined,
            }}
          >
            <span>
              <span style={{ fontSize: 22 }}>{r.s.emoji}</span> <strong>{r.s.naam}</strong>
              {r.uitgedeeld > 0 && (
                <>
                  <br />
                  <span className="klein zacht">{r.uitgedeeld} uitgedeeld</span>
                </>
              )}
            </span>
            <span style={{ fontSize: 30, fontWeight: 800 }}>{r.gedronken}</span>
          </div>
        ))}
      </div>

      {beul && beul.uitgedeeld > 0 && (
        <Kaartje style={{ textAlign: 'center' }}>
          <div className="kop-klein">Grootste beul van de avond</div>
          <h2>
            {beul.s.emoji} {beul.s.naam}
          </h2>
          <div className="zacht klein">
            {beul.uitgedeeld} {eenheid(zwaarte)} uitgedeeld
          </div>
        </Kaartje>
      )}

      {benHost && (
        <div className="onderaan">
          <GroteKnop kleur="goud" bijTik={() => naarFase(kamer.meta.code, 'kiezen')}>
            Nog een spel
          </GroteKnop>
          <GroteKnop kleur="leeg" klein bijTik={() => naarFase(kamer.meta.code, 'lobby')}>
            Terug naar de lobby
          </GroteKnop>
        </div>
      )}
    </div>
  )
}

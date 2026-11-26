import type { Kamer } from '../engine/types'
import { geefPowerup } from '../engine/powerups'
import { geefSpel, spelEmoji } from '../engine/registry'
import { onthul } from '../net/hostLoop'
import { kiesDoel, kiesInzet } from '../net/kamer'
import { GroteKnop, Kaartje } from '../ui/Basis'
import { PowerupKaart } from '../ui/Powerup'
import { meldFout } from '../ui/Fout'

/**
 * De inzetronde: zet je je sterke powerup in voor het spel dat komt?
 *
 * WAAROM DIT EEN APART SCHERM IS. Een sterke powerup is alleen spannend als je
 * blind kiest. Wist je dat het volgende spel Perudo is, dan weet je ook precies
 * wanneer Omkering goud is en wanneer hij niets doet. Dus: eerst kiezen, dan
 * het spel. Koos de host zelf een spel, dan staat het er wel bij -- dan is het
 * toch al niet geheim.
 *
 * Een inzet die niets kon doen krijg je na het spel terug; zie stopSpel.
 */
export function Inzet({ kamer, uid }: { kamer: Kamer; uid: string }) {
  const benHost = kamer.meta.hostUid === uid
  const spelers = kamer.volgorde.map((u) => kamer.spelers[u]).filter(Boolean)
  const anderen = spelers.filter((s) => s.uid !== uid)

  const id = kamer.powerups.kaarten[uid] ?? ''
  const p = geefPowerup(id)
  const over = kamer.powerups.inzetten[uid] ?? 0
  const magKiezen = !!p && p.sterk && over > 0

  const alGekozen = kamer.powerups.gereed.includes(uid)
  const ingezet = kamer.powerups.actief.includes(uid)
  const doelUid = kamer.powerups.doelwit[uid]
  // Is er niemand om op te richten, dan houdt dat de knop niet tegen.
  const doelNodig = !!p?.doelwit && !doelUid && anderen.length > 0

  const spel = kamer.powerups.wacht ? geefSpel(kamer.powerups.wacht) : null

  /** Wie moet er nog beslissen? Mensen die weggevallen zijn houden niets op. */
  const wachtOp = spelers.filter((s) => {
    if (!s.online || spelers.length < 2) return false
    if (kamer.powerups.gereed.includes(s.uid)) return false
    const kaart = geefPowerup(kamer.powerups.kaarten[s.uid] ?? '')
    return !!kaart?.sterk && (kamer.powerups.inzetten[s.uid] ?? 0) > 0
  })

  return (
    <div className="scherm">
      <h1>{spel ? spel.naam : 'Welk spel?'}</h1>

      <Kaartje style={{ textAlign: 'center' }}>
        {spel ? (
          <>
            <div className="reusachtig">{spelEmoji(spel.id)}</div>
            <div className="klein zacht">{spel.uitleg}</div>
          </>
        ) : (
          <>
            <div className="reusachtig">🎲</div>
            <strong>Nog niet bekend.</strong>
            <div className="klein zacht">
              Beslis eerst over je powerup. Daarna rolt de steen.
            </div>
          </>
        )}
      </Kaartje>

      {magKiezen ? (
        <>
          <PowerupKaart
            id={id}
            doel={doelUid ? kamer.spelers[doelUid]?.naam : undefined}
            gedimd={alGekozen && !ingezet}
          />

          {p?.doelwit && !ingezet && (
            <>
              <div className="kop-klein">Op wie?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {anderen.map((s) => (
                  <GroteKnop
                    key={s.uid}
                    kleur={doelUid === s.uid ? 'goud' : 'leeg'}
                    klein
                    bijTik={() => {
                      kiesDoel(kamer.meta.code, uid, s.uid).catch(meldFout)
                    }}
                  >
                    {s.emoji} {s.naam}
                  </GroteKnop>
                ))}
              </div>
            </>
          )}

          <div style={{ flex: 1 }} />

          {alGekozen ? (
            <Kaartje
              style={{ textAlign: 'center', borderColor: ingezet ? 'var(--paars)' : 'var(--rand)' }}
            >
              <strong>{ingezet ? 'Ingezet!' : 'Je houdt hem nog even.'}</strong>
              <div className="klein zacht">
                {ingezet
                  ? 'Hij werkt dit hele spel.'
                  : `Je hebt er nog ${over} om in te zetten.`}
              </div>
              <GroteKnop
                kleur="leeg"
                klein
                bijTik={() => {
                  kiesInzet(kamer.meta.code, uid, !ingezet).catch(meldFout)
                }}
              >
                Toch {ingezet ? 'niet' : 'wel'}
              </GroteKnop>
            </Kaartje>
          ) : (
            <div className="rij">
              <GroteKnop
                kleur="leeg"
                bijTik={() => {
                  kiesInzet(kamer.meta.code, uid, false).catch(meldFout)
                }}
              >
                Bewaren
              </GroteKnop>
              <GroteKnop
                kleur="goud"
                uit={doelNodig}
                bijTik={() => {
                  kiesInzet(kamer.meta.code, uid, true).catch(meldFout)
                }}
              >
                {doelNodig ? 'Kies eerst' : 'Inzetten'}
              </GroteKnop>
            </div>
          )}
        </>
      ) : (
        <>
          <Kaartje>
            <strong>Jij hoeft niets te kiezen.</strong>
            <div className="klein zacht">
              {!p
                ? 'Je hebt deze ronde geen kaart.'
                : !p.sterk
                  ? 'Een kleine kaart werkt vanzelf.'
                  : 'Je inzetten zijn op; de volgende trekronde krijg je weer een nieuwe kaart.'}
            </div>
          </Kaartje>
          <div style={{ flex: 1 }} />
        </>
      )}

      {wachtOp.length > 0 && (
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          Wachten op {wachtOp.map((s) => s.naam).join(', ')}…
        </div>
      )}

      {benHost ? (
        <GroteKnop
          kleur="goud"
          enorm
          uit={wachtOp.length > 0}
          bijTik={() => onthul(kamer).catch(meldFout)}
        >
          {wachtOp.length > 0 ? 'Nog niet iedereen heeft gekozen' : spel ? 'Beginnen' : '🎲 Onthul het spel'}
        </GroteKnop>
      ) : (
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          {wachtOp.length > 0 ? 'Beslis over je powerup.' : 'De host begint zo…'}
        </div>
      )}
    </div>
  )
}

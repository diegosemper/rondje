import type { Kamer } from '../engine/types'
import { CYCLUS, geefPowerup } from '../engine/powerups'
import { naarFase } from '../net/hostLoop'
import { kiesDoel } from '../net/kamer'
import { GroteKnop, Kaartje } from '../ui/Basis'
import { PowerupKaart } from '../ui/Powerup'
import { meldFout } from '../ui/Fout'

/**
 * Het trekscherm: iedereen krijgt een kaart te zien.
 *
 * Alleen je eigen kaart staat in beeld. Van de anderen zie je of ze al klaar
 * zijn, niet wat ze hebben -- anders valt er niets meer te bluffen en weet je
 * precies wanneer het slim is om iemand slokken te geven.
 *
 * Een kleine kaart die om een doelwit vraagt kies je hier, want die geldt de
 * hele cyclus. Een sterke kaart kiest zijn doelwit later, op het moment dat je
 * hem inzet.
 */
export function Powerups({ kamer, uid }: { kamer: Kamer; uid: string }) {
  const benHost = kamer.meta.hostUid === uid
  const spelers = kamer.volgorde.map((u) => kamer.spelers[u]).filter(Boolean)
  const anderen = spelers.filter((s) => s.uid !== uid)

  const id = kamer.powerups.kaarten[uid] ?? ''
  const p = geefPowerup(id)
  const doelUid = kamer.powerups.doelwit[uid]

  /**
   * Wie moet er nog een doelwit aanwijzen?
   *
   * Wie weggevallen is houdt niets op, en is er maar één speler over dan valt
   * er niets te richten -- anders kwam de host niet meer verder.
   */
  const wachtOp = spelers.filter((s) => {
    if (!s.online || spelers.length < 2) return false
    const kaart = geefPowerup(kamer.powerups.kaarten[s.uid] ?? '')
    if (!kaart || kaart.sterk || !kaart.doelwit) return false
    return !kamer.powerups.doelwit[s.uid]
  })

  // Een kleine kaart met een doelwit richt je hier; een sterke doet dat pas op
  // het moment dat je hem inzet.
  const kiest = !!p && !p.sterk && !!p.doelwit
  const klaarOmTeGaan = wachtOp.length === 0

  return (
    <div className="scherm">
      <h1>Jouw powerup</h1>
      <div className="klein zacht" style={{ marginTop: -8, marginBottom: 4 }}>
        Deze kaart gaat {CYCLUS} spellen mee. Alleen jij ziet hem.
      </div>

      {p ? (
        <PowerupKaart
          id={id}
          doel={doelUid ? kamer.spelers[doelUid]?.naam : undefined}
        />
      ) : (
        <Kaartje>
          <strong>Je hebt deze ronde geen kaart.</strong>
          <div className="klein zacht">Je kwam er net bij; de volgende ronde doe je mee.</div>
        </Kaartje>
      )}

      {p && !p.sterk && (
        <div className="klein zacht">
          Een kleine kaart werkt vanzelf, in elk spel van deze cyclus.
        </div>
      )}
      {p && p.sterk && (
        <div className="klein" style={{ color: 'var(--paars)' }}>
          Een sterke kaart zet je zelf in, hoogstens één keer per spel. Je beslist voordat
          je weet welk spel er komt.
        </div>
      )}

      {kiest && (
        <>
          <h2 style={{ marginBottom: 0 }}>Op wie richt je hem?</h2>
          <div className="klein zacht">
            Zolang de host nog niet verder is, kun je iemand anders aantikken.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {anderen.map((s) => (
              <GroteKnop
                key={s.uid}
                kleur={doelUid === s.uid ? 'goud' : 'leeg'}
                bijTik={() => kiesDoel(kamer.meta.code, uid, s.uid).catch(meldFout)}
              >
                {s.emoji} {s.naam}
              </GroteKnop>
            ))}
            {anderen.length === 0 && (
              <div className="klein zacht">Er is niemand anders om op te richten.</div>
            )}
          </div>
        </>
      )}

      <div style={{ flex: 1 }} />

      {wachtOp.length > 0 && (
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          Wachten op {wachtOp.map((s) => s.naam).join(', ')}…
        </div>
      )}

      {benHost ? (
        <GroteKnop
          kleur="goud"
          enorm
          uit={!klaarOmTeGaan}
          bijTik={() => naarFase(kamer.meta.code, 'kiezen').catch(meldFout)}
        >
          {klaarOmTeGaan ? 'Door naar het spel' : 'Nog niet iedereen is klaar'}
        </GroteKnop>
      ) : (
        <div className="klein zacht" style={{ textAlign: 'center' }}>
          {klaarOmTeGaan ? 'De host gaat verder…' : 'Kies je doelwit.'}
        </div>
      )}
    </div>
  )
}

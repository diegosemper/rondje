import { useState } from 'react'
import type { Kamer } from '../engine/types'
import { geefPowerup, werkzaam } from '../engine/powerups'
import { powerupsAan } from '../net/hostLoop'
import { Kaartje } from './Basis'

/**
 * De kaart zelf, groot in beeld.
 *
 * Eén vorm voor alle schermen: het trekscherm, de inzetvraag en het balkje dat
 * tijdens het spel meeloopt. Zo ziet je kaart er overal hetzelfde uit en hoef
 * je hem maar één keer te leren kennen.
 */
export function PowerupKaart({
  id,
  doel,
  gedimd,
  klein,
}: {
  id: string
  /** de naam van de speler op wie hij gericht staat */
  doel?: string
  /** hij doet dit spel niets -- grijs */
  gedimd?: boolean
  klein?: boolean
}) {
  const p = geefPowerup(id)
  if (!p) return null

  return (
    <Kaartje
      style={{
        borderColor: gedimd ? 'var(--rand)' : p.sterk ? 'var(--paars)' : 'var(--goud)',
        opacity: gedimd ? 0.5 : 1,
        padding: klein ? 10 : 14,
      }}
    >
      <div className="balk">
        <strong style={{ fontSize: klein ? 17 : 21 }}>
          <span style={{ fontSize: klein ? 20 : 26, marginRight: 6 }}>{p.teken}</span>
          {p.naam}
        </strong>
        <span
          className="klein"
          style={{ color: p.sterk ? 'var(--paars)' : 'var(--goud)', whiteSpace: 'nowrap' }}
        >
          {p.sterk ? 'sterk' : 'klein'}
        </span>
      </div>
      <div className="klein zacht" style={{ marginTop: 4 }}>
        {p.uitleg}
      </div>
      {doel && (
        <div className="klein" style={{ marginTop: 4, color: 'var(--goud)' }}>
          🎯 gericht op {doel}
        </div>
      )}
    </Kaartje>
  )
}

/**
 * Jouw kaart als knoopje, voor tijdens het spel.
 *
 * Tijdens een spel is het scherm van het spel zelf, dus staat er alleen een
 * teken met een naam. Tik erop en de hele kaart klapt uit -- want halverwege
 * Perudo weet niemand nog precies wat Kaatsmuur deed.
 */
export function PowerupChip({ kamer, uid }: { kamer: Kamer; uid: string }) {
  const [open, zetOpen] = useState(false)

  if (!powerupsAan(kamer)) return null
  const id = kamer.powerups.kaarten[uid]
  const p = id ? geefPowerup(id) : undefined
  if (!p) return null

  const actief = werkzaam(kamer.powerups, uid) !== null
  const doelUid = kamer.powerups.doelwit[uid]
  const doel = doelUid ? kamer.spelers[doelUid]?.naam : undefined

  return (
    <>
      <button
        className={`knop klein ${actief ? 'goud' : 'leeg'}`}
        onClick={() => zetOpen(!open)}
        style={{ whiteSpace: 'nowrap' }}
      >
        {p.teken} {p.naam}
      </button>
      {open && (
        <div
          style={{
            // Vast aan het venster: de balk waar dit knoopje in staat is smal,
            // en de kaart moet over de breedte van het scherm passen.
            position: 'fixed',
            left: 12,
            right: 12,
            top: 'calc(var(--veilig-boven) + 56px)',
            zIndex: 20,
          }}
          onClick={() => zetOpen(false)}
        >
          <PowerupKaart id={id} doel={doel} gedimd={!actief} klein />
        </div>
      )}
    </>
  )
}

/**
 * Jouw kaart, klein, onder aan een scherm waar je toch al staat.
 *
 * Staat op de spelkiezer, het uitlegscherm en tijdens het spel. Niemand onthoudt
 * drie spellen lang wat er op zijn kaart stond, en zonder dit zit je halverwege
 * Perudo te raden waarom je ineens niets hoeft te drinken.
 */
export function MijnPowerup({ kamer, uid }: { kamer: Kamer; uid: string }) {
  if (!powerupsAan(kamer)) return null

  const id = kamer.powerups.kaarten[uid]
  if (!id) return null

  const p = geefPowerup(id)
  if (!p) return null

  const doelUid = kamer.powerups.doelwit[uid]
  const doel = doelUid ? kamer.spelers[doelUid]?.naam : undefined

  /*
   * Een sterke kaart die je niet hebt ingezet doet nu niets, en een kaart
   * waar iemand een veto op gelegd heeft ook niet. Dat hoort te zien te zijn:
   * anders zit je te wachten op een effect dat niet komt.
   */
  const actief = werkzaam(kamer.powerups, uid) !== null
  const overIngezet = kamer.powerups.inzetten[uid] ?? 0

  return (
    <div style={{ marginTop: 8 }}>
      <PowerupKaart id={id} doel={doel} gedimd={!actief} klein />
      {p.sterk && (
        <div className="klein zacht" style={{ textAlign: 'center', marginTop: 4 }}>
          {actief
            ? 'ingezet voor dit spel'
            : overIngezet > 0
              ? `nog ${overIngezet}× in te zetten`
              : 'opgebruikt'}
        </div>
      )}
    </div>
  )
}

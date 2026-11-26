import { useState } from 'react'
import type { Kamer, Zwaarte } from '../engine/types'
import { pastBijGroep, spelEmoji, SPELLEN } from '../engine/registry'
import { DEMOS } from '../games/demos'
import { Voorbeeld } from '../ui/Demo'
import { ZWAARTE_LABEL, ZWAARTE_UITLEG } from '../engine/slokken'
import { CYCLUS, MAX_SPELERS as POWERUP_MAX } from '../engine/powerups'
import {
  MAX_SPELERS,
  MIN_SPELERS,
  verlaatKamer,
  zetPowerups,
  zetSpellenUit,
  zetVerwacht,
  zetZwaarte,
} from '../net/kamer'
import { naarFase, powerupsMogelijk, trekPowerups } from '../net/hostLoop'
import { deelLink } from '../net/profiel'
import { tril } from '../ui/Basis'
import { Kroeg } from '../ui/Kroeg'
import { meldFout } from '../ui/Fout'

/* ─────────────────────────────────────────────────────────────
   De lobby, in dezelfde kroegstijl als het beginscherm.

   Het bord met de code staat bovenaan en is het grootste ding op het scherm,
   want dat is het enige wat je aan de anderen moet doorgeven.

   De instellingen zijn alleen voor de host. De rest ziet wel wát er staat
   ingesteld, maar krijgt geen knoppen die niets doen.
   ───────────────────────────────────────────────────────────── */

const ZWAARTES: Zwaarte[] = ['zacht', 'normaal', 'hard', 'droog']
const AANTALLEN = [2, 3, 4, 5, 6, 7, 8]

export function Lobby({
  kamer,
  uid,
  bijVertrek,
}: {
  kamer: Kamer
  uid: string
  bijVertrek: () => void
}) {
  const [toonSpellen, zetToonSpellen] = useState(false)
  // Welk spel staat als voorbeeld open? null is dicht.
  const [voorbeeld, zetVoorbeeld] = useState<string | null>(null)
  const [gedeeld, zetGedeeld] = useState(false)

  const code = kamer.meta.code
  const benHost = kamer.meta.hostUid === uid
  const spelers = kamer.volgorde.map((u) => kamer.spelers[u]).filter(Boolean)
  const genoeg = spelers.length >= MIN_SPELERS

  // Boven vier spelers kunnen ze niet; dan staat de schakelaar op slot.
  const teVeelVoorPowerups = spelers.length > POWERUP_MAX

  const uit = kamer.instelling.uit
  const isAan = (id: string) => !uit.includes(id)
  const passend = SPELLEN.filter(
    (s) => s.id !== 'testspel' && isAan(s.id) && pastBijGroep(s, kamer.instelling.verwacht),
  ).length

  /**
   * De avond beginnen.
   *
   * Staan de powerups aan, dan trekt iedereen eerst een kaart. Daarna komt het
   * kiezen van een spel; met de kaart in je hand, zodat je weet waar je aan
   * begint.
   */
  async function beginDeAvond() {
    if (powerupsMogelijk(kamer)) await trekPowerups(kamer)
    else await naarFase(code, 'kiezen')
  }

  async function deel() {
    const link = deelLink(code)
    const tekst = `Doe mee met DORST! — lobby ${code}\n${link}`
    try {
      if (navigator.share) await navigator.share({ title: 'DORST!', text: tekst, url: link })
      else {
        await navigator.clipboard.writeText(tekst)
        zetGedeeld(true)
        setTimeout(() => zetGedeeld(false), 2000)
      }
    } catch {
      /* gebruiker brak het delen af */
    }
  }

  function wisselSpel(id: string) {
    const nieuw = uit.includes(id) ? uit.filter((x) => x !== id) : [...uit, id]
    zetSpellenUit(code, nieuw).catch(meldFout)
  }

  return (
    <>
      <Kroeg />
      <div className="scherm" style={{ gap: 12 }}>
        {/* ── De code ── */}
        <div className="codebord">
          <div className="kroeg-kop">Lobbycode</div>
          <div className="cijfers">{code}</div>
        </div>

        <button className="plaat hout" onClick={deel}>
          {gedeeld ? '✓ Link gekopieerd' : '📤 Stuur de link'}
        </button>

        {/* ── Wie zitten erin ── */}
        <div className="plank">
          <div className="plank-kop">
            Aan tafel
            <small>
              {spelers.length} van {MAX_SPELERS}
            </small>
          </div>

          <div className="spelers-raster">
            {spelers.map((s) => (
              <div
                key={s.uid}
                className={[
                  'speler-tegel',
                  s.uid === kamer.meta.hostUid ? 'host' : '',
                  s.online ? '' : 'weg',
                ].join(' ')}
              >
                <span className="gezicht">{s.emoji}</span>
                <span className="naam">{s.naam}</span>
                {s.uid === kamer.meta.hostUid && <span title="host">👑</span>}
              </div>
            ))}
            {spelers.length < 2 && <div className="speler-tegel leeg">wacht op vrienden…</div>}
          </div>
        </div>

        {/* ── Instellingen ── */}
        {benHost ? (
          <>
            <div className="plank">
              <div className="plank-kop">
                Hoe zwaar?
                <small>{ZWAARTE_UITLEG[kamer.instelling.zwaarte]}</small>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {ZWAARTES.map((z) => (
                  <button
                    key={z}
                    className={`keuze ${kamer.instelling.zwaarte === z ? 'gekozen' : ''}`}
                    onClick={() => {
                      tril(8)
                      zetZwaarte(code, z).catch(meldFout)
                    }}
                  >
                    {ZWAARTE_LABEL[z]}
                  </button>
                ))}
              </div>
            </div>

            <div className="plank">
              <div className="plank-kop">
                Met hoeveel spelen jullie?
                <small>{passend} spellen beschikbaar</small>
              </div>
              <div className="munten">
                {AANTALLEN.map((n) => (
                  <button
                    key={n}
                    className={`munt ${n === kamer.instelling.verwacht ? 'gekozen' : ''}`}
                    onClick={() => {
                      tril(8)
                      zetVerwacht(code, n).catch(meldFout)
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="plank">
              <div className="plank-kop">
                Powerups
                <small>
                  {teVeelVoorPowerups
                    ? `kan niet boven ${POWERUP_MAX} spelers`
                    : `${CYCLUS} spellen per kaart`}
                </small>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[true, false].map((aan) => (
                  <button
                    key={String(aan)}
                    className={`keuze ${kamer.instelling.powerups === aan ? 'gekozen' : ''}`}
                    disabled={teVeelVoorPowerups}
                    onClick={() => {
                      tril(8)
                      zetPowerups(code, aan).catch(meldFout)
                    }}
                  >
                    {aan ? 'Aan' : 'Uit'}
                  </button>
                ))}
              </div>
              <div className="klein zacht" style={{ marginTop: 6 }}>
                Iedereen trekt een kaart die ingrijpt op wat je drinkt en uitdeelt. Alleen jij
                ziet welke kaart je hebt.
              </div>
            </div>

            <button className="plaat hout" onClick={() => zetToonSpellen(!toonSpellen)}>
              {toonSpellen ? 'Verberg de spellijst' : `Welke spellen? (${passend} aan)`}
            </button>

            {toonSpellen && (
              <div className="plank">
                {SPELLEN.map((s) => {
                  const aan = isAan(s.id)
                  const teWeinig = !pastBijGroep(s, kamer.instelling.verwacht)
                  const demo = DEMOS[s.id]
                  return (
                    <div
                      key={s.id}
                      className="rij spelrij-houder"
                      style={{ gap: 6, alignItems: 'stretch' }}
                    >
                      {/* Het ▶ staat los van de rij zelf: tik je ernaast, dan
                          vink je het spel aan of uit en ga je niet kijken. */}
                      {demo && (
                        <button
                          className="spel-play"
                          aria-label={`Voorbeeld van ${s.naam}`}
                          onClick={() => {
                            tril(6)
                            zetVoorbeeld(s.id)
                          }}
                        >
                          ▶
                        </button>
                      )}
                      <button
                        className="spelrij"
                        style={{ flex: 1, minWidth: 0, textAlign: 'left' }}
                        onClick={() => wisselSpel(s.id)}
                      >
                        <span className={aan && !teWeinig ? '' : 'uit'} style={{ minWidth: 0 }}>
                          <span className="spel-teken">{spelEmoji(s.id)}</span>{' '}
                          <strong>{s.naam}</strong>
                          {teWeinig && (
                            <span style={{ color: '#ffd166', fontSize: 12 }}>
                              {' '}
                              · vanaf {s.minSpelers}
                            </span>
                          )}
                          <br />
                          <span style={{ fontSize: 12, opacity: 0.7 }}>{s.uitleg}</span>
                        </span>
                        <span className={`vinkje ${aan ? 'aan' : ''}`}>✓</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <div className="plank">
            <div className="plank-kop">
              Instellingen
              <small>de host bepaalt dit</small>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div className="keuze gekozen" style={{ textAlign: 'center' }}>
                {ZWAARTE_LABEL[kamer.instelling.zwaarte]}
              </div>
              <div className="keuze gekozen" style={{ textAlign: 'center' }}>
                {kamer.instelling.verwacht} spelers
              </div>
            </div>
            <div className="klein zacht" style={{ marginTop: 6 }}>
              Powerups {powerupsMogelijk(kamer) ? 'aan' : 'uit'}
            </div>
          </div>
        )}

        {/* ── Beginnen ── */}
        <div className="onderaan" style={{ marginTop: 'auto' }}>
          {benHost ? (
            <button
              className="plaat"
              disabled={!genoeg}
              onClick={() => beginDeAvond().catch(meldFout)}
            >
              {genoeg
                ? '🍻 Begin de avond'
                : `Wacht op ${MIN_SPELERS - spelers.length} speler(s)`}
            </button>
          ) : (
            <div className="bordje" style={{ maxWidth: '100%', padding: '10px 14px' }}>
              Wachten tot de host begint…
            </div>
          )}

          <button
            className="plaat hout"
            style={{ minHeight: 46, fontSize: 14 }}
            onClick={() => {
              verlaatKamer(code, uid).catch(meldFout).finally(bijVertrek)
            }}
          >
            Verlaat lobby
          </button>
        </div>
      </div>

      {voorbeeld && DEMOS[voorbeeld] && (
        <Voorbeeld
          naam={SPELLEN.find((x) => x.id === voorbeeld)?.naam ?? ''}
          teken={spelEmoji(voorbeeld)}
          beelden={DEMOS[voorbeeld]}
          bijSluiten={() => zetVoorbeeld(null)}
        />
      )}
    </>
  )
}

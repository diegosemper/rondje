import { useState } from 'react'
import type { Kamer, Zwaarte } from '../engine/types'
import { pastBijGroep, SPELLEN } from '../engine/registry'
import { ZWAARTE_LABEL, ZWAARTE_UITLEG } from '../engine/slokken'
import {
  MAX_SPELERS,
  MIN_SPELERS,
  verlaatKamer,
  zetSpellenUit,
  zetVerwacht,
  zetZwaarte,
} from '../net/kamer'
import { naarFase } from '../net/hostLoop'
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
  const [gedeeld, zetGedeeld] = useState(false)

  const code = kamer.meta.code
  const benHost = kamer.meta.hostUid === uid
  const spelers = kamer.volgorde.map((u) => kamer.spelers[u]).filter(Boolean)
  const genoeg = spelers.length >= MIN_SPELERS

  const uit = kamer.instelling.uit
  const isAan = (id: string) => !uit.includes(id)
  const passend = SPELLEN.filter(
    (s) => s.id !== 'testspel' && isAan(s.id) && pastBijGroep(s, kamer.instelling.verwacht),
  ).length

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

            <button className="plaat hout" onClick={() => zetToonSpellen(!toonSpellen)}>
              {toonSpellen ? 'Verberg de spellijst' : `Welke spellen? (${passend} aan)`}
            </button>

            {toonSpellen && (
              <div className="plank">
                {SPELLEN.map((s) => {
                  const aan = isAan(s.id)
                  const teWeinig = !pastBijGroep(s, kamer.instelling.verwacht)
                  return (
                    <button
                      key={s.id}
                      className="spelrij"
                      style={{ width: '100%', textAlign: 'left' }}
                      onClick={() => wisselSpel(s.id)}
                    >
                      <span className={aan && !teWeinig ? '' : 'uit'} style={{ minWidth: 0 }}>
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
          </div>
        )}

        {/* ── Beginnen ── */}
        <div className="onderaan" style={{ marginTop: 'auto' }}>
          {benHost ? (
            <button
              className="plaat"
              disabled={!genoeg}
              onClick={() => naarFase(code, 'kiezen').catch(meldFout)}
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
    </>
  )
}

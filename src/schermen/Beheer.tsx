import { useEffect, useState } from 'react'
import { isIngesteld } from '../net/firebase'
import { useNu, useUid } from '../net/useKamer'
import type { Beheer as BeheerStand } from '../net/beheer'
import {
  DEUR_MS,
  meldJeAanAlsBeheerder,
  volgBeheer,
  volgBenIkBeheerder,
  volgDeur,
  volgIsErEenBeheerder,
  zetDeurDicht,
  zetDeurOpen,
  zetDicht,
} from '../net/beheer'
import { OPEN } from '../dicht'
import { GroteKnop, Kaartje } from '../ui/Basis'
import { Kroeg } from '../ui/Kroeg'
import { Setup } from './Setup'

/* -----------------------------------------------------------------
   HET BEHEERSCHERM

   Te bereiken via beheer.html. Staat nergens een knop naartoe: als je het
   adres niet kent kom je er niet, en wie er wel komt kan er nog steeds niets
   zonder beheerder te zijn.

   Bewust een scherm met precies een ding erop. Je pakt dit erbij als je snel
   de deur dicht wil doen, niet om erin te gaan zitten rommelen.
   ----------------------------------------------------------------- */

/**
 * Het hele beheerscherm als losse app, voor beheer.html.
 *
 * Geen opstartscherm met grappige teksten hier: je pakt dit erbij om snel de
 * deur dicht te doen, niet om ernaar te kijken.
 */
export function BeheerApp() {
  const { uid, fout } = useUid()

  if (!isIngesteld()) return <Setup />

  if (fout) {
    return (
      <div className="scherm">
        <h1>Geen verbinding</h1>
        <Kaartje style={{ borderColor: 'var(--rood)' }}>{fout}</Kaartje>
      </div>
    )
  }

  if (!uid) {
    return (
      <div className="scherm">
        <div className="midden">
          <p className="zacht">Even verbinden…</p>
        </div>
      </div>
    )
  }

  return <Beheer uid={uid} />
}

export function Beheer({ uid }: { uid: string }) {
  const [ikBenBeheerder, zetIkBenBeheerder] = useState<boolean | null>(null)
  const [erIsEenBeheerder, zetErIsEenBeheerder] = useState<boolean | null>(null)
  const [deurSinds, zetDeurSinds] = useState(0)
  const [stand, zetStand] = useState<BeheerStand | null>(null)
  const [bezig, zetBezig] = useState(false)
  const [fout, zetFout] = useState<string | null>(null)
  const [tekst, zetTekst] = useState('')
  const [tekstAan, zetTekstAan] = useState(false)

  const nu = useNu(500)

  useEffect(() => volgBenIkBeheerder(uid, zetIkBenBeheerder), [uid])
  useEffect(() => volgIsErEenBeheerder(zetErIsEenBeheerder), [])
  useEffect(() => volgDeur(zetDeurSinds), [])
  useEffect(() => volgBeheer(zetStand), [])

  // De tekst in het invulvak volgt wat er staat, tot je hem zelf aanraakt.
  useEffect(() => {
    if (!tekstAan) zetTekst(stand?.tekst || OPEN.tekst)
  }, [stand, tekstAan])

  const dicht = stand?.dicht ?? false
  const deurRest = Math.max(0, deurSinds + DEUR_MS - nu)
  const deurOpen = deurRest > 0
  const deurSec = Math.ceil(deurRest / 1000)
  const weetIkHet = ikBenBeheerder !== null && erIsEenBeheerder !== null
  const magAanmelden = !ikBenBeheerder && (!erIsEenBeheerder || deurOpen)

  async function doe(wat: () => Promise<void>) {
    zetBezig(true)
    zetFout(null)
    try {
      await wat()
    } catch (e: any) {
      zetFout(String(e?.message ?? e))
    } finally {
      zetBezig(false)
    }
  }

  return (
    <>
      <Kroeg />
      <div className="scherm">
        <div className="midden" style={{ gap: 16 }}>
          <div className="lint">BEHEER</div>

          <div
            className="bordje"
            style={{
              fontSize: 22,
              padding: '18px 26px',
              color: dicht ? 'var(--rood)' : 'var(--groen)',
            }}
          >
            {stand === null ? 'nog nooit aan gedraaid' : dicht ? 'NU DICHT' : 'NU OPEN'}
          </div>

          {!weetIkHet && <p className="zacht klein">Even kijken wie je bent…</p>}

          {weetIkHet && ikBenBeheerder && (
            <>
              <GroteKnop
                enorm
                kleur={dicht ? 'groen' : 'rood'}
                uit={bezig}
                bijTik={() =>
                  doe(() =>
                    zetDicht(uid, !dicht, stand?.titel || OPEN.titel, tekst.trim() || OPEN.tekst),
                  )
                }
              >
                {bezig ? 'bezig…' : dicht ? 'ZET WEER OPEN' : 'ZET DICHT'}
              </GroteKnop>

              <p className="zacht klein" style={{ maxWidth: 320 }}>
                Werkt meteen. Wie de app al open heeft staan speelt zijn potje uit en merkt het pas
                als hij hem opnieuw opstart.
              </p>

              <button className="knop leeg klein" onClick={() => zetTekstAan((a) => !a)}>
                {tekstAan ? 'tekst verbergen' : 'tekst aanpassen'}
              </button>

              {tekstAan && (
                <>
                  <textarea
                    value={tekst}
                    onChange={(e) => zetTekst(e.target.value)}
                    rows={3}
                    maxLength={200}
                    style={{ width: '100%', maxWidth: 320 }}
                    aria-label="Tekst op de dichte pagina"
                  />
                  <p className="zacht klein" style={{ maxWidth: 320 }}>
                    Dit komt op de pagina te staan die mensen zien als de app dicht is. Hij wordt
                    opgeslagen zodra je hierboven aan de schakelaar draait.
                  </p>
                </>
              )}

              <hr style={{ width: '100%', maxWidth: 320, opacity: 0.2 }} />

              {deurOpen ? (
                <>
                  <Kaartje style={{ borderColor: 'var(--goud)' }}>
                    <strong>De deur staat open — nog {deurSec} sec</strong>
                    <div className="klein" style={{ marginTop: 6 }}>
                      Open dit scherm nu op je snelkoppeling en druk daar op MAAK MIJ BEHEERDER.
                    </div>
                  </Kaartje>
                  <button
                    className="knop leeg klein"
                    disabled={bezig}
                    onClick={() => doe(zetDeurDicht)}
                  >
                    deur meteen weer dicht
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="knop leeg klein"
                    disabled={bezig}
                    onClick={() => doe(zetDeurOpen)}
                  >
                    laat nog een telefoon toe
                  </button>
                  <p className="zacht klein" style={{ maxWidth: 320 }}>
                    Zet de deur vijf minuten open, zodat een snelkoppeling op je startscherm er ook
                    bij mag. Die telt namelijk als een apart apparaat.
                  </p>
                </>
              )}
            </>
          )}

          {weetIkHet && magAanmelden && (
            <>
              <Kaartje style={{ borderColor: 'var(--goud)' }}>
                {erIsEenBeheerder ? (
                  <>
                    De deur staat open — nog {deurSec} sec. Druk nu op de knop, dan mag deze
                    telefoon er ook aan.
                  </>
                ) : (
                  <>
                    Er is nog geen beheerder. Meld je aan, dan ben jij de enige die deze schakelaar
                    mag gebruiken.
                  </>
                )}
              </Kaartje>
              <GroteKnop
                enorm
                kleur="goud"
                uit={bezig}
                bijTik={() => doe(() => meldJeAanAlsBeheerder(uid))}
              >
                {bezig ? 'bezig…' : 'MAAK MIJ BEHEERDER'}
              </GroteKnop>
            </>
          )}

          {weetIkHet && !ikBenBeheerder && !magAanmelden && (
            <Kaartje style={{ borderColor: 'var(--rood)' }}>
              <strong>Deze telefoon mag er nog niet aan</strong>
              <div className="klein" style={{ marginTop: 6 }}>
                Een snelkoppeling op je startscherm telt als een apart apparaat, ook al is het
                dezelfde telefoon. Open dit scherm in je browser, waar het wél werkt, druk daar op
                "laat nog een telefoon toe", en kom hier binnen vijf minuten terug.
              </div>
            </Kaartje>
          )}

          {fout && (
            <Kaartje style={{ borderColor: 'var(--rood)' }}>
              <strong>Lukte niet</strong>
              <div className="klein">{fout}</div>
              <div className="klein zacht" style={{ marginTop: 6 }}>
                Staat het stukje over beheer al in de Firebase-regels?
              </div>
            </Kaartje>
          )}

          <p className="zacht klein" style={{ marginTop: 8, wordBreak: 'break-all', maxWidth: 320 }}>
            jouw code: {uid}
          </p>
        </div>
      </div>
    </>
  )
}

import { useEffect, useState } from 'react'
import type { Beheer as BeheerStand } from '../net/beheer'
import {
  benIkBeheerder,
  isErAlEenBeheerder,
  meldJeAanAlsBeheerder,
  volgBeheer,
  zetDicht,
} from '../net/beheer'
import { OPEN } from '../dicht'
import { GroteKnop, Kaartje } from '../ui/Basis'
import { Kroeg } from '../ui/Kroeg'

/* -----------------------------------------------------------------
   HET BEHEERSCHERM

   Te bereiken via .../rondje/#beheer. Staat nergens een knop naartoe: als je
   het adres niet kent, kom je er niet, en wie er wel komt kan er nog steeds
   niets zonder beheerder te zijn.

   Bewust een scherm met precies een ding erop. Je pakt dit erbij als je snel
   de deur dicht wil doen, niet om er in te gaan zitten rommelen.
   ----------------------------------------------------------------- */

type Rol = 'kijken' | 'beheerder' | 'mag-aanmelden' | 'bezet'

export function Beheer({ uid }: { uid: string }) {
  const [rol, zetRol] = useState<Rol>('kijken')
  const [stand, zetStand] = useState<BeheerStand | null>(null)
  const [bezig, zetBezig] = useState(false)
  const [fout, zetFout] = useState<string | null>(null)
  const [tekst, zetTekst] = useState('')
  const [tekstAan, zetTekstAan] = useState(false)

  // Wat ben ik hier: beheerder, de eerste die zich mag melden, of publiek?
  useEffect(() => {
    let levend = true
    ;(async () => {
      try {
        if (await benIkBeheerder(uid)) return levend && zetRol('beheerder')
        const bezet = await isErAlEenBeheerder()
        if (levend) zetRol(bezet ? 'bezet' : 'mag-aanmelden')
      } catch (e: any) {
        if (levend) zetFout(String(e?.message ?? e))
      }
    })()
    return () => {
      levend = false
    }
  }, [uid])

  useEffect(() => volgBeheer(zetStand), [])

  // De tekst in het invulvak volgt wat er staat, tot je hem zelf aanraakt.
  useEffect(() => {
    if (!tekstAan) zetTekst(stand?.tekst || OPEN.tekst)
  }, [stand, tekstAan])

  const dicht = stand?.dicht ?? false

  async function meldAan() {
    zetBezig(true)
    zetFout(null)
    try {
      await meldJeAanAlsBeheerder(uid)
      zetRol('beheerder')
    } catch (e: any) {
      zetFout(String(e?.message ?? e))
    } finally {
      zetBezig(false)
    }
  }

  async function draai(naar: boolean) {
    zetBezig(true)
    zetFout(null)
    try {
      await zetDicht(uid, naar, stand?.titel || OPEN.titel, tekst.trim() || OPEN.tekst)
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

          {rol === 'beheerder' && (
            <>
              <GroteKnop
                enorm
                kleur={dicht ? 'groen' : 'rood'}
                uit={bezig}
                bijTik={() => draai(!dicht)}
              >
                {bezig ? 'bezig…' : dicht ? 'ZET WEER OPEN' : 'ZET DICHT'}
              </GroteKnop>

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

              <p className="zacht klein" style={{ maxWidth: 320 }}>
                Werkt meteen. Wie de app al open heeft staan speelt zijn potje uit en merkt het pas
                als hij hem opnieuw opstart.
              </p>
            </>
          )}

          {rol === 'mag-aanmelden' && (
            <>
              <Kaartje>
                Er is nog geen beheerder. Meld je aan, dan ben jij de enige die deze schakelaar mag
                gebruiken. Daarna kan niemand anders zich er meer bij zetten.
              </Kaartje>
              <GroteKnop enorm kleur="goud" uit={bezig} bijTik={meldAan}>
                {bezig ? 'bezig…' : 'MAAK MIJ BEHEERDER'}
              </GroteKnop>
            </>
          )}

          {rol === 'bezet' && (
            <Kaartje style={{ borderColor: 'var(--rood)' }}>
              Er is al een beheerder, en jij bent het niet. Op deze telefoon kan je alleen kijken.
            </Kaartje>
          )}

          {rol === 'kijken' && <p className="zacht klein">Even kijken wie je bent…</p>}

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

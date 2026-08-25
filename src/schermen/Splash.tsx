import { useEffect, useState } from 'react'
import { Kroeg } from '../ui/Kroeg'

/* ─────────────────────────────────────────────────────────────
   Het opstartscherm.

   Staat er sowieso even, ook als de verbinding meteen klaar is. Een laadscherm
   dat één frame flitst is lelijker dan geen laadscherm, en zo krijg je de tekst
   ook echt te lezen.
   ───────────────────────────────────────────────────────────── */

export const LAAD_TEKSTEN: string[] = [
  'Bier koud aan het zetten…',
  'Glazen aan het tellen…',
  'Statiegeld aan het berekenen…',
  'Iemand aan het zoeken die kan rijden…',
  'De kater van morgen aan het inplannen…',
  'Excuses voor morgen aan het verzinnen…',
  'De aux-kabel aan het claimen…',
  'Chips aan het openscheuren…',
  'Flesopener aan het kwijtraken…',
  'Nog even snel water aan het drinken…',
  'Slokken aan het bijhouden zodat jij dat niet hoeft…',
  'Het laatste rondje aan het uitstellen…',
  'Schuim aan het wegblazen…',
  'Kroonkurken aan het verzamelen…',
  'De taxi-app alvast aan het openen…',
  'Promillage aan het optimaliseren…',
  'Zoekgeschiedenis aan het wissen…',
  'De snackbar aan het bellen…',
  'Een reden om te proosten aan het bedenken…',
  'Iemand aan het overtuigen dat het nog vroeg is…',
  'Het bierviltje aan het omdraaien…',
  'De tafel aan het afvegen…',
  'Kaarten aan het schudden…',
  'De dobbelstenen aan het opwarmen…',
  'De regels aan het verzinnen…',
  'De regels weer aan het vergeten…',
  'Aan het doen alsof we het bijhouden…',
  'Iemand aan het zoeken die de volgende ronde haalt…',
  'De buren alvast aan het waarschuwen…',
  'Het licht aan het dimmen…',
  'De speaker aan het opdraaien…',
  'Aan het beslissen wie er begint…',
  'Aan het rekenen of dit nog verantwoord is…',
  'Nee, dat is het niet…',
  'De rekening aan het splitsen…',
  'Aan het uitzoeken van wie dit glas is…',
  'Een goede smoes aan het klaarzetten…',
  'Aan het wachten tot iedereen zijn telefoon vindt…',
  'De pindaschaal aan het bijvullen…',
  'Aan het hopen dat er brood in huis is…',
  'De ochtend van morgen aan het negeren…',
  'Aan het controleren of iedereen nog rechtop zit…',
]

export function Splash({ tekst, ondertitel }: { tekst?: string; ondertitel?: string }) {
  const [regel] = useState(
    () => tekst ?? LAAD_TEKSTEN[Math.floor(Math.random() * LAAD_TEKSTEN.length)],
  )
  const [punten, zetPunten] = useState(0)

  useEffect(() => {
    const id = setInterval(() => zetPunten((p) => (p + 1) % 4), 420)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <Kroeg />
      <div className="scherm">
        <div className="midden" style={{ gap: 22 }}>
          <img
            src={`${import.meta.env.BASE_URL}logo-512.png`}
            alt="DORST!"
            width={176}
            height={176}
            className="logo wiebel"
            style={{ width: 176, height: 176, maxWidth: '54vw' }}
          />

          <div style={{ minHeight: 52 }}>
            <div style={{ fontSize: 17, lineHeight: 1.4 }}>
              {regel.replace(/…$/, '')}
              <span style={{ color: 'var(--goud)' }}>{'.'.repeat(punten)}</span>
            </div>
            {ondertitel && (
              <div className="klein zacht" style={{ marginTop: 6 }}>
                {ondertitel}
              </div>
            )}
          </div>

          <div style={{ width: 120 }}>
            <div className="balkje">
              <div
                style={{
                  width: '38%',
                  animation: 'schuif 1.4s ease-in-out infinite alternate',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

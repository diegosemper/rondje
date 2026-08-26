import { useEffect, useState } from 'react'
import { isIngesteld } from './net/firebase'
import { useKamer, useUid } from './net/useKamer'
import { useHostLoop } from './net/hostLoop'
import { bewaarCode, codeUitUrl, leesCode } from './net/profiel'
import { useStatus } from './dicht'
import { Beheer } from './schermen/Beheer'
import { Dicht } from './schermen/Dicht'
import { Setup } from './schermen/Setup'
import { Splash } from './schermen/Splash'
import { Start } from './schermen/Start'
import { Lobby } from './schermen/Lobby'
import { SpelKiezer } from './schermen/SpelKiezer'
import { Uitleg } from './schermen/Uitleg'
import { Spelen } from './schermen/Spelen'
import { Scorebord } from './schermen/Scorebord'
import { Kaartje } from './ui/Basis'
import { FoutBanner } from './ui/Fout'
import { Versiebalk } from './ui/Versie'

/**
 * Het moment waarop de app geladen werd. Het opstartscherm rekent hiermee,
 * zodat het aanmelden en de vraag "staan we open?" binnen die 1,9 seconde
 * vallen in plaats van er bovenop te komen.
 */
const GESTART = Date.now()

/** Het verborgen beheerscherm, te bereiken via .../rondje/#beheer */
function isBeheerLink(): boolean {
  try {
    return location.hash.replace('#', '').trim().toLowerCase() === 'beheer'
  } catch {
    return false
  }
}

export function App() {
  const ingesteld = isIngesteld()
  const { uid, fout } = useUid()
  // Zonder werkende verbinding valt er niets uit de database te lezen; dan
  // beslist status.json alleen, anders blijft de app hier hangen.
  const status = useStatus(uid, !ingesteld || fout !== null)
  // Eenmalig vastleggen: als de link straks opgeruimd wordt, blijf je toch
  // op het beheerscherm.
  const [beheer] = useState(isBeheerLink)

  if (!ingesteld) return <Setup />
  if (fout) return <GeenVerbinding fout={fout} />
  if (!uid) return <Splash />

  // Het beheerscherm werkt ook als de app dicht staat -- anders kan je hem
  // niet meer openzetten zodra hij eenmaal dicht is.
  if (beheer) return <Beheer uid={uid} />

  if (!status) return <Splash />
  if (status.dicht) return <Dicht status={status} />

  return (
    <>
      <FoutBanner />
      <Inhoud uid={uid} />
    </>
  )
}

function GeenVerbinding({ fout }: { fout: string }) {
  return (
    <div className="scherm">
      <h1>Geen verbinding</h1>
      <Kaartje style={{ borderColor: 'var(--rood)' }}>{fout}</Kaartje>
      <p className="zacht klein">
        Staat "Anoniem" aan bij Authentication in Firebase? En kloppen de gegevens in
        <code> src/net/firebaseConfig.ts</code>?
      </p>
    </div>
  )
}

function Inhoud({ uid }: { uid: string }) {
  const [code, zetCode] = useState<string | null>(() => codeUitUrl() ?? leesCode())

  const { kamer, prive, laden, weg } = useKamer(code, uid)

  // Het opstartscherm blijft even staan, ook als de verbinding meteen klaar
  // is. Een laadscherm dat één frame flitst is lelijker dan geen laadscherm.
  const [opgewarmd, zetOpgewarmd] = useState(false)
  useEffect(() => {
    const rest = Math.max(0, 1900 - (Date.now() - GESTART))
    const id = setTimeout(() => zetOpgewarmd(true), rest)
    return () => clearTimeout(id)
  }, [])

  // De host draait de spellogica. Op andere telefoons doet dit niets.
  useHostLoop(kamer, uid)

  // Lobby bestaat niet meer (host heeft 'm opgeruimd) → terug naar start.
  useEffect(() => {
    if (code && weg && !laden) {
      bewaarCode(null)
      zetCode(null)
    }
  }, [code, weg, laden])

  // Zodra we een lobby hebben: opslaan voor déze sessie en de code uit het
  // adres halen. Dat laatste geldt ook voor wie via een gedeelde link
  // binnenkomt — anders blijft #CODE in de balk staan en stapt hij bij een
  // volgende keer opstarten zomaar weer diezelfde lobby in.
  useEffect(() => {
    if (code) bewaarCode(code)
  }, [code])

  function ganaarLobby(nieuw: string) {
    bewaarCode(nieuw)
    zetCode(nieuw)
  }

  function verlaat() {
    bewaarCode(null)
    zetCode(null)
  }

  if (!opgewarmd) return <Splash />

  // Nog geen lobby, of ik zit er niet (meer) in.
  if (!code || (!laden && (!kamer || !kamer.spelers[uid]))) {
    if (code && laden) return <Splash ondertitel={`lobby ${code}`} />
    return <Start uid={uid} beginCode={codeUitUrl() ?? code} bijBinnen={ganaarLobby} />
  }

  if (!kamer) return <Splash ondertitel={`lobby ${code}`} />

  return (
    <>
      <Versiebalk hostVersie={kamer.meta.versie} />
      <Scherm kamer={kamer} uid={uid} prive={prive} verlaat={verlaat} />
    </>
  )
}

function Scherm({
  kamer,
  uid,
  prive,
  verlaat,
}: {
  kamer: NonNullable<ReturnType<typeof useKamer>['kamer']>
  uid: string
  prive: any
  verlaat: () => void
}) {
  switch (kamer.meta.fase) {
    case 'kiezen':
      return <SpelKiezer kamer={kamer} uid={uid} bijVertrek={verlaat} />
    case 'uitleg':
      return <Uitleg kamer={kamer} uid={uid} />
    case 'spel':
      return <Spelen kamer={kamer} uid={uid} prive={prive} />
    case 'scorebord':
      return <Scorebord kamer={kamer} uid={uid} />
    default:
      return <Lobby kamer={kamer} uid={uid} bijVertrek={verlaat} />
  }
}

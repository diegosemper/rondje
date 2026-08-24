import { useEffect, useState } from 'react'
import { isIngesteld } from './net/firebase'
import { useKamer, useUid } from './net/useKamer'
import { useHostLoop } from './net/hostLoop'
import { bewaarCode, codeUitUrl, leesCode } from './net/profiel'
import { Setup } from './schermen/Setup'
import { Start } from './schermen/Start'
import { Lobby } from './schermen/Lobby'
import { SpelKiezer } from './schermen/SpelKiezer'
import { Uitleg } from './schermen/Uitleg'
import { Spelen } from './schermen/Spelen'
import { Scorebord } from './schermen/Scorebord'
import { Kaartje } from './ui/Basis'

export function App() {
  const ingesteld = isIngesteld()
  const { uid, fout } = useUid()
  const [code, zetCode] = useState<string | null>(() => codeUitUrl() ?? leesCode())

  const { kamer, prive, laden, weg } = useKamer(code, uid)

  // De host draait de spellogica. Op andere telefoons doet dit niets.
  useHostLoop(kamer, uid)

  // Lobby bestaat niet meer (host heeft 'm opgeruimd) → terug naar start.
  useEffect(() => {
    if (code && weg && !laden) {
      bewaarCode(null)
      zetCode(null)
    }
  }, [code, weg, laden])

  function ganaarLobby(nieuw: string) {
    bewaarCode(nieuw)
    zetCode(nieuw)
  }

  function verlaat() {
    bewaarCode(null)
    zetCode(null)
  }

  if (!ingesteld) return <Setup />

  if (fout) {
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

  if (!uid) return <Bezig tekst="Verbinden…" />

  // Nog geen lobby, of ik zit er niet (meer) in.
  if (!code || (!laden && (!kamer || !kamer.spelers[uid]))) {
    if (code && laden) return <Bezig tekst="Lobby laden…" />
    return <Start uid={uid} beginCode={codeUitUrl() ?? code} bijBinnen={ganaarLobby} />
  }

  if (!kamer) return <Bezig tekst="Lobby laden…" />

  switch (kamer.meta.fase) {
    case 'lobby':
      return <Lobby kamer={kamer} uid={uid} bijVertrek={verlaat} />
    case 'kiezen':
      return <SpelKiezer kamer={kamer} uid={uid} />
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

function Bezig({ tekst }: { tekst: string }) {
  return (
    <div className="scherm">
      <div className="midden">
        <div style={{ fontSize: 54 }}>🍺</div>
        <h2 className="zacht">{tekst}</h2>
      </div>
    </div>
  )
}

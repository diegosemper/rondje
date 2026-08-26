import type { Status } from '../dicht'
import { Kroeg } from '../ui/Kroeg'

/**
 * Wat je ziet als de app dicht staat.
 *
 * Bewust een nette pagina en geen foutmelding: wie de link opent hoort te
 * begrijpen dat het aan ons ligt en niet aan hem. De titel en de tekst komen
 * uit status.json, zodat er iets anders kan staan zonder dat de code
 * aangepast hoeft te worden.
 */
export function Dicht({ status }: { status: Status }) {
  return (
    <>
      <Kroeg />
      <div className="scherm">
        <div className="midden" style={{ gap: 18 }}>
          <img
            src={`${import.meta.env.BASE_URL}logo-512.png`}
            alt="DORST!"
            width={128}
            height={128}
            className="logo"
            style={{ width: 128, height: 128, maxWidth: '38vw', filter: 'grayscale(0.5)' }}
          />
          <div style={{ fontSize: 54 }}>🔒</div>
          <h1>{status.titel}</h1>
          <div className="bordje" style={{ maxWidth: 320, fontSize: 14, padding: '10px 14px' }}>
            {status.tekst}
          </div>
        </div>
      </div>
    </>
  )
}

import { DICHT_TEKST, DICHT_TITEL } from '../dicht'
import { Kroeg } from '../ui/Kroeg'

/**
 * Wat je ziet als de app dicht staat.
 *
 * Bewust een nette pagina en geen foutmelding: wie de link opent hoort te
 * begrijpen dat het aan ons ligt en niet aan hem.
 */
export function Dicht() {
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
          <h1>{DICHT_TITEL}</h1>
          <div className="bordje" style={{ maxWidth: 320, fontSize: 14, padding: '10px 14px' }}>
            {DICHT_TEKST}
          </div>
        </div>
      </div>
    </>
  )
}

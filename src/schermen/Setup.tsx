/**
 * Wat je ziet zolang de Firebase-sleutel nog niet is ingevuld.
 * Zodra src/net/firebaseConfig.ts echte waarden bevat, verdwijnt dit scherm.
 */
export function Setup() {
  return (
    <div className="scherm">
      <h1>
        DORST! <span style={{ color: 'var(--goud)' }}>🍺</span>
      </h1>
      <p className="zacht">
        Bijna klaar. De app moet nog verbonden worden met Firebase — dat is de gratis
        dienst die de lobby's live houdt.
      </p>

      <div className="kaartje">
        <div className="kop-klein">Wat je moet doen (eenmalig, ~5 minuten)</div>
        <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
          <li>
            Ga naar <strong>console.firebase.google.com</strong>
          </li>
          <li>
            <strong>Project toevoegen</strong> → naam <code>rondje</code> → Analytics uit
          </li>
          <li>
            <strong>Build → Realtime Database → Database maken</strong>
            <br />
            <span className="zacht klein">locatie europe-west1, vergrendelde modus</span>
          </li>
          <li>
            <strong>Build → Authentication → Aan de slag</strong>
            <br />
            <span className="zacht klein">Sign-in method → Anoniem → inschakelen</span>
          </li>
          <li>
            <strong>Tandwiel → Projectinstellingen → Jouw apps → &lt;/&gt;</strong>
            <br />
            <span className="zacht klein">
              kopieer de waarden naar <code>src/net/firebaseConfig.ts</code>
            </span>
          </li>
          <li>
            <strong>Realtime Database → Regels</strong>
            <br />
            <span className="zacht klein">
              plak de inhoud van <code>database.rules.json</code> en publiceer
            </span>
          </li>
        </ol>
      </div>

      <p className="zacht klein">
        Deze stappen staan ook uitgeschreven bovenin het bestand{' '}
        <code>src/net/firebaseConfig.ts</code>.
      </p>
    </div>
  )
}

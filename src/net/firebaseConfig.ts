/* ─────────────────────────────────────────────────────────────
   HIER KOMT JOUW FIREBASE-SLEUTEL

   Zolang dit bestand nog de voorbeeldwaarden bevat, laat de app een
   uitlegscherm zien in plaats van de lobby.

   Zo kom je aan de sleutel (eenmalig, ~5 minuten, gratis):

     1. Ga naar https://console.firebase.google.com
     2. "Project toevoegen"  →  naam: rondje  →  Google Analytics UIT
     3. Klik links op "Build" → "Realtime Database" → "Database maken"
          - Locatie: europe-west1
          - Kies "Start in vergrendelde modus" (regels zetten we hierna goed)
     4. Klik links op "Build" → "Authentication" → "Aan de slag"
          - Tabblad "Sign-in method" → "Anoniem" → inschakelen → opslaan
     5. Klik linksboven op het tandwiel → "Projectinstellingen"
          - Scroll naar "Jouw apps" → klik op het web-icoon  </>
          - Bijnaam: rondje  → "App registreren"
          - Je ziet nu een blokje met apiKey, authDomain, databaseURL, ...
          - Kopieer die waarden hieronder in.

   Deze sleutel mag gewoon openbaar in de code staan. Bij Firebase-web-apps
   is dat normaal: de sleutel zegt alleen wélk project het is. De beveiliging
   zit in de databaseregels (zie database.rules.json in deze map).
   ───────────────────────────────────────────────────────────── */

export const firebaseConfig = {
  apiKey: 'VUL-IN',
  authDomain: 'VUL-IN',
  databaseURL: 'VUL-IN',
  projectId: 'VUL-IN',
  storageBucket: 'VUL-IN',
  messagingSenderId: 'VUL-IN',
  appId: 'VUL-IN',
}

export function isIngesteld(): boolean {
  return (
    firebaseConfig.apiKey !== 'VUL-IN' &&
    firebaseConfig.databaseURL !== 'VUL-IN' &&
    firebaseConfig.databaseURL.startsWith('http')
  )
}

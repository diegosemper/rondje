import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth } from 'firebase/auth'
import { getDatabase, ref, onValue, type Database } from 'firebase/database'
import { firebaseConfig, isIngesteld } from './firebaseConfig'

/* De verbinding met het "gedeelde prikbord" in de cloud. */

let app: FirebaseApp | null = null
let _db: Database | null = null
let _auth: Auth | null = null

function start() {
  if (app) return
  app = initializeApp(firebaseConfig)
  _db = getDatabase(app)
  _auth = getAuth(app)
}

export function db(): Database {
  if (!isIngesteld()) throw new Error('Firebase is nog niet ingesteld')
  start()
  return _db!
}

export function auth(): Auth {
  if (!isIngesteld()) throw new Error('Firebase is nog niet ingesteld')
  start()
  return _auth!
}

/**
 * Logt anoniem in en geeft je uid terug. Geen e-mail, geen wachtwoord —
 * de browser onthoudt wie je bent zodat je na een refresh dezelfde speler
 * blijft.
 */
let loginBelofte: Promise<string> | null = null

export function login(): Promise<string> {
  if (loginBelofte) return loginBelofte
  loginBelofte = new Promise<string>((klaar, mislukt) => {
    const a = auth()
    onAuthStateChanged(
      a,
      (gebruiker) => {
        if (gebruiker) {
          klaar(gebruiker.uid)
        } else {
          signInAnonymously(a).catch(mislukt)
        }
      },
      mislukt,
    )
  })
  return loginBelofte
}

/* ── Server-tijd ────────────────────────────────────────────────
   Telefoonklokken lopen zelden precies gelijk. Firebase vertelt ons hoeveel
   deze telefoon afwijkt, zodat aftelklokken overal hetzelfde aftellen.       */

let offset = 0

export function volgServerTijd(): () => void {
  return onValue(ref(db(), '.info/serverTimeOffset'), (snap) => {
    offset = snap.val() ?? 0
  })
}

/** De tijd nu, gecorrigeerd naar server-tijd. */
export function nu(): number {
  return Date.now() + offset
}

export { isIngesteld }

import { get, onValue, ref, serverTimestamp, set, update } from 'firebase/database'
import { db, isIngesteld } from './firebase'

/* -----------------------------------------------------------------
   DE SCHAKELAAR IN DE DATABASE

   Hiermee zet Diego DORST! open of dicht vanaf zijn eigen telefoon, zonder
   laptop en zonder wachten op publiceren.

   Wie mag dat? Alleen wie in /beheerders staat. De eerste die het
   beheerscherm opent mag zichzelf erin zetten; daarna zit het op slot.

   Waarom er dan toch een deur is die opengezet kan worden: sinds iOS 17
   krijgt elke snelkoppeling op je startscherm zijn eigen opslag, los van de
   browser. Firebase meldt je daarbinnen aan als een andere gebruiker, en die
   is dus geen beheerder -- ook al ben jij het gewoon zelf. Zonder uitweg zou
   je de schakelaar nooit als snelkoppeling kunnen gebruiken.

   Die uitweg is /deuropen: een beheerder zet daar een tijdstip neer, en vijf
   minuten lang mag er nog een toestel bij. Kort genoeg dat niemand er per
   ongeluk in glipt, lang genoeg om rustig van je browser naar je startscherm
   te lopen.
   ----------------------------------------------------------------- */

/** Hoe lang de deur openstaat nadat een beheerder erop drukt. */
export const DEUR_MS = 5 * 60 * 1000

export interface Beheer {
  dicht: boolean
  titel: string
  tekst: string
  /** wanneer er voor het laatst aan gedraaid is (servertijd) */
  sinds: number
}

function pakBeheer(v: any): Beheer | null {
  if (!v || typeof v !== 'object') return null
  return {
    dicht: v.dicht === true,
    titel: typeof v.titel === 'string' ? v.titel : '',
    tekst: typeof v.tekst === 'string' ? v.tekst : '',
    sinds: Number(v.sinds) || 0,
  }
}

/** Leest de stand een keer. null = er is nog nooit aan gedraaid. */
export async function leesBeheer(): Promise<Beheer | null> {
  if (!isIngesteld()) return null
  const snap = await get(ref(db(), 'beheer'))
  return pakBeheer(snap.val())
}

/** Blijft luisteren. Voor het beheerscherm, zodat je meteen ziet wat er staat. */
export function volgBeheer(bij: (b: Beheer | null) => void): () => void {
  return onValue(ref(db(), 'beheer'), (snap) => bij(pakBeheer(snap.val())))
}

/** Ben ik beheerder? Blijft luisteren, zodat aanmelden meteen doorwerkt. */
export function volgBenIkBeheerder(uid: string, bij: (ja: boolean) => void): () => void {
  return onValue(ref(db(), `beheerders/${uid}`), (snap) => bij(snap.val() === true))
}

/** Is er überhaupt al een beheerder? Zo niet, dan mag de eerste zich melden. */
export function volgIsErEenBeheerder(bij: (ja: boolean) => void): () => void {
  return onValue(ref(db(), 'beheerders'), (snap) => bij(snap.exists()))
}

/** Wanneer de deur voor het laatst opengezet is, of 0. */
export function volgDeur(bij: (sinds: number) => void): () => void {
  return onValue(ref(db(), 'deuropen'), (snap) => bij(Number(snap.val()) || 0))
}

/** Zet jezelf neer als beheerder. Lukt alleen als het slot dat toelaat. */
export async function meldJeAanAlsBeheerder(uid: string): Promise<void> {
  await set(ref(db(), `beheerders/${uid}`), true)
}

/** Laat er vijf minuten lang nog een toestel bij. */
export async function zetDeurOpen(): Promise<void> {
  await set(ref(db(), 'deuropen'), serverTimestamp())
}

/** Doe de deur meteen weer dicht. */
export async function zetDeurDicht(): Promise<void> {
  await set(ref(db(), 'deuropen'), 0)
}

export async function zetDicht(
  uid: string,
  dicht: boolean,
  titel: string,
  tekst: string,
): Promise<void> {
  await update(ref(db(), 'beheer'), {
    dicht,
    titel,
    tekst,
    sinds: serverTimestamp(),
    door: uid,
  })
}

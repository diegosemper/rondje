import { get, onValue, ref, serverTimestamp, set, update } from 'firebase/database'
import { db, isIngesteld } from './firebase'

/* -----------------------------------------------------------------
   DE SCHAKELAAR IN DE DATABASE

   Hiermee zet Diego DORST! open of dicht vanaf zijn eigen telefoon, zonder
   laptop en zonder wachten op publiceren.

   Wie mag dat? Alleen wie in /beheerders staat. Die lijst wordt eenmalig
   gevuld door de allereerste die het beheerscherm opent -- daarna zit hij op
   slot en kan niemand zich er nog bij zetten. Zo hoeven er geen codes heen en
   weer, en kan een nieuwsgierige vriend die de link ontdekt er alsnog niets
   mee.

   Een tweede telefoon toevoegen kan later nog wel, maar dan via de
   Firebase-website. Dat is met opzet: dat is precies de drempel die
   voorkomt dat iemand anders zich stiekem aanmeldt.
   ----------------------------------------------------------------- */

export interface Beheer {
  dicht: boolean
  titel: string
  tekst: string
  /** wanneer er voor het laatst aan gedraaid is (servertijd) */
  sinds: number
}

/** Leest de stand een keer. null = er is nog nooit aan gedraaid. */
export async function leesBeheer(): Promise<Beheer | null> {
  if (!isIngesteld()) return null
  const snap = await get(ref(db(), 'beheer'))
  const v = snap.val()
  if (!v || typeof v !== 'object') return null
  return {
    dicht: v.dicht === true,
    titel: typeof v.titel === 'string' ? v.titel : '',
    tekst: typeof v.tekst === 'string' ? v.tekst : '',
    sinds: Number(v.sinds) || 0,
  }
}

/** Blijft luisteren. Voor het beheerscherm, zodat je meteen ziet wat er staat. */
export function volgBeheer(bij: (b: Beheer | null) => void): () => void {
  return onValue(ref(db(), 'beheer'), (snap) => {
    const v = snap.val()
    if (!v || typeof v !== 'object') return bij(null)
    bij({
      dicht: v.dicht === true,
      titel: typeof v.titel === 'string' ? v.titel : '',
      tekst: typeof v.tekst === 'string' ? v.tekst : '',
      sinds: Number(v.sinds) || 0,
    })
  })
}

export async function benIkBeheerder(uid: string): Promise<boolean> {
  if (!isIngesteld()) return false
  const snap = await get(ref(db(), `beheerders/${uid}`))
  return snap.val() === true
}

/** Is er al iemand beheerder? Zo niet, dan mag de eerste zich melden. */
export async function isErAlEenBeheerder(): Promise<boolean> {
  if (!isIngesteld()) return true
  const snap = await get(ref(db(), 'beheerders'))
  return snap.exists()
}

/** Zet jezelf neer als beheerder. Lukt alleen als er nog niemand is. */
export async function meldJeAanAlsBeheerder(uid: string): Promise<void> {
  await set(ref(db(), `beheerders/${uid}`), true)
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

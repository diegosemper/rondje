import type { GameModule } from '../engine/types'

import { testspel } from './testspel'
import { hilo } from './hilo'
import { wievanons } from './wievanons'
import { snelstevinger } from './snelstevinger'
import { bussen } from './bussen'
import { imposter } from './imposter'
import { dealer } from './dealer'
import { ketting } from './ketting'
import { eenentwintig } from './eenentwintig'
import { bom } from './bom'
import { gelijkdenken } from './gelijkdenken'
import { ezelen } from './ezelen'
import { tekenen } from './tekenen'
import { nummers } from './nummers'
import { sabotage } from './sabotage'
import { golflengte } from './golflengte'
import { verbodenwoord } from './verbodenwoord'
import { flappy } from './flappy'
import { snelweg } from './snelweg'
import { stapeltoren } from './stapeltoren'
import { wiskunde } from './wiskunde'
import { opbouwen } from './opbouwen'
import { perudo } from './perudo'
import { vingers } from './vingers'
import { kleurenklap } from './kleurenklap'
import { duel } from './duel'
import { tienseconden } from './tienseconden'
import { stellingen } from './stellingen'
import { dertig } from './dertig'
import { hitster } from './hitster'
import { pijlen } from './pijlen'
import { spiegel } from './spiegel'
import { verhaal } from './verhaal'
import { blackstories } from './blackstories'
import { slechtantwoord } from './slechtantwoord'

/* ─────────────────────────────────────────────────────────────
   Wat er niet (meer) in de lijst staat

   Deze spellen zijn er op verzoek uit gehaald omdat ze niet leuk genoeg
   bleken. De code staat er nog, dus terugzetten is telkens twee regels: de
   import weer aanzetten en de naam terug in de lijst hieronder.

   · Zwaartekracht en Rood of Zwart — te saai bevonden.
   · Schudden, Kaartroulette, Pyramide en Mexicanen — idem.
   · Het Alfabet, Twee Waarheden één Leugen, Bierpong, Ik Heb Nog Nooit,
     Kingsen, Wie Ben Ik, Blinde Kaart en Waterval — idem.
   · Jetpack en Springen — idem. Flappy en Snelweg blijven over als de twee
     behendigheidsspellen.
   ───────────────────────────────────────────────────────────── */

/**
 * Alle spellen van DORST!
 *
 * Een spel toevoegen = één mapje in deze map maken en hier één regel
 * toevoegen. Meer is het niet.
 */
export const ALLE_SPELLEN: GameModule[] = [
  bussen,
  imposter,
  dealer,
  ezelen,
  perudo,
  vingers,
  tekenen,
  verhaal,
  blackstories,
  slechtantwoord,
  nummers,
  hitster,
  flappy,
  snelweg,
  stapeltoren,
  pijlen,
  wiskunde,
  kleurenklap,
  tienseconden,
  duel,
  opbouwen,
  golflengte,
  sabotage,
  verbodenwoord,
  spiegel,
  ketting,
  eenentwintig,
  bom,
  gelijkdenken,
  dertig,
  stellingen,
  hilo,
  wievanons,
  snelstevinger,

  // Blijft onderaan; is geen echt spel maar de zelftest van het fundament.
  testspel,
]

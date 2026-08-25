import type { GameModule } from '../engine/types'

import { testspel } from './testspel'
import { hilo } from './hilo'
import { wievanons } from './wievanons'
import { snelstevinger } from './snelstevinger'
import { bussen } from './bussen'
import { kingsen } from './kingsen'
import { imposter } from './imposter'
import { dealer } from './dealer'
import { ketting } from './ketting'
import { eenentwintig } from './eenentwintig'
import { bom } from './bom'
import { gelijkdenken } from './gelijkdenken'
import { pyramide } from './pyramide'
import { blindekaart } from './blindekaart'
import { ezelen } from './ezelen'
import { roulette } from './roulette'
import { tekenen } from './tekenen'
import { nummers } from './nummers'
import { sabotage } from './sabotage'
import { golflengte } from './golflengte'
import { alfabet } from './alfabet'
import { verbodenwoord } from './verbodenwoord'
import { flappy } from './flappy'
import { jetpack } from './jetpack'
import { snelweg } from './snelweg'
import { stapeltoren } from './stapeltoren'
import { wiskunde } from './wiskunde'
import { bierpong } from './bierpong'
import { opbouwen } from './opbouwen'
import { roodzwart } from './roodzwart'
import { waterval } from './waterval'
import { mexicanen } from './mexicanen'
import { kleurenklap } from './kleurenklap'
import { duel } from './duel'
import { schudden } from './schudden'
import { tienseconden } from './tienseconden'
import { nognooit } from './nognooit'
import { stellingen } from './stellingen'
import { wiebenik } from './wiebenik'
import { springen } from './springen'
import { spiegel } from './spiegel'
import { zwaartekracht } from './zwaartekracht'
import { tweewaarheden } from './tweewaarheden'

/**
 * Alle spellen van DORST!
 *
 * Een spel toevoegen = één mapje in deze map maken en hier één regel
 * toevoegen. Meer is het niet.
 */
export const ALLE_SPELLEN: GameModule[] = [
  bussen,
  kingsen,
  imposter,
  dealer,
  pyramide,
  blindekaart,
  ezelen,
  roulette,
  roodzwart,
  waterval,
  mexicanen,
  tekenen,
  nummers,
  flappy,
  jetpack,
  snelweg,
  stapeltoren,
  springen,
  bierpong,
  wiskunde,
  kleurenklap,
  tienseconden,
  duel,
  schudden,
  opbouwen,
  golflengte,
  sabotage,
  verbodenwoord,
  alfabet,
  spiegel,
  tweewaarheden,
  zwaartekracht,
  ketting,
  eenentwintig,
  bom,
  gelijkdenken,
  nognooit,
  stellingen,
  wiebenik,
  hilo,
  wievanons,
  snelstevinger,

  // Blijft onderaan; is geen echt spel maar de zelftest van het fundament.
  testspel,
]

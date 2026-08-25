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
import { spiegel } from './spiegel'
import { zwaartekracht } from './zwaartekracht'
import { tweewaarheden } from './tweewaarheden'

/**
 * Alle spellen van Rondje.
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
  tekenen,
  nummers,
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
  hilo,
  wievanons,
  snelstevinger,

  // Blijft onderaan; is geen echt spel maar de zelftest van het fundament.
  testspel,
]

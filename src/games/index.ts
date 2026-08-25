import type { GameModule } from '../engine/types'

import { testspel } from './testspel'
import { hilo } from './hilo'
import { wievanons } from './wievanons'
import { snelstevinger } from './snelstevinger'
import { bussen } from './bussen'
import { kingsen } from './kingsen'

/**
 * Alle spellen van Rondje.
 *
 * Een spel toevoegen = één mapje in deze map maken en hier één regel
 * toevoegen. Meer is het niet.
 */
export const ALLE_SPELLEN: GameModule[] = [
  bussen,
  kingsen,
  hilo,
  wievanons,
  snelstevinger,

  // Blijft onderaan; is geen echt spel maar de zelftest van het fundament.
  testspel,
]

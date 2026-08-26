/*
 * De open/dicht-schakelaar omzetten vanaf de laptop.
 *
 *   node scripts/schakel.cjs dicht
 *   node scripts/schakel.cjs open
 *
 * Waarom een scriptje en niet even met de hand: naast "dicht" moet ook
 * "sinds" mee omhoog. Dat tijdstip bepaalt namelijk wie er wint als er ook
 * vanaf de telefoon aan gedraaid is -- de laatste die aan de knop zat. Zet je
 * alleen "dicht" om en vergeet je "sinds", dan blijft een oudere stand van de
 * telefoon gewoon voorgaan en snap je er niets meer van.
 */
const fs = require('fs')
const pad = 'public/status.json'

const wat = process.argv[2]
if (wat !== 'dicht' && wat !== 'open') {
  console.error('gebruik: node scripts/schakel.cjs dicht|open')
  process.exit(1)
}

const status = JSON.parse(fs.readFileSync(pad, 'utf8'))
status.dicht = wat === 'dicht'
status.sinds = Date.now()

fs.writeFileSync(pad, JSON.stringify(status, null, 2) + '\n', 'utf8')
console.log(`${pad}: dicht=${status.dicht}, sinds=${new Date(status.sinds).toISOString()}`)

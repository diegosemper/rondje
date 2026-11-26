/*
 * Alle tests achter elkaar: `npm test`.
 *
 * Elk testbestand in deze map is een los programma dat 0 teruggeeft als alles
 * goed is. Nieuwe test erbij? Neerzetten in deze map, klaar -- behalve de
 * hulpstukken hieronder, die worden overgeslagen.
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const HULP = ['alles.cjs', 'bundel.cjs', 'keur.cjs']

const bestanden = fs
  .readdirSync(__dirname)
  .filter((n) => n.endsWith('.cjs') && !HULP.includes(n))
  .sort()

if (bestanden.length === 0) {
  console.log('Geen tests gevonden.')
  process.exit(0)
}

let stuk = 0
for (const naam of bestanden) {
  try {
    execFileSync(process.execPath, [path.join(__dirname, naam)], { stdio: 'inherit' })
  } catch {
    stuk++
  }
}

if (stuk > 0) {
  console.log(`\n${stuk} van ${bestanden.length} testbestanden ging stuk.`)
  process.exit(1)
}
console.log(`\nAlles goed: ${bestanden.length} testbestand(en).`)

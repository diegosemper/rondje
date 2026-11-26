/* Het kleinste testgereedschap dat werkt: een naam, een eis, en een eindstand. */

let goed = 0
const stuk = []

/** Eén eis. `waar` moet waar zijn, anders gaat de test stuk. */
function eis(naam, waar, extra) {
  if (waar) {
    goed++
    return
  }
  stuk.push(extra === undefined ? naam : `${naam}\n    ${extra}`)
}

/** Twee waarden moeten gelijk zijn; vergelijkt via JSON, dus ook lijsten. */
function gelijk(naam, gekregen, verwacht) {
  const a = JSON.stringify(gekregen)
  const b = JSON.stringify(verwacht)
  eis(naam, a === b, a === b ? undefined : `kreeg ${a}, verwacht ${b}`)
}

/** Print de uitslag en bepaalt de afsluitcode. */
function uitslag(kop) {
  if (stuk.length === 0) {
    console.log(`  ✓ ${kop}: ${goed} eisen gehaald`)
    return 0
  }
  console.log(`  ✗ ${kop}: ${stuk.length} van ${goed + stuk.length} eisen gefaald`)
  for (const s of stuk) console.log(`    · ${s}`)
  return 1
}

module.exports = { eis, gelijk, uitslag }

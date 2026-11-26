/*
 * Een TypeScript-module bruikbaar maken in een los testscript.
 *
 * Node kan geen TypeScript lezen, en de echte app wordt door Vite in elkaar
 * gezet. Voor een test is dat te zwaar: hier gaat één bestand met esbuild door
 * de molen en komt er als gewone CommonJS weer uit, in de tijdelijke map.
 * esbuild zit al in node_modules omdat Vite hem gebruikt.
 *
 * Alleen geschikt voor modules zonder React en zonder Firebase. De rekenkernen
 * in src/engine zijn daar met opzet los van gehouden.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const esbuild = require('esbuild')

const WORTEL = path.join(__dirname, '..')

/** Bundelt `src/<pad>` en geeft de geëxporteerde functies terug. */
function laad(pad) {
  const bron = path.join(WORTEL, 'src', pad)
  if (!fs.existsSync(bron)) throw new Error(`Bestaat niet: ${bron}`)

  const map = fs.mkdtempSync(path.join(os.tmpdir(), 'dorst-test-'))
  const doel = path.join(map, 'bundel.cjs')

  esbuild.buildSync({
    entryPoints: [bron],
    outfile: doel,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    jsx: 'automatic',
    loader: { '.css': 'text' },
    logLevel: 'warning',
  })

  return require(doel)
}

module.exports = { laad }

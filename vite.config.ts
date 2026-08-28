import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Het stempel van deze bouw. Zit in de code én in versie.json. */
const STEMPEL = Date.now().toString(36)

export default defineConfig({
  plugins: [
    react(),
    // Schrijft versie.json naast de app. De app haalt dat bestand bij elke
    // start op zonder cache en vergelijkt het met zijn eigen stempel. Zo weet
    // een telefoon die nog een oude versie uit zijn geheugen serveert dat er
    // iets nieuwers is -- anders merk je dat pas als er iets raars gebeurt.
    {
      name: 'versiebestand',
      generateBundle(_opties, bundel) {
        if (bundel['versie.json']) return
        this.emitFile({
          type: 'asset',
          fileName: 'versie.json',
          source: JSON.stringify({ build: STEMPEL }),
        })
      },
    },
  ],
  // Een stempel per bouw. De host schrijft die in de lobby, en elke telefoon
  // vergelijkt hem met de zijne. Zo merk je het meteen als er iemand nog een
  // oude versie draait, in plaats van dat je je scheel zoekt naar een spel dat
  // bij de een anders werkt dan bij de ander.
  define: {
    __BUILD__: JSON.stringify(STEMPEL),
  },
  // Relatieve paden, zodat de app zowel op localhost als op
  // https://<naam>.github.io/<repo>/ werkt zonder aanpassing.
  base: './',
  // Twee ingangen. beheer.html is het schakelaarscherm en staat bewust los
  // van de app: het heeft geen manifest, zodat een snelkoppeling op je
  // startscherm ook echt op dat scherm uitkomt en niet op de gewone app.
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        beheer: resolve(__dirname, 'beheer.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
})

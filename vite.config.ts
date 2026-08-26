import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Een stempel per bouw. De host schrijft die in de lobby, en elke telefoon
  // vergelijkt hem met de zijne. Zo merk je het meteen als er iemand nog een
  // oude versie draait, in plaats van dat je je scheel zoekt naar een spel dat
  // bij de een anders werkt dan bij de ander.
  define: {
    __BUILD__: JSON.stringify(Date.now().toString(36)),
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

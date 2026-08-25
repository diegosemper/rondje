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
  server: {
    port: 5173,
  },
})

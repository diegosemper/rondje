import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relatieve paden, zodat de app zowel op localhost als op
  // https://<naam>.github.io/<repo>/ werkt zonder aanpassing.
  base: './',
  server: {
    port: 5173,
  },
})

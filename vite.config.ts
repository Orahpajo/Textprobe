import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Basis-Pfad für GitHub Pages (https://<user>.github.io/Textprobe/).
// Lokal und bei Deploys auf eine eigene Domain via VITE_BASE überschreibbar.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/Textprobe/',
  plugins: [react()],
})

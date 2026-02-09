
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configurações específicas para Tauri e Web
export default defineConfig({
  plugins: [react()],
  // Base '/' é melhor para deploys no Vercel/Netlify
  base: '/',
  clearScreen: false,
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    target: 'chrome105',
    minify: 'esbuild',
    sourcemap: false,
    outDir: 'dist',
    emptyOutDir: true
  }
})

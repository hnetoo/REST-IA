
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configurações específicas para Tauri e Web
export default defineConfig({
  plugins: [react()],
  // @ts-ignore
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
  },
  // Base '/' é melhor para deploys no Vercel/Netlify
  base: '/',
  clearScreen: false,
  server: {
    port: 3000,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    target: 'chrome105',
    minify: 'esbuild',
    sourcemap: false,
    outDir: 'dist',
    emptyOutDir: true
  }
})

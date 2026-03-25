import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
  },
  server: {
    strictPort: true,
    port: 5173,
    clearScreen: false
  },
  clearScreen: false,
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://tboiuiwlqfzcvakxrsmj.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('sb_publishable_fBMKbbzNYBe8d1rzdWyerg_4We8tZEm')
  }
})

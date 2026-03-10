
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
  },
  // Garantir que variáveis de ambiente sejam incluídas no build
  define: {
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://tboiuiwlqfzcvakxrsmj.supabase.co'),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.fBMKbbzNYBe8d1rzdWyerg_4We8tZEm'),
    'process.env.VITE_SUPABASE_SECRET_KEY': JSON.stringify(process.env.VITE_SUPABASE_SECRET_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA3NzkzOSwiZXhwIjoyMDg4NjUzOTM5fQ.XuG0V0cxLeoBbkAVcH4kYg_OLpvunUM')
  }
})
